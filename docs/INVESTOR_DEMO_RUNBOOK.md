# OpenRAG — Investor Demo Runbook

## Architecture: 5 Primitives

OpenRAG is built on 5 primitives — each card on the dashboard represents a core subsystem:

| Primitive | Purpose | Demo Proof |
|-----------|---------|------------|
| **Intelligence** | RAG strategy catalog + AI auto-recommendation | Advisor page, Chat |
| **Engine** | Embedding, vector store, LLM runtime | Health status, model info |
| **Agents** | Background document processing pipeline | Documents page |
| **Tools & Memory** | MCP integration, CLI, semantic memory | MCP tools, CLI commands |
| **Learning** | Trace-based pipeline analysis & optimization | Debugger page |

## 1. Pre-demo Setup (5 min)

```bash
cd serpent-rag-platform
docker compose up -d

# Wait for healthy
curl http://localhost:8000/api/health

# Verify seed data
docker compose logs api | grep "Seed data loaded"
```

Frontend: **http://localhost:3000** (Docker) or start `cd frontend && npm run dev`

## 2. Demo Flow

### Step 1 — Command Center (Dashboard)

- Open the app → lands on **Command Center**
- Show 5 primitive cards — each with live stats:
  - **Intelligence**: 6 strategies, AI Advisor link
  - **Engine**: MiniLM-L6-v2 embedding, services online
  - **Agents**: documents indexed, collections count
  - **Tools & Memory**: 6 MCP tools, 8 CLI commands
  - **Learning**: Pipeline traces, real-time debugger
- Key message: *"Each primitive is a pluggable subsystem — swap components without rewriting"*

### Step 2 — Intelligence (AI Advisor)

- Click **Advisor** in sidebar → full-page AI Strategy Advisor
- Left panel: conversational AI chat
- Right panel: strategy catalog with 6 strategies
- Try prompt: *"I have legal contracts to analyze"*
- AI recommends a strategy → click **"Use This Strategy →"** → goes to Chat
- Key message: *"AI doesn't just catalog strategies — it analyzes your use case and recommends"*

### Step 3 — Chat (Query)

- Strategy is pre-selected from Advisor recommendation
- Ask: **"What is RAG and how does OpenRAG implement it?"**
- Show: real-time **token streaming**, **source citations**, **trace link**
- Switch strategy via dropdown → ask same question → different approach
- Key message: *"Same question, different strategy — different strengths"*

### Step 4 — Agents (Documents)

- Click **Documents** in sidebar
- Show pre-loaded seed documents (3 markdown files)
- Upload a new file via drag & drop
- Key message: *"Background agents parse, chunk, embed — fully automatic"*

### Step 5 — Learning (Debugger)

- Click **Debugger** in sidebar
- Open trace from last query
- Show pipeline: embedding → retrieval → reranking → generation
- Point out: latency per stage, chunks retrieved, model used
- Key message: *"Every query generates a trace — data for continuous optimization"*

### Step 6 — Compare (A/B Testing)

- Click **Compare** in sidebar
- Enter: **"Compare the RAG strategies"**
- Select **Naive** vs **Hybrid** vs **Agentic**
- Show side-by-side results
- Key message: *"Data-driven strategy selection, not guesswork"*

## 3. Suggested Demo Questions

| Question | Best Strategy | Why |
|----------|--------------|-----|
| "What is RAG?" | Naive / Hybrid | Simple factual, shows speed |
| "Compare strategies" | Hybrid | Multi-source synthesis |
| "Security policies?" | Naive | Direct document lookup |
| "Deploy OpenRAG in production?" | Agentic | Complex multi-step |
| "Monitoring and observability?" | Hybrid | Cross-document |

## 4. Pages to Show

| Page | Route | Primitive |
|------|-------|-----------|
| Command Center | `/dashboard` | All 5 |
| Advisor | `/intelligence` | Intelligence |
| Chat | `/chat` | Intelligence |
| Documents | `/documents` | Agents |
| Debugger | `/debugger` | Learning |
| Compare | `/compare` | Intelligence |

## 5. Investor Talking Points

1. **5-Primitive Architecture** — modular, each subsystem independently replaceable
2. **6 RAG Strategies** — from simple to autonomous multi-step reasoning
3. **AI-Powered Advisor** — auto-recommends strategy based on use case
4. **Full Observability** — pipeline traces for every query
5. **Self-Hosted** — data never leaves customer infrastructure
6. **Multi-Interface** — Web UI + CLI + MCP (Claude Desktop integration)
7. **Learning Loop** — traces become optimization data (roadmap: auto-tuning)

## 6. Known Limitations (do not demo)

- Graph Explorer (requires populated Neo4j)
- Quality Dashboard (requires RAGAS evaluation dataset)
- Analytics (placeholder)
- Web search fallback in CRAG (requires Tavily API key)

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| API returns 500 | `docker compose logs api` |
| No seed documents | `docker compose restart api` |
| Slow first query | Model loading (~3 sec), subsequent fast |
| "Services offline" | Wait for API init, check health endpoint |
