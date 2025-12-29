#!/usr/bin/env bash
set -euo pipefail

# Find OpenAPI spec in repo
SPEC="$(ls -1 **/*openapi*.y*ml **/*swagger*.y*ml **/*openapi*.json **/*swagger*.json 2>/dev/null | head -n 1 || true)"
if [[ -z "$SPEC" ]]; then
  echo "No OpenAPI/Swagger spec found in repo."
  exit 0
fi

echo "OpenAPI spec: $SPEC"

# Validate schema structure
npx --yes @apidevtools/swagger-cli validate "$SPEC"

# Lint rules (operationId + tags required)
npx --yes @stoplight/spectral-cli lint -r rules/spectral-otop.yml "$SPEC"

echo "OpenAPI lint OK"
