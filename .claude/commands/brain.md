# Brain - Knowledge Base Tools

Nutze die Brain API für Wissensmanagement.

## Verfügbare Aktionen:

### Suchen

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/brain/search?q=QUERY"
```

### Text hinzufügen

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"TITLE","content":"CONTENT"}' \
  "http://localhost:3000/api/brain/ingest/text"
```

### Dokumente auflisten

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/brain/docs"
```

### Statistiken

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/brain/stats"
```

## Argumente

$ARGUMENTS - Was möchtest du tun? (search, ingest, list, stats)

---

Führe die gewünschte Brain-Aktion aus. Bei "search" durchsuche die Knowledge Base. Bei "ingest" füge neues Wissen hinzu.
