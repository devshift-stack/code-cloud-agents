/**
 * Webhook Manager - Handles webhook registration, delivery, and verification
 */

import { randomUUID } from "crypto";
import type {
  WebhookConfig,
  WebhookDelivery,
  WebhookEvent,
  WebhookPayload,
  WebhookRegistration,
} from "./types.ts";
import { signPayload, verifySignature } from "./security.ts";

class WebhookManager {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private maxRetries = 3;
  private defaultTimeout = 5000;

  /**
   * Register a new webhook
   */
  register(registration: WebhookRegistration): WebhookConfig {
    const webhook: WebhookConfig = {
      id: randomUUID(),
      name: new URL(registration.url).hostname,
      url: registration.url,
      secret: registration.secret,
      events: registration.events,
      enabled: registration.enabled ?? true,
      retryAttempts: registration.retryAttempts ?? this.maxRetries,
      timeout: registration.timeout ?? this.defaultTimeout,
      headers: registration.headers,
      createdAt: new Date().toISOString(),
    };

    this.webhooks.set(webhook.id, webhook);
    console.log(`✅ Webhook registered: ${webhook.name} (${webhook.id})`);

    return webhook;
  }

  /**
   * Unregister a webhook
   */
  unregister(webhookId: string): boolean {
    const deleted = this.webhooks.delete(webhookId);
    if (deleted) {
      console.log(`❌ Webhook unregistered: ${webhookId}`);
    }
    return deleted;
  }

  /**
   * Get all registered webhooks
   */
  list(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Get a specific webhook
   */
  get(webhookId: string): WebhookConfig | undefined {
    return this.webhooks.get(webhookId);
  }

  /**
   * Update webhook configuration
   */
  update(
    webhookId: string,
    updates: Partial<WebhookConfig>,
  ): WebhookConfig | undefined {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return undefined;

    const updated: WebhookConfig = {
      ...webhook,
      ...updates,
      id: webhook.id, // Prevent ID change
      createdAt: webhook.createdAt, // Prevent createdAt change
      updatedAt: new Date().toISOString(),
    };

    this.webhooks.set(webhookId, updated);
    return updated;
  }

  /**
   * Trigger webhooks for a specific event
   */
  async trigger(
    event: WebhookEvent,
    data: unknown,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      metadata,
    };

    const matchingWebhooks = Array.from(this.webhooks.values()).filter(
      (webhook) => webhook.enabled && webhook.events.includes(event),
    );

    if (matchingWebhooks.length === 0) {
      console.log(`ℹ️  No webhooks registered for event: ${event}`);
      return;
    }

    console.log(
      `📤 Triggering ${matchingWebhooks.length} webhook(s) for event: ${event}`,
    );

    // Send webhooks in parallel
    await Promise.allSettled(
      matchingWebhooks.map((webhook) => this.deliver(webhook, payload)),
    );
  }

  /**
   * Deliver a webhook payload
   */
  private async deliver(
    webhook: WebhookConfig,
    payload: WebhookPayload,
  ): Promise<void> {
    const delivery: WebhookDelivery = {
      id: randomUUID(),
      webhookId: webhook.id,
      event: payload.event,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    this.deliveries.set(delivery.id, delivery);

    await this.sendWithRetry(webhook, delivery);
  }

  /**
   * Send webhook with retry logic
   */
  private async sendWithRetry(
    webhook: WebhookConfig,
    delivery: WebhookDelivery,
  ): Promise<void> {
    for (let attempt = 1; attempt <= webhook.retryAttempts; attempt++) {
      delivery.attempts = attempt;
      delivery.lastAttemptAt = new Date().toISOString();
      delivery.status = attempt > 1 ? "retrying" : "pending";

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "Code-Cloud-Agents/1.0",
          ...webhook.headers,
        };

        // Add signature if secret is configured
        if (webhook.secret) {
          const signature = signPayload(delivery.payload, webhook.secret);
          headers["X-Webhook-Signature"] = signature;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

        const response = await fetch(webhook.url, {
          method: "POST",
          headers,
          body: JSON.stringify(delivery.payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        delivery.responseCode = response.status;
        delivery.responseBody = await response.text().catch(() => "");

        if (response.ok) {
          delivery.status = "success";
          console.log(
            `✅ Webhook delivered: ${webhook.name} (attempt ${attempt})`,
          );
          this.deliveries.set(delivery.id, delivery);
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        delivery.error = errorMessage;
        delivery.status = "failed";
        this.deliveries.set(delivery.id, delivery);

        console.warn(
          `⚠️  Webhook delivery failed: ${webhook.name} (attempt ${attempt}/${webhook.retryAttempts})`,
        );
        console.warn(`   Error: ${errorMessage}`);

        if (attempt < webhook.retryAttempts) {
          // Exponential backoff: 1s, 2s, 4s
          const backoffDelay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }
    }

    console.error(
      `❌ Webhook delivery failed after ${webhook.retryAttempts} attempts: ${webhook.name}`,
    );
  }

  /**
   * Get delivery history for a webhook
   */
  getDeliveries(webhookId: string, limit = 50): WebhookDelivery[] {
    return Array.from(this.deliveries.values())
      .filter((delivery) => delivery.webhookId === webhookId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  }

  /**
   * Get all recent deliveries
   */
  getAllDeliveries(limit = 100): WebhookDelivery[] {
    return Array.from(this.deliveries.values())
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  }

  /**
   * Verify incoming webhook signature
   */
  verifyIncoming(payload: string, signature: string, secret: string): boolean {
    return verifySignature(payload, signature, secret);
  }

  /**
   * Clear old delivery logs (older than specified days)
   */
  clearOldDeliveries(days = 7): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    let deleted = 0;
    for (const [id, delivery] of this.deliveries.entries()) {
      if (new Date(delivery.createdAt) < cutoff) {
        this.deliveries.delete(id);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`🧹 Cleared ${deleted} old webhook deliveries`);
    }

    return deleted;
  }
}

// Singleton instance
export const webhookManager = new WebhookManager();
