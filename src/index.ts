/**
 * Code Cloud Agents - Main Entry Point
 * Supervised AI system with Engineering Lead Supervisor and Cloud Assistant
 */

import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createServer } from "http";
import { createHealthRouter } from "./api/health.js";
import { createTaskRouter } from "./api/tasks.js";
import { createAuditRouter } from "./api/audit.js";
import { createEnforcementRouter } from "./api/enforcement.js";
import { createDemoRouter } from "./api/demo.js";
import { createAuthRouter } from "./api/auth.js";
import { createUsersRouter } from "./api/users.js";
import { createGitHubRouter } from "./api/github.js";
import { createLinearRouter } from "./api/linear.js";
import { createAgentControlRouter } from "./api/agent-control.js";
import { createGitHubWebhookRouter } from "./webhooks/github.js";
import { createLinearWebhookRouter } from "./webhooks/linear.js";
import { createSettingsRouter } from "./api/settings.js";
import { createMemoryRouter } from "./api/memory.js";
import { handleSlackEvents } from "./api/slack-events.js";
import { WebSocketManager } from "./websocket/server.js";
import { initDatabase } from "./db/database.js";
import { initQueue } from "./queue/queue.js";
import { createEnforcementGate } from "./audit/enforcementGate.js";
import { setupSwagger } from "./swagger/index.js";

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

  // Webhook routes need raw body for signature verification
  app.use("/api/webhooks/github", express.text({ type: "application/json" }), createGitHubWebhookRouter(db, queue));
  app.use("/api/webhooks/linear", express.text({ type: "application/json" }), createLinearWebhookRouter(db, queue));

  // All other routes use JSON parsing
  app.use(express.json());

  // Serve static dashboard
  const publicPath = join(__dirname, "..", "public");
  app.use(express.static(publicPath));

  // Mount API routers
  app.use("/health", createHealthRouter(db, queue));
  app.use("/api/auth", createAuthRouter());
  app.use("/api/users", createUsersRouter(db));
  app.use("/api/tasks", createTaskRouter(db, queue, gate));
  app.use("/api/audit", createAuditRouter(db));
  app.use("/api/enforcement", createEnforcementRouter(gate));
  app.use("/api/demo", createDemoRouter(db));
  app.use("/api/github", createGitHubRouter());
  app.use("/api/linear", createLinearRouter());
  app.use("/api/agents", createAgentControlRouter());
  app.use("/api/settings", createSettingsRouter(db));
  app.use("/api/memory", createMemoryRouter(db));

  // Slack Events (Mujo Interactive Bot)
  app.post("/api/slack/events", handleSlackEvents);

  // Setup Swagger UI Documentation
  setupSwagger(app);

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

  // Create HTTP server
  const server = createServer(app);

  // Initialize WebSocket server
  const wsManager = new WebSocketManager(server);

  // Example: Broadcast agent status every 10 seconds
  setInterval(() => {
    wsManager.broadcastAgentStatus({
      agentName: "ENGINEERING_LEAD_SUPERVISOR",
      state: "idle",
      currentTask: undefined,
    });
  }, 10000);

  // Start server
  server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log("📋 Dashboard: http://localhost:" + PORT);
    console.log("🔌 WebSocket: ws://localhost:" + PORT + "/ws");
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
    console.log("🔗 GitHub Integration:");
    console.log("   GET  /api/github/status    - GitHub connection status");
    console.log("   GET  /api/github/repos     - List repositories");
    console.log("   GET  /api/github/repos/:owner/:repo  - Get repository");
    console.log("   GET  /api/github/issues    - List issues");
    console.log("   POST /api/github/issues    - Create issue");
    console.log("   GET  /api/github/pulls     - List pull requests");
    console.log("   POST /api/github/pulls     - Create pull request");
    console.log("   GET  /api/github/comments  - List comments");
    console.log("   POST /api/github/comments  - Create comment");
    console.log("");
    console.log("📐 Linear Integration:");
    console.log("   GET  /api/linear/status    - Linear connection status");
    console.log("   GET  /api/linear/teams     - List teams");
    console.log("   GET  /api/linear/issues    - List issues");
    console.log("   POST /api/linear/issues    - Create issue");
    console.log("   GET  /api/linear/projects  - List projects");
    console.log("   POST /api/linear/projects  - Create project");
    console.log("   GET  /api/linear/states    - List workflow states");
    console.log("   GET  /api/linear/labels    - List labels");
    console.log("   GET  /api/linear/users     - List users");
    console.log("");
    console.log("🪝 Webhook Handlers:");
    console.log("   POST /api/webhooks/github  - GitHub webhook events");
    console.log("   POST /api/webhooks/linear  - Linear webhook events");
    console.log("   GET  /api/webhooks/linear/test - Test Linear webhook");
    console.log("");
    console.log("⚙️  Settings Management:");
    console.log("   GET    /api/settings/user/:userId           - Get user settings");
    console.log("   PUT    /api/settings/user/:userId           - Update user settings");
    console.log("   DELETE /api/settings/user/:userId           - Delete user settings");
    console.log("   GET    /api/settings/preferences/:userId    - Get user preferences");
    console.log("   PATCH  /api/settings/preferences/:userId    - Update preferences");
    console.log("   GET    /api/settings/system                 - Get system settings (Admin)");
    console.log("   GET    /api/settings/system/:key            - Get system setting");
    console.log("   PUT    /api/settings/system                 - Update system settings (Admin)");
    console.log("   GET    /api/settings/history/user/:userId   - Get user history");
    console.log("   GET    /api/settings/history/system/:key    - Get system history");
    console.log("");
    console.log("🧠 Memory System:");
    console.log("   GET    /api/memory/chats/:userId             - List chats");
    console.log("   POST   /api/memory/chats                     - Create chat");
    console.log("   GET    /api/memory/chats/:chatId/details     - Get chat details");
    console.log("   POST   /api/memory/chats/:chatId/messages    - Add message");
    console.log("   GET    /api/memory/chats/:chatId/recent      - Get recent messages");
    console.log("   POST   /api/memory/search                    - Full-text search");
    console.log("   POST   /api/memory/semantic/search           - Semantic search (embeddings)");
    console.log("   GET    /api/memory/trending/:userId          - Trending topics");
    console.log("");
    console.log("🔌 WebSocket Real-time:");
    console.log("   WS   ws://localhost:" + PORT + "/ws?token=YOUR_TOKEN");
    console.log("   Messages: agent_status, chat_message, notification, user_presence");
  });

  // Export wsManager for use in other modules
  (global as typeof global & { wsManager?: WebSocketManager }).wsManager = wsManager;
}

main().catch((error) => {
  console.error("❌ Failed to start:", error);
  process.exit(1);
});
