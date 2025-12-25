# Setup-Anleitung

## 1. Prerequisites

```bash
# Node.js 20+
node --version

# OpenSSL (für Shadow-Key)
openssl version
```

## 2. Pinecone Setup

1. Account erstellen: https://www.pinecone.io
2. Free Tier wählen
3. API Key kopieren
4. In Doppler speichern als `PINECONE_API_KEY`

## 3. OpenAI Setup

1. Account: https://platform.openai.com
2. API Key erstellen
3. In Doppler speichern als `OPENAI_API_KEY`

## 4. Shadow-Key generieren

```bash
openssl rand -hex 32
```

In Doppler speichern als `SHADOW_ACCESS_HASH`

## 5. Memory Server starten

```bash
cd packages/memory-server
npm install
npm run dev
```

## 6. Cursor MCP aktivieren

Die `.cursor/mcp.json` ist bereits konfiguriert.
Cursor neu starten um MCP zu laden.

## 7. Testen

Im Cursor Chat:
```
Nutze das remember-Tool um zu speichern: "Test-Erinnerung"
```

Dann:
```
Nutze recall um nach "Test" zu suchen
```

## Doppler Environment Variables

```
PINECONE_API_KEY=dein-pinecone-key
OPENAI_API_KEY=dein-openai-key
SHADOW_ACCESS_HASH=dein-shadow-hash
```
