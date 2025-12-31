# 👨‍💻 Developer Guide - Code Cloud Agents

Umfassender Leitfaden für Entwickler, die an Code Cloud Agents arbeiten.

---

## 📋 Inhaltsverzeichnis

- [Setup](#-setup)
- [Entwicklung](#-entwicklung)
- [Testing](#-testing)
- [Debugging](#-debugging)
- [Database](#-database)
- [API Development](#-api-development)
- [Frontend Development](#-frontend-development)
- [Git Workflow](#-git-workflow)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Setup

### 1. System-Voraussetzungen

**Erforderlich:**

- Node.js ≥20.0.0
- npm ≥10.0.0
- Git

**Optional:**

- Redis (für Production Queue)
- PM2 (für Production Deployment)

**Installation prüfen:**

```bash
node --version   # v20.19.6 oder höher
npm --version    # 10.8.2 oder höher
git --version    # 2.x oder höher
```

---

### 2. Repository klonen

```bash
# HTTPS
git clone https://github.com/dsactivi-2/Optimizecodecloudagents.git
cd Optimizecodecloudagents

# SSH (empfohlen)
git clone git@github.com:dsactivi-2/Optimizecodecloudagents.git
cd Optimizecodecloudagents
```

---

### 3. Dependencies installieren

```bash
# Production + Development Dependencies
npm install

# Nur Production Dependencies
npm install --production
```

**Wichtige Dependencies:**

- `express`: Backend Web Framework
- `better-sqlite3`: SQLite Database
- `tsx`: TypeScript Runtime
- `react`: Frontend Framework
- `vite`: Build Tool

---

### 4. Environment-Variablen konfigurieren

```bash
# .env.example kopieren
cp .env.example .env
```

**Minimale .env Konfiguration:**

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
SQLITE_PATH=./data/app.sqlite

# Queue
QUEUE_ENABLED=false

# Supervisor
STOP_SCORE_THRESHOLD=70
MAX_PARALLEL_AGENTS=4
```

**Production .env:**

```bash
PORT=3000
NODE_ENV=production
SQLITE_PATH=./data/app.sqlite
QUEUE_ENABLED=true
REDIS_URL=redis://localhost:6379
STOP_SCORE_THRESHOLD=70
MAX_PARALLEL_AGENTS=4
```

---

### 5. Data-Verzeichnis erstellen

```bash
mkdir -p data
```

Die SQLite-Datenbank wird automatisch beim ersten Start erstellt.

---

### 6. Projekt starten

**Development Mode:**

```bash
# Backend (Terminal 1)
npm run backend:dev

# Frontend (Terminal 2)
npm run dev
```

**Production Mode:**

```bash
# Build
npm run build
npm run backend:build

# Start
npm run backend:start
```

**Server läuft auf:** http://localhost:3000

---

## 💻 Entwicklung

### Project Structure

```
Optimizecodecloudagents/
├── src/
│   ├── index.ts                  # Backend Entry Point
│   │
│   ├── api/                      # REST API Routes
│   │   ├── health.ts             # Health-Check Endpoint
│   │   ├── tasks.ts              # Task Management API
│   │   ├── audit.ts              # Audit Log API
│   │   ├── enforcement.ts        # Enforcement Gate API
│   │   └── demo.ts               # Demo Invite System API
│   │
│   ├── audit/                    # Audit & Enforcement Logic
│   │   ├── enforcementGate.ts    # HARD STOP Gate
│   │   └── stopScorer.ts         # STOP-Score Calculation
│   │
│   ├── db/                       # Database Layer
│   │   └── database.ts           # SQLite Interface
│   │
│   ├── queue/                    # Queue System
│   │   └── queue.ts              # Redis/InMemory Queue
│   │
│   ├── demo/                     # Demo Invite System
│   │   ├── inviteManager.ts      # Invite Management
│   │   ├── types.ts              # Type Definitions
│   │   └── README.md             # Demo System Docs
│   │
│   ├── components/               # React Components
│   │   ├── AgentCard.tsx
│   │   ├── TaskCard.tsx
│   │   └── ...
│   │
│   ├── App.tsx                   # React Entry Point
│   ├── main.tsx                  # Vite Entry Point
│   └── index.css                 # Global Styles
│
├── data/                         # SQLite Database
│   └── app.sqlite                # (auto-created)
│
├── logs/                         # PM2 Logs
│   ├── pm2-error.log
│   ├── pm2-out.log
│   └── pm2-combined.log
│
├── docs/                         # Documentation
│   ├── DEVELOPER_GUIDE.md        # This file
│   ├── ARCHITECTURE.md           # Architecture docs
│   └── CONTRIBUTING.md           # Contribution guidelines
│
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Environment template
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite config
├── ecosystem.config.cjs          # PM2 config
└── README.md                     # Project overview
```

---

### Development Scripts

```bash
# Backend
npm run backend:dev        # Development mode (tsx watch)
npm run backend:build      # Build TypeScript to JS
npm run backend:start      # Start production build
npm run backend:prod       # Production mode (tsx)

# Frontend
npm run dev                # Development mode (Vite)
npm run build              # Production build
npm run preview            # Preview production build

# Testing
npm test                   # Run all tests
npm run test:watch         # Watch mode

# Database
npm run db:migrate         # Run migrations
npm run db:health          # Health check

# Queue
npm run queue:status       # Queue status
```

---

### Coding Standards

**TypeScript Strict Mode:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Naming Conventions:**

```typescript
// Variables & Functions: camelCase
const userName = "John";
function getUserData() {}

// Components & Classes: PascalCase
class TaskManager {}
function AgentCard() {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = "http://localhost:3000";
```

**JSDoc Comments:**

```typescript
/**
 * Creates a new task and assigns it to an agent
 * @param taskData - Task configuration object
 * @param agentId - ID of the agent to assign task to
 * @returns Created task with ID and timestamp
 * @throws {Error} If agent not found or task creation fails
 */
async function createTask(taskData: TaskData, agentId: string): Promise<Task> {
  // Implementation
}
```

**Error Handling:**

```typescript
// Always use try/catch for async operations
try {
  const result = await fetchData();
  return result;
} catch (error) {
  console.error("Failed to fetch data:", error);
  throw new Error("Data fetch failed");
}
```

---

## 🧪 Testing

### Test Setup

**Test Framework:** Node.js native test runner (Node v20+)

**Test Structure:**

```
tests/
├── api/
│   ├── health.test.ts
│   ├── tasks.test.ts
│   └── audit.test.ts
├── db/
│   └── database.test.ts
└── utils/
    └── helpers.test.ts
```

---

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test tests/api/health.test.ts

# Watch mode (re-run on file change)
npm test -- --watch

# Coverage report
npm test -- --coverage
```

---

### Writing Tests

**Example Test:**

```typescript
import { describe, it } from "node:test";
import assert from "node:assert";
import { createHealthRouter } from "../src/api/health.js";

describe("Health API", () => {
  it("should return 200 on /health", async () => {
    const response = await fetch("http://localhost:3000/health");
    assert.strictEqual(response.status, 200);
  });

  it("should return database status", async () => {
    const response = await fetch("http://localhost:3000/health");
    const data = await response.json();
    assert.strictEqual(data.database, "ok");
  });
});
```

---

### Test Best Practices

1. **Isolate Tests**: Jeder Test sollte unabhängig laufen
2. **Clean State**: Datenbank vor jedem Test zurücksetzen
3. **Mock External Services**: Redis, APIs, etc.
4. **Descriptive Names**: Test-Namen sollten klar beschreiben, was getestet wird
5. **AAA Pattern**: Arrange → Act → Assert

```typescript
it("should create task with valid data", async () => {
  // Arrange
  const taskData = { title: "Test Task", priority: "high" };

  // Act
  const task = await createTask(taskData);

  // Assert
  assert.strictEqual(task.title, "Test Task");
  assert.strictEqual(task.priority, "high");
});
```

---

## 🐛 Debugging

### Backend Debugging

**Console Logs:**

```typescript
console.log("✅ Success:", data);
console.error("❌ Error:", error);
console.warn("⚠️ Warning:", message);
console.info("ℹ️ Info:", info);
```

**VS Code Debugger:**

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "tsx",
      "runtimeArgs": ["watch", "src/index.ts"],
      "console": "integratedTerminal"
    }
  ]
}
```

**Node.js Inspector:**

```bash
node --inspect --import tsx/esm src/index.ts
# Open chrome://inspect in Chrome
```

---

### Frontend Debugging

**React DevTools:**

1. Install React DevTools Extension (Chrome/Firefox)
2. Open DevTools → React Tab
3. Inspect Component Tree, Props, State

**Console Logs in Components:**

```typescript
function AgentCard({ agent }: { agent: Agent }) {
  console.log("AgentCard rendering:", agent);

  useEffect(() => {
    console.log("AgentCard mounted");
    return () => console.log("AgentCard unmounted");
  }, []);

  return <div>{agent.name}</div>;
}
```

---

### Database Debugging

**SQLite CLI:**

```bash
# Connect to database
sqlite3 data/app.sqlite

# Show tables
.tables

# Show schema
.schema tasks

# Query data
SELECT * FROM tasks;
SELECT * FROM audit_log LIMIT 10;

# Exit
.exit
```

**Database Health Check:**

```bash
npm run db:health
```

---

## 🗄️ Database

### Schema

**Tables:**

1. **tasks**: Task management
2. **audit_log**: Action audit trail
3. **enforcement_log**: STOP decisions
4. **demo_invites**: Invite codes
5. **demo_users**: Demo users

**Migrations:**

```bash
npm run db:migrate
```

---

### Database Operations

**Insert:**

```typescript
const stmt = db.prepare(
  "INSERT INTO tasks (id, title, status) VALUES (?, ?, ?)",
);
stmt.run(id, title, status);
```

**Select:**

```typescript
const stmt = db.prepare("SELECT * FROM tasks WHERE status = ?");
const tasks = stmt.all("pending");
```

**Update:**

```typescript
const stmt = db.prepare("UPDATE tasks SET status = ? WHERE id = ?");
stmt.run("completed", taskId);
```

**Delete:**

```typescript
const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
stmt.run(taskId);
```

---

## 🔌 API Development

### Creating New Endpoints

**1. Create Router File:**

```typescript
// src/api/myFeature.ts
import { Router } from "express";

export function createMyFeatureRouter(): Router {
  const router = Router();

  router.get("/", (req, res) => {
    res.json({ message: "My Feature API" });
  });

  return router;
}
```

**2. Mount in index.ts:**

```typescript
// src/index.ts
import { createMyFeatureRouter } from "./api/myFeature.js";

app.use("/api/myFeature", createMyFeatureRouter());
```

**3. Test the endpoint:**

```bash
curl http://localhost:3000/api/myFeature
```

---

### API Best Practices

1. **Input Validation**: Zod schemas
2. **Error Handling**: try/catch + proper HTTP codes
3. **Response Format**: Consistent JSON structure
4. **Documentation**: JSDoc + OpenAPI

```typescript
import { z } from "zod";

// Validation Schema
const TaskSchema = z.object({
  title: z.string().min(1).max(100),
  priority: z.enum(["low", "medium", "high"]),
});

// Endpoint mit Validation
router.post("/tasks", async (req, res) => {
  try {
    // Validate input
    const taskData = TaskSchema.parse(req.body);

    // Create task
    const task = await createTask(taskData);

    // Success response
    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    // Error response
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});
```

---

## 🎨 Frontend Development

### Component Development

**Component Structure:**

```typescript
// src/components/MyComponent.tsx
import { useState } from "react";

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h2>{title}</h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={onAction}>
        Action
      </button>
    </div>
  );
}
```

---

### Styling

**Tailwind CSS:**

```tsx
<div className="p-4 bg-white rounded-lg shadow-md">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
</div>
```

**Radix UI Components:**

```tsx
import { Button } from "@/components/ui/button";

<Button variant="primary" size="lg">
  Click Me
</Button>;
```

---

## 🔀 Git Workflow

### Branch Naming

```bash
# Agent branches
git checkout -b agent-a2-<feature>
git checkout -b agent-a3-<feature>
git checkout -b agent-a4-<feature>

# Feature branches
git checkout -b feature/authentication
git checkout -b fix/database-lock
git checkout -b docs/api-documentation
```

---

### Commit Messages

**Format:**

```
<type>(<scope>): <subject>

<body>

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

**Examples:**

```bash
git commit -m "feat(auth): Add admin middleware

- Created requireAdmin() middleware
- Protected billing endpoints
- Added tests for middleware

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Pre-Push Checklist

- [ ] `npm test` → Alle Tests grün
- [ ] `npm run backend:build` → Erfolgreich
- [ ] Lokal getestet (`npm run backend:dev`)
- [ ] Keine console.logs in Production-Code
- [ ] Keine Secrets committed
- [ ] Commit-Message aussagekräftig

---

## 🔧 Troubleshooting

### Port bereits in Verwendung

**Problem:**

```
Error: EADDRINUSE: Port 3000 already in use
```

**Lösung:**

```bash
# Prozess finden
lsof -i :3000

# Prozess beenden
kill -9 <PID>

# Oder alle Node-Prozesse
killall node
```

---

### Database locked

**Problem:**

```
Error: database is locked
```

**Lösung:**

```bash
# Prozesse prüfen
lsof data/app.sqlite

# Prozess beenden
kill <PID>

# Oder Database neu erstellen
rm data/app.sqlite
npm run backend:dev  # Auto-recreates
```

---

### TypeScript Build Errors

**Problem:**

```
error TS2307: Cannot find module
```

**Lösung:**

```bash
# node_modules neu installieren
rm -rf node_modules package-lock.json
npm install

# TypeScript-Cache löschen
rm -rf dist/
npm run backend:build
```

---

### Tests failing

**Problem:**

```
npm test
# Tests fail with timeout
```

**Lösung:**

```bash
# Server stoppen (Tests brauchen Port 3000)
lsof -i :3000
kill <PID>

# Tests erneut ausführen
npm test
```

---

## 📚 Weitere Ressourcen

- **[Architecture](./ARCHITECTURE.md)**: System-Design und Datenmodelle
- **[Contributing](./CONTRIBUTING.md)**: Contribution Guidelines
- **[API Docs](./API.md)**: API Reference (coming soon)
- **[Deployment](./DEPLOYMENT.md)**: Production Deployment Guide

---

## 💬 Support

Bei Fragen oder Problemen:

1. **Dokumentation lesen**: `docs/` Verzeichnis
2. **GitHub Issues**: Bug Reports und Feature Requests
3. **Team kontaktieren**: Slack/Email

---

**Erstellt:** 2025-12-26
**Version:** 1.0

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
