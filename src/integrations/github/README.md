# GitHub Integration

**Status:** ✅ FULLY IMPLEMENTED

Vollständig funktionale GitHub Integration mit [@octokit/rest](https://github.com/octokit/rest.js).

---

## Features

- ✅ **Issue Creation** - Issues in beliebigem Repo erstellen
- ✅ **Repository Listing** - Alle deine Repos auflisten
- ✅ **Connection Status** - Authentifizierung prüfen
- ✅ **Org Support** - Arbeite mit Organization Repos
- ✅ **Error Handling** - Sauberes Error-Handling
- ✅ **TypeScript** - Vollständig typisiert

---

## Setup

### 1. GitHub Token erstellen

Gehe zu: https://github.com/settings/tokens

**Token (classic):**

- Klicke "Generate new token (classic)"
- Name: `Cloud Agents Integration`
- Scopes aktivieren:
  - ✅ `repo` (Full control of private repositories)
  - ✅ `write:org` (Read and write org data) - nur wenn du mit Org arbeitest
- Token kopieren

### 2. .env konfigurieren

```bash
# In .env eintragen:
GITHUB_ENABLED=true
GITHUB_TOKEN=ghp_dein_token_hier
GITHUB_ORG=deine-org-name  # Optional, falls du mit Organization arbeitest
```

### 3. Testen

```bash
# Backend starten
npm run backend:dev
```

---

## Usage

### In TypeScript/JavaScript

```typescript
import { createGitHubClient } from "./integrations/github/client.js";

// Client erstellen (liest automatisch aus ENV)
const github = createGitHubClient();

// 1. Verbindung testen
const status = await github.getStatus();
console.log(status);
// { connected: true, user: "dsactivi" }

// 2. Issue erstellen
const issue = await github.createIssue("owner/repo", {
  title: "Bug: Login funktioniert nicht",
  body: "Beschreibung des Problems...",
  labels: ["bug", "priority-high"],
  assignees: ["username"],
});
console.log(issue);
// { success: true, issue: { number: 42, url: "...", htmlUrl: "..." } }

// 3. Repositories auflisten
const repos = await github.listRepos();
console.log(repos);
// { success: true, repos: [{ name: "repo1", fullName: "owner/repo1", private: false }, ...] }
```

### Von Backend API

Erstelle z.B. einen Endpoint in `src/api/github.ts`:

```typescript
import { Router } from "express";
import { createGitHubClient } from "../integrations/github/client.js";

const router = Router();

// POST /api/github/issues
router.post("/issues", async (req, res) => {
  const { repo, title, body, labels } = req.body;

  const github = createGitHubClient();
  const result = await github.createIssue(repo, { title, body, labels });

  res.json(result);
});

// GET /api/github/repos
router.get("/repos", async (req, res) => {
  const github = createGitHubClient();
  const result = await github.listRepos();

  res.json(result);
});

export default router;
```

---

## API Reference

### `createGitHubClient(config?)`

Erstellt GitHub Client Instanz.

**Parameters:**

- `config?` (optional) - Config-Objekt
  - `token: string` - GitHub Personal Access Token
  - `org?: string` - Organization Name

**Returns:** `GitHubClient`

---

### `GitHubClient.createIssue(repo, issue)`

Erstellt ein Issue in einem Repository.

**Parameters:**

- `repo: string` - Repository im Format "owner/repo"
- `issue: GitHubIssue` - Issue Details
  - `title: string` - Issue Titel
  - `body: string` - Issue Beschreibung
  - `labels?: string[]` - Labels (optional)
  - `assignees?: string[]` - Assignees (optional)

**Returns:** `Promise<{ success: boolean; issue?: GitHubIssueResult; error?: string }>`

**Example:**

```typescript
const result = await github.createIssue("dsactivi-2/repo", {
  title: "Feature Request",
  body: "Wir brauchen...",
  labels: ["enhancement"],
});
```

---

### `GitHubClient.listRepos()`

Listet alle Repositories auf (User oder Org).

**Returns:** `Promise<{ success: boolean; repos?: Array<{name, fullName, private}>; error?: string }>`

**Example:**

```typescript
const result = await github.listRepos();
if (result.success) {
  result.repos.forEach((r) => console.log(r.fullName));
}
```

---

### `GitHubClient.getStatus()`

Prüft Verbindung und gibt User-Info zurück.

**Returns:** `Promise<{ connected: boolean; user?: string; error?: string }>`

**Example:**

```typescript
const status = await github.getStatus();
if (status.connected) {
  console.log(`Logged in as: ${status.user}`);
}
```

---

## Error Handling

Alle Methoden geben `{ success: boolean; error?: string }` zurück.

```typescript
const result = await github.createIssue(...);

if (!result.success) {
  console.error(`Error: ${result.error}`);
  // Mögliche Errors:
  // - "GitHub integration disabled"
  // - "GitHub token not configured"
  // - "Invalid repo format. Use 'owner/repo'"
  // - "GitHub API error: ..."
}
```

---

## Use Cases

### 1. Automatisches Issue-Tracking

Wenn der Supervisor einen Fehler erkennt, automatisch GitHub Issue erstellen.

### 2. PR-Notifications

Bei erfolgreicher Task-Completion automatisch PR erstellen oder Issue schließen.

### 3. Repository-Management

Liste alle Repos auf und zeige sie im Dashboard.

### 4. Integration mit Linear/Slack

GitHub Issue erstellen → Slack Notification → Linear Ticket

---

## Weitere Octokit Features

Die Integration nutzt [@octokit/rest](https://octokit.github.io/rest.js/).

Du kannst weitere Methoden hinzufügen:

- Pull Requests erstellen
- Comments hinzufügen
- Labels verwalten
- Branches erstellen
- etc.

---

## Troubleshooting

### Error: "GitHub integration disabled"

→ Setze `GITHUB_ENABLED=true` in `.env`

### Error: "GitHub token not configured"

→ Setze `GITHUB_TOKEN=ghp_...` in `.env`

### Error: "Bad credentials"

→ Token ist ungültig oder abgelaufen. Erstelle neuen Token.

### Error: "Not Found"

→ Repo existiert nicht oder du hast keine Zugriffsrechte.

---

**Implementiert:** 2025-12-26
**Status:** Production Ready ✅
