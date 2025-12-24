---
description: Workflow analysieren und Automatisierung planen
allowed-tools: Read, Grep, Glob, Bash(git:*)
---

# Workflow Automation Agent

Analysiere und plane Automatisierung für: $ARGUMENTS

## Analyse-Schritte

### 1. Aktuellen Workflow verstehen
- Welche manuellen Schritte gibt es?
- Wer macht was?
- Wie lange dauert jeder Schritt?
- Wo sind Bottlenecks?

### 2. Automatisierungs-Potenzial
- Welche Schritte sind repetitiv?
- Welche Schritte brauchen keine menschliche Entscheidung?
- Welche können Agents übernehmen?

### 3. Agent-Zuweisung
| Task | Agent | Trigger |
|------|-------|---------|
| Code Review | /review | PR erstellt |
| Security Check | /security | Vor Deploy |
| Tests | /test | Nach Code Change |
| Docs | /docs | Nach Feature Complete |
| Design Check | /design | Vor Release |

## Workflow-Template

```
[TRIGGER] → [AGENT 1] → [DECISION] → [AGENT 2] → [OUTPUT]
     ↓           ↓           ↓           ↓           ↓
  PR Open    /review    Pass/Fail   /security   Deploy/Stop
```

## Output Format

```
## Workflow Analyse

**Prozess**: [Name]
**Aktuelle Dauer**: [Zeit]
**Potenzielle Einsparung**: [Zeit]

### Aktueller Workflow (Manuell)
1. [Schritt 1] - [Dauer] - [Wer]
2. [Schritt 2] - [Dauer] - [Wer]
...

### Automatisierter Workflow (Mit Agents)
1. [Schritt 1] - [Agent/Automatisch]
2. [Schritt 2] - [Agent/Automatisch]
3. [Schritt 3] - [Mensch erforderlich]
...

### Agent-Kette
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Trigger │ →  │ Agent 1 │ →  │ Agent 2 │ → Output
└─────────┘    └─────────┘    └─────────┘

### Implementierungs-Plan
1. [ ] ...
2. [ ] ...
3. [ ] ...

### ROI Schätzung
- Zeitersparnis: X Stunden/Woche
- Fehlerreduktion: X%
- Kosten: $X/Monat (Agent Usage)
```
