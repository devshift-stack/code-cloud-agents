---
description: "Memory-Nutzung - wann und was im Langzeitgedächtnis speichern"
alwaysApply: true
---

# Memory-Nutzung

## Wann speichern?

### IMMER speichern

| Situation | Memory-Typ | Beispiel |
|-----------|------------|----------|
| User sagt Präferenz | `preference` | "Ich will kurze Antworten" |
| Architektur-Entscheidung | `decision` | "Wir nutzen Pinecone statt Firebase" |
| Bug gelöst | `solution` | "CORS-Error gelöst durch proxy config" |
| Etwas funktioniert nicht | `learning` | "Qonto API braucht separaten Key" |
| Neuer Task kommt | `todo` | "Buchhaltungs-Tool bauen" |
| Session endet | `conversation` | Zusammenfassung der Session |

### NIE speichern

- Temporäre Debug-Infos
- Offensichtliche Dinge ("User nutzt TypeScript")
- Dinge die sich ständig ändern

## Security-Level wählen

| Level | Wann nutzen |
|-------|-------------|
| `public` | Allgemeine Projekt-Infos |
| `internal` | Team-relevante Entscheidungen |
| `confidential` | Persönliche Präferenzen |
| `secret` | Sensible Business-Infos |
| `shadow` | Existiert nicht. Nur mit expliziter User-Anweisung |

## Importance wählen

| Level | Wann |
|-------|------|
| `low` | Nice-to-know |
| `medium` | Standard |
| `high` | Wichtige Entscheidungen |
| `critical` | Muss IMMER erinnert werden |

## Beispiel-Aufrufe

```
// User-Präferenz speichern
remember({
  content: "User will Deutsch, keine Emojis, kurze Antworten",
  type: "preference",
  importance: "critical",
  security: "confidential"
})

// Entscheidung speichern
remember({
  content: "Buchhaltung: Qonto + FrontApp statt Firebase",
  type: "decision",
  project: "buchhaltung-tool",
  tags: ["architektur", "buchhaltung"],
  importance: "high",
  security: "internal"
})

// Kontext laden
recall_context({ project: "code-cloud-agents" })
```

## Tags verwenden

Nutze konsistente Tags:
- `architektur`, `frontend`, `backend`
- `bugfix`, `feature`, `refactor`
- `security`, `performance`
- Projekt-Namen als Tags
