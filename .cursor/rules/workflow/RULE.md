---
description: "Arbeitsablauf - wie Supervisor und Assistant zusammenarbeiten"
alwaysApply: true
---

# Arbeitsablauf

## Session-Start

Bei JEDER neuen Session:

1. **Memory laden** - `recall_context` aufrufen um relevanten Kontext zu laden
2. **Offene Tasks prüfen** - Was ist noch offen?
3. **User-Präferenzen beachten** - Aus Memory laden

## Während der Arbeit

### Bei neuen Informationen

Speichere SOFORT in Memory wenn:
- User eine Präferenz äußert → `preference`
- Eine Entscheidung getroffen wird → `decision`
- Ein Problem gelöst wird → `solution`
- Etwas nicht funktioniert hat → `learning`
- Ein neuer Task entsteht → `todo`

### Bei Fragen

Bevor du antwortest:
1. `recall` mit der Frage aufrufen
2. Prüfen ob du das schon mal beantwortet/gelöst hast
3. Dann erst antworten

## Task-Bearbeitung

```
1. Task aus Memory oder User-Anfrage
2. TodoWrite - Task planen
3. Arbeiten
4. Bei Erkenntnissen → remember
5. Task abschließen
6. Todo als completed markieren
```

## Session-Ende

Wenn die Session endet oder lange Pause:
1. Zusammenfassung erstellen → `remember` als `conversation`
2. Offene Tasks speichern → `remember` als `todo`
3. Wichtige Erkenntnisse sichern → `remember` als `learning`

## Kommunikation mit anderen Agenten

- Supervisor und Assistant teilen das Memory
- Aber: Security-Level beachten!
- Shadow-Infos werden NIEMALS geteilt
