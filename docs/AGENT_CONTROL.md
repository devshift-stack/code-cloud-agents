++ b/docs/AGENT_CONTROL.md

# 🤖 Agent Control API

## Overview

The Agent Control API provides endpoints to manage, monitor, and control agents in the Code Cloud Agents system.

## Agents in the System

The system includes three primary agents:

1. **ENGINEERING_LEAD_SUPERVISOR**
   - Plans and delegates tasks
   - Reviews work and evidence
   - Makes STOP decisions based on risk assessment

2. **CLOUD_ASSISTANT**
   - Executes tasks delegated by supervisor
   - Reports progress and evidence
   - Implements code changes

3. **META_SUPERVISOR**
   - Routes requests between agents
   - Monitors overall system health
   - Coordinates multi-agent workflows

---

## Base URL

```
http://localhost:3000/api/agents
```

---

## Endpoints

### 1. List All Agents

**GET** `/api/agents`

Returns a list of all agents in the system.

**Response:**

```json
{
  "success": true,
  "agents": [
    {
      "id": "agent_engineering_lead_supervisor",
      "name": "ENGINEERING_LEAD_SUPERVISOR",
      "state": "idle",
      "currentTask": null,
      "progress": null,
      "startedAt": "2025-12-26T14:00:00.000Z",
      "lastActivity": "2025-12-26T14:05:00.000Z",
      "tasksCompleted": 15,
      "tasksInProgress": 0,
      "errorCount": 0
    },
    {
      "id": "agent_cloud_assistant",
      "name": "CLOUD_ASSISTANT",
      "state": "working",
      "currentTask": "Implementing feature X",
      "progress": 45,
      "startedAt": "2025-12-26T14:00:00.000Z",
      "lastActivity": "2025-12-26T14:10:00.000Z",
      "tasksCompleted": 32,
      "tasksInProgress": 1,
      "errorCount": 2
    }
  ],
  "count": 3
}
```

---

### 2. Get Agent Details

**GET** `/api/agents/:agentId`

Get detailed information about a specific agent.

**Parameters:**

- `agentId` (path) - Agent ID (e.g., `agent_cloud_assistant`)

**Response:**

```json
{
  "success": true,
  "agent": {
    "id": "agent_cloud_assistant",
    "name": "CLOUD_ASSISTANT",
    "state": "working",
    "currentTask": "Implementing feature X",
    "progress": 45,
    "startedAt": "2025-12-26T14:00:00.000Z",
    "lastActivity": "2025-12-26T14:10:00.000Z",
    "tasksCompleted": 32,
    "tasksInProgress": 1,
    "errorCount": 2
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Agent not found"
}
```

---

### 3. Start Agent

**POST** `/api/agents/:agentId/start`

Start a stopped agent.

**Parameters:**

- `agentId` (path) - Agent ID

**Response:**

```json
{
  "success": true,
  "message": "Agent started successfully",
  "agent": {
    "id": "agent_cloud_assistant",
    "name": "CLOUD_ASSISTANT",
    "state": "idle",
    ...
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Agent is already idle"
}
```

---

### 4. Stop Agent

**POST** `/api/agents/:agentId/stop`

Stop a running agent.

**Request Body:**

```json
{
  "reason": "Maintenance required"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Agent stopped successfully",
  "agent": {
    "id": "agent_cloud_assistant",
    "name": "CLOUD_ASSISTANT",
    "state": "stopped",
    ...
  }
}
```

---

### 5. Update Agent State

**PATCH** `/api/agents/:agentId/state`

Manually update agent state.

**Request Body:**

```json
{
  "state": "idle",
  "reason": "Task completed"
}
```

**Valid States:**

- `idle` - Agent is ready for work
- `working` - Agent is processing a task
- `stopped` - Agent is stopped

**Response:**

```json
{
  "success": true,
  "agent": {
    "id": "agent_cloud_assistant",
    "state": "idle",
    ...
  }
}
```

---

### 6. Get Agent Logs

**GET** `/api/agents/:agentId/logs`

Retrieve agent activity logs.

**Query Parameters:**

- `limit` (optional) - Number of logs to return (default: 100, max: 1000)
- `level` (optional) - Filter by log level (`info`, `warn`, `error`, `debug`)

**Example:**

```
GET /api/agents/agent_cloud_assistant/logs?limit=50&level=error
```

**Response:**

```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2025-12-26T14:10:00.000Z",
      "level": "info",
      "message": "Task started",
      "context": {
        "taskId": "task_123"
      }
    },
    {
      "timestamp": "2025-12-26T14:15:00.000Z",
      "level": "error",
      "message": "API call failed",
      "context": {
        "error": "Connection timeout"
      }
    }
  ],
  "count": 2
}
```

---

### 7. Get Agent Metrics

**GET** `/api/agents/:agentId/metrics`

Get performance metrics for an agent.

**Response:**

```json
{
  "success": true,
  "metrics": {
    "uptime": 3600,
    "totalTasks": 34,
    "successfulTasks": 32,
    "failedTasks": 2,
    "averageTaskDuration": 0,
    "memoryUsage": {
      "rss": 52428800,
      "heapTotal": 20971520,
      "heapUsed": 15728640,
      "external": 1048576
    },
    "cpuUsage": {
      "user": 1000000,
      "system": 500000
    }
  }
}
```

**Metric Descriptions:**

- `uptime` - Agent uptime in seconds
- `totalTasks` - Total tasks processed (success + failed)
- `successfulTasks` - Number of completed tasks
- `failedTasks` - Number of failed tasks
- `averageTaskDuration` - Average task completion time (seconds)
- `memoryUsage` - Memory usage in bytes
  - `rss` - Resident Set Size
  - `heapTotal` - Total heap size
  - `heapUsed` - Used heap size
  - `external` - External memory
- `cpuUsage` - CPU usage in microseconds
  - `user` - User CPU time
  - `system` - System CPU time

---

### 8. Get System Health

**GET** `/api/agents/health/status`

Get overall system health status.

**Response:**

```json
{
  "success": true,
  "health": "healthy",
  "summary": {
    "total": 3,
    "idle": 2,
    "working": 1,
    "stopped": 0,
    "error": 0
  },
  "agents": [
    {
      "id": "agent_engineering_lead_supervisor",
      "name": "ENGINEERING_LEAD_SUPERVISOR",
      "state": "idle"
    },
    {
      "id": "agent_cloud_assistant",
      "name": "CLOUD_ASSISTANT",
      "state": "working"
    },
    {
      "id": "agent_meta_supervisor",
      "name": "META_SUPERVISOR",
      "state": "idle"
    }
  ]
}
```

**Health Status:**

- `healthy` - All agents running normally
- `degraded` - Some agents stopped but no errors
- `unhealthy` - One or more agents in error state

---

## Agent States

| State     | Description                          |
| --------- | ------------------------------------ |
| `idle`    | Agent is ready and waiting for tasks |
| `working` | Agent is actively processing a task  |
| `stopped` | Agent has been manually stopped      |
| `error`   | Agent encountered an error           |

---

## State Transitions

```
    idle ←→ working
     ↑         ↓
     └─ stopped
            ↓
          error
```

**Valid Transitions:**

- `idle` → `working` (task assigned)
- `working` → `idle` (task completed)
- `working` → `error` (task failed)
- `idle/working` → `stopped` (manual stop)
- `stopped` → `idle` (manual start)

---

## WebSocket Integration

Agent state changes are automatically broadcast via WebSocket:

```javascript
// Connect to WebSocket
const ws = new WebSocket("ws://localhost:3000/ws?token=YOUR_TOKEN");

// Listen for agent status updates
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "agent_status") {
    console.log("Agent update:", message.data);
    // {
    //   agentName: 'CLOUD_ASSISTANT',
    //   state: 'working',
    //   currentTask: 'Processing webhook',
    //   progress: 50
    // }
  }
};
```

---

## Examples

### cURL Examples

**List all agents:**

```bash
curl http://localhost:3000/api/agents
```

**Get agent details:**

```bash
curl http://localhost:3000/api/agents/agent_cloud_assistant
```

**Start agent:**

```bash
curl -X POST http://localhost:3000/api/agents/agent_cloud_assistant/start
```

**Stop agent:**

```bash
curl -X POST http://localhost:3000/api/agents/agent_cloud_assistant/stop \
  -H "Content-Type: application/json" \
  -d '{"reason":"Maintenance"}'
```

**Update agent state:**

```bash
curl -X PATCH http://localhost:3000/api/agents/agent_cloud_assistant/state \
  -H "Content-Type: application/json" \
  -d '{"state":"idle","reason":"Task completed"}'
```

**Get agent logs:**

```bash
curl "http://localhost:3000/api/agents/agent_cloud_assistant/logs?limit=50&level=error"
```

**Get agent metrics:**

```bash
curl http://localhost:3000/api/agents/agent_cloud_assistant/metrics
```

**Get system health:**

```bash
curl http://localhost:3000/api/agents/health/status
```

---

### JavaScript/TypeScript Example

```typescript
class AgentControlClient {
  private baseUrl = "http://localhost:3000/api/agents";

  async listAgents() {
    const response = await fetch(this.baseUrl);
    return await response.json();
  }

  async getAgent(agentId: string) {
    const response = await fetch(`${this.baseUrl}/${agentId}`);
    return await response.json();
  }

  async startAgent(agentId: string) {
    const response = await fetch(`${this.baseUrl}/${agentId}/start`, {
      method: "POST",
    });
    return await response.json();
  }

  async stopAgent(agentId: string, reason?: string) {
    const response = await fetch(`${this.baseUrl}/${agentId}/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    return await response.json();
  }

  async updateState(
    agentId: string,
    state: "idle" | "working" | "stopped",
    reason?: string,
  ) {
    const response = await fetch(`${this.baseUrl}/${agentId}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, reason }),
    });
    return await response.json();
  }

  async getLogs(agentId: string, limit = 100, level?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (level) params.append("level", level);

    const response = await fetch(`${this.baseUrl}/${agentId}/logs?${params}`);
    return await response.json();
  }

  async getMetrics(agentId: string) {
    const response = await fetch(`${this.baseUrl}/${agentId}/metrics`);
    return await response.json();
  }

  async getSystemHealth() {
    const response = await fetch(`${this.baseUrl}/health/status`);
    return await response.json();
  }
}

// Usage
const client = new AgentControlClient();

// List all agents
const agents = await client.listAgents();
console.log("Agents:", agents);

// Stop an agent for maintenance
await client.stopAgent("agent_cloud_assistant", "System maintenance");

// Start agent again
await client.startAgent("agent_cloud_assistant");

// Monitor agent health
const health = await client.getSystemHealth();
console.log("System health:", health.health);
```

---

## Error Handling

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**HTTP Status Codes:**

- `200` - Success
- `400` - Bad request (invalid input)
- `404` - Agent not found
- `500` - Internal server error

---

## Monitoring & Observability

### Health Checks

Monitor system health with:

```bash
# Check overall health
curl http://localhost:3000/api/agents/health/status

# Check individual agent metrics
curl http://localhost:3000/api/agents/agent_cloud_assistant/metrics
```

### Log Aggregation

Retrieve agent logs for debugging:

```bash
# Get recent errors
curl "http://localhost:3000/api/agents/agent_cloud_assistant/logs?level=error&limit=100"

# Get all recent activity
curl "http://localhost:3000/api/agents/agent_cloud_assistant/logs?limit=1000"
```

---

**Last Updated:** 2025-12-26
**Version:** 1.0.0

🤖 Generated with Claude Code
++ b/docs/WEBSOCKET.md

# 🔌 WebSocket Real-time Communication

## Overview
