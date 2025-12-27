#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(pwd)"

# Detect repo name
REPO_NAME="$(basename "$REPO_ROOT")"

# detect backend stack hints
BACKEND_FRAMEWORK=""
if [[ -f "package.json" ]]; then
  if grep -q "@nestjs" package.json; then BACKEND_FRAMEWORK="nestjs"; fi
  if grep -q "express" package.json; then BACKEND_FRAMEWORK="${BACKEND_FRAMEWORK:+$BACKEND_FRAMEWORK,}express"; fi
  if grep -q "fastify" package.json; then BACKEND_FRAMEWORK="${BACKEND_FRAMEWORK:+$BACKEND_FRAMEWORK,}fastify"; fi
fi
if [[ -f "pyproject.toml" || -f "requirements.txt" ]]; then
  if rg -q "fastapi" pyproject.toml requirements.txt 2>/dev/null; then BACKEND_FRAMEWORK="${BACKEND_FRAMEWORK:+$BACKEND_FRAMEWORK,}fastapi"; fi
  if rg -q "flask" pyproject.toml requirements.txt 2>/dev/null; then BACKEND_FRAMEWORK="${BACKEND_FRAMEWORK:+$BACKEND_FRAMEWORK,}flask"; fi
fi
if [[ -f "pom.xml" || -f "build.gradle" || -f "build.gradle.kts" ]]; then
  if rg -q "spring" pom.xml build.gradle build.gradle.kts 2>/dev/null; then BACKEND_FRAMEWORK="${BACKEND_FRAMEWORK:+$BACKEND_FRAMEWORK,}spring"; fi
fi

# detect frontend framework
FRONTEND_FRAMEWORK=""
if [[ -f "package.json" ]]; then
  if grep -q "next" package.json; then FRONTEND_FRAMEWORK="nextjs"; fi
  if grep -q "vite" package.json; then FRONTEND_FRAMEWORK="${FRONTEND_FRAMEWORK:+$FRONTEND_FRAMEWORK,}vite"; fi
  if grep -q "react-native" package.json; then FRONTEND_FRAMEWORK="react-native"; fi
  if grep -q "expo" package.json; then FRONTEND_FRAMEWORK="${FRONTEND_FRAMEWORK:+$FRONTEND_FRAMEWORK,}expo"; fi
fi

# OpenAPI file detection
OPENAPI_FILE="$(ls -1 **/*openapi*.y*ml **/*swagger*.y*ml **/*openapi*.json **/*swagger*.json 2>/dev/null | head -n 1 || true)"
OPENAPI_FORMAT=""
if [[ -n "$OPENAPI_FILE" ]]; then
  case "$OPENAPI_FILE" in
    *.yaml|*.yml) OPENAPI_FORMAT="yaml" ;;
    *.json) OPENAPI_FORMAT="json" ;;
  esac
fi

# health endpoints hints
HEALTH_HINTS="$(rg -n "/health|/ready|/status|/livez|/version" . 2>/dev/null | head -n 20 || true)"

# API env keys
API_KEYS="$(rg -n "VITE_.*API|NEXT_PUBLIC_.*API|REACT_APP_.*API|EXPO_PUBLIC_.*API|API_BASE_URL|baseURL" . 2>/dev/null | head -n 50 || true)"

# UI IDs coverage
TESTID_COUNT="$(rg -n "data-testid|testID" . 2>/dev/null | wc -l | tr -d ' ')"
OTOPID_COUNT="$(rg -n "data-otop-id|accessibilityLabel=\"otop:" . 2>/dev/null | wc -l | tr -d ' ')"

UI_TESTID_LEVEL="NONE"
[[ "$TESTID_COUNT" -gt 0 ]] && UI_TESTID_LEVEL="LOW"
[[ "$TESTID_COUNT" -gt 100 ]] && UI_TESTID_LEVEL="MED"
[[ "$TESTID_COUNT" -gt 500 ]] && UI_TESTID_LEVEL="HIGH"

UI_OTOPID_LEVEL="NONE"
[[ "$OTOPID_COUNT" -gt 0 ]] && UI_OTOPID_LEVEL="LOW"
[[ "$OTOPID_COUNT" -gt 100 ]] && UI_OTOPID_LEVEL="MED"
[[ "$OTOPID_COUNT" -gt 500 ]] && UI_OTOPID_LEVEL="HIGH"

# repo type guess
REPO_TYPE="unknown"
if [[ -n "$BACKEND_FRAMEWORK" && -n "$FRONTEND_FRAMEWORK" ]]; then
  REPO_TYPE="fullstack"
elif [[ -n "$BACKEND_FRAMEWORK" ]]; then
  REPO_TYPE="backend"
elif [[ -n "$FRONTEND_FRAMEWORK" ]]; then
  REPO_TYPE="frontend"
fi

cat > otop.config.json <<EOF
{
  "version": 1,
  "repo": { "name": "$REPO_NAME", "type": "$REPO_TYPE" },
  "backend": {
    "framework": "$BACKEND_FRAMEWORK",
    "openapi": { "file": "${OPENAPI_FILE}", "format": "${OPENAPI_FORMAT}" },
    "health_hints_sample": $(python - <<'PY'
import json,sys
print(json.dumps(sys.stdin.read().splitlines()))
PY
<<<"$HEALTH_HINTS")
  },
  "frontend": {
    "framework": "$FRONTEND_FRAMEWORK",
    "api_config_hints_sample": $(python - <<'PY'
import json,sys
print(json.dumps(sys.stdin.read().splitlines()))
PY
<<<"$API_KEYS"),
    "ui_ids": { "data_testid": "$UI_TESTID_LEVEL", "data_otop_id": "$UI_OTOPID_LEVEL" }
  }
}
EOF

echo "Wrote otop.config.json"
