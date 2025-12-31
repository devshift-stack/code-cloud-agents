# Linear Integration

**Status:** ✅ FULLY IMPLEMENTED

Vollständig funktionale Linear Integration mit [@linear/sdk](https://github.com/linear/linear).

---

## Features

- ✅ **Create Issues** - Issues mit allen Details erstellen
- ✅ **List Teams** - Alle Teams auflisten
- ✅ **List Workflow States** - Todo/In Progress/Done States
- ✅ **List Labels** - Alle Labels abrufen
- ✅ **Connection Status** - User und Organization Info
- ✅ **Priority Support** - Urgent/High/Medium/Low
- ✅ **Error Handling** - Sauberes Error-Handling
- ✅ **TypeScript** - Vollständig typisiert

---

## Setup

### 1. Linear API Key erstellen

Gehe zu: **https://linear.app/settings/api**

- Scrolle zu **"Personal API keys"**
- Klicke **"Create key"**
- Name: `Cloud Agents`
- Klicke **"Create"**
- **Kopiere den API Key** (wird nur einmal angezeigt!)

### 2. In .env eintragen:

```bash
LINEAR_ENABLED=true
LINEAR_API_KEY=lin_api_dein_key_hier
```

### 3. Fertig!

Kein weiteres Setup nötig. Linear SDK ist ready to use.

---

## Usage

### Issue erstellen (einfach)

```typescript
import { createLinearClient } from "./integrations/linear/client.js";

const linear = createLinearClient();

// Einfaches Issue (nutzt erstes Team automatisch)
const result = await linear.createIssue({
  title: "Implement dark mode",
  description: "Users are requesting dark mode support",
  priority: 2, // High priority
});

if (result.success && result.issue) {
  console.log(`✅ Issue created: ${result.issue.identifier}`);
  console.log(`   URL: ${result.issue.url}`);
}
```

### Issue mit allen Details

```typescript
// 1. Teams auflisten
const teams = await linear.listTeams();
const myTeam = teams.teams?.find((t) => t.key === "ENG");

// 2. Workflow States holen
const states = await linear.listWorkflowStates(myTeam.id);
const todoState = states.states?.find((s) => s.type === "unstarted");

// 3. Labels holen
const labels = await linear.listLabels(myTeam.id);
const bugLabel = labels.labels?.find((l) => l.name === "Bug");

// 4. Issue erstellen
const result = await linear.createIssue({
  teamId: myTeam.id,
  title: "Fix authentication bug",
  description: `## Problem
Login fails with OAuth

## Steps to Reproduce
1. Go to /login
2. Click GitHub OAuth
3. Error 500`,
  priority: 1, // Urgent
  stateId: todoState.id,
  labelIds: [bugLabel.id],
});
```

### Status prüfen

```typescript
const status = await linear.getStatus();

if (status.connected) {
  console.log(`Connected to: ${status.organization}`);
  console.log(`User: ${status.user}`);
}
```

### Teams auflisten

```typescript
const result = await linear.listTeams();

if (result.success && result.teams) {
  result.teams.forEach((team) => {
    console.log(`${team.name} (${team.key})`);
  });
}
```

---

## API Reference

### `createLinearClient(config?)`

Erstellt Linear Client Instanz.

**Parameters:**

- `config?` (optional)
  - `apiKey: string` - Linear API Key

**Returns:** `LinearClient`

---

### `LinearClient.createIssue(issue)`

Erstellt Issue in Linear.

**Parameters:**

- `issue: LinearIssue`
  - `title: string` - Issue Titel (required)
  - `description?: string` - Beschreibung (Markdown)
  - `teamId?: string` - Team ID (optional, nutzt erstes Team)
  - `priority?: number` - 0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low
  - `stateId?: string` - Workflow State ID
  - `assigneeId?: string` - User ID zum Assignen
  - `labelIds?: string[]` - Label IDs
  - `projectId?: string` - Project ID

**Returns:** `Promise<{ success: boolean; issue?: LinearIssueResult; error?: string }>`

**LinearIssueResult:**

- `id: string` - Issue ID
- `identifier: string` - z.B. "ENG-123"
- `title: string` - Issue Titel
- `url: string` - URL zum Issue

---

### `LinearClient.listTeams()`

Listet alle Teams auf.

**Returns:** `Promise<{ success: boolean; teams?: LinearTeam[]; error?: string }>`

**LinearTeam:**

- `id: string` - Team ID
- `name: string` - Team Name
- `key: string` - Team Key (z.B. "ENG")

---

### `LinearClient.listWorkflowStates(teamId)`

Listet Workflow States für Team auf.

**Parameters:**

- `teamId: string` - Team ID

**Returns:** `Promise<{ success: boolean; states?: LinearWorkflowState[]; error?: string }>`

**LinearWorkflowState:**

- `id: string` - State ID
- `name: string` - State Name
- `type: string` - "triage", "backlog", "unstarted", "started", "completed", "canceled"

---

### `LinearClient.listLabels(teamId?)`

Listet alle Labels auf.

**Parameters:**

- `teamId?: string` - Optional: Filter nach Team

**Returns:** `Promise<{ success: boolean; labels?: LinearLabel[]; error?: string }>`

**LinearLabel:**

- `id: string` - Label ID
- `name: string` - Label Name
- `color: string` - Hex Color

---

### `LinearClient.getStatus()`

Prüft Verbindung und gibt User Info zurück.

**Returns:** `Promise<{ connected: boolean; user?: string; organization?: string; error?: string }>`

---

## Priority Levels

| Priority    | Value | Verwendung              |
| ----------- | ----- | ----------------------- |
| Urgent      | 1     | Kritische Bugs, Blocker |
| High        | 2     | Wichtige Features       |
| Medium      | 3     | Standard Tasks          |
| Low         | 4     | Nice-to-have            |
| No priority | 0     | Backlog                 |

---

## Use Cases

### 1. STOP Score Alert → Linear Issue

```typescript
const linear = createLinearClient();

if (stopScore > 70) {
  await linear.createIssue({
    title: `🚨 STOP Required: ${taskName}`,
    description: `## STOP Score Alert

**Score:** ${stopScore}/100 (CRITICAL)

**Issues:**
- Missing tests
- No rollback plan
- Security review needed`,
    priority: 1, // Urgent
  });
}
```

### 2. GitHub Issue → Linear Issue

```typescript
import { createGitHubClient } from "./integrations/github/client.js";
import { createLinearClient } from "./integrations/linear/client.js";

const github = createGitHubClient();
const linear = createLinearClient();

// Webhook von GitHub empfangen
const githubIssue = { number: 42, title: "...", body: "..." };

// In Linear erstellen
await linear.createIssue({
  title: `[GitHub #${githubIssue.number}] ${githubIssue.title}`,
  description: githubIssue.body,
});
```

### 3. Slack Notification → Linear Issue

```typescript
import { createSlackClient } from "./integrations/slack/client.js";
import { createLinearClient } from "./integrations/linear/client.js";

const slack = createSlackClient();
const linear = createLinearClient();

// Issue erstellen
const issue = await linear.createIssue({
  title: "Critical bug found",
  priority: 1,
});

// Slack Notification
if (issue.success) {
  await slack.sendMessage({
    channel: "#dev",
    text: `🚨 Urgent issue created: ${issue.issue.url}`,
  });
}
```

### 4. Auto-Create Issues aus Error Logs

```typescript
const linear = createLinearClient();

// Error Handler
process.on("uncaughtException", async (error) => {
  await linear.createIssue({
    title: `Uncaught Exception: ${error.message}`,
    description: `\`\`\`
${error.stack}
\`\`\``,
    priority: 1,
  });
});
```

### 5. Daily Task Report

```typescript
const linear = createLinearClient();

// Am Ende des Tages
await linear.createIssue({
  title: "Daily Report - 2025-12-26",
  description: `## Completed Tasks
- Implemented GitHub integration
- Fixed login bug
- Added Slack notifications

## Tomorrow
- Complete Linear integration
- Write documentation`,
  priority: 4, // Low
});
```

---

## Integration Workflow

```
GitHub Issue → Slack Alert → Linear Issue → Assigned → In Progress → PR → Done
```

**Automatischer Flow:**

1. GitHub Issue erstellt
2. Slack Notification an Team
3. Linear Issue auto-created
4. Team member assigned
5. Status updates in Linear
6. PR linked
7. Issue closed

---

## Error Handling

Alle Methoden geben `{ success: boolean; error?: string }` zurück.

```typescript
const result = await linear.createIssue(...);

if (!result.success) {
  console.error(`Error: ${result.error}`);
  // Mögliche Errors:
  // - "Linear integration disabled"
  // - "Linear API key not configured"
  // - "No teams found in Linear workspace"
  // - "Linear API error: ..."
}
```

---

## Troubleshooting

### Error: "Linear integration disabled"

→ Setze `LINEAR_ENABLED=true` in `.env`

### Error: "Linear API key not configured"

→ Setze `LINEAR_API_KEY=lin_api_...` in `.env`

### Error: "No teams found"

→ Erstelle mindestens ein Team in Linear

### Error: "Invalid API key"

→ Key abgelaufen oder falsch. Neu generieren.

---

## Best Practices

1. **Nutze Teams** - Organisiere Issues nach Teams
2. **Labels verwenden** - Kategorisiere mit Labels
3. **Priority setzen** - Immer Priority angeben
4. **Descriptions mit Markdown** - Nutze Struktur
5. **States nutzen** - Workflow States für Status
6. **Auto-Assign** - Direkt User zuweisen
7. **Links einfügen** - Verlinke zu GitHub/Slack

---

## Linear GraphQL API

Der @linear/sdk nutzt GraphQL. Für erweiterte Queries:

```typescript
import { LinearClient } from "@linear/sdk";

const client = new LinearClient({ apiKey: "..." });

// Custom GraphQL Query
const result = await client.client.rawRequest(`
  query {
    issues(first: 10) {
      nodes {
        id
        title
        state { name }
      }
    }
  }
`);
```

---

**Implementiert:** 2025-12-26
**Status:** Production Ready ✅
**SDK:** @linear/sdk v30.x
