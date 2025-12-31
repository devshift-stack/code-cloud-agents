/**
 * Ops Router - Operations Dashboard API
 *
 * Provides unified event stream and task history for the Ops Dashboard.
 * Aggregates data from tasks, audit entries, and agent activity.
 */

import { Router } from "express";
import type { Database, AuditEntry } from "../db/database.js";
import { requireAuth, requireAdmin } from "../auth/middleware.js";

/**
 * Unified event type for the ops dashboard
 */
export interface OpsEvent {
  id: string;
  type:
    | "task_created"
    | "task_started"
    | "task_completed"
    | "task_stopped"
    | "audit_decision"
    | "agent_activity";
  timestamp: string;
  agentId?: string;
  taskId?: string;
  title?: string;
  status?: string;
  stopScore?: number;
  riskLevel?: string;
  decision?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Task history entry with enriched data
 */
export interface TaskHistoryEntry {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee: string;
  stopScore?: number;
  createdAt: string;
  updatedAt?: string;
  duration?: number; // ms between created and updated
  auditEntries?: AuditEntry[];
}

export function createOpsRouter(db: Database): Router {
  const router = Router();

  /**
   * GET /api/ops/events
   *
   * Returns a unified stream of events from multiple sources.
   *
   * Query params:
   *   - since: ISO timestamp, only events after this time (default: 24h ago)
   *   - limit: max events to return (default: 100, max: 500)
   *   - agentId: filter by agent/assignee
   *   - type: filter by event type (task_created, task_completed, audit_decision, etc.)
   *
   * Response: { events: OpsEvent[], count: number, since: string }
   */
  router.get("/events", requireAuth, (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const agentId = req.query.agentId as string | undefined;
      const eventType = req.query.type as string | undefined;

      // Default: last 24 hours
      const defaultSince = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();
      const since = (req.query.since as string) || defaultSince;

      const events: OpsEvent[] = [];

      // 1. Collect events from tasks
      const tasks = db.listTasks({ limit: limit * 2 }); // Get more, will filter

      for (const task of tasks) {
        // Filter by time
        if (task.created_at < since) continue;

        // Filter by agent
        if (agentId && task.assignee !== agentId) continue;

        // Task created event
        if (!eventType || eventType === "task_created") {
          events.push({
            id: `task-created-${task.id}`,
            type: "task_created",
            timestamp: task.created_at,
            taskId: task.id,
            agentId: task.assignee,
            title: task.title,
            status: task.status,
            metadata: { priority: task.priority },
          });
        }

        // Task completed/stopped event (if updated)
        if (task.updated_at && task.updated_at >= since) {
          if (
            task.status === "completed" &&
            (!eventType || eventType === "task_completed")
          ) {
            events.push({
              id: `task-completed-${task.id}`,
              type: "task_completed",
              timestamp: task.updated_at,
              taskId: task.id,
              agentId: task.assignee,
              title: task.title,
              status: task.status,
              stopScore: task.stop_score,
            });
          } else if (
            task.status === "stopped" &&
            (!eventType || eventType === "task_stopped")
          ) {
            events.push({
              id: `task-stopped-${task.id}`,
              type: "task_stopped",
              timestamp: task.updated_at,
              taskId: task.id,
              agentId: task.assignee,
              title: task.title,
              status: task.status,
              stopScore: task.stop_score,
            });
          }
        }
      }

      // 2. Collect events from audit entries
      if (!eventType || eventType === "audit_decision") {
        const auditEntries = db.listAuditEntries(limit * 2);

        for (const entry of auditEntries) {
          // Filter by time
          if (entry.created_at < since) continue;

          // Filter by agent (if audit has agent info)
          if (agentId && entry.agent && entry.agent !== agentId) continue;

          events.push({
            id: `audit-${entry.id}`,
            type: "audit_decision",
            timestamp: entry.created_at,
            taskId: entry.task_id,
            agentId: entry.agent,
            decision: entry.decision,
            riskLevel: entry.risk_level,
            stopScore: entry.stop_score,
            metadata: {
              finalStatus: entry.final_status,
              requiredNextAction: entry.required_next_action,
            },
          });
        }
      }

      // Sort by timestamp (newest first)
      events.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      // Apply limit
      const limitedEvents = events.slice(0, limit);

      res.json({
        success: true,
        events: limitedEvents,
        count: limitedEvents.length,
        total: events.length,
        since,
        filters: {
          agentId: agentId ?? null,
          type: eventType ?? null,
          limit,
        },
      });
    } catch (error) {
      console.error("[Ops] Failed to get events:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * GET /api/ops/tasks/history
   *
   * Returns task history with enriched data (duration, audit entries).
   *
   * Query params:
   *   - limit: max tasks to return (default: 50, max: 200)
   *   - status: filter by status (pending, in_progress, completed, stopped)
   *   - assignee: filter by assignee/agent
   *   - includeAudit: include related audit entries (default: false)
   *
   * Response: { tasks: TaskHistoryEntry[], count: number }
   */
  router.get("/tasks/history", requireAuth, (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const status = req.query.status as string | undefined;
      const assignee = req.query.assignee as string | undefined;
      const includeAudit = req.query.includeAudit === "true";

      // Get tasks with optional status filter
      let tasks = db.listTasks({ state: status, limit: limit * 2 });

      // Filter by assignee if specified
      if (assignee) {
        tasks = tasks.filter((t) => t.assignee === assignee);
      }

      // Limit results
      tasks = tasks.slice(0, limit);

      // Get audit entries if requested
      let auditEntriesMap: Map<string, AuditEntry[]> | null = null;
      if (includeAudit) {
        const allAuditEntries = db.listAuditEntries(500);
        auditEntriesMap = new Map();

        for (const entry of allAuditEntries) {
          if (entry.task_id) {
            if (!auditEntriesMap.has(entry.task_id)) {
              auditEntriesMap.set(entry.task_id, []);
            }
            auditEntriesMap.get(entry.task_id)!.push(entry);
          }
        }
      }

      // Build response
      const history: TaskHistoryEntry[] = tasks.map((task) => {
        const entry: TaskHistoryEntry = {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignee: task.assignee,
          stopScore: task.stop_score,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
        };

        // Calculate duration if task has been updated
        if (task.updated_at) {
          const created = new Date(task.created_at).getTime();
          const updated = new Date(task.updated_at).getTime();
          entry.duration = updated - created;
        }

        // Add audit entries if requested
        if (includeAudit && auditEntriesMap) {
          entry.auditEntries = auditEntriesMap.get(task.id) ?? [];
        }

        return entry;
      });

      res.json({
        success: true,
        tasks: history,
        count: history.length,
        filters: {
          status: status ?? null,
          assignee: assignee ?? null,
          includeAudit,
          limit,
        },
      });
    } catch (error) {
      console.error("[Ops] Failed to get task history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * GET /api/ops/stats
   *
   * Returns aggregated statistics for the ops dashboard.
   * Admin only.
   *
   * Response: { tasks: {...}, audit: {...}, agents: {...} }
   */
  router.get("/stats", requireAdmin, (_req, res) => {
    try {
      // Task stats
      const allTasks = db.listTasks({ limit: 1000 });
      const taskStats = {
        total: allTasks.length,
        pending: allTasks.filter((t) => t.status === "pending").length,
        inProgress: allTasks.filter((t) => t.status === "in_progress").length,
        completed: allTasks.filter((t) => t.status === "completed").length,
        stopped: allTasks.filter((t) => t.status === "stopped").length,
      };

      // Audit/STOP score stats
      const stopScoreStats = db.getStopScoreStats();

      // Agent activity (group by assignee)
      const agentActivity: Record<
        string,
        { total: number; completed: number; stopped: number }
      > = {};
      for (const task of allTasks) {
        if (!agentActivity[task.assignee]) {
          agentActivity[task.assignee] = { total: 0, completed: 0, stopped: 0 };
        }
        agentActivity[task.assignee].total++;
        if (task.status === "completed")
          agentActivity[task.assignee].completed++;
        if (task.status === "stopped") agentActivity[task.assignee].stopped++;
      }

      res.json({
        success: true,
        stats: {
          tasks: taskStats,
          stopScores: stopScoreStats,
          agents: agentActivity,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Ops] Failed to get stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
