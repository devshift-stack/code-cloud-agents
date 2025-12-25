# /fix - Bug systematisch beheben

## Schritte

1. **Bug verstehen**
   Frage den User:
   - Was ist das erwartete Verhalten?
   - Was passiert stattdessen?
   - Wie reproduziert man den Bug?

2. **Ursache finden**
   - Relevante Dateien identifizieren
   - Code durchlesen
   - Fehlerquelle lokalisieren

3. **Root Cause analysieren**
   - WARUM tritt der Bug auf?
   - Nicht nur Symptom, sondern Ursache finden

4. **Fix implementieren**
   - Minimalen Fix machen (nicht über-engineeren)
   - Keine anderen Änderungen einbauen

5. **Testen**
   - Manuell testen ob Bug behoben
   - Prüfen ob nichts anderes kaputt

6. **Optional: Test schreiben**
   - Fragen: "Soll ich einen Test schreiben der diesen Bug abdeckt?"

## Output

```
🐛 Bug: [Beschreibung]
📍 Ursache: [Datei:Zeile] - [Erklärung]
✅ Fix: [Was wurde geändert]
🧪 Getestet: [Wie verifiziert]
```
