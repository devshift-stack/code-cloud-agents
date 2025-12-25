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

### 4. Installieren
```bash
npm install
```

### 5. Starten
```bash
npm run dev
```

## MCP Tools

- `memory_remember` - Speichert Erinnerung
- `memory_recall` - Sucht Erinnerungen
- `memory_forget` - Löscht Erinnerung
- `memory_context` - Lädt Session-Kontext

## Security Levels

| Level | Beschreibung |
|-------|-------------|
| public | Jeder kann sehen |
| internal | Nur Projekt-Mitglieder |
| confidential | Nur bestimmte Personen |
| secret | Nur mit Access Key |

## Memory Types

- `conversation` - Chat-Zusammenfassungen
- `decision` - Architektur-Entscheidungen
- `preference` - User-Präferenzen
- `learning` - Was funktioniert/nicht
- `project` - Projekt-Kontext
- `todo` - Offene Tasks
- `error` - Aufgetretene Fehler
- `solution` - Lösungen
