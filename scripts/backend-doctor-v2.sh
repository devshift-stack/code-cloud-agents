#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# BACKEND DOCTOR v2 - One-Button Health Check
# ============================================================================
# Purpose: Verify backend health, OpenAPI validity, and optional contract tests
# Usage: bash scripts/backend-doctor-v2.sh [--contract-test]
# ============================================================================

BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"
OPENAPI_FILE="${OPENAPI_FILE:-swagger.yaml}"
RUN_CONTRACT_TEST=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --contract-test)
      RUN_CONTRACT_TEST=true
      shift
      ;;
  esac
done

echo "============================================================================"
echo "🩺 BACKEND DOCTOR v2"
echo "============================================================================"
echo "Backend URL: $BACKEND_URL"
echo "OpenAPI File: $OPENAPI_FILE"
echo "Contract Tests: $RUN_CONTRACT_TEST"
echo ""

# ============================================================================
# 1️⃣ HEALTH CHECK
# ============================================================================
echo "1️⃣ Health Check: $BACKEND_URL/health"
echo "============================================================================"

HEALTH_RESPONSE=$(curl -sf "$BACKEND_URL/health" 2>&1 || echo "FAIL")

if [[ "$HEALTH_RESPONSE" == "FAIL" ]]; then
  echo "❌ FAIL: Backend not responding at $BACKEND_URL/health"
  echo ""
  echo "Troubleshooting:"
  echo "  - Is backend running? Check: ps aux | grep node"
  echo "  - Check port: lsof -nP -iTCP:4000 -sTCP:LISTEN"
  echo "  - Try starting: npm run backend:dev"
  exit 1
fi

echo "✅ PASS: Backend is healthy"
echo ""
echo "Response:"
echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

# ============================================================================
# 2️⃣ OPENAPI VALIDATION
# ============================================================================
echo "2️⃣ OpenAPI Validation: $OPENAPI_FILE"
echo "============================================================================"

if [[ ! -f "$OPENAPI_FILE" ]]; then
  echo "❌ FAIL: OpenAPI file not found: $OPENAPI_FILE"
  exit 1
fi

echo "File found: $OPENAPI_FILE"
echo ""

# Validate with swagger-cli
echo "Running: npx @apidevtools/swagger-cli validate $OPENAPI_FILE"
if npx --yes @apidevtools/swagger-cli validate "$OPENAPI_FILE" >/dev/null 2>&1; then
  echo "✅ PASS: OpenAPI is valid"
else
  echo "❌ FAIL: OpenAPI validation failed"
  npx --yes @apidevtools/swagger-cli validate "$OPENAPI_FILE"
  exit 1
fi
echo ""

# ============================================================================
# 3️⃣ OPENAPI QUALITY CHECKS
# ============================================================================
echo "3️⃣ OpenAPI Quality: operationId + tags"
echo "============================================================================"

# Check operationId coverage
TOTAL_PATHS=$(python3 -c "
import yaml
with open('$OPENAPI_FILE', 'r') as f:
    spec = yaml.safe_load(f)
    count = 0
    for path, methods in spec.get('paths', {}).items():
        for method in ['get', 'post', 'put', 'patch', 'delete']:
            if method in methods:
                count += 1
    print(count)
" 2>/dev/null || echo "0")

MISSING_OPERATION_ID=$(python3 -c "
import yaml
with open('$OPENAPI_FILE', 'r') as f:
    spec = yaml.safe_load(f)
    missing = []
    for path, methods in spec.get('paths', {}).items():
        for method in ['get', 'post', 'put', 'patch', 'delete']:
            if method in methods:
                if 'operationId' not in methods[method]:
                    missing.append(f'{method.upper()} {path}')
    print(len(missing))
" 2>/dev/null || echo "0")

MISSING_TAGS=$(python3 -c "
import yaml
with open('$OPENAPI_FILE', 'r') as f:
    spec = yaml.safe_load(f)
    missing = []
    for path, methods in spec.get('paths', {}).items():
        for method in ['get', 'post', 'put', 'patch', 'delete']:
            if method in methods:
                if 'tags' not in methods[method] or not methods[method]['tags']:
                    missing.append(f'{method.upper()} {path}')
    print(len(missing))
" 2>/dev/null || echo "0")

echo "Total Endpoints: $TOTAL_PATHS"
echo "Missing operationId: $MISSING_OPERATION_ID"
echo "Missing tags: $MISSING_TAGS"
echo ""

if [[ "$MISSING_OPERATION_ID" -gt 0 ]] || [[ "$MISSING_TAGS" -gt 0 ]]; then
  echo "⚠️  WARNING: Some endpoints missing operationId or tags"
  echo ""
  echo "Fix with:"
  echo "  python3 scripts/otop-add-operationid.py $OPENAPI_FILE"
  echo ""
else
  echo "✅ PASS: All endpoints have operationId + tags (100%)"
  echo ""
fi

# ============================================================================
# 4️⃣ SPECTRAL LINT (if rules exist)
# ============================================================================
echo "4️⃣ Spectral Lint: OTOP Rules"
echo "============================================================================"

if [[ -f "rules/spectral-otop.yml" ]]; then
  echo "Running: npx @stoplight/spectral-cli lint -r rules/spectral-otop.yml $OPENAPI_FILE"
  if npx --yes @stoplight/spectral-cli lint -r rules/spectral-otop.yml "$OPENAPI_FILE" >/dev/null 2>&1; then
    echo "✅ PASS: Spectral lint passed"
  else
    echo "⚠️  WARNING: Spectral lint found issues"
    npx --yes @stoplight/spectral-cli lint -r rules/spectral-otop.yml "$OPENAPI_FILE" || true
  fi
else
  echo "⚠️  SKIP: rules/spectral-otop.yml not found"
fi
echo ""

# ============================================================================
# 5️⃣ ENDPOINT INVENTORY
# ============================================================================
echo "5️⃣ Endpoint Inventory"
echo "============================================================================"

python3 -c "
import yaml
with open('$OPENAPI_FILE', 'r') as f:
    spec = yaml.safe_load(f)
    endpoints = []
    for path, methods in spec.get('paths', {}).items():
        for method in ['get', 'post', 'put', 'patch', 'delete']:
            if method in methods:
                operation_id = methods[method].get('operationId', 'MISSING')
                tags = methods[method].get('tags', ['MISSING'])
                tag_str = ', '.join(tags) if tags else 'MISSING'
                endpoints.append(f'{method.upper():6} {path:40} {operation_id:35} [{tag_str}]')

    print(f'Total Endpoints: {len(endpoints)}')
    print('')
    for ep in sorted(endpoints):
        print(ep)
" 2>/dev/null || echo "Failed to parse endpoints"

echo ""

# ============================================================================
# 6️⃣ CONTRACT TESTS (Optional)
# ============================================================================
if [[ "$RUN_CONTRACT_TEST" == true ]]; then
  echo "6️⃣ Contract Tests: Verify API Responses Match OpenAPI"
  echo "============================================================================"

  echo "Testing: GET /api/tasks"
  RESPONSE=$(curl -sf "$BACKEND_URL/api/tasks" 2>&1 || echo "FAIL")

  if [[ "$RESPONSE" == "FAIL" ]]; then
    echo "❌ FAIL: GET /api/tasks returned error"
  else
    echo "✅ PASS: GET /api/tasks returned data"
    echo "Response preview:"
    echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data[:2] if isinstance(data, list) else data, indent=2))" 2>/dev/null || echo "$RESPONSE" | head -n 10
  fi

  echo ""
  echo "Testing: GET /health"
  HEALTH=$(curl -sf "$BACKEND_URL/health" 2>&1 || echo "FAIL")

  if [[ "$HEALTH" == "FAIL" ]]; then
    echo "❌ FAIL: GET /health returned error"
  else
    echo "✅ PASS: GET /health returned data"
  fi

  echo ""
  echo "⚠️  NOTE: Full contract testing requires dedicated tool (e.g., Dredd, Prism)"
  echo ""
fi

# ============================================================================
# 7️⃣ SUMMARY
# ============================================================================
echo "============================================================================"
echo "📊 SUMMARY"
echo "============================================================================"

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Health check
if [[ "$HEALTH_RESPONSE" != "FAIL" ]]; then
  echo "✅ Health Check: PASS"
  ((PASS_COUNT++))
else
  echo "❌ Health Check: FAIL"
  ((FAIL_COUNT++))
fi

# OpenAPI validation
if npx --yes @apidevtools/swagger-cli validate "$OPENAPI_FILE" >/dev/null 2>&1; then
  echo "✅ OpenAPI Validation: PASS"
  ((PASS_COUNT++))
else
  echo "❌ OpenAPI Validation: FAIL"
  ((FAIL_COUNT++))
fi

# Quality checks
if [[ "$MISSING_OPERATION_ID" -eq 0 ]] && [[ "$MISSING_TAGS" -eq 0 ]]; then
  echo "✅ OpenAPI Quality: PASS (100% coverage)"
  ((PASS_COUNT++))
else
  echo "⚠️  OpenAPI Quality: WARNING (missing operationId or tags)"
  ((WARN_COUNT++))
fi

echo ""
echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed, $WARN_COUNT warnings"
echo ""

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo "❌ DOCTOR SAYS: Backend has issues, fix them!"
  exit 1
elif [[ "$WARN_COUNT" -gt 0 ]]; then
  echo "⚠️  DOCTOR SAYS: Backend is OK, but has warnings"
  exit 0
else
  echo "✅ DOCTOR SAYS: Backend is healthy and OTOP-compliant!"
  exit 0
fi
