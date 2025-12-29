/**
 * GitHub Webhook Handler
 *
 * Handles incoming webhooks from GitHub:
 * - push events
 * - pull_request events
 * - issues events
 * - issue_comment events
 *
 * Includes HMAC SHA-256 signature verification for security.
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import type { Database } from "../db/database.js";
import type { QueueAdapter } from "../queue/queue.js";

// GitHub Event Types
export type GitHubEvent = "push" | "pull_request" | "issues" | "issue_comment" | "ping";

export interface GitHubWebhookPayload {
  action?: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  sender: {
    login: string;
  };
  // Event-specific data
  ref?: string;
  commits?: unknown[];
  pull_request?: {
    number: number;
    title?: string;
    state?: string;
    [key: string]: unknown;
  };
  issue?: {
    number: number;
    title?: string;
    state?: string;
    [key: string]: unknown;
  };
  comment?: {
    id: number;
    body?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Verifies GitHub webhook signature using HMAC SHA-256
 * @param payload - Raw request body
 * @param signature - X-Hub-Signature-256 header
 * @param secret - GitHub webhook secret
 * @returns true if signature is valid
 */
export function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const calculatedSignature = "sha256=" + hmac.digest("hex");

  // Use crypto.timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature));
  } catch {
    return false;
  }
}

/**
 * Stores webhook event in database
 */
function storeWebhookEvent(db: Database, event: GitHubEvent, payload: GitHubWebhookPayload): void {
  // Store in audit log for tracking
  db.createAuditEntry({
    agent: "github_webhook",
    action: `webhook:${event}`,
    decision: "APPROVED",
    final_status: "COMPLETE",
    risk_level: "LOW",
    stop_score: 0,
    verified_artefacts: JSON.stringify({
      event,
      repository: payload.repository.full_name,
      action: payload.action,
      sender: payload.sender.login,
    }),
    missing_invalid_parts: "",
    required_next_action: "none",
  });
}

/**
 * Processes GitHub push event
 */
async function processPushEvent(payload: GitHubWebhookPayload, queue: QueueAdapter): Promise<void> {
  console.log("📦 GitHub push event:", {
    repo: payload.repository.full_name,
    sender: payload.sender.login,
    ref: payload.ref,
    commits: Array.isArray(payload.commits) ? payload.commits.length : 0,
  });

  // Queue processing job
  await queue.add("github_push", {
    repository: payload.repository.full_name,
    ref: payload.ref,
    commits: payload.commits,
    sender: payload.sender.login,
  });
}

/**
 * Processes GitHub pull request event
 */
async function processPullRequestEvent(payload: GitHubWebhookPayload, queue: QueueAdapter): Promise<void> {
  console.log("🔀 GitHub pull_request event:", {
    repo: payload.repository.full_name,
    action: payload.action,
    number: payload.pull_request?.number,
    sender: payload.sender.login,
  });

  // Queue processing job
  await queue.add("github_pull_request", {
    repository: payload.repository.full_name,
    action: payload.action,
    pullRequest: payload.pull_request,
    sender: payload.sender.login,
  });
}

/**
 * Processes GitHub issues event
 */
async function processIssuesEvent(payload: GitHubWebhookPayload, queue: QueueAdapter): Promise<void> {
  console.log("🐛 GitHub issues event:", {
    repo: payload.repository.full_name,
    action: payload.action,
    number: payload.issue?.number,
    sender: payload.sender.login,
  });

  // Queue processing job
  await queue.add("github_issues", {
    repository: payload.repository.full_name,
    action: payload.action,
    issue: payload.issue,
    sender: payload.sender.login,
  });
}

/**
 * Processes GitHub issue comment event
 */
async function processIssueCommentEvent(payload: GitHubWebhookPayload, queue: QueueAdapter): Promise<void> {
  console.log("💬 GitHub issue_comment event:", {
    repo: payload.repository.full_name,
    action: payload.action,
    issue: payload.issue?.number,
    sender: payload.sender.login,
  });

  // Queue processing job
  await queue.add("github_issue_comment", {
    repository: payload.repository.full_name,
    action: payload.action,
    issue: payload.issue,
    comment: payload.comment,
    sender: payload.sender.login,
  });
}

/**
 * Creates GitHub webhook router
 */
export function createGitHubWebhookRouter(db: Database, queue: QueueAdapter): Router {
  const router = Router();

  // Use express.text() to get raw body for signature verification
  // This must be called BEFORE the router mounts, so it's handled in index.ts
  // Here we just access req.body which will be a string

  /**
   * POST /api/webhooks/github
   * Receives GitHub webhook events
   */
  router.post("/", async (req: Request, res: Response) => {
    try {
      const githubEvent = req.headers["x-github-event"] as GitHubEvent;
      const signature = req.headers["x-hub-signature-256"] as string;
      const secret = process.env.GITHUB_WEBHOOK_SECRET || "";

      if (!githubEvent) {
        return res.status(400).json({
          success: false,
          error: "Missing X-GitHub-Event header",
        });
      }

      // Verify signature (skip for ping events in development)
      if (githubEvent !== "ping" && secret) {
        // req.body will be a string because we use express.text() middleware
        const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        const isValid = verifyGitHubSignature(rawBody, signature, secret);

        if (!isValid) {
          console.warn("⚠️ Invalid GitHub webhook signature");
          return res.status(401).json({
            success: false,
            error: "Invalid signature",
          });
        }
      }

      // Parse JSON if body is string
      const payload = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as GitHubWebhookPayload;

      // Handle ping event (GitHub sends this to verify webhook setup)
      if (githubEvent === "ping") {
        console.log("🏓 GitHub webhook ping received");
        return res.json({
          success: true,
          message: "pong",
        });
      }

      // Store event in database
      storeWebhookEvent(db, githubEvent, payload);

      // Process event based on type
      switch (githubEvent) {
        case "push":
          await processPushEvent(payload, queue);
          break;
        case "pull_request":
          await processPullRequestEvent(payload, queue);
          break;
        case "issues":
          await processIssuesEvent(payload, queue);
          break;
        case "issue_comment":
          await processIssueCommentEvent(payload, queue);
          break;
        default:
          console.log(`ℹ️ Unhandled GitHub event: ${githubEvent}`);
      }

      res.json({
        success: true,
        event: githubEvent,
        message: "Event received and queued",
      });
    } catch (error) {
      console.error("Failed to process GitHub webhook:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
