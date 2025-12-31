# 🏗️ Architecture - Code Cloud Agents

Detaillierte Systemarchitektur und Design-Dokumentation.

---

## 📋 Inhaltsverzeichnis

- [System Overview](#-system-overview)
- [Komponenten](#-komponenten)
- [Datenmodell](#-datenmodell)
- [API Architecture](#-api-architecture)
- [Frontend Architecture](#-frontend-architecture)
- [STOP-Score System](#-stop-score-system)
- [Enforcement Gate](#-enforcement-gate)
- [Data Flow](#-data-flow)
- [Security](#-security)
- [Deployment](#-deployment)

---

## 🎯 System Overview

### Vision

Code Cloud Agents ist ein **Supervised AI System**, das AI-Agenten überwacht und bei kritischen Entscheidungen automatisch eingreift. Das System basiert auf dem **STOP-Score** Konzept: Jede Agent-Aktion wird bewertet (0-100), und ab einem kritischen Score (≥70) wird die Ausführung blockiert und eine **Human Review** angefordert.

### Kernprinzipien

1. **Evidence-Based Verification**: Keine Behauptung ohne Beweis
2. **STOP is Success**: Bei Risiko ist STOP die richtige Entscheidung
3. **Cross-Layer Consistency**: Frontend ↔ Backend ↔ Database Alignment
4. **Hard Enforcement**: STOP-Entscheidungen sind BLOCKING, keine Umgehung möglich

---

## 🧩 Komponenten

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     WEB BROWSER                          │
│                   (React Dashboard)                      │
└──────────────────┬───────────────────────────────────────┘
                   │ HTTP/REST
                   │
┌──────────────────▼───────────────────────────────────────┐
│                   EXPRESS SERVER                         │
│              (Node.js + TypeScript)                      │
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │  API       │  │  Auth      │  │  Middleware│         │
│  │  Routes    │  │  Layer     │  │  Layer     │         │
│  └────────────┘  └────────────┘  └────────────┘         │
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │  Task      │  │  Audit     │  │  Demo      │         │
│  │  Manager   │  │  Logger    │  │  System    │         │
│  └────────────┘  └────────────┘  └────────────┘         │
└──────────────────┬───────────────────────────────────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│  SQLite    │ │  Queue     │ │ Enforcement│
│  Database  │ │  System    │ │  Gate      │
└────────────┘ └────────────┘ └────────────┘
```

---

### Komponenten-Details

#### 1. Frontend Layer

**Technologie:** React 18 + TypeScript + Vite

**Verantwortlichkeiten:**

- User Interface für Agent-Monitoring
- Task-Management Dashboard
- Audit-Log Visualisierung
- Real-time Updates (via polling/WebSocket)
- Admin Controls (Demo System, Enforcement Approvals)

**Komponenten:**

- `App.tsx`: Main Application Component
- `AgentCard.tsx`: Agent Status Display
- `TaskCard.tsx`: Task Details Display
- `AuditLog.tsx`: Audit Trail Viewer
- `EnforcementApproval.tsx`: Human Review Interface

---

#### 2. Backend Layer

**Technologie:** Node.js v20+ + Express + TypeScript

**Verantwortlichkeiten:**

- REST API Endpoints
- Business Logic Execution
- Database Operations
- Queue Management
- Authentication & Authorization
- STOP-Score Calculation
- Enforcement Gate Logic

**Module:**

- `src/index.ts`: Server Entry Point
- `src/api/*`: REST API Routes
- `src/db/database.ts`: Database Interface
- `src/audit/*`: Audit & Enforcement Logic
- `src/queue/queue.ts`: Queue System
- `src/demo/*`: Demo Invite System

---

#### 3. Database Layer

**Technologie:** SQLite (better-sqlite3)

**Verantwortlichkeiten:**

- Persistent Data Storage
- ACID Transactions
- Indexing & Query Optimization
- Audit Trail Storage

**Schema:**

- `tasks`: Task management
- `audit_entries`: Audit log
- `demo_invites`: Invite codes
- `demo_users`: Demo users

---

#### 4. Queue System

**Technologie:** Redis (production) / In-Memory (development)

**Verantwortlichkeiten:**

- Task Queue Management
- Background Job Processing
- Retry Logic
- Dead Letter Queue

---

#### 5. Enforcement Gate

**Technologie:** Custom TypeScript Module

**Verantwortlichkeiten:**

- STOP-Score Calculation
- Risk Assessment
- Task Blocking
- Human Approval Workflow

---

## 🗄️ Datenmodell

### Entity Relationship Diagram

```
┌─────────────────────┐
│      TASKS          │
├─────────────────────┤
│ id (PK)             │
│ title               │
│ description         │
│ priority            │
│ status              │
│ assignee            │
│ created_at          │
│ updated_at          │
│ stop_score          │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│   AUDIT_ENTRIES     │
├─────────────────────┤
│ id (PK)             │
│ task_id (FK)        │
│ decision            │
│ final_status        │
│ risk_level          │
│ stop_score          │
│ verified_artefacts  │
│ missing_invalid     │
│ required_action     │
│ created_at          │
└─────────────────────┘

┌─────────────────────┐
│   DEMO_INVITES      │
├─────────────────────┤
│ id (PK)             │
│ code (UNIQUE)       │
│ created_by          │
│ max_redemptions     │
│ expires_at          │
│ created_at          │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│    DEMO_USERS       │
├─────────────────────┤
│ id (PK)             │
│ invite_id (FK)      │
│ username            │
│ password_hash       │
│ task_limit          │
│ tasks_created       │
│ created_at          │
└─────────────────────┘
```

---

### Datentypen

#### Task

```typescript
interface Task {
  id: string; // UUID
  title: string; // Max 200 chars
  description?: string; // Optional
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "stopped";
  assignee: string; // Agent name
  created_at: string; // ISO 8601
  updated_at?: string; // ISO 8601
  stop_score?: number; // 0-100
}
```

#### Audit Entry

```typescript
interface AuditEntry {
  id: string; // UUID
  task_id?: string; // FK to tasks
  decision: "APPROVED" | "STOP_REQUIRED";
  final_status: "COMPLETE" | "COMPLETE_WITH_GAPS" | "STOP_REQUIRED";
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  stop_score: number; // 0-100
  verified_artefacts: string; // JSON array
  missing_invalid_parts: string; // JSON array
  required_next_action: string;
  created_at: string; // ISO 8601
}
```

---

## 🔌 API Architecture

### REST API Design

**Base URL:** `http://localhost:3000`

**Principles:**

- RESTful Design
- JSON Request/Response
- HTTP Status Codes
- Error Handling
- Input Validation (Zod)

---

### API Endpoints

#### Health & Info

```
GET  /api              → API Info
GET  /health           → Health Check
```

#### Tasks

```
POST /api/tasks        → Create Task
GET  /api/tasks        → List All Tasks
GET  /api/tasks/:id    → Get Task by ID
PUT  /api/tasks/:id    → Update Task
```

#### Audit

```
GET  /api/audit        → List Audit Entries
GET  /api/audit/:id    → Get Audit Entry
```

#### Enforcement

```
GET  /api/enforcement/blocked   → List Blocked Tasks
POST /api/enforcement/approve   → Approve Blocked Task
POST /api/enforcement/reject    → Reject Blocked Task
```

#### Demo System

```
POST /api/demo/invites          → Create Invite (Admin)
POST /api/demo/redeem           → Redeem Invite Code
GET  /api/demo/stats            → Demo Statistics
GET  /api/demo/users/:id        → User Usage Stats
```

---

### Request/Response Format

**Success Response:**

```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "title": "Task Title"
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Invalid input data",
  "details": {
    "field": "title",
    "message": "Title is required"
  }
}
```

---

### HTTP Status Codes

| Code | Meaning        | Usage                   |
| ---- | -------------- | ----------------------- |
| 200  | OK             | Successful GET/PUT      |
| 201  | Created        | Successful POST         |
| 400  | Bad Request    | Invalid input           |
| 401  | Unauthorized   | Authentication required |
| 403  | Forbidden      | No permission           |
| 404  | Not Found      | Resource not found      |
| 500  | Internal Error | Server error            |

---

## 🎨 Frontend Architecture

### Component Hierarchy

```
App.tsx
├── Header
│   ├── Logo
│   └── Navigation
├── Dashboard
│   ├── AgentStatus
│   │   ├── AgentCard[]
│   │   └── AgentStats
│   ├── TaskManager
│   │   ├── TaskList
│   │   │   └── TaskCard[]
│   │   └── CreateTaskForm
│   ├── AuditLog
│   │   ├── AuditTable
│   │   └── AuditFilters
│   └── EnforcementPanel
│       ├── BlockedTasks
│       └── ApprovalForm
└── Footer
```

---

### State Management

**Strategy:** React Context + Hooks

**Global State:**

- `AgentContext`: Agent status, capabilities
- `TaskContext`: Task list, active task
- `AuditContext`: Audit entries
- `EnforcementContext`: Blocked tasks, approvals

**Component State:**

- Local UI state (modals, forms, etc.)
- Form inputs
- Loading states

---

### Data Fetching

**Strategy:** Custom Hooks + Fetch API

```typescript
// Custom Hook Example
function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.data);
    setLoading(false);
  }

  return { tasks, loading, refetch: fetchTasks };
}
```

---

## 🎯 STOP-Score System

### Konzept

Der **STOP-Score** ist eine Risikobewertung (0-100), die bestimmt, ob eine Agent-Aktion fortgesetzt werden darf oder blockiert werden muss.

### Score-Berechnung

```typescript
const WEIGHTS = {
  PRICE_CLAIM: 25, // Preisbehauptung
  LEGAL_CLAIM: 30, // Rechtsbehauptung
  UNPROVEN_CLAIM: 20, // Unbewiesene Behauptung
  MISSING_EVIDENCE: 15, // Fehlende Evidenz
  IMPLEMENTATION_GAP: 10, // Implementierungslücke
  NO_VERIFICATION: 25, // Keine Verifikation
};

function computeStopScore(reasons: StopReason[]): ScoreResult {
  let score = 0;
  const uniqueReasons = [...new Set(reasons)];

  for (const reason of uniqueReasons) {
    score += WEIGHTS[reason] ?? 0;
  }

  return {
    score: Math.min(score, 100),
    stopRequired: score >= 70,
    reasons: uniqueReasons,
  };
}
```

---

### Risk Levels

| Score  | Level    | Action                  |
| ------ | -------- | ----------------------- |
| 0-19   | LOW      | ✅ Proceed              |
| 20-44  | MEDIUM   | ⚠️ Review Recommended   |
| 45-69  | HIGH     | ⚠️ Approval Recommended |
| 70-100 | CRITICAL | 🛑 **HARD STOP**        |

---

### STOP Reasons

| Reason               | Score | Description                |
| -------------------- | ----- | -------------------------- |
| `PRICE_CLAIM`        | 25    | Unverified price statement |
| `LEGAL_CLAIM`        | 30    | Unverified legal statement |
| `UNPROVEN_CLAIM`     | 20    | Claim without evidence     |
| `MISSING_EVIDENCE`   | 15    | Expected artefacts missing |
| `IMPLEMENTATION_GAP` | 10    | Code incomplete            |
| `NO_VERIFICATION`    | 25    | No verification performed  |

---

## 🛡️ Enforcement Gate

### HARD STOP Enforcement

**Regel:** Wenn `STOP_SCORE ≥ 70`, wird die Task **SOFORT BLOCKIERT**.

**Ablauf:**

1. Agent sendet Task-Result
2. System berechnet STOP-Score
3. Wenn Score ≥ 70:
   - Task wird in `blockedTasks` Map gespeichert
   - Audit-Entry wird erstellt
   - Status → `AWAITING_APPROVAL`
   - Task kann NICHT fortgesetzt werden
4. Human Review:
   - Admin öffnet Enforcement Panel
   - Prüft Gründe und Evidenz
   - Entscheidung: `APPROVE` oder `REJECT`
5. Nach Approval:
   - Task wird entsperrt
   - Audit-Entry wird aktualisiert
   - Task kann fortgesetzt werden

---

### Gate States

```typescript
type GateStatus = "OPEN" | "BLOCKED" | "AWAITING_APPROVAL";

interface GateDecision {
  status: GateStatus;
  taskId: string;
  stopScore: number;
  reasons: StopReason[];
  blockedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}
```

---

### Human Approval

**Endpoint:** `POST /api/enforcement/approve`

**Request:**

```json
{
  "taskId": "abc123",
  "approvedBy": "admin@example.com",
  "reason": "Evidence verified manually"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Task approved, gate opened",
  "taskId": "abc123"
}
```

---

## 🔄 Data Flow

### Task Creation Flow

```
1. User (Frontend)
   │
   └──> POST /api/tasks
        │
        └──> Express Handler
             │
             ├──> Validate Input (Zod)
             ├──> Create Task in DB
             ├──> Add to Queue
             └──> Return Task

2. Queue Worker
   │
   └──> Process Task
        │
        ├──> Execute Agent Logic
        ├──> Collect Evidence
        └──> Generate Result

3. Enforcement Gate
   │
   └──> Evaluate Result
        │
        ├──> Calculate STOP-Score
        ├──> Check Reasons
        └──> Decision:
             │
             ├──> Score < 70: APPROVE
             │    └──> Update Task Status
             │
             └──> Score ≥ 70: BLOCK
                  ├──> Add to blockedTasks
                  ├──> Create Audit Entry
                  └──> Await Human Review
```

---

### Human Approval Flow

```
1. Admin (Frontend)
   │
   └──> GET /api/enforcement/blocked
        │
        └──> List of Blocked Tasks

2. Admin Reviews Task
   │
   ├──> Verify Evidence
   ├──> Assess Risk
   └──> Decision

3. Admin Approves/Rejects
   │
   └──> POST /api/enforcement/approve
        │
        └──> Enforcement Gate
             │
             ├──> Remove from blockedTasks
             ├──> Update Audit Entry
             ├──> Update Task Status
             └──> Resume Task Processing
```

---

## 🔐 Security

### Input Validation

**Zod Schemas:**

```typescript
const TaskSchema = z.object({
  title: z.string().min(1).max(200),
  priority: z.enum(["low", "medium", "high"]),
  assignee: z.string().min(1),
});
```

---

### Authentication

**Status:** 🚧 Coming Soon (Agent 2 Task)

**Planned:**

- JWT-based authentication
- Role-based access control (RBAC)
- Admin vs User permissions
- Session management

---

### Rate Limiting

**Status:** 🚧 Coming Soon (Agent 2 Task)

**Planned:**

- Express Rate Limiter
- IP-based limiting
- Endpoint-specific limits
- DDoS protection

---

### Audit Trail

**All Actions Logged:**

- Task creation
- Task updates
- STOP decisions
- Human approvals
- API calls

**Audit Log Retention:** Unlimited (SQLite persistent)

---

## 🚀 Deployment

### Production Architecture

```
┌──────────────────────────────────────┐
│          NGINX (Reverse Proxy)       │
│       Port 80/443 (SSL/TLS)          │
└──────────────┬───────────────────────┘
               │
               ├──> Frontend (Static)
               │    /build/*
               │
               └──> Backend (API)
                    /api/*, /health

┌──────────────────────────────────────┐
│          PM2 (Process Manager)       │
│     cloud-agents-backend             │
│     Node.js v20 + tsx/esm            │
└──────────────┬───────────────────────┘
               │
               ├──> SQLite Database
               │    /root/cloud-agents/data/
               │
               └──> Logs
                    /root/cloud-agents/logs/
```

---

### Infrastructure

**Server:**

- **IP:** 178.156.178.70
- **OS:** Ubuntu 24.04
- **CPU:** 8 cores (Dedicated)
- **RAM:** 30 GB
- **Disk:** 226 GB

**Stack:**

- **Process Manager:** PM2
- **Reverse Proxy:** Nginx
- **Database:** SQLite
- **Node.js:** v20.19.6

---

### Deployment Process

1. **Build Locally**
2. **Push to Git**
3. **SSH to Server**
4. **Pull Changes**
5. **Install Dependencies**
6. **Build**
7. **Restart PM2**
8. **Health Check**
9. **Backup Database**

Details: **[Deployment Guide](./DEPLOYMENT.md)**

---

## 📊 Performance

### Metrics

**Target Metrics:**

- API Response Time: < 100ms (p95)
- Database Query Time: < 10ms (p95)
- Frontend Load Time: < 2s
- Task Processing Time: < 5s

**Monitoring:**

- PM2 Monit
- Nginx Access Logs
- SQLite Query Logs
- Custom Performance Tracking

---

## 🔮 Future Architecture

**Planned Enhancements:**

1. **WebSocket Real-time** (Agent 3)
   - Real-time task updates
   - Real-time chat
   - Connection recovery

2. **Integration APIs** (Agent 3)
   - GitHub, Slack, Linear
   - Webhook handlers
   - Event processing

3. **Memory System** (Agent 3)
   - Conversation history
   - Context tracking
   - Long-term memory

4. **Multi-Provider** (Agent 3)
   - Provider fallback
   - Load balancing
   - Cost optimization

---

## 📚 Weitere Ressourcen

- **[Developer Guide](./DEVELOPER_GUIDE.md)**: Setup & Development
- **[Contributing](./CONTRIBUTING.md)**: Contribution Guidelines
- **[API Docs](./API.md)**: API Reference (coming soon)

---

**Erstellt:** 2025-12-26
**Version:** 1.0

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
