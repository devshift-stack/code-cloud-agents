/**
 * Tasks API Tests
 *
 * Tests for task management endpoints including state filtering
 */

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";

// Minimal in-memory database for testing listTasks filter logic
function createTestDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      assignee TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      stop_score INTEGER
    );
  `);
  return db;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  assignee: string;
  created_at: string;
}

interface ListTasksOptions {
  state?: string;
  limit?: number;
}

function createTask(db: Database.Database, task: Omit<Task, "id">): Task {
  const id = randomUUID();
  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, description, priority, status, assignee, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    task.title,
    task.description ?? null,
    task.priority,
    task.status,
    task.assignee,
    task.created_at,
  );
  return { id, ...task };
}

function listTasks(db: Database.Database, options?: ListTasksOptions): Task[] {
  const limit = options?.limit ?? 100;

  if (options?.state) {
    const stateMap: Record<string, string> = {
      running: "in_progress",
      failed: "stopped",
      done: "completed",
      pending: "pending",
      in_progress: "in_progress",
      completed: "completed",
      stopped: "stopped",
    };
    const dbStatus = stateMap[options.state] ?? options.state;

    const stmt = db.prepare(
      "SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC LIMIT ?",
    );
    return stmt.all(dbStatus, limit) as Task[];
  }

  const stmt = db.prepare(
    "SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?",
  );
  return stmt.all(limit) as Task[];
}

describe("Tasks API - Database Layer", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();

    // Create test tasks with different states
    createTask(db, {
      title: "Pending Task 1",
      description: "A pending task",
      priority: "medium",
      status: "pending",
      assignee: "cloud_assistant",
      created_at: new Date().toISOString(),
    });

    createTask(db, {
      title: "Running Task 1",
      description: "A running task",
      priority: "high",
      status: "in_progress",
      assignee: "cloud_assistant",
      created_at: new Date().toISOString(),
    });

    createTask(db, {
      title: "Completed Task 1",
      description: "A completed task",
      priority: "low",
      status: "completed",
      assignee: "cloud_assistant",
      created_at: new Date().toISOString(),
    });

    createTask(db, {
      title: "Stopped Task 1",
      description: "A stopped/failed task",
      priority: "high",
      status: "stopped",
      assignee: "cloud_assistant",
      created_at: new Date().toISOString(),
    });
  });

  after(() => {
    db.close();
  });

  describe("listTasks with state filter", () => {
    it("returns all tasks when no filter is provided", () => {
      const tasks = listTasks(db);
      assert.strictEqual(tasks.length, 4);
    });

    it("filters tasks by pending state", () => {
      const tasks = listTasks(db, { state: "pending" });
      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].status, "pending");
    });

    it("filters tasks by in_progress state", () => {
      const tasks = listTasks(db, { state: "in_progress" });
      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].status, "in_progress");
    });

    it("filters tasks by completed state", () => {
      const tasks = listTasks(db, { state: "completed" });
      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].status, "completed");
    });

    it("filters tasks by stopped state", () => {
      const tasks = listTasks(db, { state: "stopped" });
      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].status, "stopped");
    });

    it("maps 'running' to 'in_progress'", () => {
      const tasks = listTasks(db, { state: "running" });
      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].status, "in_progress");
    });

    it("maps 'failed' to 'stopped'", () => {
      const tasks = listTasks(db, { state: "failed" });
      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].status, "stopped");
    });

    it("maps 'done' to 'completed'", () => {
      const tasks = listTasks(db, { state: "done" });
      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].status, "completed");
    });

    it("respects limit option", () => {
      const tasks = listTasks(db, { limit: 2 });
      assert.strictEqual(tasks.length, 2);
    });

    it("returns empty array for non-existent state", () => {
      const tasks = listTasks(db, { state: "nonexistent" });
      assert.strictEqual(tasks.length, 0);
    });
  });
});
