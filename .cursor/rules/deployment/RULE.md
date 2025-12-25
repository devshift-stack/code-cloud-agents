---
description: "Deployment Checkliste - vor jedem Deploy prüfen"
globs: ["**/deploy*", "**/ci*", "**/.github/**"]
alwaysApply: false
---

# Deployment

## Checkliste vor JEDEM Deploy

- [ ] Build läuft fehlerfrei (`npm run build`)
- [ ] Keine TypeScript Errors
- [ ] Keine Console Errors im Browser
- [ ] Environment Variables gesetzt
- [ ] API URLs für Production angepasst
- [ ] CORS konfiguriert
- [ ] Tests bestanden
- [ ] Mobile getestet

## Environment Management
- Secrets NIEMALS committen
- .env.example pflegen
- Production vs Development URLs trennen
