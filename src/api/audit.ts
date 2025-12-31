/**
 * Audit Router - View audit logs, supervisor decisions, and event logging
 *
 * Two systems:
 * 1. audit_entries - Supervisor STOP-Score decisions (legacy)
 * 2. audit_events - Centralized event logging (new)
 */

import { Router } from "express";
import { z } from "zod";
import type { Database } from "../db/database.js";
import { requireAdmin, requireAuth } from "../auth/middleware.js";
import type { AuditEventKind, AuditSeverity } from "../db/audit-events.js";

// Validation schemas for event logging
const LogEventSchema = z.object({
  kind: z.enum([
    "agent_heartbeat",
    "task_created",
    "task_started",
    "task_finished",
    "task_failed",
    "chat_sent",
    "deploy",
    "error",
    "brain_ingest",
    "brain_search",
    "user_login",
    "user_logout",
    "api_call",
  ]),
  message: z.string().min(1).max(2000),
  agentId: z.string().optional(),
  taskId: z.string().optional(),
  severity: z.enum(["info", "warn", "error"]).optional(),
  meta: z.record(z.unknown()).optional(),
});

const ListEventsSchema = z.object({
  kind: z.string().optional(),
  severity: z.enum(["info", "warn", "error"]).optional(),
  agentId: z.string().optional(),
  taskId: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  since: z.string().optional(),
});

export function createAuditRouter(db: Database): Router {
  const router = Router();

  const auditService = db.audit;

  // ===== LEGACY: SUPERVISOR AUDIT ENTRIES =====

  // List audit entries - Admin only
  router.get("/", requireAdmin, (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const entries = db.listAuditEntries(limit);
      res.json({ entries, count: entries.length });
    } catch (error) {
      console.error("Failed to list audit entries:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get stop score statistics - Admin only (must be before /:id)
  router.get("/stats/stop-scores", requireAdmin, (_req, res) => {
    try {
      const stats = db.getStopScoreStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get stop score stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ===== NEW: EVENT LOGGING =====

  /**
   * POST /api/audit/events
   * Log a new audit event
   */
  router.post("/events", requireAuth, (req, res) => {
    try {
      const parsed = LogEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const userId = (req as any).userId;

      const event = auditService.log({
        ...parsed.data,
        userId,
      });

      res.status(201).json({
        success: true,
        event,
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/audit/events
   * List audit events with filters
   */
  router.get("/events", requireAuth, (req, res) => {
    try {
      const parsed = ListEventsSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const userId = (req as any).userId;
      const userRole = (req as any).userRole;

      // Non-admins can only see their own events
      const filterUserId = userRole === "admin" ? parsed.data.userId : userId;

      const events = auditService.list({
        kind: parsed.data.kind as AuditEventKind,
        severity: parsed.data.severity as AuditSeverity,
        agentId: parsed.data.agentId,
        taskId: parsed.data.taskId,
        userId: filterUserId,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
        since: parsed.data.since,
      });

      res.json({
        success: true,
        events,
        count: events.length,
      });
    } catch (error) {
      console.error("Failed to list audit events:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/audit/events/stats
   * Get audit event statistics
   */
  router.get("/events/stats", requireAdmin, (_req, res) => {
    try {
      const stats = auditService.stats();

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error("Failed to get audit stats:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/audit/events/:eventId
   * Get single audit event by ID
   */
  router.get("/events/:eventId", requireAuth, (req, res) => {
    try {
      const { eventId } = req.params;
      const event = auditService.get(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          error: "Event not found",
        });
      }

      // Check access
      const userId = (req as any).userId;
      const userRole = (req as any).userRole;
      if (userRole !== "admin" && event.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      res.json({
        success: true,
        event,
      });
    } catch (error) {
      console.error("Failed to get audit event:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/audit/events/cleanup
   * Cleanup old audit events (retention policy)
   */
  router.post("/events/cleanup", requireAdmin, (req, res) => {
    try {
      const daysToKeep = parseInt(req.body.daysToKeep as string) || 30;
      const deleted = auditService.cleanup(daysToKeep);

      // Log the cleanup action itself
      const userId = (req as any).userId;
      auditService.log({
        kind: "api_call",
        message: `Cleaned up ${deleted} audit events older than ${daysToKeep} days`,
        userId,
        severity: "info",
        meta: { daysToKeep, deleted },
      });

      res.json({
        success: true,
        deleted,
        daysToKeep,
      });
    } catch (error) {
      console.error("Failed to cleanup audit events:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ===== LEGACY: Get audit entry by ID (must be last due to :id pattern) =====
  router.get("/:id", requireAdmin, (req, res) => {
    try {
      const entry = db.getAuditEntry(req.params.id);

      if (!entry) {
        return res.status(404).json({ error: "Audit entry not found" });
      }

      res.json(entry);
    } catch (error) {
      console.error("Failed to get audit entry:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
