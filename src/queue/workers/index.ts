/**
 * Webhook Event Workers Index
 * Centralizes registration of all webhook event workers
 */

import { registerGitHubWorkers } from "./github.js";
import { registerLinearWorkers } from "./linear.js";
import type { QueueAdapter } from "../queue.js";
import type { Database } from "../../db/database.js";

/**
 * Registers all webhook event workers with the queue
 * Call this once during application startup
 */
export function registerAllWebhookWorkers(
  queue: QueueAdapter,
  db: Database,
): void {
  console.log("🔧 Registering all webhook workers...");

  // Register GitHub webhook workers
  registerGitHubWorkers(queue, db);

  // Register Linear webhook workers
  registerLinearWorkers(queue, db);

  console.log("✅ All webhook workers registered successfully");
}

// Re-export individual registration functions for flexibility
export { registerGitHubWorkers, registerLinearWorkers };
