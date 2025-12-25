# /refactor - Code verbessern

## Analysiere

1. **Code Smells finden**
   - Duplikation
   - Lange Funktionen (>50 Zeilen)
   - Tiefe Verschachtelung (>3 Ebenen)
   - God Objects
   - Magic Numbers/Strings

2. **Verbesserungen vorschlagen**
   Für jedes Problem:
   ```
   📍 datei.ts:42-67
   Problem: Funktion zu lang (87 Zeilen)
   → Aufteilen in: processInput(), validateData(), saveResult()
   ```

3. **Bestätigung einholen**
   "Soll ich diese Refactorings durchführen?"

4. **Refactoring durchführen**
   - Kleine Schritte
   - Nach jedem Schritt testen
   - Keine Funktionalität ändern

## Regeln

- Verhalten NICHT ändern
- Tests müssen weiterhin passen
- Commit nach jedem größeren Refactoring
