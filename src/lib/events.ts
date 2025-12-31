/**
 * Event Recording - Global helper for audit event logging
 * Single source of truth for all system events
 */

import type {
  AuditService,
  AuditEventKind,
  AuditSeverity,
} from "../db/audit-events.js";

let auditService: AuditService | null = null;

/**
 * Initialize the event recorder with the audit service
 * Call this once at startup after database is initialized
 */
export function initEventRecorder(service: AuditService): void {
  auditService = service;
  console.log("✅ Event recorder initialized");
}

/**
 * Record an event to the audit log
 * Falls back to console.log if audit service not initialized
 */
export function recordEvent(
  kind: AuditEventKind,
  message: string,
  options?: {
    agentId?: string;
    taskId?: string;
    userId?: string;
    severity?: AuditSeverity;
    meta?: Record<string, unknown>;
  },
): void {
  const severity = options?.severity ?? "info";
  const prefix =
    severity === "error" ? "❌" : severity === "warn" ? "⚠️" : "📝";

  // Always log to console for visibility
  console.log(
    `${prefix} [${kind}] ${message}`,
    options?.meta ? JSON.stringify(options.meta) : "",
  );

  // Persist to database if available
  if (auditService) {
    try {
      auditService.log({
        kind,
        message,
        agentId: options?.agentId,
        taskId: options?.taskId,
        userId: options?.userId,
        severity,
        meta: options?.meta,
      });
    } catch (err) {
      console.error("Failed to record event:", err);
    }
  }
}

// Convenience wrappers for common events

export const events = {
  // Task lifecycle
  taskCreated: (taskId: string, title: string, userId?: string) =>
    recordEvent("task_created", `Task created: ${title}`, { taskId, userId }),

  taskStarted: (taskId: string, agentId?: string) =>
    recordEvent("task_started", `Task started`, { taskId, agentId }),

  taskFinished: (taskId: string, agentId?: string) =>
    recordEvent("task_finished", `Task completed`, { taskId, agentId }),

  taskFailed: (taskId: string, error: string, agentId?: string) =>
    recordEvent("task_failed", `Task failed: ${error}`, {
      taskId,
      agentId,
      severity: "error",
    }),

  // Chat
  chatSent: (userId: string, agentId: string, messagePreview: string) =>
    recordEvent("chat_sent", `Message sent to ${agentId}`, {
      userId,
      agentId,
      meta: { preview: messagePreview.slice(0, 100) },
    }),

  // Auth
  userLogin: (userId: string, email: string) =>
    recordEvent("user_login", `User logged in: ${email}`, { userId }),

  userLogout: (userId: string) =>
    recordEvent("user_logout", `User logged out`, { userId }),

  // Agent
  agentHeartbeat: (agentId: string, status: string) =>
    recordEvent("agent_heartbeat", `Agent ${agentId}: ${status}`, { agentId }),

  // Errors
  error: (message: string, meta?: Record<string, unknown>) =>
    recordEvent("error", message, { severity: "error", meta }),

  // Deploy
  deploy: (message: string, meta?: Record<string, unknown>) =>
    recordEvent("deploy", message, { meta }),

  // API calls (for monitoring)
  apiCall: (
    endpoint: string,
    method: string,
    userId?: string,
    meta?: Record<string, unknown>,
  ) => recordEvent("api_call", `${method} ${endpoint}`, { userId, meta }),
};
