# /test - Tests ausführen

## Schritte

1. **Alle Tests**
   ```bash
   npm run test
   ```

2. **Bei Fehlern**
   - Zeige fehlgeschlagene Tests
   - Analysiere Ursache
   - Schlage Fix vor

3. **Coverage prüfen**
   ```bash
   npm run test:coverage
   ```

## Output

```
✅ 42 Tests bestanden
❌ 3 Tests fehlgeschlagen
📊 Coverage: 78%

Fehlgeschlagen:
1. UserAuth.test.ts:23 - "should validate token"
   Erwartet: true
   Bekommen: false
   → Mögliche Ursache: Token-Expiry nicht geprüft
```
