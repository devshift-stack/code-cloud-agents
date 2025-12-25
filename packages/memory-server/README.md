# Memory Server

Vector DB Langzeitgedächtnis für AI Assistants (Supervisor & Assistant).

## Setup

### 1. Pinecone Account erstellen
1. Gehe zu https://www.pinecone.io
2. Erstelle kostenlosen Account
3. Kopiere API Key

### 2. OpenAI API Key
1. Gehe zu https://platform.openai.com
2. Erstelle API Key (für Embeddings)

### 3. Environment einrichten
```bash
cp .env.example .env
# Trage deine Keys ein
```

### 4. Installieren & Starten
```bash
npm install
npm run dev
```

## Cursor Integration

Füge zu `~/.cursor/mcp.json` hinzu:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/pfad/zu/packages/memory-server/dist/index.js"],
      "env": {
        "PINECONE_API_KEY": "dein-key",
        "OPENAI_API_KEY": "dein-key"
      }
    }
  }
}
```

## Security-Levels

| Level | Beschreibung | Zugriff |
|-------|--------------|---------|
| `public` | Öffentlich | Jeder |
| `internal` | Intern | Projekt-Mitglieder |
| `confidential` | Vertraulich | Mit Berechtigung |
| `secret` | Geheim | Mit Access-Key |

## Tools

- `remember` - Speichert eine Erinnerung
- `recall` - Sucht Erinnerungen (semantisch)
- `recall_context` - Lädt Session-Kontext
- `forget` - Löscht eine Erinnerung
- `forget_all` - Löscht alle Erinnerungen
