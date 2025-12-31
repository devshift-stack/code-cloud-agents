# 🤝 Contributing Guide - Code Cloud Agents

Willkommen! Danke, dass du zum Code Cloud Agents Projekt beitragen möchtest.

---

## 📋 Inhaltsverzeichnis

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Workflow](#-workflow)
- [Coding Standards](#-coding-standards)
- [Testing](#-testing)
- [Pull Requests](#-pull-requests)
- [Review Process](#-review-process)

---

## 📜 Code of Conduct

### Verhaltensregeln

- **Respektvoll**: Sei respektvoll gegenüber anderen Contributors
- **Konstruktiv**: Gib konstruktives Feedback
- **Inklusiv**: Begrüße alle Skill-Levels
- **Professionell**: Halte Diskussionen professionell
- **Hilfsbereit**: Unterstütze neue Contributors

### Nicht toleriert

- Belästigung oder Diskriminierung
- Trolling oder persönliche Angriffe
- Spam oder Off-Topic Diskussionen
- Nicht genehmigte Werbung

---

## 🚀 Getting Started

### 1. Repository forken

```bash
# Fork auf GitHub
# Klicke auf "Fork" Button

# Clone deinen Fork
git clone https://github.com/<dein-username>/Optimizecodecloudagents.git
cd Optimizecodecloudagents
```

---

### 2. Development Setup

```bash
# Dependencies installieren
npm install

# Environment konfigurieren
cp .env.example .env

# Data-Verzeichnis erstellen
mkdir -p data

# Backend starten
npm run backend:dev

# Frontend starten (neues Terminal)
npm run dev
```

Detaillierte Setup-Anleitung: **[Developer Guide](./DEVELOPER_GUIDE.md)**

---

### 3. Upstream konfigurieren

```bash
# Upstream Repository hinzufügen
git remote add upstream https://github.com/dsactivi-2/Optimizecodecloudagents.git

# Upstream Branches synchronisieren
git fetch upstream
git checkout main
git merge upstream/main
```

---

## 🔄 Workflow

### Branch Strategy

**Main Branches:**

- `main`: Production-ready Code
- `develop`: Development Branch (optional)

**Feature Branches:**

```bash
# Agent-spezifische Branches
agent-a2-<feature-name>
agent-a3-<feature-name>
agent-a4-<feature-name>

# Standard Feature Branches
feature/<feature-name>
fix/<bug-name>
docs/<doc-name>
```

**Beispiele:**

```bash
git checkout -b feature/websocket-realtime
git checkout -b fix/database-lock
git checkout -b docs/api-documentation
git checkout -b agent-a2-admin-access
```

---

### Development Workflow

```bash
# 1. Neuesten Stand holen
git checkout main
git pull upstream main

# 2. Feature Branch erstellen
git checkout -b feature/my-feature

# 3. Code schreiben & committen
git add .
git commit -m "feat: add amazing feature"

# 4. Tests ausführen
npm test

# 5. Build prüfen
npm run backend:build

# 6. Push zu deinem Fork
git push origin feature/my-feature

# 7. Pull Request öffnen
# Gehe zu GitHub und erstelle PR
```

---

## 💻 Coding Standards

### TypeScript

**Strict Mode:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

**Keine `any` Types:**

```typescript
// ❌ Schlecht
function processData(data: any) {
  return data.value;
}

// ✅ Gut
function processData(data: { value: string }) {
  return data.value;
}
```

---

### Naming Conventions

| Element    | Convention           | Beispiel                            |
| ---------- | -------------------- | ----------------------------------- |
| Variables  | camelCase            | `userName`, `isActive`              |
| Functions  | camelCase            | `getUserData()`, `calculateScore()` |
| Classes    | PascalCase           | `TaskManager`, `EnforcementGate`    |
| Components | PascalCase           | `AgentCard`, `TaskList`             |
| Constants  | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `API_URL`            |
| Files      | kebab-case           | `task-manager.ts`, `user-api.ts`    |
| Interfaces | PascalCase           | `Task`, `AuditEntry`                |
| Types      | PascalCase           | `GateStatus`, `StopReason`          |

---

### JSDoc Comments

**Pflicht für:**

- Alle exported Functions
- Alle exported Classes
- Alle public Methods
- Komplexe Logic

**Format:**

````typescript
/**
 * Creates a new task and assigns it to an agent
 *
 * @param taskData - Task configuration object containing title, priority, etc.
 * @param agentId - Unique identifier of the agent to assign the task to
 * @returns The created task with generated ID and timestamps
 * @throws {Error} If agent not found or task validation fails
 *
 * @example
 * ```typescript
 * const task = await createTask({
 *   title: "Build feature",
 *   priority: "high"
 * }, "agent-123");
 * ```
 */
async function createTask(
  taskData: Omit<Task, "id">,
  agentId: string,
): Promise<Task> {
  // Implementation
}
````

---

### Code Style

**Früh returnen:**

```typescript
// ✅ Gut - Early Return
function validateTask(task: Task): boolean {
  if (!task.title) return false;
  if (!task.assignee) return false;
  if (task.priority === "invalid") return false;

  return true;
}

// ❌ Schlecht - Nested If
function validateTask(task: Task): boolean {
  if (task.title) {
    if (task.assignee) {
      if (task.priority !== "invalid") {
        return true;
      }
    }
  }
  return false;
}
```

**Destructuring:**

```typescript
// ✅ Gut
const { title, priority, assignee } = task;

// ❌ Schlecht
const title = task.title;
const priority = task.priority;
const assignee = task.assignee;
```

**Async/Await:**

```typescript
// ✅ Gut
async function fetchData() {
  try {
    const response = await fetch("/api/tasks");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch failed:", error);
    throw error;
  }
}

// ❌ Schlecht - Promises ohne async/await
function fetchData() {
  return fetch("/api/tasks")
    .then((response) => response.json())
    .then((data) => data)
    .catch((error) => {
      console.error("Fetch failed:", error);
      throw error;
    });
}
```

---

### File Organization

**Import Order:**

```typescript
// 1. External Libraries
import express from "express";
import { randomUUID } from "crypto";

// 2. Internal Modules
import { initDatabase } from "./db/database.js";
import { createTaskRouter } from "./api/tasks.js";

// 3. Types
import type { Task, AuditEntry } from "./types.js";

// 4. Constants
const PORT = 3000;
```

---

### Error Handling

**Always use try/catch:**

```typescript
// ✅ Gut
async function createTask(taskData: TaskData): Promise<Task> {
  try {
    const task = await db.createTask(taskData);
    return task;
  } catch (error) {
    console.error("Failed to create task:", error);
    throw new Error("Task creation failed");
  }
}

// ❌ Schlecht - Keine Error Handling
async function createTask(taskData: TaskData): Promise<Task> {
  const task = await db.createTask(taskData);
  return task;
}
```

**Custom Errors:**

```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function validateInput(data: unknown) {
  if (!data) {
    throw new ValidationError("Input data is required");
  }
}
```

---

## 🧪 Testing

### Test Requirements

**Alle PRs müssen:**

- [ ] Bestehende Tests bestehen
- [ ] Neue Tests für neue Features
- [ ] Code Coverage ≥ 80%

---

### Writing Tests

**Test Structure:**

```typescript
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

describe("TaskManager", () => {
  let db: Database;

  beforeEach(() => {
    db = initDatabase(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("should create task with valid data", async () => {
    const taskData = {
      title: "Test Task",
      priority: "high" as const,
      assignee: "agent-1",
    };

    const task = await createTask(db, taskData);

    assert.strictEqual(task.title, "Test Task");
    assert.strictEqual(task.priority, "high");
    assert.ok(task.id);
  });

  it("should throw error with invalid data", async () => {
    const taskData = {
      title: "", // Invalid: empty title
      priority: "high" as const,
      assignee: "agent-1",
    };

    await assert.rejects(
      async () => await createTask(db, taskData),
      /Title is required/,
    );
  });
});
```

---

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test tests/api/tasks.test.ts

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

---

## 📝 Commit Messages

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

**Scopes:**

- `api`: API endpoints
- `db`: Database
- `ui`: Frontend
- `auth`: Authentication
- `docs`: Documentation

---

### Commit Examples

```bash
# Feature
git commit -m "feat(api): add WebSocket real-time updates

- Created WebSocket server in src/websocket/
- Real-time task updates
- Connection recovery implemented

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Fix
git commit -m "fix(db): resolve database locking issue

- Added connection pooling
- Implemented retry logic
- Fixed concurrent access bug

Closes #123

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Documentation
git commit -m "docs(readme): update installation instructions

- Added prerequisites section
- Updated npm scripts
- Added troubleshooting guide

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 🔀 Pull Requests

### PR Guidelines

**Vor dem PR:**

- [ ] Code follows coding standards
- [ ] All tests pass
- [ ] Build successful
- [ ] No console.logs in production code
- [ ] No secrets committed
- [ ] Branch up-to-date with `main`

---

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made

- Change 1
- Change 2
- Change 3

## Testing

- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

## Screenshots (if applicable)

[Add screenshots here]

## Related Issues

Closes #123
```

---

### PR Title Format

```
<type>(<scope>): <description>
```

**Examples:**

```
feat(api): add WebSocket real-time updates
fix(db): resolve database locking issue
docs(readme): update installation instructions
```

---

## 🔍 Review Process

### For Contributors

**Nach PR-Erstellung:**

1. Wait for CI/CD checks to pass
2. Wait for review comments
3. Address feedback promptly
4. Request re-review after changes
5. Be patient and respectful

**Wenn Änderungen gefordert:**

```bash
# Make changes
git add .
git commit -m "fix: address review comments"
git push origin feature/my-feature
```

---

### For Reviewers

**Review Checkliste:**

- [ ] Code follows coding standards
- [ ] Tests are adequate
- [ ] No security issues
- [ ] Performance implications considered
- [ ] Documentation updated
- [ ] Breaking changes noted

**Review Comments:**

- Be constructive and respectful
- Explain why changes are needed
- Suggest alternatives
- Approve when ready

---

## 🎯 PR Merge Criteria

**Erforderlich:**

- [ ] Mindestens 1 Approval
- [ ] Alle CI Checks grün
- [ ] Keine merge conflicts
- [ ] Branch up-to-date mit `main`
- [ ] Commit-Messages sauber

**Merge Strategie:**

- **Squash Merge**: Default für Feature Branches
- **Merge Commit**: Für größere Features
- **Rebase**: Für kleine Fixes

---

## 🚀 Release Process

### Versioning

**Semantic Versioning:** `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards-compatible)
- **PATCH**: Bug fixes

**Examples:**

- `0.1.0` → `0.2.0`: New feature added
- `0.2.0` → `0.2.1`: Bug fix
- `0.2.1` → `1.0.0`: Breaking change

---

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] Deployed to production
- [ ] Release notes published

---

## 📞 Questions?

**Hilfe gesucht?**

- 📖 Lese die [Developer Guide](./DEVELOPER_GUIDE.md)
- 🏗️ Verstehe die [Architecture](./ARCHITECTURE.md)
- 💬 Frage im GitHub Discussions
- 🐛 Erstelle ein GitHub Issue

---

## 🙏 Danke

Danke für deinen Beitrag zu Code Cloud Agents!

Jede Contribution, egal wie klein, wird geschätzt:

- Code
- Dokumentation
- Bug Reports
- Feature Requests
- Reviews

**Happy Coding! 🚀**

---

**Erstellt:** 2025-12-26
**Version:** 1.0

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
