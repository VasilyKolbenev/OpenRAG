# OpenRAG Deployment Guide

## Single-Node (Development)

Default deployment with Docker Compose. Starts 7 services: API, frontend, PostgreSQL, Redis, Qdrant, Neo4j, Celery worker.

```bash
openrag init       # Create .env with your LLM provider keys
openrag up         # Start all services
```

Or without the CLI:

```bash
cp .env.example .env
# Edit .env: set OPENAI_API_KEY or ANTHROPIC_API_KEY
docker compose up -d
```

Services:
- Frontend: http://localhost:3000
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Production Deployment

Production mode adds Traefik (reverse proxy + TLS), OpenTelemetry Collector, Prometheus, and Grafana.

```bash
openrag up --prod
```

Or:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### SSL/TLS via Traefik

Traefik automatically provisions TLS certificates from Let's Encrypt.

Configure in `.env`:

```bash
DOMAIN=rag.example.com
ACME_EMAIL=admin@example.com
```

Traefik handles:
- Automatic HTTPS redirect
- Certificate renewal
- Security headers (HSTS, CSP, X-Frame-Options)

### Monitoring Stack

Production mode includes:

| Service | Port | Description |
|---------|------|-------------|
| Prometheus | 9090 | Metrics collection |
| Grafana | 3001 | Dashboards (pre-provisioned OpenRAG overview) |
| OTel Collector | 4317 | Trace collection (OTLP gRPC) |

Default Grafana credentials: `admin` / `admin` (change on first login).

The pre-built dashboard (`infra/grafana/dashboards/serpent-overview.json`) includes 8 panels: request rate, latency percentiles, strategy usage, error rate, cache hit ratio, active queries, document processing queue, and embedding throughput.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | * | OpenAI API key (or use Anthropic/Ollama) |
| `ANTHROPIC_API_KEY` | * | Anthropic API key |
| `OLLAMA_BASE_URL` | | Ollama server URL for local models |
| `DATABASE_URL` | | PostgreSQL connection string |
| `REDIS_URL` | | Redis connection string |
| `QDRANT_URL` | | Qdrant server URL |
| `NEO4J_URI` | | Neo4j connection URI (optional) |
| `EMBEDDING_MODEL` | | Embedding model name (default: `all-MiniLM-L6-v2`) |
| `EMBEDDING_DIMENSIONS` | | Embedding dimensions (default: `384`) |
| `SECRET_KEY` | yes | JWT signing key |
| `DOMAIN` | prod | Domain for TLS certificate |
| `ACME_EMAIL` | prod | Email for Let's Encrypt |

*At least one LLM provider key is required.

## Backup Strategy

### PostgreSQL

```bash
# Dump
docker compose exec postgres pg_dump -U openrag openrag > backup.sql

# Restore
docker compose exec -T postgres psql -U openrag openrag < backup.sql
```

Schedule daily backups via cron:

```bash
0 2 * * * cd /path/to/openrag && docker compose exec -T postgres pg_dump -U openrag openrag | gzip > /backups/pg_$(date +\%Y\%m\%d).sql.gz
```

### Qdrant

```bash
# Create snapshot
curl -X POST http://localhost:6333/collections/{name}/snapshots

# List snapshots
curl http://localhost:6333/collections/{name}/snapshots

# Restore: download snapshot and place in Qdrant data directory
```

### Redis

```bash
# Trigger background save
docker compose exec redis redis-cli BGSAVE

# The dump.rdb file is in the Redis data volume
```

Redis data in OpenRAG is cache-only (MemoRAG memory, advisor sessions). Loss of Redis data is non-critical -- caches rebuild automatically.

## Scaling Guidelines

### Vertical Scaling (single node)

- **API workers**: Increase `UVICORN_WORKERS` in `.env` (default: 1, recommended: CPU cores - 1)
- **Celery workers**: Scale with `docker compose up -d --scale worker=N`
- **PostgreSQL**: Tune `shared_buffers`, `work_mem` in `infra/postgres/postgresql.conf`
- **Qdrant**: Allocate more RAM for larger collections

### Horizontal Scaling

For multi-node setups:
- Run API behind a load balancer (Traefik, nginx, or cloud LB)
- PostgreSQL: Use managed service (RDS, Cloud SQL) or streaming replication
- Qdrant: Use distributed mode with sharding
- Redis: Use Redis Cluster or managed service (ElastiCache, Memorystore)
- Neo4j: Use Neo4j Aura or causal clustering

### Resource Recommendations

| Workload | CPU | RAM | Storage |
|----------|-----|-----|---------|
| Development | 4 cores | 8 GB | 20 GB |
| Small (< 10K docs) | 4 cores | 16 GB | 50 GB |
| Medium (10K-100K docs) | 8 cores | 32 GB | 200 GB |
| Large (100K+ docs) | 16+ cores | 64+ GB | 500+ GB |

Embeddings are computed locally (all-MiniLM-L6-v2, ~80 MB model). For faster ingestion on large datasets, consider GPU-accelerated embedding via a dedicated service.
