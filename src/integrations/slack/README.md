# Slack Integration

**Status:** ✅ FULLY IMPLEMENTED

Vollständig funktionale Slack Integration mit [@slack/web-api](https://slack.dev/node-slack-sdk/).

---

## Features

- ✅ **Send Messages** - Nachrichten in Channels senden
- ✅ **Rich Formatting** - Blocks und Attachments
- ✅ **Thread Replies** - In Threads antworten
- ✅ **Webhook Support** - Einfache Nachrichten ohne Token
- ✅ **List Channels** - Alle Channels auflisten
- ✅ **Connection Status** - Workspace Info abrufen
- ✅ **Error Handling** - Sauberes Error-Handling
- ✅ **TypeScript** - Vollständig typisiert

---

## Setup

### Option 1: Bot Token (Empfohlen)

**1. Slack App erstellen:**

Gehe zu: https://api.slack.com/apps

- Klicke "Create New App" → "From scratch"
- Name: `Cloud Agents`
- Workspace auswählen

**2. Bot Permissions:**

- Gehe zu "OAuth & Permissions"
- Unter "Scopes" → "Bot Token Scopes" hinzufügen:
  - ✅ `chat:write` (Send messages)
  - ✅ `chat:write.public` (Send to public channels)
  - ✅ `channels:read` (View channels)
  - ✅ `groups:read` (View private channels)
  - ✅ `im:read` (View DMs)

**3. App installieren:**

- Klicke "Install to Workspace"
- Bestätige
- Kopiere "Bot User OAuth Token" (beginnt mit `xoxb-`)

**4. Bot zu Channels einladen:**

In Slack: `/invite @Cloud Agents` im gewünschten Channel

### Option 2: Webhook URL (Einfacher, weniger Features)

**1. Webhook erstellen:**

Gehe zu: https://api.slack.com/messaging/webhooks

- "Create your Slack app"
- "Incoming Webhooks" aktivieren
- "Add New Webhook to Workspace"
- Channel auswählen
- Webhook URL kopieren (beginnt mit `https://hooks.slack.com/`)

### 5. .env konfigurieren

**Mit Bot Token (empfohlen):**

```bash
SLACK_ENABLED=true
SLACK_TOKEN=xoxb-dein-token-hier
```

**Mit Webhook (einfacher):**

```bash
SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

**Beide (flexibel):**

```bash
SLACK_ENABLED=true
SLACK_TOKEN=xoxb-dein-token-hier
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## Usage

### Einfache Nachricht senden

```typescript
import { createSlackClient } from "./integrations/slack/client.js";

const slack = createSlackClient();

// Mit Bot Token
const result = await slack.sendMessage({
  channel: "#general",
  text: "Hello from Cloud Agents! 👋",
});

// Mit Webhook (einfacher, aber weniger Features)
const result = await slack.sendWebhook("Quick notification!");

if (result.success) {
  console.log("✅ Message sent!");
}
```

### Rich Formatted Message (Blocks)

```typescript
const result = await slack.sendMessage({
  channel: "#alerts",
  text: "Task Completed", // Fallback text
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ Task Completed Successfully",
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: "*Task:*\nGitHub Integration",
        },
        {
          type: "mrkdwn",
          text: "*Duration:*\n2.5 hours",
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Details" },
          url: "https://github.com/...",
        },
      ],
    },
  ],
});
```

### In Thread antworten

```typescript
// Erste Nachricht
const first = await slack.sendMessage({
  channel: "#dev",
  text: "Starting deployment...",
});

// Antwort im Thread
if (first.success && first.message) {
  await slack.sendMessage({
    channel: "#dev",
    text: "✅ Deployment completed!",
    threadTs: first.message.ts, // Reply to first message
  });
}
```

### Channels auflisten

```typescript
const result = await slack.listChannels();

if (result.success && result.channels) {
  result.channels.forEach((ch) => {
    console.log(`#${ch.name} - Member: ${ch.isMember}`);
  });
}
```

### Status prüfen

```typescript
const status = await slack.getStatus();

if (status.connected) {
  console.log(`Connected to: ${status.team}`);
  console.log(`Bot user: ${status.user}`);
}
```

---

## API Reference

### `createSlackClient(config?)`

Erstellt Slack Client Instanz.

**Parameters:**

- `config?` (optional)
  - `token: string` - Bot User OAuth Token
  - `webhookUrl?: string` - Incoming Webhook URL

**Returns:** `SlackClient`

---

### `SlackClient.sendMessage(message)`

Sendet Nachricht in Channel (benötigt Bot Token).

**Parameters:**

- `message: SlackMessage`
  - `channel: string` - Channel name (#general) oder ID
  - `text: string` - Nachricht Text (Markdown unterstützt)
  - `blocks?: unknown[]` - Rich formatting blocks (optional)
  - `attachments?: unknown[]` - Legacy attachments (optional)
  - `threadTs?: string` - Thread timestamp für Reply (optional)

**Returns:** `Promise<{ success: boolean; message?: SlackMessageResult; error?: string }>`

---

### `SlackClient.sendWebhook(text)`

Sendet einfache Nachricht via Webhook (kein Token nötig).

**Parameters:**

- `text: string` - Nachricht Text

**Returns:** `Promise<{ success: boolean; error?: string }>`

---

### `SlackClient.listChannels()`

Listet alle Channels auf.

**Returns:** `Promise<{ success: boolean; channels?: SlackChannel[]; error?: string }>`

---

### `SlackClient.getStatus()`

Prüft Verbindung und gibt Workspace Info zurück.

**Returns:** `Promise<{ connected: boolean; team?: string; user?: string; error?: string }>`

---

## Use Cases

### 1. Supervisor Alerts

```typescript
// STOP Score Alert
const slack = createSlackClient();

if (stopScore > 70) {
  await slack.sendMessage({
    channel: "#alerts",
    text: `🚨 CRITICAL: STOP Score ${stopScore}/100`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 STOP Required",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*STOP Score:* ${stopScore}/100\n*Task:* ${taskName}\n*Action:* Manual review required`,
        },
      },
    ],
  });
}
```

### 2. Task Completion Notifications

```typescript
// Task erfolgreich abgeschlossen
await slack.sendMessage({
  channel: "#dev",
  text: "✅ Task completed",
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Task:* ${taskName}\n*Agent:* ${agentName}\n*Duration:* ${duration}`,
      },
    },
  ],
});
```

### 3. Error Reporting

```typescript
// Fehler melden
await slack.sendMessage({
  channel: "#errors",
  text: `❌ Error: ${error.message}`,
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Error:* ${error.message}\n*File:* ${error.file}:${error.line}\n*Stack:* \`\`\`${error.stack}\`\`\``,
      },
    },
  ],
});
```

### 4. Daily Reports

```typescript
// Täglicher Statusreport
await slack.sendMessage({
  channel: "#reports",
  text: "Daily Report",
  blocks: [
    {
      type: "header",
      text: { type: "plain_text", text: "📊 Daily Report" },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Tasks Completed:* ${tasksCompleted}` },
        { type: "mrkdwn", text: `*STOP Events:* ${stopEvents}` },
        { type: "mrkdwn", text: `*Avg STOP Score:* ${avgStopScore}` },
        { type: "mrkdwn", text: `*Uptime:* ${uptime}` },
      ],
    },
  ],
});
```

### 5. Integration mit GitHub

```typescript
import { createSlackClient } from "./integrations/slack/client.js";
import { createGitHubClient } from "./integrations/github/client.js";

const slack = createSlackClient();
const github = createGitHubClient();

// Issue erstellt → Slack Notification
const issue = await github.createIssue("owner/repo", {
  title: "Bug found",
  body: "...",
});

if (issue.success) {
  await slack.sendMessage({
    channel: "#github",
    text: `🐛 New issue created: ${issue.issue?.htmlUrl}`,
  });
}
```

---

## Block Kit Builder

Für komplexe Nachrichten nutze den Block Kit Builder:

https://app.slack.com/block-kit-builder

Dort kannst du visuell Nachrichten designen und den JSON-Code kopieren.

---

## Error Handling

Alle Methoden geben `{ success: boolean; error?: string }` zurück.

```typescript
const result = await slack.sendMessage(...);

if (!result.success) {
  console.error(`Error: ${result.error}`);
  // Mögliche Errors:
  // - "Slack integration disabled"
  // - "Slack token not configured"
  // - "Slack API error: channel_not_found"
  // - "Slack API error: not_in_channel"
}
```

### Häufige Fehler

| Error               | Bedeutung                | Lösung                    |
| ------------------- | ------------------------ | ------------------------- |
| `channel_not_found` | Channel existiert nicht  | Channel-Name prüfen       |
| `not_in_channel`    | Bot ist nicht im Channel | `/invite @Bot` im Channel |
| `invalid_auth`      | Token ungültig           | Token neu generieren      |
| `missing_scope`     | Permission fehlt         | Bot Scope hinzufügen      |

---

## Troubleshooting

### Error: "Slack integration disabled"

→ Setze `SLACK_ENABLED=true` in `.env`

### Error: "Slack token not configured"

→ Setze `SLACK_TOKEN=xoxb-...` in `.env`

### Error: "not_in_channel"

→ Lade Bot in Channel ein: `/invite @Cloud Agents`

### Error: "channel_not_found"

→ Prüfe Channel-Name (muss `#` haben oder Channel-ID nutzen)

### Error: "invalid_auth"

→ Token abgelaufen oder ungültig. Neu generieren.

---

## Best Practices

1. **Nutze Threads** für zusammenhängende Nachrichten
2. **Nutze Blocks** für rich formatting statt plain text
3. **Rate Limiting** beachten (1+ message/second ist OK)
4. **Channel IDs statt Namen** für bessere Performance
5. **Webhook für simple Alerts**, Token für komplexe Nachrichten
6. **Error-Handling** immer implementieren

---

**Implementiert:** 2025-12-26
**Status:** Production Ready ✅
**SDK:** @slack/web-api v7.x
