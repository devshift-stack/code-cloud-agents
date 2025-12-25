# /review - Code Review durchführen

## Prüfe den aktuellen Code auf

### Kritisch
- [ ] **Sicherheitslücken** - SQL Injection, XSS, CSRF, Auth-Bypass
- [ ] **Secrets im Code** - API Keys, Passwörter, Tokens
- [ ] **Error Handling** - Unhandled Exceptions, fehlende Try-Catch

### Wichtig
- [ ] **TypeScript Fehler** - Strict Mode Violations
- [ ] **Performance** - N+1 Queries, Memory Leaks, unnötige Re-Renders
- [ ] **Code-Duplikation** - DRY Violations

### Nice-to-have
- [ ] **Code Style** - Konsistenz, Naming
- [ ] **Dokumentation** - Fehlende JSDoc für komplexe Funktionen

## Output Format

Für jedes Finding:
```
[KRITISCH/WICHTIG/HINWEIS] datei.ts:42
Beschreibung des Problems
→ Lösungsvorschlag
```

## Am Ende

- Zusammenfassung: X kritisch, Y wichtig, Z Hinweise
- Bei kritischen Findings: NICHT mergen empfehlen
