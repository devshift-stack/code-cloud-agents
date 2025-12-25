# /morning - Täglicher Arbeitsbeginn

## Automatisch ausführen

1. **Git Status**
   ```bash
   git status
   git log -5 --oneline --all
   git fetch origin
   ```

2. **Offene Branches**
   ```bash
   git branch -a
   ```

3. **TODOs im Code suchen**
   ```bash
   grep -r "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx"
   ```

4. **Dependencies prüfen**
   ```bash
   npm outdated
   ```

5. **Memory laden**
   Rufe `memory_context` auf um relevanten Kontext zu laden:
   - Offene Todos
   - Letzte Entscheidungen
   - Wo wurde gestern aufgehört

## Output

Zeige übersichtlich:
- 📋 Offene Tasks
- 🔄 Ausstehende PRs
- ⚠️ TODOs im Code
- 📦 Veraltete Packages
- 💡 Kontext von gestern
