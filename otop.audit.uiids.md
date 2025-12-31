# UI ID Audit

Repo: Optimizecodecloudagents

## Counts
- data-testid/testID: 19
- data-otop-id/otop accessibilityLabel: 18

## Samples (first 50)
### data-testid / testID
./AGENTS.md:2:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./AGENTS.md:3:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./docs/retrofit-guide.md:74:- `testID` + `accessibilityLabel="otop:<id>"`
./docs/otop-standard.md:5:2) **UI-Elemente** sind eindeutig & stabil referenzierbar (`data-otop-id` / `data-testid`).
./docs/otop-standard.md:46:- `data-testid`
./docs/otop-standard.md:60:  data-testid="crm.candidate.list.create.button"
./docs/otop-standard.md:69:- `testID` (Tests & Tool-Anker)
./docs/otop-standard.md:74:  testID="crm.candidate.list.create.button"
./scripts/otop-scan.sh:50:TESTID_COUNT="$(rg -n "data-testid|testID" . 2>/dev/null | wc -l | tr -d ' ')"
./scripts/otop-install.sh:52:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./scripts/otop-install.sh:53:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./scripts/otop-install.sh:61:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./scripts/otop-install.sh:62:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./scripts/otop-uiid-audit.sh:12:TESTID_COUNT="$(rg -n "data-testid|testID" . 2>/dev/null | wc -l | tr -d ' ')"
./scripts/otop-uiid-audit.sh:14:echo "- data-testid/testID: $TESTID_COUNT" >> "$OUT"
./scripts/otop-uiid-audit.sh:19:echo "### data-testid / testID" >> "$OUT"
./scripts/otop-uiid-audit.sh:20:rg -n "data-testid|testID" . 2>/dev/null | head -n 50 >> "$OUT" || true
./otop.audit.uiids.md:6:- data-testid/testID: 19
./otop.audit.uiids.md:10:### data-testid / testID
./docs/prompts/02_v0_prompt.txt:7:  - Jeder interaktive Control bekommt data-otop-id + data-testid
./docs/prompts/04_checklist.txt:10:  - data-otop-id + data-testid überall

### data-otop-id / otop label
./otop.audit.uiids.md:7:- data-otop-id/otop accessibilityLabel: 18
./otop.audit.uiids.md:11:./AGENTS.md:2:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./otop.audit.uiids.md:12:./AGENTS.md:3:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./otop.audit.uiids.md:13:./docs/retrofit-guide.md:74:- `testID` + `accessibilityLabel="otop:<id>"`
./otop.audit.uiids.md:14:./docs/otop-standard.md:5:2) **UI-Elemente** sind eindeutig & stabil referenzierbar (`data-otop-id` / `data-testid`).
./otop.audit.uiids.md:20:./scripts/otop-install.sh:52:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./otop.audit.uiids.md:21:./scripts/otop-install.sh:53:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./otop.audit.uiids.md:22:./scripts/otop-install.sh:61:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./otop.audit.uiids.md:23:./scripts/otop-install.sh:62:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./otop.audit.uiids.md:30:./docs/prompts/02_v0_prompt.txt:7:  - Jeder interaktive Control bekommt data-otop-id + data-testid
./otop.audit.uiids.md:31:./docs/prompts/04_checklist.txt:10:  - data-otop-id + data-testid überall
./otop.audit.uiids.md:33:### data-otop-id / otop label
./docs/otop-standard.md:5:2) **UI-Elemente** sind eindeutig & stabil referenzierbar (`data-otop-id` / `data-testid`).
./docs/otop-standard.md:47:- `data-otop-id`
./docs/otop-standard.md:61:  data-otop-id="crm.candidate.list.create.button"
./docs/otop-standard.md:75:  accessibilityLabel="otop:crm.candidate.list.create.button"
./scripts/otop-scan.sh:51:OTOPID_COUNT="$(rg -n "data-otop-id|accessibilityLabel=\"otop:" . 2>/dev/null | wc -l | tr -d ' ')"
./docs/prompts/02_v0_prompt.txt:7:  - Jeder interaktive Control bekommt data-otop-id + data-testid
./docs/retrofit-guide.md:74:- `testID` + `accessibilityLabel="otop:<id>"`
./scripts/otop-uiid-audit.sh:13:OTOPID_COUNT="$(rg -n "data-otop-id|accessibilityLabel=\"otop:" . 2>/dev/null | wc -l | tr -d ' ')"
./scripts/otop-uiid-audit.sh:15:echo "- data-otop-id/otop accessibilityLabel: $OTOPID_COUNT" >> "$OUT"
./scripts/otop-uiid-audit.sh:22:echo "### data-otop-id / otop label" >> "$OUT"
./scripts/otop-uiid-audit.sh:23:rg -n "data-otop-id|accessibilityLabel=\"otop:" . 2>/dev/null | head -n 50 >> "$OUT" || true
./scripts/otop-install.sh:52:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./scripts/otop-install.sh:53:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./scripts/otop-install.sh:61:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./scripts/otop-install.sh:62:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./docs/prompts/04_checklist.txt:10:  - data-otop-id + data-testid überall
./AGENTS.md:2:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./AGENTS.md:3:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
