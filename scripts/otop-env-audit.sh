#!/usr/bin/env bash
set -euo pipefail

OUT="otop.audit.env.md"

echo "# Hardcoded URL Audit" > "$OUT"
echo "" >> "$OUT"
echo "Repo: $(basename "$(pwd)")" >> "$OUT"
echo "" >> "$OUT"

echo "## Findings (first 200)" >> "$OUT"
rg -n "http://localhost:|https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" .   -g'!**/node_modules/**' -g'!**/dist/**' -g'!**/build/**' -g'!**/.next/**' -g'!**/.venv/**'   2>/dev/null | head -n 200 >> "$OUT" || true

echo "" >> "$OUT"
echo "## Notes" >> "$OUT"
echo "- Hardcoded URLs should move to ENV (VITE_*, NEXT_PUBLIC_*, EXPO_PUBLIC_*) or proxy (/api)." >> "$OUT"

echo "Wrote $OUT"
