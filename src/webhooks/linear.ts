/**
 * Linear Webhook Handler
 *
 * Handles incoming webhooks from Linear:
 * - Issue.create events
 * - Issue.update events
 * - Issue.remove events
 * - Comment.create events
 * - Comment.update events
 * - Project.create events
 * - Project.update events
 *
 * Includes signature verification for security.
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import type { Database } from "../db/database.js";
import type { QueueAdapter } from "../queue/queue.js";

// Linear Event Types
export type LinearEventType =
  | "Issue"
  | "Comment"
  | "Project"
  | "Cycle"
  | "Label"
  | "User"
  | "Team"
  | "IssueLabel";

export type LinearEventAction = "create" | "update" | "remove";

export interface LinearWebhookPayload {
  action: LinearEventAction;
  type: LinearEventType;
  data: {
    id: string;
    title?: string;
    description?: string;
    state?: {
      name: string;
      type: string;
    };
    team?: {
      id: string;
      name: string;
      key: string;
    };
    assignee?: {
      id: string;
      name: string;
    };
    [key: string]: unknown;
  };
  url: string;
  createdAt: string;
  webhookTimestamp: number;
  webhookId: string;
}

/**
 * Verifies Linear webhook signature using HMAC SHA-256
 * @param payload - Raw request body
 * @param signature - Linear-Signature header
 * @param secret - Linear webhook secret
 * @returns true if signature is valid
 */
export function verifyLinearSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest("hex");

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
function storeWebhookEvent(
  db: Database,
  eventType: LinearEventType,
  action: LinearEventAction,
  payload: LinearWebhookPayload
): void {
  // Store in audit log for tracking
  db.createAuditEntry({
    agent: "linear_webhook",
    action: `webhook:${eventType}.${action}`,
    decision: "APPROVED",
    final_status: "COMPLETE",
    risk_level: "LOW",
    stop_score: 0,
    verified_artefacts: JSON.stringify({
      type: eventType,
      action,
      data: {
        id: payload.data.id,
        title: payload.data.title,
        team: payload.data.team?.name,
      },
    }),
    missing_invalid_parts: "",
    required_next_action: "none",
  });
}

/**
 * Processes Linear Issue event
 */
async function processIssueEvent(payload: LinearWebhookPayload, queue: QueueAdapter): Promise<void> {
  console.log("📋 Linear Issue event:", {
    action: payload.action,
    id: payload.data.id,
    title: payload.data.title,
    team: payload.data.team?.name,
  });

  // Queue processing job
  await queue.add("linear_issue", {
    action: payload.action,
    issue: payload.data,
    url: payload.url,
  });
}

/**
 * Processes Linear Comment event
 */
async function processCommentEvent(payload: LinearWebhookPayload, queue: QueueAdapter): Promise<void> {
  console.log("💬 Linear Comment event:", {
    action: payload.action,
    id: payload.data.id,
  });

  // Queue processing job
  await queue.add("linear_comment", {
    action: payload.action,
    comment: payload.data,
    url: payload.url,
  });
}

/**
 * Processes Linear Project event
 */
async function processProjectEvent(payload: LinearWebhookPayload, queue: QueueAdapter): Promise<void> {
  console.log("📦 Linear Project event:", {
    action: payload.action,
    id: payload.data.id,
    name: payload.data.title,
  });

  // Queue processing job
  await queue.add("linear_project", {
    action: payload.action,
    project: payload.data,
    url: payload.url,
  });
}

/**
 * Creates Linear webhook router
 */
export function createLinearWebhookRouter(db: Database, queue: QueueAdapter): Router {
  const router = Router();

  // Use express.text() to get raw body for signature verification
  // This must be called BEFORE the router mounts, so it's handled in index.ts
  // Here we just access req.body which will be a string

  /**
   * POST /api/webhooks/linear
   * Receives Linear webhook events
   */
  router.post("/", async (req: Request, res: Response) => {
    try {
      const signature = req.headers["linear-signature"] as string;
      const secret = process.env.LINEAR_WEBHOOK_SECRET || "";

      // Phase-1 Hardening: Signature verification is MANDATORY
      if (!secret) {
        console.error("❌ LINEAR_WEBHOOK_SECRET not configured - rejecting webhook");
        return res.status(500).json({
          success: false,
          error: "Webhook secret not configured",
        });
      }

      // req.body will be a string because we use express.text() middleware
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const isValid = verifyLinearSignature(rawBody, signature, secret);

      if (!isValid) {
        console.warn("⚠️ Invalid Linear webhook signature");
        return res.status(401).json({
          success: false,
          error: "Invalid signature",
        });
      }

      // Parse JSON if body is string
      const payload = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as LinearWebhookPayload;

      // Validate payload
      if (!payload.type || !payload.action) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: type, action",
        });
      }

      // Store event in database
      storeWebhookEvent(db, payload.type, payload.action, payload);

      // Process event based on type
      switch (payload.type) {
        case "Issue":
          await processIssueEvent(payload, queue);
          break;
        case "Comment":
          await processCommentEvent(payload, queue);
          break;
        case "Project":
          await processProjectEvent(payload, queue);
          break;
        default:
          console.log(`ℹ️ Unhandled Linear event: ${payload.type}.${payload.action}`);
      }

      res.json({
        success: true,
        type: payload.type,
        action: payload.action,
        message: "Event received and queued",
      });
    } catch (error) {
      console.error("Failed to process Linear webhook:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/webhooks/linear/test
   * Test endpoint to verify webhook configuration
   */
  router.get("/test", (_req, res) => {
    res.json({
      success: true,
      message: "Linear webhook endpoint is active",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
