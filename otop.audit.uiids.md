# UI ID Audit

Repo: code-cloud-agents

## Counts
- data-testid/testID: 29
- data-otop-id/otop accessibilityLabel: 28

## Samples (first 50)
### data-testid / testID
./docs/retrofit-guide.md:74:- `testID` + `accessibilityLabel="otop:<id>"`
./docs/otop-standard.md:5:2) **UI-Elemente** sind eindeutig & stabil referenzierbar (`data-otop-id` / `data-testid`).
./docs/otop-standard.md:46:- `data-testid`
./docs/otop-standard.md:60:  data-testid="crm.candidate.list.create.button"
./docs/otop-standard.md:69:- `testID` (Tests & Tool-Anker)
./docs/otop-standard.md:74:  testID="crm.candidate.list.create.button"
./src/App.tsx:380:                  data-testid="agents.navigation.profile.menuitem"
./src/App.tsx:388:                  data-testid="agents.navigation.settingsMenu.menuitem"
./src/App.tsx:396:                  data-testid="agents.navigation.logout.button"
./src/App.tsx:414:              data-testid="agents.navigation.dashboard.tab"
./src/App.tsx:422:              data-testid="agents.navigation.chat.tab"
./src/App.tsx:430:              data-testid="agents.navigation.tasks.tab"
./src/App.tsx:438:              data-testid="agents.navigation.agents.tab"
./src/App.tsx:446:              data-testid="agents.navigation.settings.tab"
./src/App.tsx:551:                  data-testid="agents.agent.list.search.input"
./src/App.tsx:557:                data-testid="agents.agent.list.create.button"
./otop.audit.uiids.md:6:- data-testid/testID: 29
./otop.audit.uiids.md:10:### data-testid / testID
./AGENTS.md:2:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./AGENTS.md:3:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./docs/prompts/02_v0_prompt.txt:7:  - Jeder interaktive Control bekommt data-otop-id + data-testid
./docs/prompts/04_checklist.txt:10:  - data-otop-id + data-testid überall
./scripts/otop-scan.sh:50:TESTID_COUNT="$(rg -n "data-testid|testID" . 2>/dev/null | wc -l | tr -d ' ')"
./scripts/otop-uiid-audit.sh:12:TESTID_COUNT="$(rg -n "data-testid|testID" . 2>/dev/null | wc -l | tr -d ' ')"
./scripts/otop-uiid-audit.sh:14:echo "- data-testid/testID: $TESTID_COUNT" >> "$OUT"
./scripts/otop-uiid-audit.sh:19:echo "### data-testid / testID" >> "$OUT"
./scripts/otop-uiid-audit.sh:20:rg -n "data-testid|testID" . 2>/dev/null | head -n 50 >> "$OUT" || true
./scripts/otop-install.sh:52:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./scripts/otop-install.sh:53:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./scripts/otop-install.sh:61:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./scripts/otop-install.sh:62:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.

### data-otop-id / otop label
./AGENTS.md:2:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./AGENTS.md:3:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./docs/retrofit-guide.md:74:- `testID` + `accessibilityLabel="otop:<id>"`
./scripts/otop-scan.sh:51:OTOPID_COUNT="$(rg -n "data-otop-id|accessibilityLabel=\"otop:" . 2>/dev/null | wc -l | tr -d ' ')"
./docs/otop-standard.md:5:2) **UI-Elemente** sind eindeutig & stabil referenzierbar (`data-otop-id` / `data-testid`).
./docs/otop-standard.md:47:- `data-otop-id`
./docs/otop-standard.md:61:  data-otop-id="crm.candidate.list.create.button"
./docs/otop-standard.md:75:  accessibilityLabel="otop:crm.candidate.list.create.button"
./scripts/otop-uiid-audit.sh:13:OTOPID_COUNT="$(rg -n "data-otop-id|accessibilityLabel=\"otop:" . 2>/dev/null | wc -l | tr -d ' ')"
./scripts/otop-uiid-audit.sh:15:echo "- data-otop-id/otop accessibilityLabel: $OTOPID_COUNT" >> "$OUT"
./scripts/otop-uiid-audit.sh:22:echo "### data-otop-id / otop label" >> "$OUT"
./scripts/otop-uiid-audit.sh:23:rg -n "data-otop-id|accessibilityLabel=\"otop:" . 2>/dev/null | head -n 50 >> "$OUT" || true
./src/App.tsx:381:                  data-otop-id="agents.navigation.profile.menuitem"
./src/App.tsx:389:                  data-otop-id="agents.navigation.settingsMenu.menuitem"
./src/App.tsx:397:                  data-otop-id="agents.navigation.logout.button"
./src/App.tsx:415:              data-otop-id="agents.navigation.dashboard.tab"
./src/App.tsx:423:              data-otop-id="agents.navigation.chat.tab"
./src/App.tsx:431:              data-otop-id="agents.navigation.tasks.tab"
./src/App.tsx:439:              data-otop-id="agents.navigation.agents.tab"
./src/App.tsx:447:              data-otop-id="agents.navigation.settings.tab"
./src/App.tsx:552:                  data-otop-id="agents.agent.list.search.input"
./src/App.tsx:558:                data-otop-id="agents.agent.list.create.button"
./scripts/otop-install.sh:52:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./scripts/otop-install.sh:53:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./scripts/otop-install.sh:61:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./scripts/otop-install.sh:62:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./otop.audit.uiids.md:7:- data-otop-id/otop accessibilityLabel: 28
./otop.audit.uiids.md:11:./docs/retrofit-guide.md:74:- `testID` + `accessibilityLabel="otop:<id>"`
./otop.audit.uiids.md:12:./docs/otop-standard.md:5:2) **UI-Elemente** sind eindeutig & stabil referenzierbar (`data-otop-id` / `data-testid`).
./otop.audit.uiids.md:29:./AGENTS.md:2:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./otop.audit.uiids.md:30:./AGENTS.md:3:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./otop.audit.uiids.md:31:./docs/prompts/02_v0_prompt.txt:7:  - Jeder interaktive Control bekommt data-otop-id + data-testid
./otop.audit.uiids.md:32:./docs/prompts/04_checklist.txt:10:  - data-otop-id + data-testid überall
./otop.audit.uiids.md:38:./scripts/otop-install.sh:52:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./otop.audit.uiids.md:39:./scripts/otop-install.sh:53:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./otop.audit.uiids.md:40:./scripts/otop-install.sh:61:- Add `data-otop-id` + `data-testid` to every interactive UI component (Web).
./otop.audit.uiids.md:41:./scripts/otop-install.sh:62:- React Native: add `testID` + `accessibilityLabel="otop:<id>"`.
./otop.audit.uiids.md:43:### data-otop-id / otop label
./docs/prompts/02_v0_prompt.txt:7:  - Jeder interaktive Control bekommt data-otop-id + data-testid
./docs/prompts/04_checklist.txt:10:  - data-otop-id + data-testid überall
