#!/usr/bin/env bash
set -euo pipefail

OUT="otop.audit.uiids.md"

echo "# UI ID Audit" > "$OUT"
echo "" >> "$OUT"
echo "Repo: $(basename "$(pwd)")" >> "$OUT"
echo "" >> "$OUT"

echo "## Counts" >> "$OUT"
TESTID_COUNT="$(rg -n "data-testid|testID" . 2>/dev/null | wc -l | tr -d ' ')"
OTOPID_COUNT="$(rg -n "data-otop-id|accessibilityLabel=\"otop:" . 2>/dev/null | wc -l | tr -d ' ')"
echo "- data-testid/testID: $TESTID_COUNT" >> "$OUT"
echo "- data-otop-id/otop accessibilityLabel: $OTOPID_COUNT" >> "$OUT"
echo "" >> "$OUT"

echo "## Samples (first 50)" >> "$OUT"
echo "### data-testid / testID" >> "$OUT"
rg -n "data-testid|testID" . 2>/dev/null | head -n 50 >> "$OUT" || true
echo "" >> "$OUT"
echo "### data-otop-id / otop label" >> "$OUT"
rg -n "data-otop-id|accessibilityLabel=\"otop:" . 2>/dev/null | head -n 50 >> "$OUT" || true

echo "Wrote $OUT"
