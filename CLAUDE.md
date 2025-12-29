# Code Cloud Agents - Rules

## Sprache
- Antworte immer auf **Deutsch**
- Code-Kommentare auf **Englisch**

---

## ⚠️ KRITISCHE VERHALTENSREGELN

### Keine Lügen, keine Halluzinationen
- **NIEMALS** Informationen erfinden
- **NIEMALS** Code generieren der nicht funktioniert
- Wenn unsicher → nachfragen oder recherchieren
- Nur Fakten, die verifizierbar sind

### Zügig arbeiten, nicht warten
- **NICHT** auf User warten wenn nicht nötig
- Wenn Task unabhängig von API/Input → sofort weitermachen
- Beispiel: Agent braucht API-Key → trotzdem alles andere fertig bauen
- Parallelisieren wo möglich

### Aktiv denken und prüfen
- **VOR** dem Coden: Plan erstellen
- **WÄHREND** dem Coden: Fehler aktiv suchen
- **NACH** dem Coden: Testen, verifizieren
- Checkliste mental durchgehen:
  - [ ] Frontend fertig?
  - [ ] Backend fertig?
  - [ ] Frontend ↔ Backend verbunden?
  - [ ] Types geteilt?
  - [ ] Error-Handling?
  - [ ] Security?
  - [ ] Tests?

### Nichts vergessen
- **IMMER** vollständig implementieren
- Keine halben Sachen
- Keine "TODO später" ohne Grund
- Integration Frontend ↔ Backend **NICHT** vergessen

### Wenig reden, viel coden
- Kurze Erklärungen
- Schnell zum Code
- Ergebnisse zeigen statt beschreiben
- Bei Fragen: konkret und präzise

### Proaktiv Fehler melden & verbessern
- **UX-Fehler** sofort ansprechen (schlechte Usability, verwirrende UI)
- **Code-Smells** aktiv melden (Duplikate, schlechte Namen, fehlende Types)
- **Performance-Probleme** identifizieren und Lösung vorschlagen
- **Security-Lücken** sofort flaggen
- **Optimierungen** vorschlagen:
  - Bessere Algorithmen
  - Cleaner Code
  - Modernere Patterns
  - Fehlende Best Practices
- Nicht nur ausführen → **mitdenken und verbessern**

### Nichts eigenmächtig ändern
- **KEINE** selbstständigen Design-Änderungen
- **KEINE** unaufgeforderten Refactorings
- **KEINE** "Verbesserungen" ohne Rücksprache
- Vorschlagen: ✅ JA → Selbst umsetzen: ❌ NEIN
- Immer **fragen** bevor größere Änderungen
- Nur das umsetzen was **explizit beauftragt** wurde

---

## Coding Standards

### TypeScript
- TypeScript verwenden, strikte Typisierung (`strict: true`)
- **Keine `any` Types** – immer explizite Typen definieren
- Modulare Architektur mit klaren Schnittstellen

### Namenskonventionen
| Element | Convention | Beispiel |
|---------|------------|----------|
| Variablen | camelCase | `userName`, `isLoading` |
| Komponenten/Klassen | PascalCase | `AgentCard`, `FileSearchService` |
| Konstanten | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |

### Dokumentation
- Jede Funktion/Komponente mit **JSDoc** dokumentieren
```typescript
/**
 * Searches files on disk based on query
 * @param query - Natural language search query
 * @param options - Search configuration options
 * @returns Array of matching file paths
 */
```

---

## Frontend-Backend-Integration

1. **API-Endpunkte** immer explizit mit Frontend-Komponenten verknüpfen
2. **Login/Auth**: Backend-Route UND Frontend-Handler gemeinsam implementieren
3. **State-Management** vor UI-Komponenten entwickeln
4. **Error-Handling** für ALLE API-Aufrufe:
   - try/catch
   - Loading-States
   - Error-States
5. **API-Response-Types** zwischen Frontend und Backend teilen (`/src/shared/types/`)

---

## Entwicklungsprozess

1. Code in **kleinen, testbaren Schritten** generieren
2. Nach jedem Schritt: **Funktionalität verifizieren** bevor weiter
3. Bei Fehlern: **Exakte Error-Message analysieren**, Root Cause zuerst fixen
4. **Keine isolierten Snippets** – immer Kontext zur Gesamtarchitektur beachten
5. **Abhängigkeiten** zwischen Modulen explizit benennen

---

## Sicherheit

- [ ] Input-Validierung auf Frontend **UND** Backend
- [ ] XSS/SQL-Injection Prevention beachten
- [ ] Secrets **niemals** im Code hardcoden – Environment Variables nutzen
- [ ] Authentication/Authorization bei **jedem** Endpoint prüfen

### Verbotene Dateien
```
.env
.env.local
secrets/
credentials/
*.pem
*.key
```

---

## Code-Qualität

### DRY-Prinzip
Wiederholungen vermeiden, in Funktionen auslagern

### Single Responsibility
Eine Funktion = eine Aufgabe

### Früh returnen
```typescript
// Gut ✅
function process(data: Data | null): Result {
  if (!data) return null;
  if (!data.isValid) return { error: 'Invalid' };

  return processData(data);
}

// Schlecht ❌
function process(data: Data | null): Result {
  if (data) {
    if (data.isValid) {
      return processData(data);
    } else {
      return { error: 'Invalid' };
    }
  }
  return null;
}
```

### Aussagekräftige Namen
```typescript
// Gut ✅
const isUserAuthenticated = checkAuth(user);
const fetchUserProfile = async (userId: string) => { ... };

// Schlecht ❌
const x = check(u);
const getData = async (id) => { ... };
```

---

## Supervisor-System (Cloud Agents)

### Hierarchie
```
META_SUPERVISOR (Routing + Monitoring)
    ↓
ENGINEERING_LEAD_SUPERVISOR (Plan + Delegate + Verify + STOP)
    ↓
CLOUD_ASSISTANT (Execute + Report + Evidence)
```

### Kernprinzipien
1. **Evidence-Based Verification**: Keine Behauptung ohne Beweis
2. **STOP is Success**: Bei Risiko ist STOP die richtige Entscheidung
3. **Cross-Layer Consistency**: Frontend ↔ Backend ↔ Database Alignment

### STOP-Score (0-100)
| Score | Risk Level | Aktion |
|-------|------------|--------|
| 0-19 | LOW | Weiter |
| 20-44 | MEDIUM | Review |
| 45-69 | HIGH | Approval nötig |
| 70-100 | CRITICAL | **STOP_REQUIRED** |

---

## 🔐 GIT-WORKFLOW FÜR ALLE AGENTEN (PFLICHT!)

### Grundregeln
```yaml
# Server .env Konfiguration
GIT_MODE=branch_push              # Immer Feature-Branch erstellen
PR_REQUIRE_GREEN_CI=true          # CI muss grün sein vor Merge
RUN_MODE=allowlist                # Nur erlaubte Commands
REDACT_SECRETS=true               # Secrets aus Logs entfernen
```

### ❌ VERBOTEN
1. **NIEMALS** direkt auf `main` branch pushen
2. **NIEMALS** auf `main` committen
3. **NIEMALS** force push (`git push --force`)
4. **NIEMALS** Hooks überspringen (`--no-verify`)
5. **NIEMALS** Git-History umschreiben (außer auf eigenem Branch vor Push)

### ✅ PFLICHT-WORKFLOW

#### Schritt 1: Feature-Branch erstellen
```bash
# Branch-Naming Convention:
git checkout -b agent-aX-feature-name

# Beispiele:
git checkout -b agent-a2-setup
git checkout -b agent-a5-design-ux
git checkout -b agent-fixes-and-features
```

#### Schritt 2: Änderungen committen
```bash
# Alle Änderungen stagen
git add -A

# Commit mit Co-Authored-By
git commit -m "feat: implement feature X

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Commit-Message Format:**
```
<type>: <kurze beschreibung>

[Optionale längere Beschreibung]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**
- `feat:` - Neues Feature
- `fix:` - Bug-Fix
- `docs:` - Dokumentation
- `style:` - Code-Formatierung
- `refactor:` - Code-Refactoring
- `test:` - Tests hinzufügen
- `chore:` - Build/Dependencies

#### Schritt 3: Push zu origin
```bash
# Ersten Push mit -u flag
git push -u origin agent-aX-feature-name

# Weitere Pushes
git push
```

#### Schritt 4: Pull Request erstellen
```bash
# Mit GitHub CLI (gh)
gh pr create --title "feat: implement feature X" --body "$(cat <<'EOF'
## Summary
- Was wurde implementiert
- Warum wurde es implementiert

## Changes
- Datei 1: Was geändert
- Datei 2: Was geändert

## Test plan
- [ ] Backend startet
- [ ] Frontend startet
- [ ] Tests bestehen
- [ ] Manuelle Tests durchgeführt

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

#### Schritt 5: Merge-Reihenfolge einhalten
```
A2 (Setup) → main (ZUERST)
    ↓
A1 (Docs) → main
    ↓
A3 (Integrations) → main
    ↓
A4 (Docs) → main
    ↓
A5 (Design) → main (ZULETZT)
```

### 🔍 Git-Status vor JEDEM Commit prüfen
```bash
# 1. Status prüfen
git status

# 2. Diff prüfen (was wird committed)
git diff --staged

# 3. Sicherstellen dass keine Secrets committed werden
git diff --staged | grep -i "api_key\|password\|secret\|token"

# 4. Erst dann committen
git commit -m "..."
```

### 🚨 Wenn Hook fehlschlägt

**Wenn Commit ABGELEHNT wurde (Hook rejected):**
```bash
# ❌ NICHT amend verwenden!
# ✅ Problem fixen, dann NEUEN Commit erstellen
git add -A
git commit -m "fix: resolve hook issues"
```

**Wenn Commit ERFOLGREICH war, aber Hook Auto-Modifications gemacht hat:**
```bash
# Nur WENN:
# 1. HEAD commit wurde von dir erstellt (git log -1)
# 2. Commit ist NICHT gepusht (git status zeigt "ahead")
# DANN darfst du amend verwenden:
git add -A
git commit --amend --no-edit
```

### 📋 Vor jedem Push - Checkliste

- [ ] Branch-Name folgt Convention (`agent-aX-*`)
- [ ] Commit-Message hat Co-Authored-By
- [ ] Keine `.env` oder Secrets im Commit
- [ ] `git status` ist sauber
- [ ] Backend startet ohne Fehler
- [ ] Frontend startet ohne Fehler
- [ ] Tests bestehen (`npm test`)
- [ ] Keine TypeScript-Fehler

### 🔗 Troubleshooting

#### Problem: "fatal: could not read Username"
```bash
# GitHub CLI authentifizieren
gh auth login
```

#### Problem: "rejected: cannot push to main"
```bash
# Falscher Branch! Zurück zu Feature-Branch
git checkout agent-aX-feature-name
```

#### Problem: "Your branch is behind"
```bash
# Erst pullen, dann pushen
git pull origin agent-aX-feature-name
git push
```

#### Problem: Merge-Konflikt
```bash
# Lokale Änderungen sichern
git stash

# Remote holen
git pull

# Änderungen zurück
git stash pop

# Konflikte lösen (in Files)
# Dann:
git add -A
git commit -m "fix: resolve merge conflicts"
git push
```

---

## AI-Provider Integration

### Priorität
1. **Cloud AI** (wenn Internet verfügbar):
   - Claude (Anthropic)
   - GPT-4 (OpenAI)
   - Grok (xAI)

2. **Lokale AI** (offline Fallback):
   - Ollama (Llama, Mistral)
   - LM Studio

### API-Key Konfiguration
```bash
# .env.local (niemals committen!)
ANTHROPIC_API_KEY=sk-...
OPENAI_API_KEY=sk-...
XAI_API_KEY=xai-...
```

---

## 🧪 TEST-AUTOMATISIERUNG (PFLICHT)

### UI Test-IDs (PFLICHT für alle UI-Elemente)

```tsx
// React/TypeScript
<Button data-testid="login_button_submit">Login</Button>
<Input data-testid="login_input_email" />
<div data-testid="dashboard_card_agents" />
```

**Naming Convention:** `screenName_elementType_beschreibung`

Beispiele:
- `login_button_submit`
- `dashboard_list_agents`
- `settings_toggle_darkmode`
- `chat_input_message`

### Test-Typen

| Typ | Wann | Beispiel |
|-----|------|----------|
| Unit Test | Jede Utility-Funktion | `auth.test.ts` |
| Integration Test | Jeder Screen/API | `github-api.test.ts` |
| E2E Test | Kritische Flows | `login-flow.test.ts` |

### Vor jedem Commit - Checkliste

- [ ] Alle neuen UI-Elemente haben `data-testid`
- [ ] Alle neuen Funktionen haben Unit Tests
- [ ] Alle Tests laufen durch (`npm test`)
- [ ] TypeScript hat keine Fehler (`npx tsc --noEmit`)

### Test-Befehle

```bash
# Alle Tests ausführen
npm test

# Einzelnen Test ausführen
npx tsx --test tests/auth-middleware.test.ts

# Type Check
npx tsc --noEmit
```

### CI/CD Integration

- Tests laufen automatisch bei Push auf `main/develop`
- Tests laufen bei Pull Requests
- Tägliche Tests um 6:00 UTC
- CI muss grün sein vor Merge
