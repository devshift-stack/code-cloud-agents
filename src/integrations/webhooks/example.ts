/**
 * Webhook Integration Examples
 *
 * DISABLED BY DEFAULT - Enable via ENABLE_WEBHOOKS=true
 */

import { webhookManager } from "./manager.ts";
import { generateSecret } from "./security.ts";

/**
 * Example 1: Register a webhook for task events
 */
async function exampleRegisterTaskWebhook() {
  const secret = generateSecret();

  const webhook = webhookManager.register({
    url: "https://your-domain.com/webhooks/tasks",
    secret,
    events: ["task.created", "task.updated", "task.completed", "task.stopped"],
    enabled: true,
    retryAttempts: 3,
    timeout: 5000,
  });

  console.log("Webhook registered:", webhook.id);
  console.log("Secret (store securely):", secret);
}

/**
 * Example 2: Register a webhook for STOP Score alerts
 */
async function exampleRegisterStopScoreWebhook() {
  const webhook = webhookManager.register({
    url: "https://your-domain.com/webhooks/alerts",
    events: ["stop_score.high", "stop_score.critical"],
    enabled: true,
    headers: {
      "X-API-Key": "your-api-key",
    },
  });

  console.log("STOP Score webhook registered:", webhook.id);
}

/**
 * Example 3: Trigger a webhook manually
 */
async function exampleTriggerWebhook() {
  await webhookManager.trigger("task.created", {
    id: "task-123",
    title: "New agent task",
    priority: "high",
    assignee: "CLOUD_ASSISTANT",
  });
}

/**
 * Example 4: List all registered webhooks
 */
function exampleListWebhooks() {
  const webhooks = webhookManager.list();
  console.log(`Total webhooks: ${webhooks.length}`);

  webhooks.forEach((webhook) => {
    console.log(`- ${webhook.name} (${webhook.id})`);
    console.log(`  URL: ${webhook.url}`);
    console.log(`  Events: ${webhook.events.join(", ")}`);
    console.log(`  Enabled: ${webhook.enabled}`);
  });
}

/**
 * Example 5: View delivery history
 */
function exampleViewDeliveryHistory(webhookId: string) {
  const deliveries = webhookManager.getDeliveries(webhookId, 10);

  console.log(`Recent deliveries for webhook ${webhookId}:`);
  deliveries.forEach((delivery) => {
    console.log(`- ${delivery.event} [${delivery.status}]`);
    console.log(`  Attempts: ${delivery.attempts}`);
    console.log(`  Response: ${delivery.responseCode || "N/A"}`);
    if (delivery.error) {
      console.log(`  Error: ${delivery.error}`);
    }
  });
}

/**
 * Example 6: Update webhook configuration
 */
function exampleUpdateWebhook(webhookId: string) {
  const updated = webhookManager.update(webhookId, {
    enabled: false,
    events: ["stop_score.critical"], // Only critical events
  });

  console.log("Webhook updated:", updated);
}

/**
 * Example 7: Unregister webhook
 */
function exampleUnregisterWebhook(webhookId: string) {
  const deleted = webhookManager.unregister(webhookId);
  console.log(`Webhook deleted: ${deleted}`);
}

/**
 * Example 8: Verify incoming webhook (for receiving webhooks)
 */
function exampleVerifyIncoming(
  requestBody: string,
  signature: string,
  secret: string,
) {
  const isValid = webhookManager.verifyIncoming(requestBody, signature, secret);

  if (isValid) {
    console.log("✅ Webhook signature valid");
    // Parse and process: JSON.parse(requestBody)
  } else {
    console.error("❌ Invalid webhook signature");
  }
}

/**
 * Example 9: Integration with Slack (send notification on HIGH STOP score)
 */
async function exampleSlackIntegration() {
  webhookManager.register({
    url:
      process.env.SLACK_WEBHOOK_URL ||
      "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    events: ["stop_score.high", "stop_score.critical"],
    enabled: !!process.env.SLACK_WEBHOOK_URL,
  });
}

/**
 * Example 10: Auto-cleanup old delivery logs
 */
function exampleAutoCleanup() {
  // Clear deliveries older than 7 days
  const deleted = webhookManager.clearOldDeliveries(7);
  console.log(`Cleaned up ${deleted} old deliveries`);
}

// Export examples (disabled by default)
export const examples = {
  exampleRegisterTaskWebhook,
  exampleRegisterStopScoreWebhook,
  exampleTriggerWebhook,
  exampleListWebhooks,
  exampleViewDeliveryHistory,
  exampleUpdateWebhook,
  exampleUnregisterWebhook,
  exampleVerifyIncoming,
  exampleSlackIntegration,
  exampleAutoCleanup,
};
