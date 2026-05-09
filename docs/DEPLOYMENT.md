# OpenRAG Deployment Guide

OpenRAG ships as a Docker Compose stack with two compose files:

| File | Use case |
|---|---|
| `docker-compose.yml` | Local development (no TLS, no Traefik, no monitoring) |
| `docker-compose.prod.yml` | Production (Traefik + TLS, Prometheus, Grafana, OTel) |

Both compose files build the API and worker from `backend/Dockerfile` and run
the active backend at `app.main:app`. The legacy `openrag/` package and the
root `Dockerfile` remain only as a compatibility surface and are not used by
the active deployment path.

## Single-Node (Development)

```bash
cp .env.example .env
# set at least one model provider key (OPENAI_API_KEY or ANTHROPIC_API_KEY)
docker compose up -d
```

Services:

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |

## Production Deployment

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The production overlay adds:

- Traefik reverse proxy with Let's Encrypt TLS
- Prometheus + Grafana
- OpenTelemetry collector
- Read-only filesystem and `no-new-privileges` on every container

Configure `.env` for production:

```bash
DOMAIN=rag.example.com
ACME_EMAIL=admin@example.com

# Required secrets — boot fails if any of these are missing in production
JWT_SECRET=<32+ random characters>
ENCRYPTION_KEY=<32+ random characters>
OPENRAG_ADMIN_PASSWORD=<12+ characters, the password used for /api/auth/login>

# Database and infra
POSTGRES_PASSWORD=<strong>
REDIS_PASSWORD=<strong>
NEO4J_PASSWORD=<strong>

# Model provider
OPENAI_API_KEY=...
# or
ANTHROPIC_API_KEY=...
```

The backend refuses to start in `ENVIRONMENT=production` if `JWT_SECRET`,
`ENCRYPTION_KEY`, or `OPENRAG_ADMIN_PASSWORD` are unset or below the minimum
length. This is intentional — it prevents accidental insecure boot.

### Traefik

Traefik strips the `/api` prefix before forwarding traffic to the API
container. Internally the backend serves routes without a prefix
(`/health`, `/strategies`, `/query`, …). External clients always use
`/api/<path>`.

TLS is provisioned automatically through the Let's Encrypt TLS challenge.

### Auth Flow

```bash
# 1) Exchange password for a JWT
curl -X POST https://${DOMAIN}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"'"${OPENRAG_ADMIN_PASSWORD}"'"}'

# 2) Use the JWT for protected endpoints
curl https://${DOMAIN}/api/strategies \
  -H "Authorization: Bearer <jwt>"
```

The token is signed with `JWT_SECRET` and lives for `JWT_EXPIRE_HOURS`
(default 24h). For enterprise rollouts an external IdP can issue JWTs that
use the same `JWT_SECRET`.

### Monitoring Stack

| Service | Port | Purpose |
|---|---|---|
| Prometheus | 9090 | Metrics collection |
| Grafana | 3001 | Dashboards (`infra/grafana/dashboards/openrag-overview.json`) |
| OTel Collector | 4317 | Distributed tracing |

Grafana uses the password from `GRAFANA_PASSWORD` (set in `.env`). Change it
on first login.

## Environment Variables

See `.env.example`. The most relevant variables:

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | one of | OpenAI model provider key |
| `ANTHROPIC_API_KEY` | one of | Anthropic model provider key |
| `OLLAMA_BASE_URL` | optional | Local model endpoint |
| `JWT_SECRET` | prod | Signing key for JWT (>= 32 chars) |
| `ENCRYPTION_KEY` | prod | Field-level encryption key (>= 32 chars) |
| `OPENRAG_ADMIN_PASSWORD` | prod | Admin password for `/api/auth/login` (>= 12 chars) |
| `POSTGRES_PASSWORD` | prod | Database password |
| `REDIS_PASSWORD` | prod | Redis password |
| `NEO4J_PASSWORD` | optional | Required only if `GraphRAG` is used |
| `DOMAIN` | prod | Public hostname for TLS |
| `ACME_EMAIL` | prod | Let's Encrypt account email |
| `EMBEDDING_MODEL` | optional | Defaults to `BAAI/bge-m3` (1024 dims) |
| `EMBEDDING_DIMENSIONS` | optional | Defaults to `1024` |

For development, leave most secrets at their `.env.example` defaults — boot
checks are skipped when `ENVIRONMENT=development`.

## Backup Strategy

### PostgreSQL

```bash
docker compose exec postgres pg_dump -U openrag openrag > backup.sql
docker compose exec -T postgres psql -U openrag openrag < backup.sql
```

Schedule daily backups via cron:

```bash
0 2 * * * cd /opt/openrag && docker compose exec -T postgres pg_dump -U openrag openrag | gzip > /backups/pg_$(date +\%Y\%m\%d).sql.gz
```

### Qdrant

```bash
curl -X POST http://localhost:6333/collections/{name}/snapshots
curl http://localhost:6333/collections/{name}/snapshots
```

### Redis

```bash
docker compose exec redis redis-cli BGSAVE
```

Redis stores ReasoningBank retrieval memory and advisor sessions. Loss of
Redis is non-critical because caches rebuild automatically.

## Scaling Guidelines

### Vertical Scaling

- API workers: increase `UVICORN_WORKERS` in `.env` (default `1`,
  recommended `cpu_cores - 1`)
- Celery workers: scale with `docker compose up -d --scale worker=N`
- PostgreSQL: tune `shared_buffers`, `work_mem`
- Qdrant: allocate more RAM for larger collections

### Horizontal Scaling

- API behind a load balancer (Traefik, nginx, or cloud LB)
- PostgreSQL: managed service or streaming replication
- Qdrant: distributed mode with sharding
- Redis: Redis Cluster or managed service
- Neo4j: Neo4j Aura or causal cluster

### Resource Recommendations

| Workload | CPU | RAM | Storage |
|---|---|---|---|
| Development | 4 cores | 8 GB | 20 GB |
| Small (< 10K docs) | 4 cores | 16 GB | 50 GB |
| Medium (10K-100K docs) | 8 cores | 32 GB | 200 GB |
| Large (100K+ docs) | 16+ cores | 64+ GB | 500+ GB |

Embeddings run locally (BGE-M3 by default, ~2 GB model). For faster ingestion
on large corpora, consider GPU-accelerated embedding via a dedicated service.
