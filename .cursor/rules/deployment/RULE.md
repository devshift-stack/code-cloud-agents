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

- `.env.example` mit allen benötigten Variablen
- Secrets NIEMALS committen
- Separate Configs für: development, staging, production

## Verboten
- Deploy ohne vollständige Checkliste
- Secrets in Git committen
- Production-Deploy ohne Test auf Staging
