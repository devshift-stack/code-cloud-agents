# Postman Collection - Code Cloud Agents

**Version:** 0.1.0
**Collection:** `postman/collection.json`
**Environments:** `postman/environment.json` (Production), `postman/local-environment.json` (Local)

---

## 📦 Quick Setup

### 1. Import Collection

1. Open Postman
2. Click **Import** button
3. Select `postman/collection.json`
4. Click **Import**

### 2. Import Environment

**Production:**
1. Click **Import** → Select `postman/environment.json`
2. Set environment to "Code Cloud Agents - Production"

**Local Development:**
1. Click **Import** → Select `postman/local-environment.json`
2. Set environment to "Code Cloud Agents - Local"

### 3. Setup Authentication

The collection uses **Bearer Token** authentication.

**Option A: Manual Setup**
1. Go to **Authentication** folder
2. Run `Login` request with your credentials
3. Token will be automatically saved to environment variable `jwt_token`

**Option B: Set Token Manually**
1. Click **Environments** (eye icon)
2. Edit `jwt_token` variable
3. Paste your JWT token

---

## 🔑 Authentication Flow

### Step 1: Login

```
POST {{base_url}}/api/auth/login
```

**Body:**
```json
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

The **Test** script automatically saves the token:
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set('jwt_token', jsonData.token);
    pm.collectionVariables.set('jwt_token', jsonData.token);
}
```

### Step 2: Use Token

All subsequent requests will automatically include:
```
Authorization: Bearer {{jwt_token}}
```

---

## 📋 Collection Structure

### 1. Health & Info (2 requests)
- `GET /health` - System health check
- `GET /api` - API information

### 2. Authentication (1 request)
- `POST /api/auth/login` - User login (auto-saves token)

### 3. Tasks (3 requests)
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task by ID

### 4. Audit (2 requests)
- `GET /api/audit` - Get audit logs
- `POST /api/audit/verify/:id` - Verify task claims

### 5. Enforcement (3 requests)
- `GET /api/enforcement/blocked` - Get blocked tasks
- `POST /api/enforcement/approve` - Approve task
- `POST /api/enforcement/reject` - Reject task

### 6. Memory System (6 requests)
- `GET /api/memory/conversations` - List conversations
- `POST /api/memory/conversations` - Create conversation
- `GET /api/memory/conversations/:id` - Get conversation
- `POST /api/memory/conversations/:id/messages` - Add message
- `POST /api/memory/search` - Semantic search
- `GET /api/memory/stats` - Statistics

### 7. GitHub (2 requests)
- `GET /api/github/repos` - List repositories
- `GET /api/github/issues/:owner/:repo` - Get issues

### 8. Linear (2 requests)
- `GET /api/linear/issues` - List issues
- `GET /api/linear/projects` - List projects

### 9. Settings (2 requests)
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

**Total:** 25+ Requests across 9 categories

---

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API base URL | `http://178.156.178.70:3000` |
| `jwt_token` | JWT authentication token | Auto-set after login |
| `user_email` | User email for testing | `admin@example.com` |

### Switching Environments

**Production:** `http://178.156.178.70:3000`
**Local:** `http://localhost:3000`

Click the environment dropdown → Select desired environment

---

## 📝 Example Workflows

### Workflow 1: Create and Monitor Task

1. **Login** (`Authentication/Login`)
2. **Create Task** (`Tasks/Create Task`)
   - Modify body as needed
   - Note the `id` from response
3. **Get Task** (`Tasks/Get Task by ID`)
   - Replace `:id` with actual task ID
4. **Check Audit** (`Audit/Get Audit Logs`)
   - View task execution logs

### Workflow 2: Memory Search

1. **Login** (`Authentication/Login`)
2. **Create Conversation** (`Memory System/Create Conversation`)
   - Note the `id` from response
3. **Add Message** (`Memory System/Add Message`)
   - Replace `:id` with conversation ID
4. **Search** (`Memory System/Semantic Search`)
   - Search for keywords
5. **Stats** (`Memory System/Memory Statistics`)
   - View overall stats

### Workflow 3: Enforcement Flow

1. **Login** (`Authentication/Login`)
2. **Create High-Risk Task** (`Tasks/Create Task`)
   - Use description that triggers high STOP score
3. **Check Blocked** (`Enforcement/Get Blocked Tasks`)
   - Find your blocked task
4. **Approve** (`Enforcement/Approve Task`)
   - Provide taskId and reason

---

## 🧪 Pre-request Scripts

### Auto-set Task ID

Add this to a request's **Pre-request Script**:
```javascript
// Use last created task ID
const taskId = pm.collectionVariables.get('last_task_id');
if (taskId) {
    pm.variables.set('id', taskId);
}
```

### Save Response Data

Add this to a request's **Tests**:
```javascript
// Save task ID from response
if (pm.response.code === 201) {
    const jsonData = pm.response.json();
    pm.collectionVariables.set('last_task_id', jsonData.id);
}
```

---

## 🎯 Testing Best Practices

### 1. Add Tests

Example test script:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has required fields", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData).to.have.property('status');
});

pm.test("Response time < 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

### 2. Use Variables

Replace hardcoded values:
```json
{
  "email": "{{user_email}}",
  "taskId": "{{last_task_id}}"
}
```

### 3. Collection Runner

1. Click **Runner** (top left)
2. Select "Code Cloud Agents API"
3. Select environment
4. Click **Run**
5. View results

---

## 🚨 Troubleshooting

### "401 Unauthorized"

**Solution:** Token expired or missing
1. Re-run `Authentication/Login`
2. Check `jwt_token` in environment variables

### "404 Not Found"

**Solution:** Check URL and endpoint
- Verify `base_url` is correct
- Check if server is running
- Test with `Health Check` request

### "500 Internal Server Error"

**Solution:** Server issue
1. Check server logs
2. Verify request body format
3. Contact admin

### Variables Not Working

**Solution:**
1. Check environment is selected (dropdown)
2. Verify variable syntax: `{{variable_name}}`
3. Check variable scope (environment vs collection)

---

## 📊 Response Examples

### Task Creation Success
```json
{
  "id": "task-abc123",
  "name": "Implement authentication",
  "status": "pending",
  "stopScore": 15,
  "createdAt": "2025-12-26T15:35:00.000Z"
}
```

### Task Blocked (High STOP Score)
```json
{
  "blocked": true,
  "stopScore": 75,
  "reasons": [
    "Potential security risk detected",
    "Unverified external API call"
  ]
}
```

### Memory Search Results
```json
[
  {
    "conversationId": "conv-123",
    "messageId": "msg-456",
    "content": "How to implement JWT authentication...",
    "similarity": 0.92,
    "timestamp": "2025-12-26T10:30:00.000Z"
  }
]
```

---

## 🔗 Related Documentation

- **Swagger UI:** [http://178.156.178.70:3000/api-docs](http://178.156.178.70:3000/api-docs)
- **API Documentation:** `docs/API.md`
- **OpenAPI Spec:** `swagger.yaml`

---

## 📚 Additional Resources

- [Postman Documentation](https://learning.postman.com/docs/getting-started/introduction/)
- [Environment Variables](https://learning.postman.com/docs/sending-requests/variables/)
- [Test Scripts](https://learning.postman.com/docs/writing-scripts/test-scripts/)
- [Collection Runner](https://learning.postman.com/docs/running-collections/intro-to-collection-runs/)

---

**Created:** 2025-12-26
**Version:** 0.1.0
**Agent:** Agent 4 (Documentation & DevOps)
