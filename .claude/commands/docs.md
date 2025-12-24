---
description: Dokumentation erstellen oder aktualisieren
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Documentation Agent

Erstelle/Aktualisiere Dokumentation für: $ARGUMENTS

## Dokumentations-Typen

### 1. README.md
- Projekt-Beschreibung
- Quick Start Guide
- Installation
- Usage Examples
- Contributing Guidelines

### 2. API Documentation
- Endpoints Liste
- Request/Response Beispiele
- Authentication
- Error Codes
- Rate Limits

### 3. Code Documentation
- JSDoc für alle Funktionen
- Inline Kommentare für komplexe Logik
- Type Definitions

### 4. User Guide
- Getting Started
- Features Übersicht
- Step-by-Step Tutorials
- FAQ
- Troubleshooting

### 5. Architecture Docs
- System Overview
- Component Diagram
- Data Flow
- Tech Stack
- Design Decisions

## Output Format

```markdown
# [Titel]

## Übersicht
[Kurze Beschreibung]

## Inhaltsverzeichnis
1. [Section 1]
2. [Section 2]
...

## [Section 1]
[Inhalt]

## [Section 2]
[Inhalt]

---
*Erstellt am: [Datum]*
*Version: [Version]*
```

## Regeln

- Deutsch für User-facing Docs
- Englisch für Code-Docs
- Beispiele immer inkludieren
- Screenshots wo hilfreich
- Aktuell halten bei Code-Änderungen
