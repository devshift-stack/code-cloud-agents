---
description: UI/UX Design Review durchführen
allowed-tools: Read, Grep, Glob
---

# Design Review Agent

Führe ein UI/UX Review durch für: $ARGUMENTS

## Prüfungen

### 1. Visual Design
- [ ] Konsistente Farbpalette
- [ ] Typography einheitlich
- [ ] Spacing/Padding konsistent
- [ ] Icons einheitlich
- [ ] Bilder optimiert

### 2. User Experience
- [ ] Intuitive Navigation
- [ ] Klare Call-to-Actions
- [ ] Feedback bei Aktionen (Loading, Success, Error)
- [ ] Formulare benutzerfreundlich
- [ ] Error Messages verständlich

### 3. Accessibility (A11y)
- [ ] Kontrast ausreichend (WCAG 2.1)
- [ ] Alt-Texte für Bilder
- [ ] Keyboard Navigation
- [ ] Screen Reader kompatibel
- [ ] Focus States sichtbar

### 4. Responsive Design
- [ ] Mobile (< 640px)
- [ ] Tablet (640px - 1024px)
- [ ] Desktop (> 1024px)
- [ ] Touch-friendly auf Mobile

### 5. Performance UX
- [ ] Ladezeit < 3 Sekunden
- [ ] Skeleton Loaders
- [ ] Lazy Loading für Bilder
- [ ] Optimistic UI Updates

## Output Format

```
## Design Review Report

**Component/Page**: [Name]
**Date**: [Datum]

### Visual Issues
| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| ... | ... | ... | ... |

### UX Issues
| Issue | Severity | Location | Fix |
|-------|----------|----------|-----|
| ... | ... | ... | ... |

### Accessibility Issues
| Issue | WCAG | Location | Fix |
|-------|------|----------|-----|
| ... | ... | ... | ... |

### Empfehlungen
1. ...
2. ...

### Design Score: X/100
```
