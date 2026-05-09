# Продовая готовность: backlog на 2026-04-24

## Текущий статус: investor demo ready, customer pilot in progress

Active product surface переименован в OpenRAG, расширен до трёх канонических
движков (LightRAG, AgenticRAG, GraphRAG) и сведён к одному runtime-пути
(`backend/Dockerfile` → `app.main:app`).

P0 блокеры закрыты:

- унифицирован prod runtime (P0.1)
- routing и healthcheck больше не конфликтуют (P0.2)
- `POST /api/auth/login` выдаёт JWT по `OPENRAG_ADMIN_PASSWORD` (P0.3)
- `JWT_SECRET`, `ENCRYPTION_KEY`, `OPENRAG_ADMIN_PASSWORD` валидируются на
  старте production-инстанса (P0.4)

P1 задачи в работе ниже. Полный customer prod release требует завершить P1.

---

## Что уже выглядит хорошо

- Активная продуктовая поверхность уже сведена к двум движкам:
  `LightRAG` и `GraphRAG`.
- Целевые backend-тесты по активному surface ранее прошли:
  `27 passed`.
- Production build фронтенда ранее прошёл успешно.
- В active backend есть проверка сильного `JWT_SECRET` в production:
  `backend/app/config.py:19-24`.
- Во frontend nginx уже выставлены базовые security headers:
  `frontend/nginx.conf:9-15`.

Это хороший фундамент, но до customer prod ещё нужен отдельный проход по
runtime, auth, секретам и release hygiene.

---

## Источник истины для дальнейшей доработки

Для Claude Code лучше считать **источником истины** только эти поверхности:

- `backend/app`
- `backend/tests`
- `frontend/src`
- `backend/Dockerfile`

С осторожностью:

- `openrag/*` — legacy compatibility surface, там много старого поведения
- `Dockerfile` в корне — сейчас указывает на legacy runtime
- `docs/superpowers/*` — исторические планы/спеки, не источник истины для
  текущего продукта

---

## P0 — блокеры go-live

### 1. Prod compose деплоит legacy backend вместо активного backend/app

Симптомы:

- `docker-compose.prod.yml:108` собирает `api` из корневого `Dockerfile`
- `docker-compose.prod.yml:164` собирает `worker` тоже из корневого `Dockerfile`
- `docker-compose.prod.yml:168` запускает legacy worker:
  `celery -A openrag.workers.celery_app:celery_app ...`
- `Dockerfile:64` стартует `uvicorn openrag.server:app`
- `backend/Dockerfile:64` стартует `uvicorn app.main:app`

Почему это критично:

- в прод попадёт **не тот backend**, который сейчас считается основным
- активный refactor и его тесты относятся к `backend/app`, а не к `openrag`
- customer будет тестировать один продукт, а деплоить другой

Что надо сделать:

- либо переключить prod-compose на `backend/Dockerfile`
- либо свести runtime к одному Dockerfile и одному entrypoint
- отдельно решить, нужен ли вообще legacy worker в новой продуктовой модели

### 2. В продовом роутинге есть риск фактической поломки API и healthcheck

Симптомы:

- Traefik в prod режет префикс `/api`:
  `docker-compose.prod.yml:132`
- legacy backend монтирует роутер под `/api`:
  `openrag/server.py:176`
- healthcheck продового `api` контейнера стучится в `/health`:
  `docker-compose.prod.yml:150`
- health endpoint в legacy router объявлен как `/health`:
  `openrag/api/v1/health.py:14`

Почему это критично:

- если в контейнере реально поднимается `openrag.server:app`, то API surface
  и проверки здоровья могут расходиться по путям
- это уже не просто архитектурный дрейф, а потенциальная причина 404/unhealthy
  в реальном проде

Что надо сделать:

- после унификации runtime перепроверить реальный внешний и внутренний маршрут:
  `/api/health`, `/api/strategies`, `/api/query`
- убрать лишний strip-prefix или лишний internal prefix
- убедиться, что healthcheck контейнера и внешний reverse proxy проверяют
  один и тот же живой endpoint

### 3. В production-auth есть защита, но нет внятного способа выдать токен

Симптомы:

- production auth enforced через
  `backend/app/dependencies.py:73-82`
- защищённые endpoint'ы уже используют это:
  `backend/app/api/v1/query.py:66`
  `backend/app/api/v1/query.py:238`
  `backend/app/api/v1/query.py:351`
  `backend/app/api/v1/advisor.py:82`
  `backend/app/api/v1/traces.py:19`
- helper для выпуска JWT есть только как внутренний метод:
  `backend/app/dependencies.py:18`
- в active router нет auth/login endpoint:
  `backend/app/api/router.py`

Почему это критично:

- заказчик не получает понятную схему авторизации для prod
- сейчас backend в prod может требовать bearer token, но сам не даёт механизм
  получения этого токена

Что надо сделать:

- выбрать один из двух вариантов:
  1. встроенный auth endpoint / service account flow
  2. внешний IdP / gateway, который выдаёт JWT совместимого формата
- после этого обновить docs и интеграционный контракт

### 4. Секреты и шифрование для prod ещё не доведены

Симптомы:

- prod-compose напрямую пробрасывает секреты из env:
  `docker-compose.prod.yml:119-122`
- при локальном рендере `docker compose config` секреты из `.env`
  интерполируются в открытый вывод
- при том же локальном рендере `ENCRYPTION_KEY` оказался пустым
- в `SECURITY.md` важные enterprise controls всё ещё помечены как planned:
  `SECURITY.md:55`
  `SECURITY.md:135-141`

Почему это критично:

- легко случайно засветить секреты в логах, тикетах, чатах и CI output
- для customer prod слабое secret management — это отдельный red flag
- отсутствие обязательного non-empty `ENCRYPTION_KEY` оставляет дыру в
  операционном профиле

Что надо сделать:

- перейти на Docker secrets / Vault / внешний secret manager
- запретить boot в production без обязательных секретов
- отдельно валидировать `ENCRYPTION_KEY` так же жёстко, как `JWT_SECRET`
- не использовать вывод `docker compose config` в коммуникациях, если он
  рендерится из реального `.env`

### 5. Нет чистого release artifact для заказчика

Симптомы:

- рабочее дерево грязное: `git status --short` показывает большое количество
  изменённых файлов
- там же есть legacy-изменения в `openrag/*`, которые не были частью нового
  активного продуктового surface

Почему это критично:

- нельзя уверенно сказать, какой именно commit/tag нужно отдавать заказчику
- возрастает риск, что в релиз уйдут лишние или несогласованные изменения

Что надо сделать:

- выделить release branch / release tag
- очистить scope релиза
- отделить активный product surface от legacy-хвостов

---

## P1 — must-fix до customer pilot / раннего prod

### 6. Quality dashboard пока питается placeholder-данными

Симптомы:

- `backend/app/api/v1/metrics.py:20` прямо говорит:
  `For now, return placeholder structure`
- endpoint `/metrics/quality` существует, но не даёт реальной продовой
  телеметрии

Почему это важно:

- customer увидит dashboard, который выглядит настоящим, но не опирается на
  реальные агрегаты
- для enterprise demo/prod это быстро подрывает доверие

Что надо сделать:

- собрать реальные агрегаты по query logs / traces
- либо временно убрать экран/виджет из продукта до полноценной реализации

### 7. Во frontend остались API-вызовы, которых нет в active backend

Симптомы:

- `frontend/src/lib/api.ts:266` -> `/analytics`
- `frontend/src/lib/api.ts:280` -> `/engine/models`
- `frontend/src/lib/api.ts:292` -> `/feedback`
- соответствующие UI-поверхности:
  `frontend/src/pages/AnalyticsPage.tsx:3`
  `frontend/src/components/engine/EnginePanel.tsx:3`
- в active backend нет router-файлов для `analytics`, `engine`, `feedback`:
  см. `backend/app/api/router.py` и список файлов в `backend/app/api/v1`

Почему это важно:

- часть экранов или интеграций может ловить 404/500 уже после деплоя
- продукт выглядит шире, чем реально поддерживается

Что надо сделать:

- либо реализовать эти endpoint'ы в `backend/app`
- либо убрать/скрыть эти UI surfaces до фактической готовности

### 8. Документация по деплою и API ещё не синхронизирована с активным продуктом

Симптомы:

- `docs/DEPLOYMENT.md:1` всё ещё называется `OpenRAG Deployment Guide`
- `docs/DEPLOYMENT.md:30` предлагает `openrag up --prod`
- `docs/DEPLOYMENT.md:36` всё ещё отправляет в текущий prod-compose, который
  пока не согласован с active backend
- `docs/DEPLOYMENT.md:84` использует старое имя секрета `SECRET_KEY`
- `docs/API.md:19` пишет, что используется API key
- `docs/API.md:22` предлагает `X-API-Key`
- при этом active backend работает вокруг bearer JWT
- `docker-compose.prod.yml:4-5` всё ещё описывает старый multi-strategy продукт

Почему это важно:

- handoff заказчику и внедренцам будет путать людей
- Claude Code может начать чинить не тот путь, если взять старые доки как
  главный источник истины

Что надо сделать:

- переписать deployment guide под текущий runtime
- привести auth docs к реальному контракту
- убрать старые названия стратегий из продовых материалов

### 9. Security/compliance narrative сейчас сильнее, чем фактическая реализация

Симптомы:

- encryption at rest всё ещё planned:
  `SECURITY.md:55`
- SOC2 и enterprise controls тоже planned:
  `SECURITY.md:115`
  `SECURITY.md:135-141`

Почему это важно:

- для customer prod, особенно enterprise/regulated, эти пункты часто
  всплывают уже на pre-sales или security review
- сейчас это скорее roadmap, чем готовая продовая гарантия

Что надо сделать:

- в customer-facing материалах честно отделить `implemented` от `planned`
- не обещать продовую зрелость там, где пока только roadmap

---

## P2 — важные, но не блокирующие замечания

### 10. GraphRAG может деградировать тихо, но платформа продолжит рекламировать его как доступный

Симптомы:

- при проблеме с Neo4j backend лишь логирует предупреждение:
  `backend/app/main.py:50`
- при этом `/strategies` отдаёт статический список движков:
  `backend/app/api/v1/strategies.py:17`
  `backend/app/api/v1/strategies.py:27`
  `backend/app/api/v1/strategies.py:37`
  `backend/app/api/v1/strategies.py:40`

Почему это важно:

- customer может увидеть `GraphRAG` как доступный продукт, хотя графовая
  зависимость реально не поднялась
- это создаёт ложную готовность feature-флага

Что надо сделать:

- завести capability/status слой
- скрывать или помечать `GraphRAG` как degraded/unavailable при падении Neo4j

### 11. Исторические `docs/superpowers/*` лучше явно пометить как archival

Симптомы:

- в `docs/superpowers/specs/2026-03-17-openrag-rewrite-design.md`
  и `docs/superpowers/plans/2026-03-17-openrag-rewrite.md` остались ссылки на
  старые endpoint'ы и старый runtime
- там фигурируют `feedback`, `analytics`, `engine/models`,
  а также переходы между `app.main:app` и `openrag.server:app`

Почему это важно:

- для Claude Code это опасный источник ложного контекста
- можно по ошибке реализовать устаревший замысел вместо актуального продукта

Что надо сделать:

- либо вынести их в архивный каталог
- либо добавить в начало файлов явную пометку `historical / not source of truth`

---

## Рекомендуемый порядок исправления

1. Свести production runtime к одному backend (`backend/app`) и одному Docker path.
2. Починить prod-routing и healthcheck после унификации runtime.
3. Зафиксировать auth contract: встроенный auth или внешний IdP/JWT gateway.
4. Закрыть secret management: обязательные секреты, rotation, безопасный delivery.
5. Удалить или реализовать frontend/backend хвосты (`analytics`, `engine`, `feedback`).
6. Заменить placeholder metrics на реальные данные или убрать виджет.
7. Пометить legacy/docs/historical материалы, чтобы они не путали разработку.
8. Очистить worktree, собрать release candidate и прогнать полную prod smoke-проверку.

---

## Минимальные acceptance criteria перед customer prod

- `docker-compose.prod.yml` поднимает **тот же** backend, что и active product surface.
- `api` container healthy по корректному endpoint.
- `GET /api/health` работает через внешний ingress.
- `GET /api/strategies` возвращает только `lightrag` и `graph`.
- `POST /api/query` и `POST /api/compare` проходят end-to-end в prod compose.
- auth flow документирован и реально воспроизводим.
- в docs больше нет конфликтов между `JWT Bearer` и `X-API-Key`.
- секреты не текут в обычные operational workflow.
- customer-facing материалы не обещают то, что пока только planned.

---

## Практический вывод

Если нужен честный статус одной строкой:

**сейчас проект готов как сильный staging/pilot candidate, но не как customer production release.**
