# 📮 Postman Guide - Code Cloud Agents API

Komplette Anleitung für die Verwendung der Postman Collection zur Interaktion mit der Code Cloud Agents API.

---

## 📋 Inhaltsverzeichnis

- [Installation](#-installation)
- [Collection Import](#-collection-import)
- [Environment Setup](#-environment-setup)
- [Collection Structure](#-collection-structure)
- [Usage Examples](#-usage-examples)
- [Testing](#-testing)
- [Variables](#-variables)
- [Pre-request Scripts](#-pre-request-scripts)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Installation

### 1. Postman installieren

**Desktop App (empfohlen):**

- Download: https://www.postman.com/downloads/
- macOS, Windows, Linux verfügbar

**Web Version:**

- URL: https://web.postman.com/
- Erfordert Login

---

## 📥 Collection Import

### Methode 1: Import via Files

1. **Öffne Postman**
2. **Klicke auf "Import"** (oben links)
3. **Wähle Files:**
   - `postman/Cloud-Agents.postman_collection.json`
   - `postman/Cloud-Agents.dev.postman_environment.json`
   - `postman/Cloud-Agents.prod.postman_environment.json`
4. **Klicke "Import"**

---

### Methode 2: Import via URL (wenn Repository public)

1. **Öffne Postman**
2. **Klicke auf "Import"**
3. **Wähle "Link" Tab**
4. **Paste URL:**
   ```
   https://raw.githubusercontent.com/activiAI/Optimizecodecloudagents/main/postman/Cloud-Agents.postman_collection.json
   ```
5. **Klicke "Continue" → "Import"**

---

## 🌍 Environment Setup

### Environments verfügbar:

1. **Development** (`Cloud-Agents.dev.postman_environment.json`)
   - BaseURL: `http://localhost:3000`
   - Für lokale Entwicklung

2. **Production** (`Cloud-Agents.prod.postman_environment.json`)
   - BaseURL: `http://178.156.178.70:3000`
   - Für Production Server

### Environment aktivieren:

1. **Oben rechts:** Dropdown neben "No Environment"
2. **Wähle:** "Code Cloud Agents - Development" ODER "...Production"
3. **✅ Environment ist aktiv**

---

## 📂 Collection Structure

```
Code Cloud Agents API
├── Health
│   ├── Get API Info
│   └── Health Check
├── Tasks
│   ├── List All Tasks
│   ├── Create Task
│   ├── Get Task by ID
│   └── Submit Work
├── Audit
│   ├── List Audit Entries
│   └── Get Audit Entry by ID
├── Enforcement
│   ├── Get Blocked Tasks
│   ├── Approve Blocked Task
│   └── Reject Blocked Task
├── Chat
│   ├── Send Chat Message
│   └── Get Available Agents
├── Demo
│   ├── Create Demo Invite (Admin)
│   ├── Redeem Invite Code
│   ├── Get Demo Statistics (Admin)
│   └── Get User Usage Stats
└── Slack
    └── Slack Events Webhook
```

**Total:** 18 Endpoints in 7 Kategorien

---

## 🎯 Usage Examples

### Example 1: Complete Task Workflow

**Schritt 1: Health Check**

```
GET /health
→ Verify system is running
```

**Schritt 2: Create Task**

```
POST /api/tasks
Body:
{
  "title": "Implement user authentication",
  "priority": "high"
}
→ Returns task with ID
→ taskId wird automatisch in Environment gespeichert
```

**Schritt 3: Get Task Details**

```
GET /api/tasks/{{taskId}}
→ Uses saved taskId from previous request
```

**Schritt 4: Submit Work**

```
POST /api/tasks/{{taskId}}
Body:
{
  "content": "Implemented JWT auth",
  "artefacts": ["src/auth/jwt.ts"]
}
→ Returns STOP-Score
→ If score ≥ 70: Task wird blockiert
```

**Schritt 5: Check Blocked Tasks (if blocked)**

```
GET /api/enforcement/blocked
→ Shows all blocked tasks
```

**Schritt 6: Approve Task (if blocked)**

```
POST /api/enforcement/approve
Body:
{
  "taskId": "{{taskId}}",
  "approvedBy": "admin@example.com",
  "reason": "Evidence verified"
}
→ Task unblocked
```

---

### Example 2: Demo User Creation

**Schritt 1: Create Invite (Admin)**

```
POST /api/demo/invites
Body:
{
  "createdBy": "admin@example.com",
  "maxRedemptions": 10,
  "taskLimit": 50
}
→ Returns invite code
→ inviteCode wird automatisch gespeichert
```

**Schritt 2: Redeem Invite**

```
POST /api/demo/redeem
Body:
{
  "code": "{{inviteCode}}",
  "username": "johndoe",
  "password": "SecurePass123"
}
→ Creates demo user
→ demoUserId wird automatisch gespeichert
```

**Schritt 3: Check User Usage**

```
GET /api/demo/users/{{demoUserId}}
→ Shows usage stats (tasks, messages, credits)
```

---

### Example 3: AI Chat Workflow

**Schritt 1: Get Available Agents**

```
GET /api/chat/agents
→ List of AI agents (emir, mujo, etc.)
```

**Schritt 2: Send Chat Message**

```
POST /api/chat/send
Body:
{
  "message": "Help me with authentication",
  "userId": "user123",
  "agentName": "emir",
  "provider": "anthropic"
}
→ Returns AI response
```

---

## 🧪 Testing

### Automatische Tests

Jeder Request hat eingebaute Tests:

**Global Tests (auf alle Requests):**

- ✅ Response time < 5000ms
- ✅ Content-Type is application/json

**Request-spezifische Tests:**

- ✅ Status Code Checks
- ✅ Response Structure Validation
- ✅ Data Type Checks

### Tests ausführen:

**Einzelner Request:**

1. Request auswählen
2. "Send" klicken
3. "Test Results" Tab anzeigen

**Ganzer Ordner:**

1. Ordner auswählen (z.B. "Tasks")
2. "..." klicken → "Run folder"
3. "Run" klicken
4. Test Results anzeigen

**Gesamte Collection:**

1. Collection auswählen
2. "..." klicken → "Run collection"
3. Environment wählen
4. "Run Code Cloud Agents API"
5. Test Report anzeigen

---

### Test Results interpretieren:

```
✅ PASSED (200 OK)
   ✅ Status code is 200
   ✅ Response has correct structure
   ✅ Supervisor mode is SUPERVISED
```

```
❌ FAILED (500 Internal Server Error)
   ❌ Status code is 200
      Expected 200, got 500
```

---

## 🔧 Variables

### Environment Variables

| Variable     | Type    | Beschreibung                     |
| ------------ | ------- | -------------------------------- |
| `baseUrl`    | Static  | API Base URL                     |
| `taskId`     | Dynamic | Zuletzt erstellte Task ID        |
| `auditId`    | Dynamic | Zuletzt erstellte Audit Entry ID |
| `inviteCode` | Dynamic | Zuletzt erstellter Invite Code   |
| `demoUserId` | Dynamic | Zuletzt erstellte Demo User ID   |
| `userId`     | Static  | Standard User ID                 |
| `adminEmail` | Static  | Admin Email                      |

### Variables verwenden:

**In URL:**

```
{{baseUrl}}/api/tasks/{{taskId}}
```

**In Request Body:**

```json
{
  "userId": "{{userId}}",
  "taskId": "{{taskId}}"
}
```

**In Headers:**

```
X-User-ID: {{userId}}
```

### Variables setzen:

**Manuell:**

1. Environment auswählen (rechts oben)
2. "..." klicken → "Edit"
3. Variable ändern
4. "Save" klicken

**Automatisch via Tests:**

```javascript
pm.environment.set("taskId", jsonData.id);
```

---

## ⚙️ Pre-request Scripts

### Global Pre-request Script

Läuft vor **jedem** Request:

```javascript
console.log("=== Request Details ===");
console.log("Method:", pm.request.method);
console.log("URL:", pm.request.url.toString());
console.log("Timestamp:", new Date().toISOString());
```

**Nützlich für:**

- Logging
- Token Refresh (zukünftig)
- Request Timing

---

### Request-spezifische Pre-request Scripts

**Beispiel: Dynamic Timestamp**

```javascript
pm.environment.set("timestamp", new Date().toISOString());
```

Dann in Body verwenden:

```json
{
  "createdAt": "{{timestamp}}"
}
```

---

## 🔍 Troubleshooting

### Problem: "Could not get response"

**Ursache:** Server läuft nicht

**Lösung:**

```bash
# Check if server is running
curl http://localhost:3000/health

# If not, start server
npm run backend:dev
```

---

### Problem: "404 Not Found"

**Ursache:** Endpoint existiert nicht oder falsche URL

**Lösung:**

1. Check baseUrl in Environment
2. Check Endpoint URL
3. Verify server routes: http://localhost:3000/api

---

### Problem: "Environment variable not found"

**Ursache:** Variable nicht gesetzt

**Lösung:**

1. Check Environment ist aktiv (rechts oben)
2. Run "Create Task" Request zuerst (setzt taskId)
3. Oder setze Variable manuell

---

### Problem: "Test failed: Status code is 200"

**Ursache:** Server returned error (4xx/5xx)

**Lösung:**

1. Check Response Body für Error-Details
2. Check Request Body format
3. Check Server Logs:
   ```bash
   pm2 logs cloud-agents-backend
   ```

---

### Problem: "Rate limit exceeded (429)"

**Ursache:** Demo Redeem Endpoint ist rate-limited

**Lösung:**

- Warte 15 Minuten
- Oder use different IP/User

---

## 📊 Best Practices

### 1. Environment Management

- ✅ Verwende Development für lokale Tests
- ✅ Verwende Production nur für finale Verifikation
- ❌ Nicht Production Environment für Bulk-Tests

---

### 2. Request Order

**Empfohlene Reihenfolge:**

1. Health Check (verify server)
2. Get API Info (verify version)
3. Functionality Tests (Tasks, Chat, etc.)

**Task Workflow:**

```
Create Task → Get Task → Submit Work → Check Blocked → Approve/Reject
```

**Demo Workflow:**

```
Create Invite → Redeem Invite → Check User Stats
```

---

### 3. Testing Strategy

**Development:**

- Run einzelne Requests
- Verify Response manually
- Iterate quickly

**Pre-Deployment:**

- Run gesamte Collection
- Verify all Tests pass
- Check Performance (response times)

---

### 4. Variables Management

- ✅ Use Environment Variables für URLs
- ✅ Let Tests auto-save IDs
- ✅ Update static variables (userId, adminEmail) für dein Setup

---

## 🎓 Advanced Usage

### Collection Runner

**Automatisierte Test-Suites:**

1. "Runner" klicken (links unten)
2. Collection wählen
3. Environment wählen
4. Iterations: 1 (oder mehr für Stress-Tests)
5. "Run Code Cloud Agents API"

**Export Results:**

- JSON Export
- HTML Export (via Newman CLI)

---

### Newman CLI

**Command-Line Collection Runner:**

```bash
# Install Newman
npm install -g newman

# Run Collection
newman run postman/Cloud-Agents.postman_collection.json \
  --environment postman/Cloud-Agents.dev.postman_environment.json

# With HTML Report
newman run postman/Cloud-Agents.postman_collection.json \
  --environment postman/Cloud-Agents.dev.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export newman-report.html
```

---

### CI/CD Integration

**GitHub Actions Example:**

```yaml
- name: Run Postman Tests
  run: |
    npm install -g newman
    newman run postman/Cloud-Agents.postman_collection.json \
      --environment postman/Cloud-Agents.dev.postman_environment.json \
      --bail
```

---

## 📚 Weitere Ressourcen

### Dokumentation:

- **[README.md](../README.md)**: Projekt-Overview
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)**: Entwickler-Setup
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System-Design
- **[OpenAPI Spec](../swagger.yaml)**: API Specification

### Postman Learning:

- https://learning.postman.com/
- https://www.postman.com/postman/workspace/postman-answers

---

## 🆘 Support

**Bei Problemen:**

1. Check Troubleshooting Section oben
2. Check Server Logs: `pm2 logs cloud-agents-backend`
3. Check API Docs: http://localhost:3000/api/docs
4. GitHub Issues: https://github.com/activiAI/Optimizecodecloudagents/issues

---

**Erstellt:** 2025-12-26
**Version:** 1.0

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
