/**
 * Test Supervisor-Slack Integration
 * Tests Mujo bot connection with Supervisor system
 */

import "dotenv/config";
import {
  createMetaSupervisor,
  createCloudAssistant,
  createSupervisorNotifications,
  computeStopScore,
} from "./src/supervisor/index.js";

console.log("🧪 Testing Supervisor → Slack (Mujo) Integration\n");

// Initialize components
const metaSupervisor = createMetaSupervisor();
const assistant = createCloudAssistant();
const notifications = createSupervisorNotifications({
  channel: "#general", // Change to your channel
});

// Check if enabled
if (!notifications.isEnabled()) {
  console.log("❌ Slack notifications are disabled");
  console.log("\n💡 Enable with:");
  console.log("   SLACK_NOTIFICATIONS_ENABLED=true in .env");
  console.log("   Or activate SLACK_ENABLED=true");
  process.exit(1);
}

console.log("✅ Slack notifications enabled");
console.log(`📢 Channel: ${notifications.getConfig().channel}\n`);

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 1: STOP Score Alert");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Test 1: STOP Score Alert
const stopScore = computeStopScore(["PRICING_WITHOUT_FACT", "MISSING_TESTS"]);
console.log(`STOP Score: ${stopScore.score}/100 (${stopScore.severity})`);
console.log(`Stop Required: ${stopScore.stopRequired ? "YES" : "NO"}`);

const stopResult = await notifications.sendStopScoreAlert(
  "Database Migration",
  stopScore,
  "Task involves schema changes without proper test coverage",
);

if (stopResult.success) {
  console.log("✅ STOP alert sent to Slack\n");
} else {
  console.log(`❌ Failed: ${stopResult.error}\n`);
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 2: System Health Alert");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Test 2: System Health Alert
metaSupervisor.updateHealth("code-cloud-agents", {
  status: "degraded",
  stopRate: 0.35,
  queueDepth: 55,
  avgStopScore: 45,
  taskCompletionRate: 0.75,
});

const metrics = metaSupervisor.getAggregatedMetrics();
const systemHealth = metrics.systemHealth["code-cloud-agents"];

console.log(`System Status: ${systemHealth.status}`);
console.log(`Stop Rate: ${(systemHealth.stopRate * 100).toFixed(1)}%`);
console.log(`Queue Depth: ${systemHealth.queueDepth}`);

const healthResult = await notifications.sendSystemHealthAlert(
  "code-cloud-agents",
  systemHealth,
);

if (healthResult.success) {
  console.log("✅ Health alert sent to Slack\n");
} else {
  console.log(`❌ Failed: ${healthResult.error}\n`);
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 3: Task Completion");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Test 3: Task Completion
assistant.startTask("TASK-001", "Implement OAuth authentication");
assistant.addStep("Created login endpoint", "file:src/api/auth.ts");
assistant.addStep("Added JWT middleware", "file:src/middleware/jwt.ts");
assistant.recordGap("Missing password reset flow");
assistant.recordGap("Missing 2FA support");

const proposal = assistant.complete();
console.log(`Task Status: ${proposal.status}`);
console.log(`Gaps: ${proposal.gaps.length}`);
console.log(`Risks: ${proposal.risks.length}`);

const taskResult = await notifications.sendTaskCompletionNotification(
  "TASK-001",
  proposal,
);

if (taskResult.success) {
  console.log("✅ Task completion sent to Slack\n");
} else {
  console.log(`❌ Failed: ${taskResult.error}\n`);
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 4: Custom Message");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Test 4: Custom Message
const customResult = await notifications.sendCustomMessage(
  "🎉 Supervisor Integration Complete",
  `Mujo bot is now connected with the Supervisor system!\n\n*Features:*\n• STOP Score Alerts\n• System Health Monitoring\n• Task Completion Notifications\n• Custom Supervisor Messages\n\n*Status:* ✅ OPERATIONAL`,
  "info",
);

if (customResult.success) {
  console.log("✅ Custom message sent to Slack\n");
} else {
  console.log(`❌ Failed: ${customResult.error}\n`);
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("✅ All tests completed!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("\n💡 Check your Slack channel for the messages!");
