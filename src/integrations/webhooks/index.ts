/**
 * Webhooks Integration Module
 *
 * Provides webhook management for outgoing and incoming webhooks.
 *
 * Features:
 * - Register webhooks for specific events
 * - Automatic retry with exponential backoff
 * - Signature verification (HMAC-SHA256)
 * - Delivery history tracking
 * - Event filtering
 *
 * Usage:
 * ```typescript
 * import { webhookManager } from "./integrations/webhooks";
 *
 * // Register webhook
 * const webhook = webhookManager.register({
 *   url: "https://your-domain.com/webhook",
 *   events: ["task.created", "stop_score.critical"],
 *   secret: "your-secret-key"
 * });
 *
 * // Trigger webhook
 * await webhookManager.trigger("task.created", { id: "123", title: "Task" });
 * ```
 *
 * DISABLED BY DEFAULT - Enable via ENABLE_WEBHOOKS=true
 */

export { webhookManager } from "./manager.ts";
export { signPayload, verifySignature, generateSecret } from "./security.ts";
export type {
  WebhookConfig,
  WebhookDelivery,
  WebhookEvent,
  WebhookPayload,
  WebhookRegistration,
  IncomingWebhookPayload,
  WebhookVerificationResult,
} from "./types.ts";
