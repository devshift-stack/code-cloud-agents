# /status - Projekt-Status anzeigen

## Sammeln

1. **Git Status**
   ```bash
   git status
   git log -5 --oneline
   git branch -vv
   ```

2. **Build Status**
   ```bash
   npm run build 2>&1 | tail -20
   ```

3. **Dependencies**
   ```bash
   npm outdated
   ```

4. **TODOs**
   ```bash
   grep -r "TODO\|FIXME" src/ --include="*.ts" --include="*.tsx" | head -20
   ```

## Output

```
📊 PROJEKT STATUS

Git:
├── Branch: feature/auth
├── Ahead: 3 commits
├── Behind: 0 commits
└── Uncommitted: 2 files

Build:
└── ✅ Erfolgreich (oder ❌ Fehlgeschlagen)

Dependencies:
└── 3 outdated packages

TODOs: 7 offen
├── src/auth.ts:42 - Implement refresh token
└── ...
```
