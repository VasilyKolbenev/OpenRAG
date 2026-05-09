# OpenRAG — инструкция по развертыванию для заказчика

Документ описывает полный цикл подъёма OpenRAG в инфраструктуре заказчика:
от подготовки сервера до проверки работоспособности и базового обслуживания.

> **Срок ознакомительного периода:** 30 дней с момента подписания акта установки.
> По истечении периода связаться с поставщиком для оплаты и активации
> постоянной лицензии.

---

## 1. Что устанавливается

OpenRAG — self-hosted платформа интеллектуального поиска по документам.
В состав поставки входит:

- **3 движка извлечения:** LightRAG, AgenticRAG, GraphRAG
- **AI-советник** — рекомендует оптимальный движок под задачу
- **Compare-режим** — сравнение качества движков на одном запросе
- **Pipeline Debugger** — пошаговый трейс каждого ответа
- **REST API + Web UI + CLI + MCP**
- **Оптимизаторы:** ReasoningBank (накопительная память), TurboQuant (квантизация рантайма)

Все данные остаются в контуре заказчика. Внешние сервисы используются только
если оператор явно указал ключи провайдеров LLM (OpenAI, Anthropic) или может
быть полностью оффлайн при использовании локальных моделей через Ollama / vLLM.

---

## 2. Требования к окружению

### 2.1. Минимальные характеристики сервера

| Профиль | CPU | RAM | Диск |
|---|---|---|---|
| Pilot (до 10 000 документов) | 4 ядра | 16 GB | 50 GB SSD |
| Production (до 100 000 документов) | 8 ядер | 32 GB | 200 GB SSD |
| High-load (100 000+ документов) | 16+ ядер | 64+ GB | 500+ GB SSD |

### 2.2. ОС и системное ПО

- Ubuntu 22.04 LTS / Ubuntu 24.04 LTS / Debian 12 / RHEL 9 / AlmaLinux 9
- Docker Engine 24.0+ с плагином Compose v2
- (опционально) Nginx или другой reverse-proxy перед Traefik
- Открытые порты:
  - **80, 443** — HTTPS-доступ к UI и API
  - **22** — SSH для администрирования
  - Все остальные порты остаются на loopback

### 2.3. Сетевой доступ

| Назначение | Куда | Обязательно |
|---|---|---|
| LLM-провайдер (OpenAI / Anthropic) | `api.openai.com`, `api.anthropic.com` | если используются облачные модели |
| Hugging Face | `huggingface.co` | при первой загрузке embedding-модели |
| Let's Encrypt | `acme-v02.api.letsencrypt.org` | при включённом TLS |

Для **air-gapped** установок:
1. Соберите образ `backend/Dockerfile` на машине с интернетом, экспортируйте через `docker save`
2. Передайте на целевой сервер и `docker load`
3. Подключите локальный Ollama/vLLM-инстанс через `OLLAMA_BASE_URL`
4. Разрешите `EMBEDDING_PROVIDER=local` и предзагрузите модель в volume `model-cache`

---

## 3. Подготовка сервера

### 3.1. Установка Docker

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
# Перелогиниться чтобы группа применилась.
docker --version && docker compose version
```

### 3.2. Создание системного пользователя и каталога

```bash
sudo useradd --system --create-home --home-dir /opt/openrag --shell /bin/bash openrag
sudo mkdir -p /opt/openrag
sudo chown openrag:openrag /opt/openrag
```

### 3.3. Системные лимиты

Откройте `/etc/security/limits.conf` и добавьте:

```
openrag soft nofile 65536
openrag hard nofile 65536
```

Для Qdrant полезно увеличить `vm.max_map_count`:

```bash
echo 'vm.max_map_count=262144' | sudo tee /etc/sysctl.d/openrag.conf
sudo sysctl --system
```

---

## 4. Установка платформы

### 4.1. Получение релизного артефакта

Заказчик получает архив `openrag-v1.0.0.tar.gz` от поставщика
(либо клонирует репозиторий по предоставленным учётным данным).

```bash
sudo -u openrag bash
cd /opt/openrag
tar xzf openrag-v1.0.0.tar.gz --strip-components=1
# либо: git clone <repo-url> .
```

В каталоге должно появиться:

```
backend/         # активный backend (FastAPI)
frontend/        # Web UI (React + Vite)
infra/           # Prometheus / Grafana / OTel конфиги
seed/            # демо-документы
docs/            # документация
docker-compose.yml         # development стек
docker-compose.prod.yml    # production overlay (Traefik + TLS + monitoring)
.env.example
scripts/demo-smoke.sh      # smoke-тест после установки
```

### 4.2. Конфигурация `.env`

```bash
cp .env.example .env
chmod 600 .env
$EDITOR .env
```

Заполнить **обязательные** для production:

| Переменная | Назначение |
|---|---|
| `OPENAI_API_KEY` или `ANTHROPIC_API_KEY` | хотя бы один LLM-провайдер |
| `JWT_SECRET` | 32+ случайных символа (`openssl rand -hex 32`) |
| `ENCRYPTION_KEY` | 32+ случайных символа (`openssl rand -hex 32`) |
| `OPENRAG_ADMIN_PASSWORD` | 12+ символов; админ-пароль для входа |
| `POSTGRES_PASSWORD` | сильный пароль БД |
| `REDIS_PASSWORD` | сильный пароль Redis |
| `NEO4J_PASSWORD` | пароль Neo4j (только если используется GraphRAG) |
| `DOMAIN` | публичное FQDN, на который указывает A/AAAA запись |
| `ACME_EMAIL` | email для Let's Encrypt |
| `ENVIRONMENT` | значение `production` |

Сгенерировать сильные секреты одной командой:

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "OPENRAG_ADMIN_PASSWORD=$(openssl rand -base64 18)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-32)"
echo "REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-32)"
echo "NEO4J_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-32)"
```

> При `ENVIRONMENT=production` API **не запустится**, если хотя бы один из
> `JWT_SECRET / ENCRYPTION_KEY / OPENRAG_ADMIN_PASSWORD` не задан или короче
> требуемой длины. Это намеренная защита.

### 4.3. DNS и TLS (production)

Создайте A/AAAA запись на сервер:

```
rag.example.com.   A   203.0.113.10
```

Traefik автоматически выпустит сертификат Let's Encrypt при первом запуске.
Если сервер за корпоративным NAT, заранее обеспечьте проброс 80/443.

### 4.4. Запуск стека

**Production (рекомендуется заказчику):**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Development / для первичной проверки:**

```bash
docker compose up -d
```

Первый запуск занимает 5–10 минут: Docker скачивает образы и embedding-модель
(~2 GB). После завершения сервисы должны стать `healthy`:

```bash
docker compose ps
```

### 4.5. Применение миграций

Миграции выполняются автоматически в `entrypoint.sh` при старте `api`.
Если нужно применить вручную:

```bash
docker compose exec api alembic upgrade head
```

### 4.6. Проверка работоспособности

```bash
# Внутренняя проверка
curl -fsS http://localhost:8000/health | jq

# С внешнего домена (production)
curl -fsS https://rag.example.com/api/health | jq

# Список движков
curl -fsS https://rag.example.com/api/strategies | jq '.strategies[] | {id, available}'
```

Полный smoke-тест:

```bash
API_URL=https://rag.example.com OPENRAG_ADMIN_PASSWORD="<пароль из .env>" \
    bash scripts/demo-smoke.sh
```

Ожидаемый результат — все шаги `[OK]`.

---

## 5. Получение JWT токена и базовое использование

### 5.1. Авторизация

```bash
TOKEN=$(curl -fsS -X POST https://rag.example.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"$OPENRAG_ADMIN_PASSWORD\"}" \
  | jq -r .access_token)

echo $TOKEN
```

Используйте токен в заголовке `Authorization: Bearer ${TOKEN}` для всех
защищённых эндпоинтов.

### 5.2. Загрузка документа

```bash
curl -X POST https://rag.example.com/api/documents/upload \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@/path/to/document.pdf" \
  -F "collection=default"
```

### 5.3. Запрос к движку

```bash
curl -X POST https://rag.example.com/api/query \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the renewal clause in our master agreement?",
    "strategy": "lightrag",
    "top_k": 10
  }' | jq
```

### 5.4. Сравнение движков

```bash
curl -X POST https://rag.example.com/api/compare \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Walk through every counterparty obligation",
    "strategies": ["lightrag", "agentic", "graph"]
  }' | jq
```

---

## 6. Бэкапы и восстановление

### 6.1. PostgreSQL

```bash
# Дамп
docker compose exec -T postgres \
    pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > /backups/pg_$(date +%Y%m%d).sql.gz

# Восстановление
gunzip -c /backups/pg_20260101.sql.gz | \
    docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB
```

Cron daily backup:

```bash
0 2 * * * cd /opt/openrag && docker compose exec -T postgres pg_dump -U openrag openrag | gzip > /backups/pg_$(date +\%Y\%m\%d).sql.gz
```

### 6.2. Qdrant (векторное хранилище)

```bash
# Снимок коллекции
curl -X POST http://localhost:6333/collections/default/snapshots

# Список снимков
curl http://localhost:6333/collections/default/snapshots
```

Снимки лежат в volume `qdrant-data` (`/qdrant/storage/snapshots/`).

### 6.3. Redis (опционально)

Redis хранит ReasoningBank-память и метаданные документов. Потеря Redis
**не приводит к потере документов** (chunks остаются в Qdrant) — но
восстановление займёт время на переиндексирование.

```bash
docker compose exec redis redis-cli -a $REDIS_PASSWORD BGSAVE
```

### 6.4. Объёмные данные пользователя

Загруженные файлы лежат в volume `upload-data` (`/app/uploads/`).
Скопируйте volume через `docker run --rm -v upload-data:/data -v $(pwd):/backup busybox tar czf /backup/uploads.tgz /data`.

---

## 7. Обновление платформы

```bash
cd /opt/openrag
git pull origin main          # либо распакуйте новый tarball
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose exec api alembic upgrade head
```

Ветка `main` всегда содержит последний стабильный релиз. Для production
рекомендуется фиксироваться на конкретном теге (`v1.0.0`, `v1.0.1`, …).

---

## 8. Мониторинг и наблюдаемость

При запуске с `docker-compose.prod.yml`:

| Сервис | URL | Доступ |
|---|---|---|
| Grafana | `https://${DOMAIN}/grafana` | admin / `${GRAFANA_PASSWORD}` |
| Prometheus | внутренняя сеть | `http://prometheus:9090` |
| OpenTelemetry | внутренняя сеть | `http://otel-collector:4317` |

В Grafana предзагружен дашборд `OpenRAG Overview` с панелями:
request rate, latency p50/p95/p99, error rate, strategy usage, cache hit ratio,
document processing queue, embedding throughput.

Логи приложения:

```bash
docker compose logs -f api
docker compose logs -f worker
```

Логи структурированные (JSON), интегрированы с OpenTelemetry — могут
направляться в любой OTLP-совместимый коллектор (Jaeger, Tempo, Datadog).

---

## 9. Типовые проблемы

### 9.1. API не стартует, в логах "JWT_SECRET must be set"

Не заполнены обязательные секреты при `ENVIRONMENT=production`. Проверьте
`.env` — должны быть `JWT_SECRET`, `ENCRYPTION_KEY`, `OPENRAG_ADMIN_PASSWORD`
длиной 32 / 32 / 12 символов соответственно.

### 9.2. GraphRAG помечен как unavailable в UI

GraphRAG требует Neo4j. Если контейнер `neo4j` не запущен или нездоров,
движок намеренно деградирует: LightRAG и AgenticRAG продолжают работать.

```bash
docker compose ps neo4j
docker compose logs neo4j | tail -50
docker compose restart neo4j
```

### 9.3. Загруженный документ не появляется в списке

Документ обрабатывается асинхронно (parse → chunk → embed → index). Статус
виден через `GET /api/documents/{id}` — поле `status` проходит этапы
`processing → indexed`. Если завис на `processing`, посмотрите логи воркера:

```bash
docker compose logs worker | tail -100
```

### 9.4. Let's Encrypt не выпускает сертификат

Проверьте:
- DNS A-запись указывает на сервер (`dig +short rag.example.com`)
- Порты 80/443 открыты снаружи
- В логах `traefik`: `docker compose logs traefik | grep -i acme`

При отладке используйте staging-сервер Let's Encrypt — добавьте флаг
`--certificatesresolvers.openrag.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory`
во временный override.

### 9.5. Большие документы загружаются медленно

Воркер ингеста — CPU-bound (parsing + embedding). Масштабируйте:

```bash
docker compose up -d --scale worker=4
```

При наличии GPU подключите внешний embedding-сервис и переключите
`EMBEDDING_PROVIDER=openai` (вынесет нагрузку наружу) или используйте
Ollama-инстанс с GPU.

---

## 10. Деинсталляция

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
sudo rm -rf /opt/openrag
sudo userdel openrag
```

`-v` удаляет volumes — **все данные пропадут**. Перед деинсталляцией снимите
бэкапы (см. раздел 6).

---

## 11. Acceptance checklist для приёмки

Заказчик подписывает акт установки после прохождения чек-листа:

- [ ] `docker compose ps` — все сервисы `healthy`
- [ ] `curl https://${DOMAIN}/api/health` → `"status":"healthy"`
- [ ] `GET /api/strategies` возвращает 3 канонических движка
- [ ] `POST /api/auth/login` с `OPENRAG_ADMIN_PASSWORD` возвращает JWT
- [ ] UI открывается на `https://${DOMAIN}` и проходит по всем 5 разделам
  (Dashboard, Intelligence, Chat, Documents, Compare, Debugger)
- [ ] Загрузка PDF и индексирование завершаются успешно
- [ ] Запрос через `lightrag` возвращает ответ с цитатами
- [ ] Compare на 2 движках работает
- [ ] Grafana доступна и показывает реальные метрики
- [ ] `scripts/demo-smoke.sh` отрабатывает все шаги без ошибок
- [ ] Бэкап PostgreSQL восстанавливается из снапшота

---

## 12. Контакты поставщика

| Поставщик | OpenRAG Platform |
|---|---|
| Канал поддержки | (заполнить при поставке) |
| SLA на ответ | 24 рабочих часа в течение пробного периода |
| Каналы экстренной поддержки | (заполнить) |
| Адрес для оплаты лицензии | (заполнить) |

После окончания 30-дневного пробного периода выберите тариф:

- **Pro** — для отдельных команд, до 10 000 запросов/мес
- **Business** — для всей организации, поддержка 8×5
- **Enterprise** — выделенный SLA, on-premise лицензия, поддержка 24×7

Подробности — у поставщика.
