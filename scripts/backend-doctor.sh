#!/usr/bin/env bash
set -euo pipefail

echo "🏥 Backend Doctor - Health & OpenAPI Check"
echo "==========================================="

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
OPENAPI_URL="${OPENAPI_URL:-$BACKEND_URL/openapi.json}"

echo ""
echo "Configuration:"
echo "  BACKEND_URL: $BACKEND_URL"
echo "  OPENAPI_URL: $OPENAPI_URL"

echo ""
echo "1️⃣ Health Check..."
HEALTH_RESPONSE=$(curl -sf "$BACKEND_URL/health" 2>/dev/null || echo "FAIL")
if [[ "$HEALTH_RESPONSE" == "FAIL" ]]; then
  echo "❌ Health check failed at $BACKEND_URL/health"
  echo "➡️ Trying alternative endpoints..."

  # Try /api/health
  HEALTH_RESPONSE=$(curl -sf "$BACKEND_URL/api/health" 2>/dev/null || echo "FAIL")
  if [[ "$HEALTH_RESPONSE" != "FAIL" ]]; then
    echo "✅ Health check OK: $BACKEND_URL/api/health"
  else
    echo "❌ No health endpoint found"
    echo "➡️ Check: Is backend running? Correct port?"
    exit 1
  fi
else
  echo "✅ Health check OK: $BACKEND_URL/health"
  echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
fi

echo ""
echo "2️⃣ OpenAPI Discovery..."

# Try multiple common paths
SPEC_FOUND=false
for PATH in /openapi.json /swagger.json /api-docs /api/openapi.json /api/swagger.json; do
  FULL_URL="$BACKEND_URL$PATH"
  SPEC_RESPONSE=$(curl -sf "$FULL_URL" 2>/dev/null || echo "FAIL")
  if [[ "$SPEC_RESPONSE" != "FAIL" ]]; then
    echo "✅ OpenAPI spec found: $FULL_URL"
    OPENAPI_URL="$FULL_URL"
    SPEC_FOUND=true
    break
  fi
done

# Try local file
if [[ "$SPEC_FOUND" == "false" ]]; then
  if [[ -f "swagger.yaml" ]]; then
    echo "✅ OpenAPI spec found: ./swagger.yaml (local file)"
    SPEC_RESPONSE=$(< swagger.yaml)
    SPEC_FOUND=true
  elif [[ -f "openapi.yaml" ]]; then
    echo "✅ OpenAPI spec found: ./openapi.yaml (local file)"
    SPEC_RESPONSE=$(< openapi.yaml)
    SPEC_FOUND=true
  fi
fi

if [[ "$SPEC_FOUND" == "false" ]]; then
  echo "❌ OpenAPI spec not found"
  echo "➡️ Tried: /openapi.json, /swagger.json, /api-docs, ./swagger.yaml"
  exit 1
fi

echo ""
echo "3️⃣ Validate OpenAPI Schema..."

# Save to temp file for validation
if [[ "$OPENAPI_URL" == http* ]]; then
  curl -sf "$OPENAPI_URL" > /tmp/openapi-temp.json
  SPEC_FILE="/tmp/openapi-temp.json"
elif [[ -f "swagger.yaml" ]]; then
  SPEC_FILE="swagger.yaml"
elif [[ -f "openapi.yaml" ]]; then
  SPEC_FILE="openapi.yaml"
fi

npx --yes @apidevtools/swagger-cli validate "$SPEC_FILE" 2>&1 || {
  echo "❌ OpenAPI validation failed"
  exit 1
}
echo "✅ OpenAPI schema is valid"

echo ""
echo "4️⃣ Check operationId + tags..."

# Count missing operationIds and tags
if [[ "$SPEC_FILE" == *.yaml ]] || [[ "$SPEC_FILE" == *.yml ]]; then
  # YAML parsing
  TOTAL_OPS=$(grep -E "^\s+(get|post|put|delete|patch):" "$SPEC_FILE" | wc -l | tr -d ' ')
  MISSING_OPS=$(python3 -c "
import yaml, sys
with open('$SPEC_FILE') as f:
  spec = yaml.safe_load(f)
missing = 0
for path, methods in spec.get('paths', {}).items():
  for method in ['get','post','put','delete','patch']:
    if method in methods and 'operationId' not in methods[method]:
      missing += 1
print(missing)
" 2>/dev/null || echo "0")

  MISSING_TAGS=$(python3 -c "
import yaml, sys
with open('$SPEC_FILE') as f:
  spec = yaml.safe_load(f)
missing = 0
for path, methods in spec.get('paths', {}).items():
  for method in ['get','post','put','delete','patch']:
    if method in methods and ('tags' not in methods[method] or not methods[method]['tags']):
      missing += 1
print(missing)
" 2>/dev/null || echo "0")
else
  # JSON parsing
  TOTAL_OPS=$(jq '[.paths | to_entries[] | .value | to_entries[] | select(.key | IN("get","post","put","delete","patch"))] | length' "$SPEC_FILE" 2>/dev/null || echo "0")
  MISSING_OPS=$(jq '[.paths | to_entries[] | .value | to_entries[] | select(.key | IN("get","post","put","delete","patch")) | select(.value.operationId == null)] | length' "$SPEC_FILE" 2>/dev/null || echo "0")
  MISSING_TAGS=$(jq '[.paths | to_entries[] | .value | to_entries[] | select(.key | IN("get","post","put","delete","patch")) | select(.value.tags == null or (.value.tags | length) == 0)] | length' "$SPEC_FILE" 2>/dev/null || echo "0")
fi

echo "Total endpoints: $TOTAL_OPS"

if [[ "$MISSING_OPS" -gt 0 ]]; then
  echo "⚠️  $MISSING_OPS endpoints missing operationId"
else
  echo "✅ All endpoints have operationId"
fi

if [[ "$MISSING_TAGS" -gt 0 ]]; then
  echo "⚠️  $MISSING_TAGS endpoints missing tags"
else
  echo "✅ All endpoints have tags"
fi

echo ""
echo "5️⃣ Summary for Orval Setup..."
echo "---"
echo "BACKEND_URL: $BACKEND_URL"
if [[ "$OPENAPI_URL" == http* ]]; then
  echo "OPENAPI_URL: $OPENAPI_URL (remote)"
else
  echo "OPENAPI_FILE: $SPEC_FILE (local)"
fi
echo "Status: $([ "$MISSING_OPS" -eq 0 ] && echo "✅ Ready for Orval" || echo "⚠️ Fix operationId first")"
echo ""
echo "🎉 Backend Doctor DONE"
echo ""
echo "Next steps:"
if [[ "$MISSING_OPS" -gt 0 ]]; then
  echo "1. Fix missing operationIds: python3 scripts/otop-add-operationid.py $SPEC_FILE"
  echo "2. Then setup Orval"
else
  echo "1. Setup Orval: npm install -D orval"
  echo "2. Create orval.config.ts"
  echo "3. Run: npm run generate:api"
fi
