# /recall - Suche im Langzeitgedächtnis

Durchsuche das Vector DB Memory nach relevanten Erinnerungen.

## Anweisung

Frage den User wonach gesucht werden soll, dann rufe `memory_recall` auf:

```json
{
  "query": "[Suchanfrage]",
  "limit": 10,
  "project": "code-cloud-agents"
}
```

Zeige die Ergebnisse formatiert:
- Datum
- Typ (decision/learning/etc.)
- Inhalt
- Relevanz-Score

Bei keinen Ergebnissen: Schlage alternative Suchbegriffe vor.
