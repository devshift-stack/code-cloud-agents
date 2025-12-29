#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-}"
if [[ -z "$ROOT" ]]; then
  echo "Usage: bash otop-install.sh <root-folder-containing-repos>"
  exit 1
fi

PACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "OTOP install: pack=$PACK_DIR root=$ROOT"

EXCLUDE_DIRS=("node_modules" "dist" "build" ".next" ".venv" "coverage" ".git")

is_excluded() {
  local p="$1"
  for d in "${EXCLUDE_DIRS[@]}"; do
    if [[ "$p" == *"/$d"* ]]; then return 0; fi
  done
  return 1
}

# find git repos (directories containing .git)
mapfile -t REPOS < <(find "$ROOT" -maxdepth 4 -type d -name ".git" 2>/dev/null | sed 's|/.git$||')

echo "Found repos: ${#REPOS[@]}"

for R in "${REPOS[@]}"; do
  if is_excluded "$R"; then
    continue
  fi
  echo "==> Installing into: $R"

  mkdir -p "$R/docs" "$R/scripts" "$R/rules" "$R/.github/workflows" "$R/docs/prompts"

  # copy docs/prompts/rules/scripts
  cp -f "$PACK_DIR/docs/otop-standard.md" "$R/docs/otop-standard.md"
  cp -f "$PACK_DIR/docs/retrofit-guide.md" "$R/docs/retrofit-guide.md"
  cp -f "$PACK_DIR/docs/prompts/"*.txt "$R/docs/prompts/" || true
  cp -f "$PACK_DIR/rules/spectral-otop.yml" "$R/rules/spectral-otop.yml"
  cp -f "$PACK_DIR/scripts/"otop-*.sh "$R/scripts/" || true
  cp -f "$PACK_DIR/scripts/otop-add-operationid.py" "$R/scripts/otop-add-operationid.py" || true
  cp -f "$PACK_DIR/.github/workflows/"*.yml "$R/.github/workflows/" || true

  # add AGENTS.md snippet if file exists; otherwise create minimal
  if [[ -f "$R/AGENTS.md" ]]; then
    if ! grep -q "OTOP Rules" "$R/AGENTS.md"; then
      cat >> "$R/AGENTS.md" <<'EOF'

## OTOP Rules (MUST)
- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
- Do not hardcode API URLs; use ENV/proxy.
- Backend APIs must have OpenAPI with unique `operationId` + structured `tags`.
EOF
    fi
  else
    cat > "$R/AGENTS.md" <<'EOF'
## OTOP Rules (MUST)
- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
- Do not hardcode API URLs; use ENV/proxy.
- Backend APIs must have OpenAPI with unique `operationId` + structured `tags`.
EOF
  fi

done

echo "Done. Next: run in each repo: bash scripts/otop-scan.sh"
