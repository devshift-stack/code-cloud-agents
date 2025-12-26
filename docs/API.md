# Code Cloud Agents - API Documentation

**Version:** 0.1.0
**Server:** http://178.156.178.70:3000
**Local:** http://localhost:3000

---

## 📚 Interactive Documentation

**Swagger UI:** [http://178.156.178.70:3000/api-docs](http://178.156.178.70:3000/api-docs)

Interactive API documentation with try-it-out functionality.

---

## 🏗️ Architecture

```
META_SUPERVISOR (Routing + Monitoring)
    ↓
ENGINEERING_LEAD_SUPERVISOR (Plan + Delegate + Verify + STOP)
    ↓
CLOUD_ASSISTANT (Execute + Report + Evidence)
```

---

## 🔑 Authentication

All API endpoints (except `/health` and `/api`) require JWT authentication.

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Using the Token

Include the token in all subsequent requests:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://178.156.178.70:3000/api/tasks
```

---

## 📋 API Endpoints Overview

### Health & Info
- `GET /health` - System health check
- `GET /api` - API information

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Audit
- `GET /api/audit` - Get audit logs
- `POST /api/audit/verify/:id` - Verify task claims

### Enforcement
- `GET /api/enforcement/blocked` - Get blocked tasks
- `POST /api/enforcement/approve` - Approve blocked task
- `POST /api/enforcement/reject` - Reject blocked task

### Memory System (21 Endpoints)
- `GET /api/memory/conversations` - List conversations
- `POST /api/memory/conversations` - Create conversation
- `GET /api/memory/conversations/:id` - Get conversation
- `POST /api/memory/conversations/:id/messages` - Add message
- `POST /api/memory/search` - Semantic search
- `GET /api/memory/stats` - Memory statistics
- _...and 15 more_

### GitHub Integration
- `GET /api/github/repos` - List repositories
- `GET /api/github/issues/:owner/:repo` - Get issues
- `POST /api/github/issues/:owner/:repo` - Create issue
- `GET /api/github/prs/:owner/:repo` - Get pull requests

### Linear Integration
- `GET /api/linear/issues` - List issues
- `POST /api/linear/issues` - Create issue
- `GET /api/linear/projects` - List projects

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### Webhooks
- `POST /api/webhooks/github` - GitHub webhook handler
- `POST /api/webhooks/linear` - Linear webhook handler

### Slack
- `POST /api/slack/events` - Slack events handler

---

## 🚀 Quick Start Examples

### 1. Health Check

```bash
curl http://178.156.178.70:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-26T15:30:45.892Z",
  "components": {
    "database": "healthy",
    "queue": "healthy"
  },
  "mode": "in-memory"
}
```

### 2. Create a Task

```bash
curl -X POST http://178.156.178.70:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Implement authentication",
    "description": "Add JWT auth to API",
    "agent": "CLOUD_ASSISTANT",
    "priority": "high"
  }'
```

**Response:**
```json
{
  "id": "task-abc123",
  "name": "Implement authentication",
  "description": "Add JWT auth to API",
  "agent": "CLOUD_ASSISTANT",
  "status": "pending",
  "priority": "high",
  "stopScore": 15,
  "createdAt": "2025-12-26T15:35:00.000Z"
}
```

### 3. Get All Tasks

```bash
curl http://178.156.178.70:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Semantic Memory Search

```bash
curl -X POST http://178.156.178.70:3000/api/memory/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "authentication implementation",
    "limit": 5,
    "agentName": "CLOUD_ASSISTANT"
  }'
```

---

## 🛡️ STOP Score System

Tasks are automatically evaluated for risk using STOP scores (0-100):

| Score | Risk Level | Action |
|-------|------------|--------|
| 0-19 | LOW | ✅ Proceed automatically |
| 20-44 | MEDIUM | ⚠️ Review required |
| 45-69 | HIGH | ⚠️ Approval needed |
| 70-100 | CRITICAL | 🛑 **STOP REQUIRED** |

When a task is blocked (STOP score ≥ 45), it requires human approval:

```bash
POST /api/enforcement/approve
{
  "taskId": "task-abc123",
  "approver": "admin@example.com",
  "reason": "Reviewed and approved for production"
}
```

---

## 🔌 WebSocket Updates

Real-time updates available via WebSocket:

```javascript
const ws = new WebSocket('ws://178.156.178.70:3000');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log('Event:', event);
});

// Events:
// - agent_status: Agent state changes
// - task_update: Task progress updates
// - enforcement_alert: High STOP score alerts
```

---

## 📊 Memory System

The Memory System provides semantic search and conversation management across 21 endpoints.

### Key Features:
- **Conversations**: Multi-turn chat history
- **Messages**: Individual messages with embeddings
- **Semantic Search**: Vector similarity search
- **Statistics**: Usage analytics
- **Trending Topics**: Popular themes

### Example: Add Message to Conversation

```bash
POST /api/memory/conversations/{id}/messages
{
  "role": "user",
  "content": "How do I implement auth?",
  "metadata": {
    "priority": "high"
  }
}
```

---

## 🔗 Integration Examples

### GitHub Integration

```bash
# Get repositories
GET /api/github/repos

# Get issues for a repo
GET /api/github/issues/dsactivi-2/code-cloud-agents

# Create an issue
POST /api/github/issues/dsactivi-2/code-cloud-agents
{
  "title": "Bug: Auth not working",
  "body": "Description of the bug",
  "labels": ["bug", "high-priority"]
}
```

### Linear Integration

```bash
# Get issues
GET /api/linear/issues

# Create issue
POST /api/linear/issues
{
  "title": "Implement feature X",
  "description": "Full description",
  "priority": 1
}
```

---

## 🚨 Error Handling

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional information"
  }
}
```

### Common Error Codes:

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `STOP_REQUIRED` | 403 | Task blocked by enforcement gate |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 📦 Rate Limiting

- **Default:** 100 requests per minute per IP
- **Authenticated:** 1000 requests per minute per user

Exceeded limits return:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## 🧪 Testing

### Using curl:
```bash
# Set token
export TOKEN="your-jwt-token"

# Test endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://178.156.178.70:3000/api/tasks
```

### Using Postman:
Import the Postman collection: `postman/collection.json`

---

## 📚 Additional Resources

- **Swagger UI:** [/api-docs](http://178.156.178.70:3000/api-docs)
- **Postman Collection:** `postman/collection.json`
- **OpenAPI Spec:** `swagger.yaml`
- **GitHub:** [dsactivi-2/code-cloud-agents](https://github.com/dsactivi-2/code-cloud-agents)

---

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/dsactivi-2/code-cloud-agents/issues)
- **Docs:** [Repository Wiki](https://github.com/dsactivi-2/code-cloud-agents/wiki)

---

**Generated:** 2025-12-26
**Version:** 0.1.0
**Agent:** Agent 4 (Documentation & DevOps)
