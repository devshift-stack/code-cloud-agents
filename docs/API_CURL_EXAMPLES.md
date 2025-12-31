# API curl Examples

## Authentication

### Login (get JWT token)
```bash
# Success case
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cloudagents.io","password":"ChangeMe123!"}'

# Response (200 OK):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@cloudagents.io",
    "role": "admin"
  }
}

# Error case - wrong credentials (401 Unauthorized):
{
  "error": "Invalid email or password"
}

# Error case - too many attempts (429 Too Many Requests):
{
  "error": "Too many login attempts. Please try again later."
}
```

---

## Agents Status (NEW)

### GET /api/agents/status
Get status overview of all agents (for MCP tools / dashboard).

```bash
TOKEN="your-jwt-token"

curl -X GET http://localhost:4000/api/agents/status \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "agents": [
    {
      "name": "Agent 0",
      "status": "online",
      "pid": 12345,
      "uptime": 86400,
      "queueDepth": 1,
      "lastError": null,
      "lastActivity": "2025-12-31T10:00:00.000Z"
    },
    {
      "name": "Agent 1",
      "status": "offline",
      "pid": null,
      "uptime": 0,
      "queueDepth": 0,
      "lastError": null,
      "lastActivity": "2025-12-31T09:00:00.000Z"
    }
  ],
  "count": 5,
  "timestamp": "2025-12-31T12:00:00.000Z"
}
```

**Error (401 Unauthorized):**
```json
{
  "error": "No authorization header"
}
```

**Error (403 Forbidden):**
```json
{
  "error": "Admin access required"
}
```

---

## Tasks

### GET /api/tasks - List all tasks
```bash
TOKEN="your-jwt-token"

# All tasks
curl -X GET http://localhost:4000/api/tasks \
  -H "Authorization: Bearer $TOKEN"

# Filter by state
curl -X GET "http://localhost:4000/api/tasks?state=running" \
  -H "Authorization: Bearer $TOKEN"

# Available states: pending, running, in_progress, done, completed, failed, stopped
```

**Response (200 OK):**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "uuid-123",
      "title": "Implement feature X",
      "state": "in_progress",
      "createdAt": "2025-12-31T10:00:00.000Z",
      "updatedAt": "2025-12-31T11:00:00.000Z"
    }
  ],
  "count": 1,
  "filter": "running"
}
```

### State mapping:
| API State | Database Status |
|-----------|-----------------|
| running   | in_progress     |
| failed    | stopped         |
| done      | completed       |
| pending   | pending         |

### POST /api/tasks - Create task
```bash
TOKEN="your-jwt-token"

curl -X POST http://localhost:4000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build Status Dashboard",
    "description": "Create a dashboard showing agent status",
    "priority": "high"
  }'
```

**Response (201 Created):**
```json
{
  "id": "uuid-123",
  "status": "pending",
  "gate_status": "OPEN",
  "message": "Task created and queued for processing"
}
```

**Response (202 Accepted - BLOCKED by Enforcement Gate):**
```json
{
  "id": "uuid-123",
  "status": "BLOCKED",
  "stop_score": 75,
  "reasons": ["High risk operation detected"],
  "message": "⚠️ STOP_REQUIRED: Task blocked. Human approval needed.",
  "approval_url": "/api/enforcement/approve/uuid-123"
}
```

---

## Quick Test Script

```bash
#!/bin/bash
# test-api.sh

BASE_URL="http://localhost:4000"

echo "=== 1. Login ==="
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cloudagents.io","password":"ChangeMe123!"}' \
  | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✅ Token: ${TOKEN:0:20}..."

echo ""
echo "=== 2. Agents Status ==="
curl -s -X GET $BASE_URL/api/agents/status \
  -H "Authorization: Bearer $TOKEN" | jq '.agents[] | {name, status, uptime}'

echo ""
echo "=== 3. All Tasks ==="
curl -s -X GET $BASE_URL/api/tasks \
  -H "Authorization: Bearer $TOKEN" | jq '.tasks | length'

echo ""
echo "=== 4. Running Tasks ==="
curl -s -X GET "$BASE_URL/api/tasks?state=running" \
  -H "Authorization: Bearer $TOKEN" | jq '.count'

echo ""
echo "=== 5. Health Check ==="
curl -s -X GET $BASE_URL/health | jq '.'
```

---

## Error Response Shapes

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "details": [
    {
      "code": "too_small",
      "message": "String must contain at least 1 character(s)",
      "path": ["title"]
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "No authorization header"
}
```
or
```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Task not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```
