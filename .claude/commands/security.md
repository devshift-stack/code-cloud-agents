---
description: Sicherheits-Audit durchführen
allowed-tools: Read, Grep, Glob, Bash(npm:*), Bash(git:*)
---

# Security Audit Agent

Führe ein Sicherheits-Audit durch für: $ARGUMENTS

## Prüfungen

### 1. Secrets & Credentials
- [ ] Keine hardgecodeten API-Keys
- [ ] Keine Passwörter im Code
- [ ] .env Dateien in .gitignore
- [ ] Keine Secrets in Git History

### 2. Input Validierung
- [ ] Frontend: Alle User-Inputs validiert
- [ ] Backend: Alle API-Inputs validiert
- [ ] SQL Injection Prevention
- [ ] XSS Prevention

### 3. Authentication & Authorization
- [ ] Auth auf allen geschützten Routen
- [ ] Token Expiration konfiguriert
- [ ] CORS richtig konfiguriert
- [ ] Rate Limiting aktiv

### 4. Dependencies
- [ ] `npm audit` ausführen
- [ ] Keine bekannten Vulnerabilities
- [ ] Dependencies aktuell

### 5. OWASP Top 10
- [ ] Injection
- [ ] Broken Authentication
- [ ] Sensitive Data Exposure
- [ ] XML External Entities
- [ ] Broken Access Control
- [ ] Security Misconfiguration
- [ ] Cross-Site Scripting
- [ ] Insecure Deserialization
- [ ] Using Components with Known Vulnerabilities
- [ ] Insufficient Logging & Monitoring

## Output Format

```
## Security Audit Report

**Scan Date**: [Datum]
**Scope**: [Bereich]

### Critical Issues 🔴
- ...

### High Issues 🟠
- ...

### Medium Issues 🟡
- ...

### Low Issues 🟢
- ...

### Empfehlungen
1. ...
2. ...

### STOP-Score Security: X/100
```
