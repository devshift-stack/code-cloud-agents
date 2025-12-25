# /deploy - Deployment Checkliste

## Vor dem Deploy prüfen

- [ ] `npm run build` erfolgreich
- [ ] Keine TypeScript Fehler
- [ ] Keine Console Errors
- [ ] Tests bestanden
- [ ] Environment Variables gesetzt
- [ ] API URLs für Production
- [ ] CORS konfiguriert
- [ ] Mobile getestet

## Schritte

1. **Build prüfen**
   ```bash
   npm run build
   ```

2. **Git Status**
   ```bash
   git status
   git log -3 --oneline
   ```

3. **Bestätigung einholen**
   Zeige dem User:
   - Was wird deployed
   - Welche Änderungen seit letztem Deploy
   - Ziel-Environment (staging/production)

4. **Erst nach expliziter Bestätigung deployen**

## NIEMALS

- Ohne Bestätigung deployen
- Mit fehlgeschlagenem Build deployen
- Secrets in Logs ausgeben
