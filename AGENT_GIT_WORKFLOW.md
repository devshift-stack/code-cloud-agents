# 🔀 AGENT GIT WORKFLOW - PFLICHTREGELN

**Projekt:** Optimizecodecloudagents
**Repo:** github.com/dsactivi-2/Optimizecodecloudagents
**Main Branch:** main

---

## ⚠️ KRITISCHE REGELN

### ❌ VERBOTEN

1. **NIEMALS direkt auf `main` pushen**
2. **NIEMALS `git push --force` verwenden**
3. **NIEMALS ohne Commit-Message pushen**
4. **NIEMALS API-Keys/Secrets committen**

### ✅ PFLICHT

1. **IMMER Feature-Branch erstellen**
2. **IMMER aussagekräftige Commit-Messages**
3. **IMMER Co-Authored-By hinzufügen**
4. **IMMER vor Push: Tests laufen lassen**

---

## 📋 WORKFLOW (Schritt für Schritt)

### Schritt 1: Feature-Branch erstellen

```bash
# Von main starten
git checkout main
git pull origin main

# Neuen Branch erstellen (Naming: agent-aX-feature-name)
git checkout -b agent-a2-setup-fixes
# oder
git checkout -b agent-a3-whatsapp-integration
# oder
git checkout -b agent-a5-design-system
```

**Branch-Naming-Convention:**

- `agent-a1-*` - Agent A1 (Dokumentation)
- `agent-a2-*` - Agent A2 (Setup/Infrastructure)
- `agent-a3-*` - Agent A3 (Integrations)
- `agent-a4-*` - Agent A4 (API Docs)
- `agent-a5-*` - Agent A5 (Design/UX)
- `feature/*` - Allgemeine Features
- `fix/*` - Bugfixes

---

### Schritt 2: Änderungen committen

```bash
# Alle Änderungen stagen
git add -A

# Status prüfen (WICHTIG: .env darf NICHT dabei sein!)
git status

# Commit mit aussagekräftiger Message
git commit -m "$(cat <<'EOF'
feat: implement WhatsApp Business API integration

- Add WhatsApp client in src/integrations/whatsapp/
- Add API endpoints for sending messages
- Add webhook receiver for incoming messages
- Add tests for WhatsApp integration

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**Commit-Message-Format:**

```
<type>: <kurze beschreibung>

<detaillierte beschreibung>
- Bullet point 1
- Bullet point 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**

- `feat:` - Neues Feature
- `fix:` - Bugfix
- `docs:` - Dokumentation
- `refactor:` - Code-Refactoring
- `test:` - Tests hinzufügen
- `chore:` - Maintenance (Dependencies, Config)

---

### Schritt 3: Push zu Remote

```bash
# Ersten Push mit -u (upstream setzen)
git push -u origin agent-a2-setup-fixes

# Weitere Pushes (wenn Branch schon existiert)
git push
```

---

### Schritt 4: Pull Request erstellen (Optional)

```bash
# Mit GitHub CLI (gh)
gh pr create \
  --title "feat: WhatsApp Business API integration" \
  --body "$(cat <<'EOF'
## Summary
- ✅ WhatsApp client implementiert
- ✅ API endpoints hinzugefügt
- ✅ Webhook receiver funktioniert
- ✅ Tests bestehen

## Test plan
- [ ] Manuelle Tests durchgeführt
- [ ] Unit Tests bestehen
- [ ] Integration mit echtem WhatsApp Account getestet

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

# Oder manuell auf GitHub:
# https://github.com/dsactivi-2/Optimizecodecloudagents/compare/main...agent-a2-setup-fixes
```

---

## 🚨 SICHERHEITS-CHECKS

### Vor jedem Commit:

```bash
# 1. Prüfe auf Secrets
git diff | grep -E "(API_KEY|SECRET|PASSWORD|TOKEN)" && echo "⚠️ WARNUNG: Potentieller Secret gefunden!"

# 2. Prüfe .gitignore
cat .gitignore | grep -E "(.env|secrets/|credentials/)" || echo "⚠️ .env fehlt in .gitignore!"

# 3. Prüfe ob .env staged ist
git status | grep ".env" && echo "❌ FEHLER: .env darf nicht committed werden!"
```

### Nach jedem Push:

```bash
# Verifiziere dass Push erfolgreich war
git log origin/$(git branch --show-current) -1

# Prüfe Remote-Status
git fetch origin
git status
```

---

## 🔄 MERGE-PROZESS

### Agent A2 (Setup) - Zuerst mergen

```bash
git checkout main
git pull origin main
git merge agent-a2-setup-fixes
git push origin main
```

### Agent A1 (Docs) - Nach A2

```bash
# Warten bis A2 gemerged ist
git checkout main
git pull origin main
git merge agent-a1-documentation
git push origin main
```

### Agent A3 (Integrations) - Nach A1

```bash
git checkout main
git pull origin main
git merge agent-a3-integrations
git push origin main
```

### Agent A4 (API Docs) - Nach A3

```bash
git checkout main
git pull origin main
git merge agent-a4-api-docs
git push origin main
```

**Merge-Reihenfolge:**

```
A2 (Setup) → A1 (Docs) → A3 (Integrations) → A4 (API Docs) → A5 (Design)
```

---

## 🛠️ KONFLIKT-LÖSUNG

### Bei Merge-Konflikten:

```bash
# 1. Aktuellen Stand stashen
git stash

# 2. Main pullen
git checkout main
git pull origin main

# 3. Zurück zum Feature-Branch
git checkout agent-a2-setup-fixes

# 4. Main in Feature-Branch mergen
git merge main

# 5. Konflikte manuell lösen (in Editor)
# Dateien öffnen, <<<<< ===== >>>>> Marker entfernen

# 6. Resolved markieren
git add <gelöste-datei>

# 7. Merge abschließen
git commit -m "merge: resolve conflicts with main"

# 8. Stash zurückholen
git stash pop
```

---

## 📊 HILFREICHE BEFEHLE

```bash
# Aktuellen Branch anzeigen
git branch --show-current

# Alle Branches anzeigen
git branch -a

# Letzten Commit rückgängig machen (lokal)
git reset --soft HEAD~1

# Branch löschen (lokal)
git branch -d agent-a2-setup-fixes

# Branch löschen (remote)
git push origin --delete agent-a2-setup-fixes

# Änderungen anzeigen
git diff

# Commit-History anzeigen
git log --oneline -10

# Remote-Status prüfen
git remote -v

# Zeige nicht-getrackete Dateien
git status --untracked-files
```

---

## ✅ PRE-PUSH CHECKLIST

Vor jedem Push diese Punkte prüfen:

- [ ] Feature-Branch erstellt (nicht auf main)
- [ ] Aussagekräftige Commit-Message
- [ ] Co-Authored-By hinzugefügt
- [ ] Keine Secrets im Code (.env nicht staged)
- [ ] Tests laufen durch (`npm test`)
- [ ] Backend startet (`npm run backend:dev`)
- [ ] Keine TypeScript-Errors (kritische)
- [ ] Git-Status sauber (`git status`)

---

## 🎯 BEISPIEL-SESSION

```bash
# 1. Feature-Branch erstellen
git checkout main
git pull origin main
git checkout -b agent-a3-slack-integration

# 2. Code schreiben
# ... Dateien ändern ...

# 3. Committen
git add -A
git status  # Prüfen!
git commit -m "feat: add Slack integration

- Slack client implemented
- API endpoints added
- Webhook receiver working

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 4. Pushen
git push -u origin agent-a3-slack-integration

# 5. PR erstellen (optional)
gh pr create --title "feat: Slack integration" --body "..."

# 6. Warten auf Review/Merge
```

---

**Zuletzt aktualisiert:** 2025-12-26
**Version:** 1.0
**Status:** ✅ Produktiv
