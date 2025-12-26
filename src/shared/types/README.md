# Shared Types

Zentrale Type-Definitionen für Frontend und Backend.

## Struktur

```
src/shared/types/
├── index.ts       # Zentrale Export-Datei
├── common.ts      # Basis-Types (Status, RiskLevel, etc.)
├── agent.ts       # Agent-bezogene Types
├── task.ts        # Task-bezogene Types
└── api.ts         # API Request/Response Types
```

## Verwendung

### Import aller Types

```typescript
import type { Agent, Task, RiskLevel, ApiResponse } from "@/shared/types";
```

### Import spezifischer Module

```typescript
import type { Agent, AgentConfig } from "@/shared/types/agent";
import type { Task, TaskResult } from "@/shared/types/task";
```

## Type-Kategorien

### Common Types (`common.ts`)

Basis-Types die überall verwendet werden:

- `RiskLevel` - LOW | MEDIUM | HIGH | CRITICAL
- `Status` - Task/Operation Status
- `AgentStatus` - Agent Status
- `ModelProvider` - AI Provider Types
- `ApiResponse<T>` - Standard API Response Wrapper
- `PaginatedResponse<T>` - Paginierte Responses

### Agent Types (`agent.ts`)

Agent-bezogene Definitionen:

- `Agent` - Agent Entity
- `AgentType` - Agent Kategorien
- `AgentConfig` - Agent Konfiguration
- `AgentStatistics` - Agent Performance Metriken
- `AgentPerformance` - Detaillierte Performance Daten

### Task Types (`task.ts`)

Task-Management Types:

- `Task` - Task Entity
- `TaskPriority` - Priority Levels
- `CreateTaskRequest` - Task Erstellung
- `UpdateTaskRequest` - Task Updates
- `TaskResult` - Task Execution Results
- `Artefact` - Produced Artefacts

### API Types (`api.ts`)

API Request/Response Interfaces:

- `HealthResponse` - Health Check
- `DashboardSummary` - Dashboard Daten
- `Alert` - Alert Entity
- `AuditEntry` - Audit Log Entry
- `StopScoreStats` - STOP Score Statistiken
- `ReportRequest` - Report Generation
- `ReportResponse` - Report Daten

## Best Practices

### 1. Immer Types importieren

```typescript
// ✅ Gut
import type { Agent } from "@/shared/types";

// ❌ Schlecht
import { Agent } from "@/shared/types"; // Runtime Import
```

### 2. Generic API Responses nutzen

```typescript
// ✅ Gut
const response: ApiResponse<Agent[]> = await fetchAgents();

// ❌ Schlecht
const response: any = await fetchAgents();
```

### 3. Types erweitern

```typescript
// Eigene Types können shared Types erweitern
import type { Agent, WithId, Timestamps } from "@/shared/types";

interface CustomAgent extends Agent {
  customField: string;
}
```

### 4. Keine Duplikate

Wenn ein Type bereits in `shared/types` existiert, nutze diesen statt einen neuen zu definieren.

### 5. Dokumentation

Alle Types sollten JSDoc-Kommentare haben:

```typescript
/**
 * Agent entity with configuration and status
 */
export interface Agent extends WithId, Timestamps {
  name: string;
  status: AgentStatus;
}
```

## Frontend Usage

```typescript
import type { Agent, Task, DashboardSummary } from "@/shared/types";

// React Component
interface DashboardProps {
  summary: DashboardSummary;
  agents: Agent[];
  tasks: Task[];
}
```

## Backend Usage

```typescript
import type { CreateTaskRequest, Task, ApiResponse } from "@/shared/types";

// API Handler
async function createTask(req: CreateTaskRequest): Promise<ApiResponse<Task>> {
  // Implementation
}
```

## Type Safety

Diese Types gewährleisten:

- ✅ Konsistenz zwischen Frontend und Backend
- ✅ Auto-Completion in IDEs
- ✅ Compile-Time Type Checking
- ✅ Weniger Runtime Errors
- ✅ Bessere Dokumentation

## Updates

Wenn neue Types hinzugefügt werden:

1. Type in entsprechende Datei hinzufügen (`common.ts`, `agent.ts`, etc.)
2. Type in `index.ts` exportieren
3. Dokumentation updaten (dieser README)
4. Bestehende Code-Duplikate entfernen

## Conventions

- PascalCase für Interfaces: `Agent`, `Task`, `ApiResponse`
- camelCase für Properties: `agentName`, `taskId`, `createdAt`
- UPPER_SNAKE_CASE für Enums: `"LOW"`, `"HIGH"`, `"CRITICAL"`
- Type suffix für Union Types: `AgentType`, `TaskPriority`
