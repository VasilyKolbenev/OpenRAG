# OpenRAG Architecture

## Overview

OpenRAG keeps the existing 5-primitive platform framing, with the active
product surface now centered on three canonical retrieval engines:

- `LightRAG`
- `AgenticRAG`
- `GraphRAG`

Everything else is treated as legacy compatibility or internal scaffolding.

## 5 Primitives

| Primitive | Responsibility | Active components |
|---|---|---|
| Intelligence | Engine selection, advisor, compare, canonical strategy routing | `backend/app/strategies`, `backend/app/api/v1/strategies.py`, advisor flows |
| Engine | Retrieval runtime, embeddings, graph access, reranking, generation | Qdrant, Neo4j, LiteLLM, vector store, graph store |
| Agents | Background ingestion and indexing | document workers, upload pipeline |
| Tools & Memory | Cache, sessions, MCP, CLI, retrieval memory | Redis, ReasoningBank helper, CLI, MCP |
| Learning | Pipeline traces, metrics, comparison feedback loop | tracing, quality dashboard, compare view |

## Canonical Engines

| Engine | Retrieval pattern | Specialization | Runtime notes |
|---|---|---|---|
| `lightrag` | Dense + sparse retrieval with reranking hooks | Default for mixed documents and fast Q&A | Uses ReasoningBank recall and TurboQuant controls |
| `agentic` | Plan → retrieve → reflect → answer with tool selection | Investigative, multi-hop, research-grade workloads | Iterative loop, optional graph tool fallback |
| `graph` | Graph traversal plus supporting vector context | Entity links, lineage, and explainability | Uses ReasoningBank recall and adaptive hop expansion |

## Optimizer Layer

The platform exposes optimizers as cross-engine capabilities rather than
separate strategies.

| Optimizer | Backend location | Current behavior |
|---|---|---|
| ReasoningBank-style memory | `backend/app/services/reasoning_bank.py` | Stores and recalls short lessons from prior attempts |
| TurboQuant controls | query schema + strategy runtime parameters | Lets callers tune a quantization-style runtime profile |

## Query Flow

1. The API receives a request with `strategy` set to `lightrag`, `agentic`, `graph`, or a legacy alias.
2. `StrategyFactory` canonicalizes the request to one of the three engines.
3. The selected engine retrieves context, optionally consulting ReasoningBank memory.
4. The engine generates an answer and records a trace.
5. Outcome metadata is written back so future runs can reuse retrieval lessons.

## Canonicalization Rules

For migration safety, the backend still accepts legacy ids:

- `hybrid`, `naive`, `memo`, `wiki` → `lightrag`
- `corrective` → `graph`
- `agentic` is canonical (no longer aliased)

The UI shows only the three canonical engine names.

## Active Code Layout

```text
backend/
  app/
    api/v1/              # query, compare, advisor, strategies
    schemas/             # request/response models
    services/            # cache, tracing, reasoning_bank
    strategies/          # LightRAG, AgenticRAG, GraphRAG, factory, advisor
    workers/             # ingestion and background tasks
  tests/                 # backend test suite

frontend/
  src/
    components/          # compare, advisor, chat, debugger, layout
    lib/                 # constants, API client
    pages/               # dashboard, intelligence, chat, compare
    stores/              # persisted UI state
    types/               # API and UI models

openrag/                 # legacy package and CLI compatibility surface
docs/                    # product and developer documentation
```

## Product Surface vs Legacy Surface

The repo still contains older strategy implementations and legacy package code,
but the active product surface is defined by:

- `GET /api/strategies`
- `POST /api/query`
- `POST /api/compare`
- the React UI in `frontend/src`

Those surfaces present only `LightRAG`, `AgenticRAG`, and `GraphRAG`.

## Design Decisions

1. **Three-engine product**: separate canonical engines for fast retrieval (LightRAG), autonomous research (AgenticRAG), and relationship reasoning (GraphRAG). The advisor and compare flow are built around this triple.
2. **Backward compatibility**: keep legacy strategy ids valid at the API boundary during migration.
3. **Reasoning memory as optimizer**: store lessons from failed and successful retrieval attempts without adding a new public strategy.
4. **TurboQuant as runtime control**: expose deployment tuning without claiming a separate retrieval method.
5. **Graceful graph fallback**: if Neo4j is unavailable, `GraphRAG` should fail clearly while `LightRAG` and `AgenticRAG` remain available.
