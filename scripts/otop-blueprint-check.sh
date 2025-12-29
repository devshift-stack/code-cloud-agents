#!/usr/bin/env bash
set -euo pipefail

SWAGGER="${1:-swagger.yaml}"
BLUEPRINT="${2:-docs/otop/blueprints/ui-blueprint.md}"
SRC_DIR="${3:-src}"

if [ ! -f "$SWAGGER" ]; then
  echo "ERROR: swagger file not found: $SWAGGER"
  exit 1
fi
if [ ! -f "$BLUEPRINT" ]; then
  echo "ERROR: blueprint not found: $BLUEPRINT"
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# 1) operationIds aus swagger
grep -oE 'operationId:\s*[A-Za-z0-9_\.]+' "$SWAGGER" \
  | awk '{print $2}' \
  | sort -u > "$tmp/swagger_ops.txt"

# 2) operationIds aus Blueprint (Zeilen wie:  - xxx -> GET /api/...)
grep -oE '^\s*-\s*[A-Za-z0-9_\.]+\s*->' "$BLUEPRINT" \
  | sed -E 's/^\s*-\s*([A-Za-z0-9_\.]+)\s*->.*/\1/' \
  | sort -u > "$tmp/blueprint_ops.txt" || true

# 3) IDs im Blueprint
grep -oE 'data-otop-id="[^"]+"' "$BLUEPRINT" \
  | sed -E 's/.*data-otop-id="([^"]+)".*/\1/' \
  | sort -u > "$tmp/blueprint_otop_ids.txt" || true

grep -oE 'data-testid="[^"]+"' "$BLUEPRINT" \
  | sed -E 's/.*data-testid="([^"]+)".*/\1/' \
  | sort -u > "$tmp/blueprint_test_ids.txt" || true

# 4) IDs im Code
if [ -d "$SRC_DIR" ]; then
  grep -RhoE 'data-otop-id="[^"]+"' "$SRC_DIR" 2>/dev/null \
    | sed -E 's/.*data-otop-id="([^"]+)".*/\1/' \
    | sort -u > "$tmp/code_otop_ids.txt" || true

  grep -RhoE 'data-testid="[^"]+"' "$SRC_DIR" 2>/dev/null \
    | sed -E 's/.*data-testid="([^"]+)".*/\1/' \
    | sort -u > "$tmp/code_test_ids.txt" || true
else
  : > "$tmp/code_otop_ids.txt"
  : > "$tmp/code_test_ids.txt"
fi

echo "===================="
echo "OTOP BLUEPRINT CHECK"
echo "===================="
echo "Swagger:   $SWAGGER"
echo "Blueprint: $BLUEPRINT"
echo "Src:       $SRC_DIR"
echo

echo "A) Swagger operationIds:        $(wc -l < "$tmp/swagger_ops.txt")"
echo "B) Blueprint referenced ops:     $(wc -l < "$tmp/blueprint_ops.txt")"
echo "C) Blueprint data-otop-id:       $(wc -l < "$tmp/blueprint_otop_ids.txt")"
echo "D) Code data-otop-id:            $(wc -l < "$tmp/code_otop_ids.txt")"
echo

echo "1) Ops in Swagger but NOT referenced in Blueprint (Blueprint unvollständig):"
comm -23 "$tmp/swagger_ops.txt" "$tmp/blueprint_ops.txt" | sed 's/^/  - /' || true
echo

echo "2) Ops referenced in Blueprint but NOT in Swagger (Blueprint/v0 falsch):"
comm -13 "$tmp/swagger_ops.txt" "$tmp/blueprint_ops.txt" | sed 's/^/  - /' || true
echo

echo "3) data-otop-id in Blueprint but NOT found in Code (v0 nicht umgesetzt / nicht gemerged):"
comm -23 "$tmp/blueprint_otop_ids.txt" "$tmp/code_otop_ids.txt" | head -n 80 | sed 's/^/  - /' || true
echo

echo "4) data-otop-id in Code but NOT in Blueprint (Blueprint veraltet / Code drift):"
comm -13 "$tmp/blueprint_otop_ids.txt" "$tmp/code_otop_ids.txt" | head -n 80 | sed 's/^/  - /' || true
echo

echo "DONE."
