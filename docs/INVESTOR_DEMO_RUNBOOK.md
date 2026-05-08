# OpenRAG Investor Demo Runbook

## Core Story

OpenRAG is a self-hosted document intelligence platform with a deliberately
focused product surface:

- `LightRAG` — fast dual-level retrieval for mixed corpora
- `AgenticRAG` — autonomous multi-step research with planning and reflection
- `GraphRAG` — relationship-heavy, explainable reasoning over a knowledge graph
- ReasoningBank-style memory and TurboQuant controls as platform optimizers

## Demo Flow

### 1. Dashboard

Open the Command Center and position OpenRAG as a focused three-engine
platform, not an experiment catalog.

Key talking points:

- AI-guided engine selection
- self-hosted deployment
- traces for every query
- one runtime, three clear retrieval modes

### 2. Intelligence

Open the advisor page.

Show:

- conversational advisor on the left
- three-engine catalog on the right

Suggested prompt:

> "I have legal contracts with linked entities, obligations, and renewal chains."

Expected outcome:

- advisor recommends `GraphRAG`
- explain that `LightRAG` is the default for generic search and `AgenticRAG` is
  the choice when one question hides several sub-questions

### 3. Chat

Run the same question first with `LightRAG`, then with `AgenticRAG`, then with
`GraphRAG`.

Suggested question:

> "What are the obligations connected to the renewal clause and who owns them?"

Key talking point:

- same corpus, different engine specialization

### 4. Documents

Show upload and indexing.

Key talking point:

- the platform ingests documents once, then all three engines reuse the same corpus

### 5. Compare

Open the compare page and run all three engines side by side.

Suggested question:

> "Summarize the main obligations and linked entities."

Key talking points:

- product buyers can compare speed vs research depth vs relationship traversal directly
- compare accepts two or three engines per request

### 6. Debugger

Open the trace from one of the queries.

Highlight:

- retrieval path
- sources used
- latency
- engine-specific behavior (planning steps for AgenticRAG, hop expansion for GraphRAG)

## Suggested Demo Questions

| Question | Best engine | Why |
|---|---|---|
| "What are the key findings?" | LightRAG | fast default document synthesis |
| "Walk through every counterparty obligation step by step" | AgenticRAG | multi-step planning and reflection |
| "Which entities are linked to this clause?" | GraphRAG | entity and relation traversal |
| "Summarize the renewal policy." | LightRAG | broad document summary |
| "Trace obligations across counterparties and check for conflicts." | AgenticRAG / GraphRAG | research depth or graph reasoning |

## Investor Talking Points

1. Three-engine product instead of a confusing strategy catalog.
2. LightRAG covers the default enterprise search use case.
3. AgenticRAG covers autonomous research and audit-style workflows.
4. GraphRAG covers explainability and relationship-heavy workloads.
5. ReasoningBank-style memory improves repeat-query behavior across engines.
6. TurboQuant controls give a deployment-level latency and cost story.
7. The whole platform is self-hosted and traceable.

## Do Not Overclaim

- TurboQuant is currently exposed as runtime control, not a custom low-level kernel story.
- ReasoningBank is implemented as retrieval memory inside the platform, not a separate agent framework.
- Neo4j is optional, so GraphRAG depends on that service being available.
- AgenticRAG is bounded by an iteration cap and an LLM-routed tool selector; it is not a fully autonomous agent framework.
