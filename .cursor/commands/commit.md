# /commit - Git Commit erstellen

## Schritte

1. **Status prüfen**
   ```bash
   git status
   git diff --staged
   git diff
   ```

2. **Änderungen analysieren**
   - Was wurde geändert?
   - Warum wurde es geändert?
   - Welcher Typ: feat, fix, refactor, docs, test, chore?

3. **Commit Message schreiben**
   Format: `type: kurze beschreibung`

   Beispiele:
   - `feat: add user authentication`
   - `fix: resolve memory leak in dashboard`
   - `refactor: simplify API client`

4. **Commit ausführen**
   ```bash
   git add -A
   git commit -m "message"
   ```

5. **Push fragen**
   "Soll ich die Änderungen pushen?"
   - Ja → `git push`
   - Nein → Fertig

## NIEMALS

- .env oder Secrets committen
- Ohne Review bei kritischen Änderungen committen
- Force-Push ohne explizite Anweisung
