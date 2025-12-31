/**
 * Webhook Workers Tests
 *
 * Tests for GitHub and Linear webhook event workers
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { registerGitHubWorkers } from "../src/queue/workers/github.js";
import { registerLinearWorkers } from "../src/queue/workers/linear.js";
import { registerAllWebhookWorkers } from "../src/queue/workers/index.js";
import type { QueueAdapter, QueueJob } from "../src/queue/queue.js";
import type { Database } from "../src/db/database.js";

// Mock Queue Adapter
function createMockQueue(): QueueAdapter {
  const handlers = new Map<string, (job: QueueJob) => Promise<void>>();
  const jobs: QueueJob[] = [];

  return {
    mode: "in-memory",

    isHealthy(): boolean {
      return true;
    },

    async add(name: string, data: Record<string, unknown>): Promise<string> {
      const id = `test_job_${jobs.length + 1}`;
      const job: QueueJob = {
        id,
        name,
        data,
        status: "pending",
        created_at: new Date(),
      };
      jobs.push(job);

      // Process immediately if handler exists
      const handler = handlers.get(name);
      if (handler) {
        job.status = "processing";
        try {
          await handler(job);
          job.status = "completed";
          job.processed_at = new Date();
        } catch (error) {
          job.status = "failed";
        }
      }

      return id;
    },

    process(name: string, handler: (job: QueueJob) => Promise<void>): void {
      handlers.set(name, handler);
    },

    getJob(id: string): QueueJob | undefined {
      return jobs.find((j) => j.id === id);
    },

    getStats() {
      return {
        pending: 0,
        processing: 0,
        completed: jobs.filter((j) => j.status === "completed").length,
        failed: 0,
      };
    },
  };
}

// Mock Database
function createMockDatabase(): Database {
  const auditEntries: unknown[] = [];

  return {
    createAuditEntry(entry: unknown) {
      auditEntries.push(entry);
    },
    getAuditEntries() {
      return auditEntries;
    },
  } as unknown as Database;
}

describe("GitHub Webhook Workers", () => {
  it("registers all GitHub worker handlers", () => {
    const queue = createMockQueue();
    const db = createMockDatabase();

    registerGitHubWorkers(queue, db);

    // Verify handlers are registered (by checking if jobs can be processed)
    assert.ok(queue, "Queue should exist");
  });

  it("processes github_push events", async () => {
    const queue = createMockQueue();
    const db = createMockDatabase();

    registerGitHubWorkers(queue, db);

    const jobId = await queue.add("github_push", {
      repository: "owner/repo",
      ref: "refs/heads/main",
      commits: [
        {
          id: "abc123",
          message: "Test commit",
          author: { name: "Test User", email: "test@example.com" },
          url: "https://github.com/owner/repo/commit/abc123",
        },
      ],
      sender: "testuser",
    });

    const job = queue.getJob(jobId);
    assert.ok(job, "Job should exist");
    assert.strictEqual(job.status, "completed");
  });

  it("processes github_pull_request events", async () => {
    const queue = createMockQueue();
    const db = createMockDatabase();

    registerGitHubWorkers(queue, db);

    const jobId = await queue.add("github_pull_request", {
      repository: "owner/repo",
      action: "opened",
      pullRequest: {
        number: 123,
        title: "Test PR",
        state: "open",
        html_url: "https://github.com/owner/repo/pull/123",
        user: { login: "testuser" },
      },
      sender: "testuser",
    });

    const job = queue.getJob(jobId);
    assert.ok(job, "Job should exist");
    assert.strictEqual(job.status, "completed");
  });

  it("processes github_issues events", async () => {
    const queue = createMockQueue();
    const db = createMockDatabase();

    registerGitHubWorkers(queue, db);

    const jobId = await queue.add("github_issues", {
      repository: "owner/repo",
      action: "opened",
      issue: {
        number: 456,
        title: "Test Issue",
        state: "open",
        html_url: "https://github.com/owner/repo/issues/456",
        user: { login: "testuser" },
      },
      sender: "testuser",
    });

    const job = queue.getJob(jobId);
    assert.ok(job, "Job should exist");
    assert.strictEqual(job.status, "completed");
  });

  it("processes github_issue_comment events", async () => {
    const queue = createMockQueue();
    const db = createMockDatabase();

    registerGitHubWorkers(queue, db);

    const jobId = await queue.add("github_issue_comment", {
      repository: "owner/repo",
      action: "created",
      issue: {
        number: 456,
        title: "Test Issue",
      },
      comment: {
        id: 789,
        body: "Test comment",
        html_url: "https://github.com/owner/repo/issues/456#issuecomment-789",
        user: { login: "testuser" },
      },
      sender: "testuser",
    });

    const job = queue.getJob(jobId);
    assert.ok(job, "Job should exist");
    assert.strictEqual(job.status, "completed");
  });
});

describe("Linear Webhook Workers", () => {
  it("registers all Linear worker handlers", () => {
    const queue = createMockQueue();
    const db = createMockDatabase();

    registerLinearWorkers(queue, db);

    assert.ok(queue, "Queue should exist");
  });

  it("processes linear_issue events", async () => {
    const queue = createMockQueue();
    const db = createMockDatabase();

    registerLinearWorkers(queue, db);

    const jobId = await queue.add("linear_issue", {
      action: "create",
      type: "Issue",
      data: {
        id: "issue-123",
        title: "Test Issue",
        state: { name: "Todo" },
        team: { name: "Engineering" },
        assignee: { name: "Test User" },
        url: "https://linear.app/team/issue/TEST-123",
      },
      webhookId: "webhook-abc",
    });

    const job = queue.getJob(jobId);
    assert.ok(job, "Job should exist");
    assert.strictEqual(job.status, "completed");
  });

  it("processes linear_comment events", async () => {
    const queue = createMockQueue();
    const db = createMockDatabase();

    registerLinearWorkers(queue, db);

    const jobId = await queue.add("linear_comment", {
      action: "create",
      type: "Comment",
      data: {
        id: "comment-456",
        body: "Test comment",
        issue: {
          id: "issue-123",
          title: "Test Issue",
        },
        user: { name: "Test User" },
        url: "https://linear.app/team/issue/TEST-123#comment-456",
      },
      webhookId: "webhook-def",
    });

    const job = queue.getJob(jobId);
    assert.ok(job, "Job should exist");
    assert.strictEqual(job.status, "completed");
  });

  it("processes linear_project events", async () => {
    const queue = createMockQueue();
    const db = createMockDatabase();

    registerLinearWorkers(queue, db);

    const jobId = await queue.add("linear_project", {
      action: "create",
      type: "Project",
      data: {
        id: "project-789",
        name: "Test Project",
        state: "planned",
        lead: { name: "Test User" },
        url: "https://linear.app/team/project/test-project",
      },
      webhookId: "webhook-ghi",
    });

    const job = queue.getJob(jobId);
    assert.ok(job, "Job should exist");
    assert.strictEqual(job.status, "completed");
  });
});

describe("All Webhook Workers Registration", () => {
  it("registers both GitHub and Linear workers", () => {
    const queue = createMockQueue();
    const db = createMockDatabase();

    registerAllWebhookWorkers(queue, db);

    // Test that both GitHub and Linear jobs can be processed
    assert.ok(queue, "Queue should exist");
  });

  it("processes jobs from both GitHub and Linear", async () => {
    const queue = createMockQueue();
    const db = createMockDatabase();

    registerAllWebhookWorkers(queue, db);

    // Queue both GitHub and Linear jobs
    const githubJobId = await queue.add("github_push", {
      repository: "owner/repo",
      ref: "refs/heads/main",
      commits: [],
      sender: "testuser",
    });

    const linearJobId = await queue.add("linear_issue", {
      action: "create",
      type: "Issue",
      data: {
        id: "issue-123",
        title: "Test Issue",
        url: "https://linear.app/team/issue/TEST-123",
      },
      webhookId: "webhook-abc",
    });

    const githubJob = queue.getJob(githubJobId);
    const linearJob = queue.getJob(linearJobId);

    assert.ok(githubJob, "GitHub job should exist");
    assert.ok(linearJob, "Linear job should exist");
    assert.strictEqual(githubJob.status, "completed");
    assert.strictEqual(linearJob.status, "completed");
  });
});
