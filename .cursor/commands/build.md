# /build - Build-Prozess ausführen

## Schritte

1. **TypeScript prüfen**
   ```bash
   npm run typecheck
   ```
   Bei Fehlern: STOPP und Fehler auflisten

2. **Lint prüfen**
   ```bash
   npm run lint
   ```
   Bei Fehlern: Automatisch fixen oder auflisten

3. **Build ausführen**
   ```bash
   npm run build
   ```

4. **Ergebnis melden**
   - ✅ Build erfolgreich - zeige Output-Größe
   - ❌ Build fehlgeschlagen - zeige Fehler und Lösungsvorschläge

## Bei Fehlern

Nicht einfach aufgeben! Analysiere den Fehler und:
- Schlage Fix vor
- Führe Fix aus (nach Bestätigung)
- Baue erneut
