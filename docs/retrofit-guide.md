# Retrofit Guide (rückwirkend umstellen)

## Warum rückwirkend in Schritten?
Wenn du „alles auf einmal“ in 22 Repos umstellst, entsteht Chaos (Merge-Konflikte, UI-Brüche). Darum:

1) **Standards + Checks überall einführen** (OTOP Pack)
2) **Baselines/Reports erzeugen** (Audit)
3) **Gezielt nachziehen** (repoweise, screenweise)

---

## Schritt 1: Pack in alle Repos übernehmen
- `bash otop-pack-v1/scripts/otop-install.sh <root-mit-repos>`

Das kopiert:
- `docs/otop-standard.md`
- `docs/prompts/*`
- `rules/spectral-otop.yml`
- `scripts/*`
- `.github/workflows/otop-*.yml` (statische Checks)
- Ergänzt optional `AGENTS.md`

---

## Schritt 2: Baseline pro Repo erzeugen
In jedem Repo:
```bash
bash scripts/otop-scan.sh
bash scripts/otop-uiid-audit.sh
bash scripts/otop-openapi-lint.sh
bash scripts/otop-env-audit.sh
```

Ergebnis:
- `otop.config.json` (Scan)
- `otop.audit.uiids.md` (UI-ID Coverage)
- `otop.audit.env.md` (Hardcoded URL Findings)
- Lint-Output für OpenAPI

---

## Schritt 3: Priorisierung (empfohlen)
Basierend auf deinem aktuellen Report:
- **partner**: Hardcoded URLs → ENV (kritisch, sonst nie sauber deploybar)
- **CRM-activi**: OpenAPI ohne operationId → nicht verlinkbar
- **code-cloud-agents / Optimizecodecloudagents**: OpenAPI+Health ok, aber UI-IDs fehlen komplett

---

## Schritt 4: UI IDs rückwirkend einführen (Web)
### 4.1 Schnellster Hebel: “Design System Wrapper”
Lege zentral Komponenten an, die IDs erzwingen:
- `OButton`, `OInput`, `OSelect`, `OLink`
- Props: `otopId` (string), setzt automatisch beide Attribute

Dann ersetzt du schrittweise:
- `<Button ...>` → `<OButton otopId="..." ...>`

### 4.2 Heuristik für IDs (damit KI konsistent bleibt)
- Domain: `crm|agents|auth|telephony|admin|utils`
- entity: `candidate|job|task|agent|user|...`
- screen: `list|detail|form|settings|...`
- component: `table|search|modal|toolbar|...`
- action: `create|save|delete|edit|open|close|...`

### 4.3 Minimalziel pro Screen
- Primary Buttons (Create/Save/Delete/Cancel)
- Inputs/Selects im Form
- Navigation Tabs/Links

---

## Schritt 5: UI IDs rückwirkend einführen (React Native)
- `testID` + `accessibilityLabel="otop:<id>"`
- Für “Custom Buttons” zentral Wrapper `OButtonRN` bauen, der beide setzt.

---

## Schritt 6: OpenAPI operationId rückwirkend ergänzen
Wenn OpenAPI im Repo liegt:
- Führe `python scripts/otop-add-operationid.py api/openapi.yaml` aus
- Danach `bash scripts/otop-openapi-lint.sh`

---

## Schritt 7: “Stop the bleeding”
Sobald ein Repo angefangen hat:
- CI/PR-Checks aktivieren, die neue UI ohne IDs blocken
- OpenAPI ohne operationId blocken

So wächst die Qualität automatisch.
