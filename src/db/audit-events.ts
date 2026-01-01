/**
 * Audit Events - Centralized event logging
 * Single source of truth for all system events
 */

import type { Database as BetterSqlite3Database } from "better-sqlite3";
import { randomUUID } from "crypto";

// Event kinds
export type AuditEventKind =
  | "agent_heartbeat"
  | "task_created"
  | "task_started"
  | "task_finished"
  | "task_failed"
  | "chat_sent"
  | "deploy"
  | "error"
  | "brain_ingest"
  | "brain_search"
  | "user_login"
  | "user_logout"
  | "user_created"
  | "user_deleted"
  | "password_reset"
  | "api_call";

export type AuditSeverity = "info" | "warn" | "error";

export interface AuditEvent {
  id: string;
  ts: string;
  kind: AuditEventKind;
  agentId: string | null;
  taskId: string | null;
  userId: string | null;
  severity: AuditSeverity;
  message: string;
  meta: Record<string, unknown> | null;
}

export interface CreateAuditEventInput {
  kind: AuditEventKind;
  message: string;
  agentId?: string;
  taskId?: string;
  userId?: string;
  severity?: AuditSeverity;
  meta?: Record<string, unknown>;
}

export interface ListAuditEventsOptions {
  kind?: AuditEventKind;
  severity?: AuditSeverity;
  userId?: string;
  agentId?: string;
  taskId?: string;
  limit?: number;
  offset?: number;
  since?: string; // ISO date string
}

export interface AuditEventStats {
  total: number;
  byKind: Record<string, number>;
  bySeverity: Record<string, number>;
  lastEvent: string | null;
}

/**
 * Initialize audit_events table
 */
export function initAuditEventsTable(db: BetterSqlite3Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      ts TEXT NOT NULL,
      kind TEXT NOT NULL,
      agent_id TEXT,
      task_id TEXT,
      user_id TEXT,
      severity TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      meta TEXT,

      -- Indexes for common queries
      created_at TEXT GENERATED ALWAYS AS (ts) STORED
    );

    CREATE INDEX IF NOT EXISTS idx_audit_events_ts ON audit_events(ts DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_events_kind ON audit_events(kind);
    CREATE INDEX IF NOT EXISTS idx_audit_events_severity ON audit_events(severity);
    CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_events_agent_id ON audit_events(agent_id);
    CREATE INDEX IF NOT EXISTS idx_audit_events_task_id ON audit_events(task_id);
  `);
}

/**
 * Audit Events Service
 */
export function createAuditService(db: BetterSqlite3Database) {
  return {
    /**
     * Log a new audit event
     */
    log(input: CreateAuditEventInput): AuditEvent {
      const id = randomUUID();
      const ts = new Date().toISOString();
      const severity = input.severity ?? "info";
      const meta = input.meta ? JSON.stringify(input.meta) : null;

      const stmt = db.prepare(`
        INSERT INTO audit_events (id, ts, kind, agent_id, task_id, user_id, severity, message, meta)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        ts,
        input.kind,
        input.agentId ?? null,
        input.taskId ?? null,
        input.userId ?? null,
        severity,
        input.message,
        meta,
      );

      return {
        id,
        ts,
        kind: input.kind,
        agentId: input.agentId ?? null,
        taskId: input.taskId ?? null,
        userId: input.userId ?? null,
        severity,
        message: input.message,
        meta: input.meta ?? null,
      };
    },

    /**
     * Get single event by ID
     */
    get(id: string): AuditEvent | undefined {
      const stmt = db.prepare("SELECT * FROM audit_events WHERE id = ?");
      const row = stmt.get(id) as
        | {
            id: string;
            ts: string;
            kind: string;
            agent_id: string | null;
            task_id: string | null;
            user_id: string | null;
            severity: string;
            message: string;
            meta: string | null;
          }
        | undefined;

      if (!row) return undefined;

      return {
        id: row.id,
        ts: row.ts,
        kind: row.kind as AuditEventKind,
        agentId: row.agent_id,
        taskId: row.task_id,
        userId: row.user_id,
        severity: row.severity as AuditSeverity,
        message: row.message,
        meta: row.meta ? JSON.parse(row.meta) : null,
      };
    },

    /**
     * List events with filters
     */
    list(options: ListAuditEventsOptions = {}): AuditEvent[] {
      const limit = options.limit ?? 100;
      const offset = options.offset ?? 0;
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (options.kind) {
        conditions.push("kind = ?");
        params.push(options.kind);
      }
      if (options.severity) {
        conditions.push("severity = ?");
        params.push(options.severity);
      }
      if (options.userId) {
        conditions.push("user_id = ?");
        params.push(options.userId);
      }
      if (options.agentId) {
        conditions.push("agent_id = ?");
        params.push(options.agentId);
      }
      if (options.taskId) {
        conditions.push("task_id = ?");
        params.push(options.taskId);
      }
      if (options.since) {
        conditions.push("ts >= ?");
        params.push(options.since);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const query = `SELECT * FROM audit_events ${whereClause} ORDER BY ts DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const stmt = db.prepare(query);
      const rows = stmt.all(...params) as Array<{
        id: string;
        ts: string;
        kind: string;
        agent_id: string | null;
        task_id: string | null;
        user_id: string | null;
        severity: string;
        message: string;
        meta: string | null;
      }>;

      return rows.map((row) => ({
        id: row.id,
        ts: row.ts,
        kind: row.kind as AuditEventKind,
        agentId: row.agent_id,
        taskId: row.task_id,
        userId: row.user_id,
        severity: row.severity as AuditSeverity,
        message: row.message,
        meta: row.meta ? JSON.parse(row.meta) : null,
      }));
    },

    /**
     * Get event statistics
     */
    stats(): AuditEventStats {
      const totalStmt = db.prepare(
        "SELECT COUNT(*) as count FROM audit_events",
      );
      const total = (totalStmt.get() as { count: number }).count;

      const kindStmt = db.prepare(
        "SELECT kind, COUNT(*) as count FROM audit_events GROUP BY kind",
      );
      const kindRows = kindStmt.all() as Array<{ kind: string; count: number }>;
      const byKind: Record<string, number> = {};
      for (const row of kindRows) {
        byKind[row.kind] = row.count;
      }

      const sevStmt = db.prepare(
        "SELECT severity, COUNT(*) as count FROM audit_events GROUP BY severity",
      );
      const sevRows = sevStmt.all() as Array<{
        severity: string;
        count: number;
      }>;
      const bySeverity: Record<string, number> = {};
      for (const row of sevRows) {
        bySeverity[row.severity] = row.count;
      }

      const lastStmt = db.prepare(
        "SELECT ts FROM audit_events ORDER BY ts DESC LIMIT 1",
      );
      const lastRow = lastStmt.get() as { ts: string } | undefined;

      return {
        total,
        byKind,
        bySeverity,
        lastEvent: lastRow?.ts ?? null,
      };
    },

    /**
     * Cleanup old events (retention policy)
     * @param daysToKeep Number of days to retain (default: 30)
     * @returns Number of deleted events
     */
    cleanup(daysToKeep = 30): number {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffIso = cutoffDate.toISOString();

      const stmt = db.prepare("DELETE FROM audit_events WHERE ts < ?");
      const result = stmt.run(cutoffIso);
      return result.changes;
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
