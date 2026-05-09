"""
AI Advisor Chatbot -> conversational strategy recommendation.
Stateful LLM chat with system prompt checklist.
Session history stored in Redis (1h TTL).
"""

import json
import logging
import uuid
from typing import Optional

import litellm
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.config import settings
from app.dependencies import require_auth_in_production

logger = logging.getLogger("openrag.advisor")

router = APIRouter(tags=["advisor"])

ADVISOR_SYSTEM_PROMPT = """You are an AI strategy advisor for the OpenRAG platform. \
Your role is to help users choose the best retrieval engine and configuration \
for their use case through a conversational interview.

CHECKLIST (gather this information naturally through conversation):
1. Domain: What field/industry? (legal, medical, enterprise, research, support, other)
2. Query complexity: How complex are typical queries? (simple factual, moderate analytical, \
complex multi-step, very complex research)
3. Data structure: What's the data like? (flat text, structured/relational, mixed, code)
4. Priority: What matters most? (speed, accuracy, cost, explainability)
5. Scale: How much data? (small <1K docs, medium 1K-100K, large 100K+)
6. Special requirements: Real-time? Compliance? Multi-language?

AVAILABLE ENGINES:
- **LightRAG**: Default engine for most document collections. Fast dual-level retrieval with ReasoningBank memory and TurboQuant-ready runtime optimization.
- **GraphRAG**: Best for entity-rich, relational, compliance-heavy, or research-heavy corpora where explainability and relationship traversal matter.

RULES:
- Ask 1-2 questions at a time, not all at once
- Be concise but friendly
- After gathering enough info (at least 3-4 checklist items), provide your recommendation
- When ready to recommend, include a JSON block in your response:
```json
{"recommended": "lightrag", "scores": {"lightrag": 0.9, "graph": 0.5}, \
"reasoning": "brief explanation", "settings": {"top_k": 10, "temperature": 0.1}}
```
- Always explain WHY you recommend a specific engine
- If unsure, recommend LightRAG as the safe default"""


class AdvisorChatRequest(BaseModel):
    """Request for advisor chat endpoint."""

    session_id: Optional[str] = None
    message: str = Field(..., min_length=1, max_length=5000)


class AdvisorRecommendation(BaseModel):
    """Extracted recommendation from advisor response."""

    recommended: str
    scores: dict[str, float] = Field(default_factory=dict)
    reasoning: str = ""
    settings: dict = Field(default_factory=dict)


class AdvisorChatResponse(BaseModel):
    """Response from advisor chat endpoint."""

    session_id: str
    reply: str
    recommendation: Optional[AdvisorRecommendation] = None
    is_complete: bool = False


@router.post("/advisor/chat", response_model=AdvisorChatResponse)
async def advisor_chat(
    request: AdvisorChatRequest,
    req: Request,
    current_user: Optional[dict] = Depends(require_auth_in_production),
):
    """Conversational AI advisor for strategy selection."""
    app = req.app
    cache = app.state.cache

    user_id = current_user["sub"] if current_user and current_user.get("sub") else "anonymous"
    session_id = request.session_id or str(uuid.uuid4())
    history = await cache.get_advisor_session(user_id, session_id) or []

    messages = [{"role": "system", "content": ADVISOR_SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": request.message})

    try:
        response = await litellm.acompletion(
            model=settings.advisor_model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        reply = response.choices[0].message.content or ""
    except Exception as exc:
        logger.error("Advisor LLM call failed: %s", exc)
        reply = (
            "I apologize, but I'm having trouble connecting right now. "
            "As a general recommendation, **LightRAG** is the safest default "
            "for most use cases. Could you try again in a moment?"
        )

    history.append({"role": "user", "content": request.message})
    history.append({"role": "assistant", "content": reply})
    await cache.set_advisor_session(user_id, session_id, history, ttl=3600)

    recommendation = _extract_recommendation(reply)

    return AdvisorChatResponse(
        session_id=session_id,
        reply=reply,
        recommendation=recommendation,
        is_complete=recommendation is not None,
    )


def _extract_recommendation(reply: str) -> Optional[AdvisorRecommendation]:
    """Extract JSON recommendation from advisor reply, if present."""
    try:
        start = reply.find('{"recommended"')
        if start < 0:
            code_start = reply.find("```json")
            if code_start >= 0:
                json_start = reply.find("{", code_start)
                json_end = reply.find("```", json_start)
                if json_start >= 0 and json_end > json_start:
                    start = json_start
                    raw = reply[json_start:json_end].strip()
                else:
                    return None
            else:
                return None
        else:
            depth = 0
            end = start
            for i, char in enumerate(reply[start:], start):
                if char == "{":
                    depth += 1
                elif char == "}":
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        break
            raw = reply[start:end]

        data = json.loads(raw)
        if "recommended" in data:
            return AdvisorRecommendation(
                recommended=data["recommended"],
                scores=data.get("scores", {}),
                reasoning=data.get("reasoning", ""),
                settings=data.get("settings", {}),
            )
    except (json.JSONDecodeError, KeyError, ValueError):
        pass
    return None
