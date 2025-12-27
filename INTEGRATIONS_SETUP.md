# 🔌 Integrations Setup Guide

**Status:** GitHub, Slack, Linear vollständig implementiert und funktional

---

## 📋 Übersicht

| Integration | Status | Setup Zeit | Features |
|-------------|--------|------------|----------|
| **GitHub** | ✅ Production Ready | 2 min | Issues, Repos, Status |
| **Slack** | ✅ Production Ready | 3 min | Messages, Webhooks, Threads |
| **Linear** | ✅ Production Ready | 2 min | Issues, Teams, Workflows |

---

## 🚀 Quick Start (Alle 3 Integrationen)

### 1. GitHub Setup

**API Token erstellen:**
1. https://github.com/settings/tokens
2. "Generate new token (classic)"
3. Scopes: ✅ `repo`, ✅ `write:org` (optional)
4. Token kopieren

**In .env:**
```bash
GITHUB_ENABLED=true
GITHUB_TOKEN=ghp_dein_token_hier
GITHUB_ORG=deine-org  # Optional
```

**Test:**
```typescript
import { createGitHubClient } from "./integrations/github/client.js";
const github = createGitHubClient();
await github.getStatus();
```

---

### 2. Slack Setup

**Option A: Bot Token (Empfohlen)**

1. https://api.slack.com/apps → "Create New App" → "From scratch"
2. Name: `Cloud Agents`
3. "OAuth & Permissions" → Bot Token Scopes:
   - ✅ `chat:write`
   - ✅ `chat:write.public`
   - ✅ `channels:read`
4. "Install to Workspace" → Token kopieren
5. In Channel: `/invite @Cloud Agents`

**Option B: Webhook (Einfacher)**

1. https://api.slack.com/messaging/webhooks
2. "Create your Slack app" → "Incoming Webhooks"
3. "Add New Webhook to Workspace" → Channel wählen
4. URL kopieren

**In .env:**
```bash
SLACK_ENABLED=true
SLACK_TOKEN=xoxb-dein-token-hier          # Option A
SLACK_WEBHOOK_URL=https://hooks.slack...  # Option B (oder beide)
```

**Test:**
```typescript
import { createSlackClient } from "./integrations/slack/client.js";
const slack = createSlackClient();
await slack.sendMessage({ channel: "#general", text: "Test!" });
```

---

### 3. Linear Setup

**API Key erstellen:**
1. https://linear.app/settings/api
2. "Personal API keys" → "Create key"
3. Name: `Cloud Agents`
4. Key kopieren

**In .env:**
```bash
LINEAR_ENABLED=true
LINEAR_API_KEY=lin_api_dein_key_hier
```

**Test:**
```typescript
import { createLinearClient } from "./integrations/linear/client.js";
const linear = createLinearClient();
await linear.getStatus();
```

---

## 🔧 Detaillierte Dokumentation

Jede Integration hat vollständige Dokumentation:

- **GitHub:** `src/integrations/github/README.md`
- **Slack:** `src/integrations/slack/README.md`
- **Linear:** `src/integrations/linear/README.md`

---

## 💡 Beispiele

### GitHub Issue erstellen

```typescript
import { createGitHubClient } from "./integrations/github/client.js";

const github = createGitHubClient();

const result = await github.createIssue("owner/repo", {
  title: "Bug: Login fails",
  body: "Users can't log in with OAuth",
  labels: ["bug", "priority-high"],
});

console.log(result.issue?.htmlUrl);
```

### Slack Nachricht senden

```typescript
import { createSlackClient } from "./integrations/slack/client.js";

const slack = createSlackClient();

await slack.sendMessage({
  channel: "#dev",
  text: "✅ Deployment completed!",
  blocks: [
    {
      type: "section",
      text: { type: "mrkdwn", text: "*Status:* Success\n*Duration:* 2.5 minutes" }
    }
  ]
});
```

### Linear Issue erstellen

```typescript
import { createLinearClient } from "./integrations/linear/client.js";

const linear = createLinearClient();

const result = await linear.createIssue({
  title: "Implement dark mode",
  description: "Users requesting dark theme",
  priority: 2, // High
});

console.log(result.issue?.url);
```

---

## 🔄 Integration Workflows

### Workflow 1: GitHub → Slack → Linear

```typescript
import { createGitHubClient } from "./integrations/github/client.js";
import { createSlackClient } from "./integrations/slack/client.js";
import { createLinearClient } from "./integrations/linear/client.js";

const github = createGitHubClient();
const slack = createSlackClient();
const linear = createLinearClient();

// 1. GitHub Issue erstellt
const githubIssue = await github.createIssue("owner/repo", {
  title: "Critical Bug",
  body: "Production error"
});

// 2. Slack Notification
await slack.sendMessage({
  channel: "#alerts",
  text: `🚨 Critical issue: ${githubIssue.issue?.htmlUrl}`
});

// 3. Linear Issue für Tracking
await linear.createIssue({
  title: `[GitHub] Critical Bug`,
  description: `Source: ${githubIssue.issue?.htmlUrl}`,
  priority: 1
});
```

### Workflow 2: STOP Score Alert

```typescript
const stopScore = 75;

// Linear Issue
const linearIssue = await linear.createIssue({
  title: `🚨 STOP Required: ${taskName}`,
  description: `STOP Score: ${stopScore}/100`,
  priority: 1
});

// Slack Alert
await slack.sendMessage({
  channel: "#alerts",
  text: `🚨 STOP Score ${stopScore}/100`,
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Linear Issue:* ${linearIssue.issue?.url}\n*Action:* Manual review required`
      }
    }
  ]
});

// GitHub Issue als Backup
await github.createIssue("team/repo", {
  title: `STOP: ${taskName}`,
  body: `STOP Score: ${stopScore}\nLinear: ${linearIssue.issue?.url}`,
  labels: ["stop-score", "urgent"]
});
```

---

## 🔐 Sicherheit

### .env Datei (NICHT committen!)

```bash
# ✅ RICHTIG - In .env
GITHUB_TOKEN=ghp_...
SLACK_TOKEN=xoxb-...
LINEAR_API_KEY=lin_api_...

# ❌ FALSCH - Hardcoded
const token = "ghp_123..."; // NIEMALS!
```

### .gitignore prüfen

```bash
# Muss in .gitignore stehen:
.env
.env.local
.env.*.local
```

---

## 🧪 Testing

### Status aller Integrationen prüfen

```typescript
import { createGitHubClient } from "./integrations/github/client.js";
import { createSlackClient } from "./integrations/slack/client.js";
import { createLinearClient } from "./integrations/linear/client.js";

const github = createGitHubClient();
const slack = createSlackClient();
const linear = createLinearClient();

// Status prüfen
const githubStatus = await github.getStatus();
const slackStatus = await slack.getStatus();
const linearStatus = await linear.getStatus();

console.log("GitHub:", githubStatus.connected ? "✅" : "❌");
console.log("Slack:", slackStatus.connected ? "✅" : "❌");
console.log("Linear:", linearStatus.connected ? "✅" : "❌");
```

---

## 🐛 Troubleshooting

### GitHub

| Error | Lösung |
|-------|--------|
| `invalid_auth` | Token neu generieren |
| `Not Found` | Repo-Name prüfen oder Permissions fehlen |
| `rate limit` | Warte 1 Stunde oder nutze authenticated token |

### Slack

| Error | Lösung |
|-------|--------|
| `not_in_channel` | `/invite @Bot` im Channel |
| `channel_not_found` | Channel-Name prüfen (mit `#`) |
| `invalid_auth` | Token neu generieren |

### Linear

| Error | Lösung |
|-------|--------|
| `Invalid API key` | Key neu generieren |
| `No teams found` | Mindestens ein Team erstellen |
| `Unauthorized` | API key Permissions prüfen |

---

## 📊 Next Steps

Nach dem Setup:

1. **API Endpoints erstellen** - Integrationen über REST API zugänglich machen
2. **Webhook Handler** - Automatische Triggers von GitHub/Slack
3. **Supervisor Integration** - STOP Scores → Linear Issues
4. **Dashboard** - Status aller Integrationen anzeigen
5. **Notifications** - Auto-Alerts bei Critical Events

---

## 📚 Dokumentation Links

- **GitHub API:** https://docs.github.com/rest
- **Slack API:** https://api.slack.com/
- **Linear API:** https://developers.linear.app/

---

## ✅ Checkliste

- [ ] GitHub Token erstellt und in .env
- [ ] GitHub Status getestet
- [ ] Slack Bot erstellt oder Webhook URL in .env
- [ ] Slack Bot in Channel eingeladen
- [ ] Slack Status getestet
- [ ] Linear API Key erstellt und in .env
- [ ] Linear Status getestet
- [ ] .env NICHT in Git committed
- [ ] Test-Issue in GitHub erstellt
- [ ] Test-Message in Slack gesendet
- [ ] Test-Issue in Linear erstellt

---

**Setup Zeit:** ~10 Minuten für alle 3 Integrationen
**Status:** Alles Production Ready ✅
**Letzte Aktualisierung:** 2025-12-26
