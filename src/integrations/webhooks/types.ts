/**
 * Webhook Types and Interfaces
 */

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  enabled: boolean;
  retryAttempts: number;
  timeout: number;
  headers?: Record<string, string>;
  createdAt: string;
  updatedAt?: string;
}

export type WebhookEvent =
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "task.stopped"
  | "stop_score.high"
  | "stop_score.critical"
  | "enforcement.blocked"
  | "enforcement.approved"
  | "enforcement.rejected"
  | "agent.status_change"
  | "audit.entry_created";

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: unknown;
  metadata?: Record<string, unknown>;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: WebhookPayload;
  status: "pending" | "success" | "failed" | "retrying";
  attempts: number;
  lastAttemptAt?: string;
  responseCode?: number;
  responseBody?: string;
  error?: string;
  createdAt: string;
}

export interface WebhookRegistration {
  url: string;
  secret?: string;
  events: WebhookEvent[];
  enabled?: boolean;
  retryAttempts?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface IncomingWebhookPayload {
  event: string;
  timestamp: string;
  signature?: string;
  data: unknown;
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
}
