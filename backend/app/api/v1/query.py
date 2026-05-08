"""
Main RAG query endpoints -> sync and streaming.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse

from app.config import settings as app_settings
from app.dependencies import require_auth_in_production
from app.schemas.query import (
    CompareRequest,
    CompareResponse,
    CompareResult,
    QueryRequest,
    QueryResponse,
    SourceInfo,
)

logger = logging.getLogger("openrag.query")

router = APIRouter(tags=["query"])


async def _load_session(app, user_id: str, session_id: Optional[str]):
    """Load chat session from Redis, return (session_id, history)."""
    cache = app.state.cache
    sid = session_id or str(uuid.uuid4())
    history = await cache.get_chat_session(user_id, sid) or []
    return sid, history


async def _save_session(app, user_id: str, session_id: str, history: list[dict]):
    """Save chat session to Redis with message limit."""
    cache = app.state.cache
    trimmed = history[-app_settings.max_chat_history_messages :]
    await cache.set_chat_session(user_id, session_id, trimmed)


def _get_user_id(current_user: Optional[dict]) -> str:
    """Extract user_id from JWT payload or fallback to anonymous."""
    if current_user and current_user.get("sub"):
        return current_user["sub"]
    return "anonymous"


def _build_optimizer_metadata(request: QueryRequest) -> dict:
    return {
        "reasoning_bank": request.enable_reasoning_bank,
        "turboquant": request.turboquant_enabled,
        "turboquant_bits": request.turboquant_bits,
    }


@router.post("/query", response_model=QueryResponse)
async def query_documents(
    request: QueryRequest,
    req: Request,
    current_user: Optional[dict] = Depends(require_auth_in_production),
):
    """Main RAG query endpoint -> retrieves context and generates answer."""
    app = req.app
    factory = app.state.strategy_factory
    tracing = app.state.tracing_service
    llm_service = app.state.llm_service

    user_id = _get_user_id(current_user)
    session_id, history = await _load_session(app, user_id, request.session_id)

    retrieval_query = request.query
    if history:
        retrieval_query = await llm_service.rewrite_query(request.query, history)

    canonical_strategy = factory.canonicalize(request.strategy)
    strategy = factory.get(request.strategy)
    trace = tracing.create_recorder(
        query=request.query,
        strategy=canonical_strategy.value,
        collection=request.collection,
    )

    context = await strategy.retrieve(
        query=retrieval_query,
        collection=request.collection,
        trace=trace,
        top_k=request.top_k,
        max_hops=request.max_hops,
        entity_types=request.entity_types,
        query_mode=request.query_mode,
        sparse_weight=request.sparse_weight,
        enable_reranking=request.enable_reranking,
        reranker_type=request.reranker_type,
        enable_reasoning_bank=request.enable_reasoning_bank,
        reasoning_memory_limit=request.reasoning_memory_limit,
        turboquant_enabled=request.turboquant_enabled,
        turboquant_bits=request.turboquant_bits,
        filters=request.filters,
    )

    if request.check_sufficiency and context:
        is_sufficient, score = await strategy.check_context_sufficiency(
            query=request.query,
            context=context,
            trace=trace,
            threshold=request.sufficiency_threshold,
            model=request.model,
        )
        if not is_sufficient:
            if request.sufficiency_action == "retry":
                context = await strategy.retrieve(
                    query=retrieval_query,
                    collection=request.collection,
                    trace=trace,
                    top_k=request.top_k * 2,
                    max_hops=request.max_hops,
                    entity_types=request.entity_types,
                    query_mode=request.query_mode,
                    sparse_weight=request.sparse_weight,
                    enable_reranking=request.enable_reranking,
                    reranker_type=request.reranker_type,
                    enable_reasoning_bank=request.enable_reasoning_bank,
                    reasoning_memory_limit=request.reasoning_memory_limit,
                    turboquant_enabled=request.turboquant_enabled,
                    turboquant_bits=request.turboquant_bits,
                    filters=request.filters,
                )
            elif request.sufficiency_action == "abstain":
                await tracing.save_trace(
                    trace,
                    chunks_retrieved=len(context),
                    answer_length=0,
                    model=request.model,
                )
                await strategy.record_outcome(
                    query=request.query,
                    collection=request.collection,
                    trace=trace,
                    success=False,
                    context=context,
                    metadata={"reason": "insufficient_context"},
                )
                sources = [
                    SourceInfo(
                        content=chunk["content"][:200],
                        score=chunk.get("score", 0),
                        metadata=chunk.get("metadata", {}),
                    )
                    for chunk in context
                ]
                return QueryResponse(
                    answer=(
                        "Insufficient context to answer confidently "
                        f"(sufficiency score: {score:.0%}). "
                        "Try uploading more relevant documents or rephrasing the query."
                    ),
                    sources=sources,
                    strategy_used=canonical_strategy,
                    metadata={
                        "model": request.model,
                        "top_k": request.top_k,
                        "chunks_retrieved": len(context),
                        "sufficiency_score": score,
                        "abstained": True,
                        "optimizers": _build_optimizer_metadata(request),
                        "requested_strategy": request.strategy.value,
                    },
                    latency_ms=trace.total_latency_ms,
                    trace_id=trace.trace_id,
                    session_id=session_id,
                )

    answer = await strategy.generate(
        query=request.query,
        context=context,
        trace=trace,
        model=request.model,
        temperature=request.temperature,
        history=history or None,
    )

    await tracing.save_trace(
        trace,
        chunks_retrieved=len(context),
        answer_length=len(answer),
        model=request.model,
    )
    await strategy.record_outcome(
        query=request.query,
        collection=request.collection,
        trace=trace,
        success=bool(context),
        context=context,
        metadata={"query_rewritten": retrieval_query != request.query},
    )

    history.append({"role": "user", "content": request.query})
    history.append({"role": "assistant", "content": answer})
    await _save_session(app, user_id, session_id, history)

    sources = [
        SourceInfo(
            content=chunk["content"][:200],
            score=chunk.get("score", 0),
            metadata=chunk.get("metadata", {}),
        )
        for chunk in context
    ]

    return QueryResponse(
        answer=answer,
        sources=sources,
        strategy_used=canonical_strategy,
        metadata={
            "model": request.model,
            "top_k": request.top_k,
            "chunks_retrieved": len(context),
            "query_rewritten": retrieval_query != request.query,
            "optimizers": _build_optimizer_metadata(request),
            "requested_strategy": request.strategy.value,
        },
        latency_ms=trace.total_latency_ms,
        trace_id=trace.trace_id,
        session_id=session_id,
    )


@router.post("/query/stream")
async def query_stream(
    request: QueryRequest,
    req: Request,
    current_user: Optional[dict] = Depends(require_auth_in_production),
):
    """Streaming RAG query endpoint via SSE."""
    app = req.app
    factory = app.state.strategy_factory
    tracing = app.state.tracing_service
    llm_service = app.state.llm_service

    user_id = _get_user_id(current_user)
    session_id, history = await _load_session(app, user_id, request.session_id)

    retrieval_query = request.query
    if history:
        retrieval_query = await llm_service.rewrite_query(request.query, history)

    async def event_generator():
        try:
            canonical_strategy = factory.canonicalize(request.strategy)
            strategy = factory.get(request.strategy)
            trace = tracing.create_recorder(
                query=request.query,
                strategy=canonical_strategy.value,
                collection=request.collection,
            )

            logger.info("Stream query: filters=%s, strategy=%s", request.filters, request.strategy)
            yield {"event": "status", "data": json.dumps({"phase": "retrieving"})}

            context = await strategy.retrieve(
                query=retrieval_query,
                collection=request.collection,
                trace=trace,
                top_k=request.top_k,
                max_hops=request.max_hops,
                entity_types=request.entity_types,
                query_mode=request.query_mode,
                sparse_weight=request.sparse_weight,
                enable_reranking=request.enable_reranking,
                reranker_type=request.reranker_type,
                enable_reasoning_bank=request.enable_reasoning_bank,
                reasoning_memory_limit=request.reasoning_memory_limit,
                turboquant_enabled=request.turboquant_enabled,
                turboquant_bits=request.turboquant_bits,
                filters=request.filters,
            )

            sources = [
                {
                    "content": chunk["content"][:200],
                    "score": chunk.get("score", 0),
                    "metadata": chunk.get("metadata", {}),
                }
                for chunk in context
            ]
            yield {"event": "sources", "data": json.dumps(sources, default=str)}

            yield {"event": "status", "data": json.dumps({"phase": "generating"})}

            full_answer = []
            async for token in strategy.stream_generate(
                query=request.query,
                context=context,
                model=request.model,
                temperature=request.temperature,
                history=history or None,
            ):
                full_answer.append(token)
                yield {"event": "token", "data": json.dumps({"text": token})}

            answer_text = "".join(full_answer)
            await tracing.save_trace(
                trace,
                chunks_retrieved=len(context),
                answer_length=len(answer_text),
                model=request.model,
            )
            await strategy.record_outcome(
                query=request.query,
                collection=request.collection,
                trace=trace,
                success=bool(context),
                context=context,
                metadata={"query_rewritten": retrieval_query != request.query},
            )

            history.append({"role": "user", "content": request.query})
            history.append({"role": "assistant", "content": answer_text})
            await _save_session(app, user_id, session_id, history)

            yield {
                "event": "done",
                "data": json.dumps(
                    {
                        "trace_id": trace.trace_id,
                        "latency_ms": trace.total_latency_ms,
                        "strategy": canonical_strategy.value,
                        "chunks_retrieved": len(context),
                        "session_id": session_id,
                        "query_rewritten": retrieval_query != request.query,
                    }
                ),
            }
        except Exception as exc:
            logger.error("Stream error: %s", exc, exc_info=True)
            yield {"event": "error", "data": json.dumps({"message": str(exc)})}

    return EventSourceResponse(event_generator())


@router.post("/compare", response_model=CompareResponse)
async def compare_strategies(
    request: CompareRequest,
    req: Request,
    current_user: Optional[dict] = Depends(require_auth_in_production),
):
    """A/B comparison -> run the same query through multiple strategies."""
    app = req.app
    factory = app.state.strategy_factory
    tracing = app.state.tracing_service

    async def run_strategy(strat_enum):
        canonical = factory.canonicalize(strat_enum)
        strategy = factory.get(strat_enum)
        trace = tracing.create_recorder(
            query=request.query,
            strategy=canonical.value,
            collection=request.collection,
        )

        context = await strategy.retrieve(
            query=request.query,
            collection=request.collection,
            trace=trace,
            top_k=request.top_k,
            enable_reasoning_bank=True,
            turboquant_enabled=True,
        )

        answer = await strategy.generate(
            query=request.query,
            context=context,
            trace=trace,
            model=request.model,
            temperature=request.temperature,
        )

        await tracing.save_trace(
            trace,
            chunks_retrieved=len(context),
            answer_length=len(answer),
            model=request.model,
        )
        await strategy.record_outcome(
            query=request.query,
            collection=request.collection,
            trace=trace,
            success=bool(context),
            context=context,
            metadata={"compare_mode": True},
        )

        return CompareResult(
            strategy=canonical,
            answer=answer,
            sources=[
                SourceInfo(
                    content=chunk["content"][:200],
                    score=chunk.get("score", 0),
                    metadata=chunk.get("metadata", {}),
                )
                for chunk in context
            ],
            latency_ms=trace.total_latency_ms,
            trace_id=trace.trace_id,
        )

    canonical_strategies = []
    for strategy_id in request.strategies:
        canonical = factory.canonicalize(strategy_id)
        if canonical not in canonical_strategies:
            canonical_strategies.append(canonical)

    results = await asyncio.gather(
        *[run_strategy(strategy_id) for strategy_id in canonical_strategies],
        return_exceptions=True,
    )

    valid_results = [result for result in results if isinstance(result, CompareResult)]
    return CompareResponse(query=request.query, results=valid_results)
