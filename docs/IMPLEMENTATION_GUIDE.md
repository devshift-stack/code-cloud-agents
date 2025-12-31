# Implementation Guide - Next Steps

**Datum:** 26. Dezember 2025
**Status:** Agent 3 Complete, Ready for Production

---

## 📋 ÜBERSICHT

Dieser Guide beschreibt die nächsten Schritte nach Abschluss von Agent 3:

1. ✅ **Hetzner Server Deployment** - Manual (SSH required)
2. 🟢 **OpenAI API Key Setup** - Ready to configure
3. 🟡 **Frontend Integration** - Implementation guide
4. 🟡 **Performance Testing** - Testing strategy
5. 🟡 **Monitoring & Analytics** - Observability setup

---

## 1. 🚀 HETZNER SERVER DEPLOYMENT

### Voraussetzungen

- SSH-Zugriff zu `178.156.178.70`
- Git Repository Access
- PM2 installiert auf Server

### Deployment Steps

```bash
# 1. SSH zum Server
ssh root@178.156.178.70

# 2. Navigate to project directory
cd /root/code-cloud-agents  # Adjust path as needed

# 3. Pull latest changes
git pull origin main

# 4. Install dependencies
npm install

# 5. Build project (if needed)
npm run build

# 6. Restart with PM2
pm2 restart code-cloud-agents

# 7. Check status
pm2 status
pm2 logs code-cloud-agents --lines 50

# 8. Test health endpoint
curl http://localhost:3000/health
```

### Environment Variables Setup

Create or update `.env` file on server:

```bash
# Navigate to project
cd /root/code-cloud-agents

# Create/edit .env file
nano .env
```

Add the following variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database
SQLITE_PATH=./data/app.sqlite

# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret

# Linear Integration
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxx
LINEAR_WEBHOOK_SECRET=your_linear_webhook_secret

# AI Providers (Optional - for Chat & Memory System)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
GEMINI_API_KEY=your_gemini_key
```

### Post-Deployment Verification

```bash
# Check server is running
pm2 status

# Check logs for errors
pm2 logs code-cloud-agents --lines 100

# Test endpoints
curl http://localhost:3000/api
curl http://localhost:3000/health
curl http://localhost:3000/api/github/status
curl http://localhost:3000/api/linear/status
```

### Webhook Configuration

#### GitHub Webhooks

1. Go to your GitHub repository → Settings → Webhooks
2. Add webhook:
   - URL: `https://your-domain.com/api/webhooks/github`
   - Content type: `application/json`
   - Secret: Your `GITHUB_WEBHOOK_SECRET`
   - Events: `push`, `pull_request`, `issues`

#### Linear Webhooks

1. Go to Linear → Settings → API → Webhooks
2. Add webhook:
   - URL: `https://your-domain.com/api/webhooks/linear`
   - Secret: Your `LINEAR_WEBHOOK_SECRET`
   - Events: Select desired events

---

## 2. 🔑 OPENAI API KEY SETUP

### Status: ✅ Already Implemented

Der Code ist bereits vollständig für OpenAI vorbereitet:

**Verwendete Stellen:**

1. `src/chat/manager.ts` - Chat-Funktionalität mit OpenAI
2. `src/memory/embeddings.ts` - Semantic Search mit text-embedding-3-small

### API Key Beschaffung

1. **OpenAI Account erstellen:**
   - Gehe zu https://platform.openai.com/signup
   - Erstelle einen Account oder melde dich an

2. **API Key generieren:**
   - Navigiere zu https://platform.openai.com/api-keys
   - Klicke auf "Create new secret key"
   - Name: `code-cloud-agents-production`
   - Kopiere den Key (nur einmal sichtbar!)

3. **Billing Setup:**
   - Gehe zu https://platform.openai.com/account/billing
   - Füge Zahlungsmethode hinzu
   - Setze optionales Spending Limit (empfohlen: $50/month)

### Environment Variable Setup

**Auf dem Server:**

```bash
# Add to .env file
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

**Restart Server:**

```bash
pm2 restart code-cloud-agents
```

### Funktions-Check

**Test Chat mit OpenAI:**

```bash
curl -X POST http://localhost:3000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "message": "Hello, how are you?",
    "agentName": "Claude",
    "modelProvider": "openai",
    "model": "gpt-4"
  }'
```

**Test Semantic Search:**

```bash
# 1. Create chat and add message
curl -X POST http://localhost:3000/api/memory/chats \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "title": "Test Chat",
    "initialMessage": "How do I deploy to production?"
  }'

# 2. Wait for auto-embedding (if enabled)
sleep 2

# 3. Semantic search
curl -X POST http://localhost:3000/api/memory/semantic/search \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "query": "deployment process",
    "limit": 5
  }'
```

### Cost Management

**OpenAI Pricing (as of 2025):**

**text-embedding-3-small:**

- Cost: $0.02 per 1M tokens
- Usage: ~150 tokens per message
- 10,000 messages = ~$0.03

**GPT-4:**

- Input: $30 per 1M tokens
- Output: $60 per 1M tokens
- Average conversation: ~$0.05-0.15

**GPT-3.5-turbo (cheaper alternative):**

- Input: $0.50 per 1M tokens
- Output: $1.50 per 1M tokens
- Average conversation: ~$0.001-0.005

**Monitoring:**

```bash
# Check usage in OpenAI Dashboard
https://platform.openai.com/usage

# Or via code:
GET /api/billing/usage/:userId
```

### Best Practices

1. **Rate Limiting:**
   - Implement rate limits für API endpoints
   - Default: 10 requests/minute per user

2. **Caching:**
   - Cache embeddings in database (already implemented)
   - Never re-generate existing embeddings

3. **Model Selection:**
   - Use GPT-3.5-turbo for simple queries
   - Use GPT-4 for complex reasoning
   - Use text-embedding-3-small for embeddings (cost-effective)

4. **Error Handling:**
   - Retry logic für transient errors
   - Fallback to cached results if API fails
   - User-friendly error messages

---

## 3. 🎨 FRONTEND INTEGRATION

### Architecture Overview

```
Frontend (React/Next.js)
    ↓
REST API (Express)
    ↓
Business Logic
    ↓
Database (SQLite/PostgreSQL)
```

### Technology Stack Recommendations

**Frontend Framework:**

- **Next.js 14+** (recommended) - App Router, Server Components
- **React 18+** - Hooks, Suspense
- **TypeScript** - Type safety

**UI Library:**

- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality components
- **Radix UI** - Accessible primitives

**State Management:**

- **React Query (TanStack Query)** - Server state
- **Zustand** - Client state
- **WebSocket Context** - Real-time updates

**API Client:**

- **Axios** or **Fetch API**
- **OpenAPI Generator** - Generate types from Swagger

### Implementation Steps

#### Step 1: Setup Next.js Project

```bash
# Create Next.js app
npx create-next-app@latest code-cloud-agents-frontend --typescript --tailwind --app

cd code-cloud-agents-frontend

# Install dependencies
npm install @tanstack/react-query axios zustand
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install lucide-react class-variance-authority clsx tailwind-merge
```

#### Step 2: API Client Setup

**`src/lib/api.ts`:**

```typescript
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
```

#### Step 3: Memory System Integration

**Chat Component:**

```typescript
// app/chat/[chatId]/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages } = useQuery({
    queryKey: ['chat', params.chatId, 'messages'],
    queryFn: async () => {
      const { data } = await api.get(`/api/memory/chats/${params.chatId}/messages`);
      return data.messages;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post(`/api/memory/chats/${params.chatId}/messages`, {
        role: 'user',
        content,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', params.chatId, 'messages'] });
      setMessage('');
    },
  });

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((msg: any) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (message.trim()) {
              sendMessage.mutate(message);
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={!message.trim() || sendMessage.isPending}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
```

#### Step 4: WebSocket Integration

**WebSocket Hook:**

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState } from "react";

export function useWebSocket(url: string, token: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect
    ws.current = new WebSocket(`${url}?token=${token}`);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // Cleanup
    return () => {
      ws.current?.close();
    };
  }, [url, token]);

  const sendMessage = (type: string, payload: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }));
    }
  };

  return { isConnected, messages, sendMessage };
}
```

**Usage:**

```typescript
// app/dashboard/page.tsx
'use client';

import { useWebSocket } from '@/hooks/useWebSocket';

export default function Dashboard() {
  const { isConnected, messages, sendMessage } = useWebSocket(
    'ws://localhost:3000/ws',
    'your-auth-token'
  );

  useEffect(() => {
    // Listen for agent status updates
    const agentStatusMessages = messages.filter((m) => m.type === 'agent_status');
    console.log('Agent Status:', agentStatusMessages);
  }, [messages]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {/* Rest of dashboard */}
    </div>
  );
}
```

#### Step 5: Settings Management UI

**Settings Page:**

```typescript
// app/settings/page.tsx
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

export default function SettingsPage() {
  const userId = 'current-user-id'; // From auth context

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['settings', userId],
    queryFn: async () => {
      const { data } = await api.get(`/api/settings/user/${userId}`);
      return data;
    },
  });

  // Update settings
  const updateSettings = useMutation({
    mutationFn: async (newSettings: any) => {
      const { data } = await api.put(`/api/settings/user/${userId}`, newSettings);
      return data;
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-4">
        {/* Example setting */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Theme
          </label>
          <select
            value={settings?.theme || 'light'}
            onChange={(e) => updateSettings.mutate({ ...settings, theme: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>

        {/* More settings... */}
      </div>
    </div>
  );
}
```

### Complete Example Project Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Dashboard
│   │   ├── chat/
│   │   │   ├── page.tsx      # Chat list
│   │   │   └── [id]/
│   │   │       └── page.tsx  # Chat view
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── admin/
│   │       └── page.tsx
│   └── api/                   # API routes (if needed)
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── chat/
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── ChatSidebar.tsx
│   └── layout/
│       ├── Header.tsx
│       └── Sidebar.tsx
├── hooks/
│   ├── useWebSocket.ts
│   ├── useAuth.ts
│   └── useChat.ts
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── utils.ts
└── types/
    └── api.ts
```

---

## 4. 🔬 PERFORMANCE TESTING

### Testing Strategy

**Tools:**

1. **k6** - Load testing
2. **Artillery** - Load testing & monitoring
3. **Apache Bench (ab)** - Quick benchmarks
4. **Lighthouse** - Frontend performance

### k6 Load Testing

**Installation:**

```bash
brew install k6  # macOS
# or
sudo apt install k6  # Linux
# or
choco install k6  # Windows
```

**Test Script (`load-test.js`):**

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // Warm up
    { duration: "1m", target: 50 }, // Ramp up to 50 users
    { duration: "3m", target: 50 }, // Stay at 50 users
    { duration: "30s", target: 100 }, // Spike to 100 users
    { duration: "1m", target: 100 }, // Stay at 100 users
    { duration: "30s", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests must complete below 500ms
    http_req_failed: ["rate<0.01"], // Less than 1% errors
  },
};

const BASE_URL = "http://localhost:3000";

export default function () {
  // Test health endpoint
  let res = http.get(`${BASE_URL}/health`);
  check(res, {
    "health status is 200": (r) => r.status === 200,
  });

  sleep(1);

  // Test memory list
  res = http.get(`${BASE_URL}/api/memory/chats/test-user`);
  check(res, {
    "memory list status is 200": (r) => r.status === 200,
  });

  sleep(1);

  // Test chat message
  res = http.post(
    `${BASE_URL}/api/memory/chats`,
    JSON.stringify({
      userId: "test-user",
      title: "Load Test Chat",
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
  check(res, {
    "create chat status is 201": (r) => r.status === 201,
  });

  sleep(2);
}
```

**Run Test:**

```bash
k6 run load-test.js
```

### Database Performance Testing

**Query Performance:**

```sql
-- Enable query timing
PRAGMA timer=on;

-- Test message retrieval
EXPLAIN QUERY PLAN
SELECT * FROM chat_messages
WHERE chat_id = 'test-chat-id'
ORDER BY timestamp DESC
LIMIT 100;

-- Test semantic search (if using embeddings)
EXPLAIN QUERY PLAN
SELECT m.*, e.embedding
FROM chat_messages m
JOIN message_embeddings e ON m.id = e.message_id
WHERE m.chat_id IN (
  SELECT id FROM chats WHERE user_id = 'test-user'
)
LIMIT 10;
```

**Benchmark Script (`benchmark-db.js`):**

```javascript
const Database = require("better-sqlite3");
const db = new Database("./data/app.sqlite");

console.time("1000 inserts");
const stmt = db.prepare(
  "INSERT INTO chat_messages (id, chat_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)",
);
for (let i = 0; i < 1000; i++) {
  stmt.run(
    `msg-${i}`,
    "test-chat",
    "user",
    `Message ${i}`,
    new Date().toISOString(),
  );
}
console.timeEnd("1000 inserts");

console.time("1000 reads");
const selectStmt = db.prepare("SELECT * FROM chat_messages WHERE chat_id = ?");
for (let i = 0; i < 1000; i++) {
  selectStmt.get("test-chat");
}
console.timeEnd("1000 reads");
```

### WebSocket Load Testing

**WebSocket Test (`ws-load-test.js`):**

```javascript
import ws from "k6/ws";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
};

export default function () {
  const url = "ws://localhost:3000/ws?token=test-token";
  const params = { tags: { name: "WebSocket" } };

  const response = ws.connect(url, params, function (socket) {
    socket.on("open", () => {
      console.log("Connected");

      // Send test message
      socket.send(
        JSON.stringify({
          type: "chat_message",
          payload: { message: "Hello" },
        }),
      );
    });

    socket.on("message", (data) => {
      console.log("Message received:", data);
    });

    socket.on("close", () => {
      console.log("Disconnected");
    });

    socket.setTimeout(() => {
      socket.close();
    }, 10000);
  });

  check(response, { "status is 101": (r) => r && r.status === 101 });
}
```

### Performance Targets

**API Endpoints:**

- **Response Time:** < 100ms (p95)
- **Throughput:** 1000 requests/second
- **Error Rate:** < 0.1%
- **Concurrent Users:** 500+

**Database:**

- **Read:** < 10ms per query
- **Write:** < 50ms per query
- **Index Usage:** 100% for WHERE clauses

**WebSocket:**

- **Connection Time:** < 500ms
- **Message Latency:** < 50ms
- **Concurrent Connections:** 1000+

---

## 5. 📊 MONITORING & ANALYTICS

### Monitoring Stack

**Option 1: Self-Hosted (Recommended for Start)**

- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **Loki** - Log aggregation

**Option 2: Cloud (Scalable)**

- **Datadog** - All-in-one
- **New Relic** - APM
- **Sentry** - Error tracking

### Prometheus Setup

**Install Prometheus:**

```bash
# macOS
brew install prometheus

# Linux
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

**Configure (`prometheus.yml`):**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "code-cloud-agents"
    static_configs:
      - targets: ["localhost:3000"]
    metrics_path: "/metrics"
```

**Add Metrics to Express App:**

```typescript
// src/monitoring/metrics.ts
import promClient from "prom-client";

// Create registry
export const register = new promClient.Registry();

// Default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const chatMessagesTotal = new promClient.Counter({
  name: "chat_messages_total",
  help: "Total number of chat messages",
  labelNames: ["user_id", "agent_name"],
  registers: [register],
});

export const embeddingsGenerated = new promClient.Counter({
  name: "embeddings_generated_total",
  help: "Total number of embeddings generated",
  registers: [register],
});

export const openaiApiCalls = new promClient.Counter({
  name: "openai_api_calls_total",
  help: "Total OpenAI API calls",
  labelNames: ["model", "status"],
  registers: [register],
});
```

**Add to Express:**

```typescript
// src/index.ts
import { register, httpRequestDuration } from "./monitoring/metrics.js";

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  const metrics = await register.metrics();
  res.send(metrics);
});

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(
        req.method,
        req.route?.path || req.path,
        res.statusCode.toString(),
      )
      .observe(duration);
  });
  next();
});
```

### Grafana Dashboard

**Install Grafana:**

```bash
# macOS
brew install grafana

# Start
brew services start grafana
```

**Access:** http://localhost:3000 (default: admin/admin)

**Add Prometheus Data Source:**

1. Configuration → Data Sources → Add Prometheus
2. URL: http://localhost:9090
3. Save & Test

**Create Dashboard:**

```json
{
  "dashboard": {
    "title": "Code Cloud Agents",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_count[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Chat Messages Total",
        "targets": [
          {
            "expr": "chat_messages_total"
          }
        ]
      },
      {
        "title": "OpenAI API Calls",
        "targets": [
          {
            "expr": "rate(openai_api_calls_total[5m])"
          }
        ]
      }
    ]
  }
}
```

### Error Tracking (Sentry)

**Install Sentry:**

```bash
npm install @sentry/node @sentry/profiling-node
```

**Setup:**

```typescript
// src/monitoring/sentry.ts
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export function initSentry(app: Express) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  // RequestHandler creates a separate execution context
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

export function sentryErrorHandler(app: Express) {
  app.use(Sentry.Handlers.errorHandler());
}
```

### Analytics Events

**Track Key Events:**

```typescript
// src/monitoring/analytics.ts
import {
  chatMessagesTotal,
  embeddingsGenerated,
  openaiApiCalls,
} from "./metrics.js";

export function trackChatMessage(userId: string, agentName: string) {
  chatMessagesTotal.labels(userId, agentName).inc();
}

export function trackEmbeddingGeneration() {
  embeddingsGenerated.inc();
}

export function trackOpenAICall(model: string, status: "success" | "error") {
  openaiApiCalls.labels(model, status).inc();
}
```

**Use in Code:**

```typescript
// src/memory/embeddings.ts
import {
  trackEmbeddingGeneration,
  trackOpenAICall,
} from "../monitoring/analytics.js";

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    trackOpenAICall("text-embedding-3-small", "success");
    trackEmbeddingGeneration();

    return response.data[0].embedding;
  } catch (error) {
    trackOpenAICall("text-embedding-3-small", "error");
    throw error;
  }
}
```

### Logging Strategy

**Structured Logging with Winston:**

```bash
npm install winston
```

```typescript
// src/monitoring/logger.ts
import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}
```

**Usage:**

```typescript
import { logger } from "./monitoring/logger.js";

logger.info("Chat message received", {
  userId,
  chatId,
  messageLength: content.length,
});
logger.error("OpenAI API error", { error: error.message, model, userId });
logger.warn("Rate limit approaching", { userId, currentRate, limit });
```

---

## 📝 ZUSAMMENFASSUNG

### Completed ✅

1. ✅ Agent 3 - Alle 7 Tasks vollständig implementiert
2. ✅ Deployment Report erstellt
3. ✅ Implementation Guide erstellt

### Next Steps 🟢

**Immediate:**

1. Hetzner Server Deployment (manual SSH)
2. Environment Variables Setup
3. Webhook Configuration

**Short-term:** 4. OpenAI API Key Setup (already prepared) 5. Frontend Development (Next.js + React Query) 6. Performance Testing (k6 + Artillery) 7. Monitoring Setup (Prometheus + Grafana)

**Medium-term:** 8. Error Tracking (Sentry) 9. Analytics Dashboard 10. Load Testing & Optimization

---

**Guide erstellt:** 26. Dezember 2025
**Status:** Ready for Production Implementation
**Next:** Manual Hetzner deployment → Frontend development → Testing → Monitoring
