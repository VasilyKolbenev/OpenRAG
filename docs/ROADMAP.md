# OpenRAG Commercial Roadmap

## Positioning

OpenRAG is sold as a focused document intelligence product with three engines
and two optimizer stories:

- `LightRAG` — fast default for enterprise workloads
- `AgenticRAG` — autonomous multi-step research and investigation
- `GraphRAG` — explainability and relationship reasoning
- ReasoningBank-style memory across all three
- TurboQuant runtime controls

## Phase 1: Product Focus

- [x] collapse the public strategy surface to three canonical engines
- [x] normalize API and UI around `lightrag`, `agentic`, and `graph`
- [x] keep legacy aliases only for migration compatibility
- [x] update key documentation and positioning

## Phase 2: Market Packaging

- [ ] landing page centered on the three-engine offer
- [ ] pricing page that sells `LightRAG`, `AgenticRAG`, and `GraphRAG` as workload tiers
- [ ] comparison page against generic RAG frameworks
- [ ] demo narrative around "fast default" vs "autonomous research" vs "explainable graph"
- [ ] Russian and English product messaging

## Phase 3: Demo and Sales Enablement

- [ ] hosted demo with seeded corpora
- [ ] read-only compare flow across the three engines
- [ ] investor and buyer decks with trace screenshots
- [ ] vertical demos for legal, research, and support

## Phase 4: Enterprise Packaging

- [ ] self-hosted license bundle
- [ ] SSO and enterprise auth options
- [ ] audit logging and compliance reporting
- [ ] air-gapped deployment package
- [ ] onboarding runbooks for enterprise pilots

## Pricing Direction

| Tier | Buyer | Positioning |
|---|---|---|
| Community | developers and evaluation teams | self-hosted core product |
| Pro | SMB and pilot teams | LightRAG-first commercial usage |
| Business | operations and knowledge teams | LightRAG + AgenticRAG + GraphRAG with support |
| Enterprise | regulated and large orgs | self-hosted, SSO, SLA, compliance |

## Metrics to Track

- time to first indexed document
- time to first successful query
- engine usage split across `lightrag`, `agentic`, and `graph`
- compare-to-conversion rate
- trace-driven quality improvements
- pilot-to-paid conversion
