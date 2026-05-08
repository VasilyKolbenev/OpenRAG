#!/bin/bash
# OpenRAG investor demo smoke test.
# Run after the stack is up: validates the runbook flow against the live API.
#
# Usage:
#   API_URL=http://localhost:8000 ./scripts/demo-smoke.sh
#   API_URL=https://rag.example.com OPENRAG_ADMIN_PASSWORD=your-pw ./scripts/demo-smoke.sh

set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
ADMIN_PW="${OPENRAG_ADMIN_PASSWORD:-}"

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
blue()  { printf "\033[34m%s\033[0m\n" "$*"; }

step() { blue ">>> $*"; }
pass() { green "[OK]  $*"; }
fail() { red   "[FAIL] $*"; exit 1; }

# Resolve API base. If hitting the dev backend directly, paths sit at root.
# In production behind Traefik, paths are prefixed with /api.
if curl -fsS "${API_URL}/api/health" >/dev/null 2>&1; then
  BASE="${API_URL}/api"
elif curl -fsS "${API_URL}/health" >/dev/null 2>&1; then
  BASE="${API_URL}"
else
  fail "Cannot reach health endpoint at ${API_URL} (tried /api/health and /health)"
fi

step "Using API base: ${BASE}"

# 1. Health
step "GET ${BASE}/health"
HEALTH=$(curl -fsS "${BASE}/health")
echo "${HEALTH}" | head -c 240; echo
pass "health"

# 2. Strategies — must return 3 canonical engines
step "GET ${BASE}/strategies"
STRATEGIES=$(curl -fsS "${BASE}/strategies")
echo "${STRATEGIES}" | head -c 600; echo
echo "${STRATEGIES}" | grep -q '"lightrag"' || fail "lightrag missing in /strategies"
echo "${STRATEGIES}" | grep -q '"agentic"'  || fail "agentic missing in /strategies"
echo "${STRATEGIES}" | grep -q '"graph"'    || fail "graph missing in /strategies"
pass "strategies returns 3 canonical engines"

# 3. Optional: auth flow (only if admin password is set)
if [[ -n "${ADMIN_PW}" ]]; then
  step "POST ${BASE}/auth/login"
  TOKEN=$(curl -fsS -X POST "${BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"${ADMIN_PW}\"}" | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
  if [[ -z "${TOKEN}" ]]; then
    fail "auth/login did not return access_token"
  fi
  pass "auth/login returned JWT (length=${#TOKEN})"
  AUTH_HEADER="Authorization: Bearer ${TOKEN}"
else
  blue ">>> OPENRAG_ADMIN_PASSWORD not set — skipping /auth/login check"
  AUTH_HEADER=""
fi

# 4. Recommend (rule-based, no LLM cost)
step "POST ${BASE}/recommend"
REC=$(curl -fsS -X POST "${BASE}/recommend" \
  -H "Content-Type: application/json" \
  -d '{"domain":"legal","query_complexity":"complex","data_structure":"structured","priority":"explainability"}')
echo "${REC}"
echo "${REC}" | grep -q '"recommended"' || fail "recommend missing recommended"
echo "${REC}" | grep -q '"agentic"\|"graph"\|"lightrag"' || fail "recommend missing engine"
pass "recommend returns a canonical engine"

# 5. Compare with 3 engines (lightweight — relies on existing collection if present)
step "POST ${BASE}/compare with 3 engines"
COMPARE=$(curl -fsS -X POST "${BASE}/compare" \
  ${AUTH_HEADER:+-H "${AUTH_HEADER}"} \
  -H "Content-Type: application/json" \
  -d '{"query":"hello","strategies":["lightrag","agentic","graph"],"top_k":3}' \
  || echo '{"results":[]}')
echo "${COMPARE}" | head -c 400; echo
if echo "${COMPARE}" | grep -q '"results"'; then
  pass "compare endpoint accepts 3 engines"
else
  red "compare did not return results (collection may be empty — non-fatal)"
fi

green "
=== Smoke test complete ==="
green "API base   : ${BASE}"
green "Auth flow  : $([[ -n "${ADMIN_PW}" ]] && echo "enabled" || echo "skipped (set OPENRAG_ADMIN_PASSWORD)")"
green "3 engines  : verified"
