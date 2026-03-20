# OpenRAG — Investor Demo Runbook

## 1. Pre-demo Setup (5 min)

```bash
# Start the full stack
cd serpent-rag-platform
docker compose up -d

# Wait for healthy
curl http://localhost:8000/api/health
# Expected: {"status": "healthy", "services": {...}}

# Verify seed data loaded
docker compose logs api | grep "Seed data loaded"
```

If seed didn't auto-run:
```bash
docker compose restart api
```

Start the frontend dev server (if not using Docker frontend):
```bash
cd frontend && npm run dev
```

## 2. Demo Flow

### Step 1 — Dashboard (entry point)

- Open **http://localhost:3000** (Docker) or **http://localhost:5173** (dev server)
- You land on the **Dashboard** page
- Point out:
  - **Documents Indexed** — number of documents in the system
  - **Collections** — how many knowledge bases exist
  - **System Status** — real-time health of all services
  - **Strategies Available** — 6 RAG strategies built-in
- Show **Quick Actions**: Upload Documents, Ask Your Documents, Compare Strategies

### Step 2 — Documents

- Click **Documents** in the sidebar (or "Upload Documents" button)
- Show 3 pre-loaded demo documents from seed:
  - `openrag-docs.md` — Platform documentation
  - `rag-overview.md` — RAG technology overview
  - `sample-policy.md` — Sample enterprise policy
- Key message: "Documents are automatically parsed, chunked, and embedded on upload"

### Step 3 — Chat (main feature)

- Click **Chat** in the sidebar (or "Ask Your Documents" on Dashboard)
- Select **Hybrid RAG** strategy from the dropdown
- Ask: **"What is RAG and how does OpenRAG implement it?"**
- Point out:
  - Real-time **token streaming** (SSE)
  - **Source citations** with relevance scores
  - **Strategy indicator** showing which RAG approach was used
- Try another strategy: switch to **Agentic RAG** and ask: **"How do I deploy OpenRAG in production?"**

### Step 4 — Debugger (RAG pipeline trace)

- Click **Debugger** in the sidebar
- Open the trace from your last query
- Show the **pipeline visualization**: embedding → retrieval → reranking → generation
- Point out: latency per stage, retrieved chunks, model used
- Key message: "Full observability of every RAG step — debug and optimize your pipeline"

### Step 5 — Compare (A/B testing)

- Click **Compare** in the sidebar
- Enter: **"Compare the different RAG strategies available"**
- Select **Naive** vs **Hybrid** vs **Agentic**
- Show side-by-side results: different answers, latency, source counts
- Key message: "Compare strategies on real data before choosing — no guesswork"

### Step 6 — Strategy Selection from Dashboard (optional)

- Go back to **Dashboard**
- Click on any strategy card (e.g., "MemoRAG")
- It navigates to Chat with that strategy pre-selected
- Key message: "One-click strategy switching for different use cases"

### Step 7 — CLI & MCP (for technical audience, optional)

```bash
# CLI query
openrag query "What is RAG?" -s hybrid

# Show available strategies
openrag strategies

# Check system health
openrag status
```

Key message: "Full CLI + MCP integration — use OpenRAG from terminal or Claude Desktop"

## 3. Suggested Demo Questions

| Question | Best Strategy | Why |
|----------|--------------|-----|
| "What is RAG and how does it work?" | Naive / Hybrid | Simple factual, shows speed |
| "Compare the different RAG strategies" | Hybrid | Multi-source synthesis |
| "What are the security policies?" | Naive | Direct document lookup |
| "How do I deploy OpenRAG in production?" | Agentic | Complex multi-step answer |
| "What monitoring and observability is available?" | Hybrid | Cross-document synthesis |

## 4. Pages to Show

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Dashboard | `/dashboard` | Ready | Entry point, stats, quick actions |
| Chat | `/chat` | Ready | Streaming, strategy selection |
| Documents | `/documents` | Ready | Seed docs visible, upload works |
| Debugger | `/debugger` | Ready | Pipeline trace viewer |
| Compare | `/compare` | Ready | A/B strategy comparison |

## 5. Pages NOT in Demo (hidden)

These pages are hidden from navigation and should not be accessed:

- Graph Explorer (requires populated Neo4j)
- Quality Dashboard (requires RAGAS evaluation dataset)
- Analytics (placeholder data)
- Feedback (not connected to DB)

## 6. Talking Points

- **Self-hosted** — your data never leaves your infrastructure
- **6 strategies** — from simple vector search to autonomous multi-step reasoning
- **Full observability** — trace every step of the RAG pipeline
- **A/B testing** — compare strategies before deploying to production
- **Extensible** — add new strategies by composing 5 primitives
- **Integration** — CLI, MCP (Claude Desktop), REST API

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| API returns 500 | `docker compose logs api` |
| No seed documents | `docker compose restart api` |
| Embedding slow on first query | First query loads model (~3 sec), subsequent are fast |
| Frontend shows "Services offline" | Wait for API to initialize, check health endpoint |
| Port 3000 occupied | Use `npm run dev` for local dev server (port 5173) |
