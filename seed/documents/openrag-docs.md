# OpenRAG Platform Documentation

OpenRAG is an open-source, self-hosted RAG platform built on a 5-primitive architecture inspired by OpenJarvis.

## Architecture Primitives

| Primitive | Purpose | Components |
|-----------|---------|------------|
| Intelligence | RAG strategies | Naive, Hybrid, Graph, Agentic, MemoRAG, CRAG |
| Engine | Inference backends | LLM (LiteLLM), Embedding, Reranker |
| Agents | Orchestration | Strategy dispatcher, AI advisor, quality evaluator |
| Tools | Data & memory | MCP server, Qdrant, Neo4j, Redis, document processor |
| Learning | Evaluation | RAGAS metrics, user feedback, query analytics |

## Key Features

- **6 RAG Strategies**: Choose the best approach for your use case
- **Pipeline Tracing**: Debug every step of the RAG pipeline
- **A/B Compare**: Run queries through multiple strategies simultaneously
- **Graph Explorer**: Visualize entity relationships in your documents
- **MCP Server**: Integrate with Claude, Cursor, and other AI tools
- **CLI**: Manage your instance from the command line

## Quick Start

```bash
pip install openrag
openrag init
openrag query "What is RAG?"
```
