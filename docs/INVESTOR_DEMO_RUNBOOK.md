# OpenRAG — Investor Demo Runbook

## 1. Pre-demo Setup (5 min)

```bash
# Start the full stack
cd serpent-rag-platform
docker compose up -d

# Wait for healthy
curl http://localhost:8000/api/health
# Expected: {"status": "healthy", "services": {...}}

# Verify seed data loaded (check API logs)
docker compose logs api | grep "Seed data loaded"
```

If seed didn't auto-run, restart the API container:
```bash
docker compose restart api
```

## 2. Demo Flow (core happy path)

### Step 1 — Open the UI
- Navigate to **http://localhost:3000**
- Show the **Strategies** page: 6 RAG strategies with descriptions, tags, complexity scores

### Step 2 — Show Documents
- Click **Documents** tab
- Point out 3 pre-loaded demo documents (from seed):
  - `openrag-docs.md` — Platform documentation
  - `rag-overview.md` — RAG technology overview
  - `sample-policy.md` — Sample enterprise policy

### Step 3 — Ask a Question (Chat)
- Click **Chat** tab
- Select **Hybrid RAG** strategy
- Ask: **"What is RAG and how does OpenRAG implement it?"**
- Wait for streaming answer
- Point out: real-time token streaming, source citations

### Step 4 — Inspect the Trace (Debugger)
- After answer arrives, click the trace link / navigate to **Debugger**
- Show pipeline trace: embedding → retrieval → reranking → generation
- Explain: full observability of every RAG step, latency per stage

### Step 5 — Compare Strategies
- Click **Compare** tab
- Enter same question
- Select **Naive** vs **Hybrid** vs **Agentic**
- Show side-by-side: different answers, latency, source counts
- Key message: "compare strategies on real data before choosing"

### Step 6 — CLI & MCP (optional, for technical audience)
```bash
# CLI query
openrag query "What is RAG?" -s hybrid

# Show available strategies
openrag strategies

# Check system health
openrag status
```

## 3. Suggested Demo Questions

| Question | Best Strategy | Why |
|----------|--------------|-----|
| "What is RAG and how does it work?" | Naive/Hybrid | Simple factual, shows speed |
| "Compare the different RAG strategies available" | Hybrid | Multi-source synthesis |
| "What are the security policies?" | Naive | Direct document lookup |
| "How do I deploy OpenRAG in production?" | Agentic | Complex multi-step answer |
| "What monitoring and observability is available?" | Hybrid | Cross-document synthesis |

## 4. Pages to Show

| Page | Status | Notes |
|------|--------|-------|
| Strategies | Ready | 6 strategies with full metadata |
| Chat | Ready | Streaming, strategy selection |
| Documents | Ready | Seed docs visible |
| Debugger | Ready | Pipeline trace viewer |
| Compare | Ready | A/B strategy comparison |

## 5. Known Limitations (do not demo)

- Graph Explorer, Quality Dashboard, Analytics pages are hidden (placeholder data)
- Neo4j graph features require Neo4j to be running and populated
- RAGAS quality metrics require evaluation dataset
- Web search fallback in Corrective RAG requires Tavily API key

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| API returns 500 | Check `docker compose logs api` for details |
| No seed documents | Restart API: `docker compose restart api` |
| Embedding slow on first query | First query loads the model (~3 sec), subsequent are fast |
| Frontend shows "offline" | Check API health, wait for services to initialize |
