# Memory System Documentation

## Overview

Das Memory System bietet vollständiges Conversation Memory Management mit drei Kernkomponenten:

1. **MemoryManager** - CRUD-Operationen für Chats und Messages
2. **MemorySearch** - Full-text Search und Keyword-basierte Suche
3. **EmbeddingsManager** - Semantic Search mit OpenAI Embeddings

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   REST API Layer                     │
│             /api/memory/* (21 endpoints)             │
└──────────────────┬──────────────────────────────────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
      ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌─────────────┐
│  Memory  │ │  Memory  │ │ Embeddings  │
│ Manager  │ │  Search  │ │   Manager   │
└────┬─────┘ └────┬─────┘ └──────┬──────┘
     │            │               │
     │            │               ├─── OpenAI API
     │            │               │    (text-embedding-3-small)
     └────────────┴───────────────┘
                  │
           ┌──────▼──────┐
           │   SQLite    │
           │  Database   │
           └─────────────┘
```

## Database Schema

### Chats Table
```sql
CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  agent_name TEXT,
  message_count INTEGER DEFAULT 0,
  last_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_chats_user_id ON chats(user_id);
```

### Chat Messages Table
```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  agent_name TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_chat_id ON chat_messages(chat_id);
```

### Message Embeddings Table
```sql
CREATE TABLE message_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT UNIQUE NOT NULL,
  embedding TEXT NOT NULL,  -- JSON array of 1536 floats
  model TEXT NOT NULL,      -- 'text-embedding-3-small'
  created_at TEXT NOT NULL,
  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_embeddings_message_id ON message_embeddings(message_id);
CREATE INDEX idx_embeddings_created_at ON message_embeddings(created_at);
```

## Core Components

### 1. MemoryManager

Verwaltet Chats und Messages mit vollständigem CRUD-Support.

**Key Features:**
- Chat Lifecycle Management (create, read, update, delete)
- Message Storage mit Token Tracking
- Context Retrieval (last N messages)
- Export/Import Support
- User Statistics

**Example Usage:**
```typescript
import { MemoryManager } from './memory/manager.js';

const memory = new MemoryManager(db);

// Create chat
const chat = memory.createChat({
  userId: 'user-123',
  title: 'My Conversation',
  agentName: 'Claude',
  initialMessage: 'Hello!'
});

// Add messages
memory.addMessage({
  chatId: chat.id,
  role: 'assistant',
  content: 'Hi! How can I help you?',
  tokensInput: 10,
  tokensOutput: 15
});

// Get recent context
const context = memory.getRecentMessages(chat.id, 10);
```

### 2. MemorySearch

Full-text und keyword-basierte Suche mit Snippet-Generierung.

**Key Features:**
- Message Search mit SQL LIKE
- Chat Search nach Titel
- Similar Messages (keyword overlap)
- Context Retrieval (vor/nach einer Message)
- Trending Topics (häufigste Keywords)

**Example Usage:**
```typescript
import { MemorySearch } from './memory/search.js';

const search = new MemorySearch(db);

// Full-text search
const results = search.searchMessages({
  userId: 'user-123',
  query: 'machine learning',
  limit: 20
});

// Get trending topics
const trending = search.getTrendingTopics('user-123', 10, 7);
```

### 3. EmbeddingsManager

Semantic Search mit OpenAI Embeddings und Cosine Similarity.

**Key Features:**
- Auto-Embedding bei Message Creation (optional)
- Batch Embedding Generation für existing chats
- Semantic Search mit Cosine Similarity
- Similar Message Detection
- Model: `text-embedding-3-small` (1536 dimensions)

**Setup:**
```bash
# Required environment variable
export OPENAI_API_KEY="sk-..."
```

**Example Usage:**
```typescript
import { EmbeddingsManager } from './memory/embeddings.js';

const embeddings = new EmbeddingsManager(db);

// Check if enabled (requires OPENAI_API_KEY)
if (embeddings.isEnabled()) {
  // Store embedding for message
  await embeddings.storeEmbedding(messageId, messageContent);

  // Semantic search
  const results = await embeddings.semanticSearch(
    'How do I deploy to production?',
    'user-123',
    10
  );

  // Find similar messages
  const similar = await embeddings.findSimilarMessages(messageId, 5);
}
```

## REST API Reference

### Chat Management

#### `GET /api/memory/chats/:userId`
List all chats for a user.

**Query Parameters:**
- `limit` (default: 50) - Max chats to return
- `offset` (default: 0) - Pagination offset

**Response:**
```json
{
  "chats": [
    {
      "id": "uuid",
      "userId": "user-123",
      "title": "My Chat",
      "agentName": "Claude",
      "messageCount": 42,
      "lastMessage": "Latest message preview...",
      "createdAt": "2025-12-26T10:00:00Z",
      "updatedAt": "2025-12-26T11:30:00Z"
    }
  ]
}
```

#### `POST /api/memory/chats`
Create a new chat.

**Body:**
```json
{
  "userId": "user-123",
  "title": "New Conversation",
  "agentName": "Claude",
  "initialMessage": "Hello!" // optional
}
```

#### `GET /api/memory/chats/:chatId/details`
Get chat details.

#### `PATCH /api/memory/chats/:chatId`
Update chat metadata.

**Body:**
```json
{
  "title": "Updated Title",
  "agentName": "Claude"
}
```

#### `DELETE /api/memory/chats/:chatId`
Delete a chat and all its messages.

### Message Management

#### `GET /api/memory/chats/:chatId/messages`
Get messages from a chat.

**Query Parameters:**
- `limit` (default: 100)
- `offset` (default: 0)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "chatId": "chat-uuid",
      "role": "assistant",
      "content": "Message text...",
      "agentName": "Claude",
      "tokensInput": 100,
      "tokensOutput": 150,
      "tokensTotal": 250,
      "timestamp": "2025-12-26T10:00:00Z"
    }
  ]
}
```

#### `POST /api/memory/chats/:chatId/messages`
Add a message to a chat.

**Body:**
```json
{
  "role": "user",
  "content": "My message",
  "agentName": "Claude",
  "tokensInput": 10,
  "tokensOutput": 0
}
```

**Auto-Embedding:**
If `OPENAI_API_KEY` is set, embeddings are automatically generated for new messages.

#### `GET /api/memory/chats/:chatId/recent`
Get recent messages (for context).

**Query Parameters:**
- `count` (default: 10)

#### `DELETE /api/memory/chats/:chatId/messages/old`
Clear old messages, keeping only the last N.

**Query Parameters:**
- `keepLast` (default: 100)

### Search

#### `POST /api/memory/search`
Full-text search across messages.

**Body:**
```json
{
  "userId": "user-123",
  "query": "machine learning",
  "chatId": "chat-uuid", // optional
  "limit": 20
}
```

**Response:**
```json
{
  "results": [
    {
      "messageId": "uuid",
      "chatId": "chat-uuid",
      "chatTitle": "ML Discussion",
      "content": "Full message text...",
      "snippet": "...about machine learning...",
      "role": "assistant",
      "timestamp": "2025-12-26T10:00:00Z",
      "relevance": 0.95
    }
  ]
}
```

#### `GET /api/memory/search/chats/:userId`
Search chats by title.

**Query Parameters:**
- `query` - Search term
- `limit` (default: 20)

#### `GET /api/memory/messages/:messageId/context`
Get context around a message.

**Query Parameters:**
- `contextSize` (default: 5) - Messages before/after

**Response:**
```json
{
  "before": [...],
  "message": {...},
  "after": [...]
}
```

#### `GET /api/memory/messages/:messageId/similar`
Find similar messages (keyword-based).

**Query Parameters:**
- `limit` (default: 10)

#### `GET /api/memory/trending/:userId`
Get trending topics.

**Query Parameters:**
- `limit` (default: 10)
- `days` (default: 7)

**Response:**
```json
{
  "topics": [
    { "keyword": "deployment", "count": 15 },
    { "keyword": "database", "count": 12 }
  ]
}
```

### Semantic Search (Embeddings)

#### `POST /api/memory/semantic/search`
Semantic search using embeddings.

**Requirements:** `OPENAI_API_KEY` must be set

**Body:**
```json
{
  "query": "How do I deploy?",
  "userId": "user-123",
  "limit": 10
}
```

**Response:**
```json
{
  "results": [
    {
      "messageId": "uuid",
      "chatId": "chat-uuid",
      "chatTitle": "Deployment Help",
      "content": "To deploy, you need to...",
      "role": "assistant",
      "timestamp": "2025-12-26T10:00:00Z",
      "similarity": 0.89
    }
  ]
}
```

#### `POST /api/memory/chats/:chatId/embeddings/generate`
Generate embeddings for all messages in a chat.

**Response:**
```json
{
  "generated": 42,
  "message": "Generated 42 embeddings"
}
```

#### `GET /api/memory/embeddings/stats`
Get embedding statistics.

**Response:**
```json
{
  "totalEmbeddings": 1234,
  "embeddingsByModel": {
    "text-embedding-3-small": 1234
  },
  "averageAge": 5.2
}
```

### Export & Stats

#### `GET /api/memory/chats/:chatId/export`
Export complete chat with all messages.

**Response:**
```json
{
  "chat": {...},
  "messages": [...]
}
```

#### `GET /api/memory/stats/:userId`
Get user statistics.

**Response:**
```json
{
  "totalChats": 25,
  "totalMessages": 1234,
  "totalTokens": 500000
}
```

## Performance Considerations

### Indexing
Alle wichtigen Spalten sind indexiert:
- `chats.user_id` - für User-Queries
- `chat_messages.chat_id` - für Message-Retrieval
- `message_embeddings.message_id` - für Embedding-Lookup

### Pagination
Alle List-Endpoints unterstützen `limit` und `offset` für Pagination.

### Token Tracking
Token-Counts werden optional gespeichert für:
- Cost Analysis
- Usage Monitoring
- Quota Enforcement

### Embedding Generation
- Embeddings werden asynchron generiert
- Batch-Processing für existing chats
- Cache in Database (kein Re-Generate)

## Error Handling

Alle Endpoints verwenden standard HTTP Status Codes:

- `200 OK` - Erfolgreiche Operation
- `201 Created` - Ressource erstellt
- `400 Bad Request` - Validierungsfehler
- `404 Not Found` - Ressource nicht gefunden
- `500 Internal Server Error` - Server-Fehler

**Error Response Format:**
```json
{
  "error": "Error message"
}
```

## Security Considerations

### Input Validation
- Alle Inputs werden mit Zod validiert
- SQL Injection Prevention durch Prepared Statements
- XSS Prevention durch Content Sanitization

### Data Privacy
- User Isolation (alle Queries filtern nach `userId`)
- CASCADE DELETE (Messages werden mit Chat gelöscht)
- Embeddings werden mit Messages gelöscht (ON DELETE CASCADE)

### API Key Security
- `OPENAI_API_KEY` nur server-side
- Niemals im Frontend exponiert
- Environment Variable statt Hardcoding

## Cost Management

### OpenAI Embedding Costs
- Model: `text-embedding-3-small`
- Cost: ~$0.02 per 1M tokens
- Durchschnitt: ~150 tokens pro Message
- 1000 Messages ≈ $0.003

### Database Storage
- Messages: ~1KB pro Message
- Embeddings: ~6KB pro Message (1536 floats als JSON)
- 10,000 Messages ≈ 70MB

## Testing

Beispiel cURL Commands:

```bash
# Create chat
curl -X POST http://localhost:3000/api/memory/chats \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "title": "Test Chat",
    "agentName": "Claude"
  }'

# Add message
curl -X POST http://localhost:3000/api/memory/chats/CHAT_ID/messages \
  -H "Content-Type: application/json" \
  -d '{
    "role": "user",
    "content": "Hello, how are you?"
  }'

# Search
curl -X POST http://localhost:3000/api/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "query": "hello",
    "limit": 10
  }'

# Semantic search
curl -X POST http://localhost:3000/api/memory/semantic/search \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "query": "greeting",
    "limit": 10
  }'
```

## Integration Examples

### React Hook
```typescript
import { useState, useEffect } from 'react';

function useChat(chatId: string) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/memory/chats/${chatId}/messages`)
      .then(res => res.json())
      .then(data => {
        setMessages(data.messages);
        setLoading(false);
      });
  }, [chatId]);

  const addMessage = async (content: string, role: string) => {
    const res = await fetch(`/api/memory/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, role })
    });
    const newMessage = await res.json();
    setMessages([...messages, newMessage]);
  };

  return { messages, loading, addMessage };
}
```

### Node.js Client
```typescript
class MemoryClient {
  constructor(private baseUrl: string) {}

  async createChat(userId: string, title: string) {
    const res = await fetch(`${this.baseUrl}/api/memory/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title })
    });
    return res.json();
  }

  async semanticSearch(userId: string, query: string) {
    const res = await fetch(`${this.baseUrl}/api/memory/semantic/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, query, limit: 10 })
    });
    return res.json();
  }
}
```

## Future Enhancements

Mögliche zukünftige Features:

1. **Multi-Modal Support** - Images, Audio, Documents
2. **Advanced Analytics** - Sentiment Analysis, Topic Modeling
3. **Conversation Summarization** - Auto-generate chat summaries
4. **Memory Compression** - Compress old conversations
5. **Cross-User Search** - Admin-only, privacy-respecting
6. **Real-time Sync** - WebSocket integration für live updates
7. **Vector DB Migration** - Separate Vector Database (Pinecone, Weaviate)
8. **Hybrid Search** - Combine full-text + semantic search

## Support

Bei Fragen oder Problemen:
- Dokumentation: `/docs/MEMORY.md`
- API Reference: Siehe REST API Section
- Examples: Siehe Integration Examples Section
