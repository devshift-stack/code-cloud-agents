/**
 * Code Cloud Agents - Main Entry Point
 * Supervised AI system with Engineering Lead Supervisor and Cloud Assistant
 */

import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHealthRouter } from "./api/health.js";
import { createTaskRouter } from "./api/tasks.js";
import { createAuditRouter } from "./api/audit.js";
import { createEnforcementRouter } from "./api/enforcement.js";
import { createDemoRouter } from "./api/demo.js";
import { createSwaggerRouter } from "./api/swagger.js";
import { handleSlackEvents } from "./api/slack-events.js";
import { initDatabase } from "./db/database.js";
import { initQueue } from "./queue/queue.js";
import { createEnforcementGate } from "./audit/enforcementGate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT ?? 3000;

async function main() {
  console.log("🚀 Starting Code Cloud Agents...");

  // Initialize database
  const db = initDatabase();
  console.log("✅ Database initialized");

  // Initialize queue
  const queue = initQueue();
  console.log("✅ Queue initialized (mode:", queue.mode, ")");

  // Initialize enforcement gate (HARD STOP enforcement)
  const gate = createEnforcementGate(db);
  console.log("✅ Enforcement Gate active (STOP decisions are BLOCKING)");

  // Create Express app
  const app = express();
  app.use(express.json());

  // Serve static dashboard
  const publicPath = join(__dirname, "..", "public");
  app.use(express.static(publicPath));

  // Mount API routers
  app.use("/health", createHealthRouter(db, queue));
  app.use("/api/tasks", createTaskRouter(db, queue, gate));
  app.use("/api/audit", createAuditRouter(db));
  app.use("/api/enforcement", createEnforcementRouter(gate));
  app.use("/api/demo", createDemoRouter(db));
  app.use("/api/docs", createSwaggerRouter());

  // Slack Events (Mujo Interactive Bot)
  app.post("/api/slack/events", handleSlackEvents);

  // API info endpoint
  app.get("/api", (_req, res) => {
    res.json({
      name: "code-cloud-agents",
      version: "0.1.0",
      status: "running",
      supervisor: "ENGINEERING_LEAD_SUPERVISOR",
      mode: "SUPERVISED",
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log("📋 Dashboard: http://localhost:" + PORT);
    console.log("📋 API Endpoints:");
    console.log("   GET  /api           - API info");
    console.log("   GET  /health        - Health check");
    console.log("   POST /api/tasks     - Create task");
    console.log("   GET  /api/tasks     - List tasks");
    console.log("   GET  /api/audit     - Audit log");
    console.log("   GET  /api/enforcement/blocked  - Blocked tasks");
    console.log("   POST /api/enforcement/approve  - Human approval");
    console.log("   POST /api/enforcement/reject   - Human rejection");
    console.log("");
    console.log("🎁 Demo Invite System:");
    console.log("   POST /api/demo/invites     - Create demo invite (Admin)");
    console.log("   GET  /api/demo/invites     - List invites (Admin)");
    console.log("   POST /api/demo/redeem      - Redeem invite code");
    console.log("   GET  /api/demo/users/:id   - Get demo user status");
    console.log("");
    console.log("🤖 Mujo Interactive Bot:");
    console.log("   POST /api/slack/events     - Slack events webhook");
    console.log("");
    console.log("📚 API Documentation:");
    console.log("   GET  /api/docs             - Swagger UI (Interactive API Docs)");
    console.log("   GET  /api/docs/openapi.json - OpenAPI 3.0 JSON Spec");
    console.log("   GET  /api/docs/openapi.yaml - OpenAPI 3.0 YAML Spec");
  });
}

main().catch((error) => {
  console.error("❌ Failed to start:", error);
  process.exit(1);
});
