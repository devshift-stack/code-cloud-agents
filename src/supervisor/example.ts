/**
 * Supervisor Notifications - Usage Examples
 * Shows how to integrate Mujo bot with Supervisor system
 */

import {
  createMetaSupervisor,
  createCloudAssistant,
  createSupervisorNotifications,
  computeStopScore,
} from "./index.js";

/**
 * Example 1: STOP Score Alert
 * When a high STOP score is detected, send alert to Slack
 */
export async function exampleStopScoreAlert() {
  const notifications = createSupervisorNotifications({
    channel: "#alerts",
    enabled: true,
  });

  // Compute STOP score
  const stopScore = computeStopScore(["PRICING_WITHOUT_FACT", "MISSING_TESTS"]);

  console.log(`Stop Score: ${stopScore.score}/100 (${stopScore.severity})`);

  // Send alert if score is high
  if (stopScore.stopRequired) {
    const result = await notifications.sendStopScoreAlert(
      "Database Migration Task",
      stopScore,
      "Missing test coverage and pricing claims without verification",
    );

    if (result.success) {
      console.log("✅ Alert sent to Slack");
    } else {
      console.error(`❌ Failed: ${result.error}`);
    }
  }
}

/**
 * Example 2: System Health Monitoring
 * Monitor system health and send alerts when degraded
 */
export async function exampleSystemHealthMonitoring() {
  const metaSupervisor = createMetaSupervisor();
  const notifications = createSupervisorNotifications();

  // Simulate system health update
  metaSupervisor.updateHealth("code-cloud-agents", {
    status: "degraded",
    stopRate: 0.35,
    queueDepth: 55,
    avgStopScore: 45,
  });

  // Check for alerts
  const alerts = metaSupervisor.checkAlerts();
  console.log(`Alerts found: ${alerts.length}`);

  // Get system health
  const metrics = metaSupervisor.getAggregatedMetrics();
  const systemHealth = metrics.systemHealth["code-cloud-agents"];

  if (systemHealth) {
    const result = await notifications.sendSystemHealthAlert(
      "code-cloud-agents",
      systemHealth,
    );

    if (result.success) {
      console.log("✅ System health alert sent to Slack");
    } else {
      console.error(`❌ Failed: ${result.error}`);
    }
  }
}

/**
 * Example 3: Task Completion Notification
 * Notify team when task completes with issues
 */
export async function exampleTaskCompletion() {
  const assistant = createCloudAssistant();
  const notifications = createSupervisorNotifications();

  // Start a task
  assistant.startTask("TASK-123", "Implement user authentication");

  // Add steps
  assistant.addStep("Created login endpoint", "file:src/api/auth.ts");
  assistant.addStep("Added JWT middleware", "file:src/middleware/auth.ts");

  // Record a gap
  assistant.recordGap("Missing password reset functionality");

  // Complete task
  const proposal = assistant.complete();
  console.log(`Task status: ${proposal.status}`);

  // Send notification
  const result = await notifications.sendTaskCompletionNotification(
    "TASK-123",
    proposal,
  );

  if (result.success) {
    console.log("✅ Task completion notification sent to Slack");
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * Example 4: Complete Workflow
 * Full supervisor workflow with Slack notifications
 */
export async function exampleCompleteWorkflow() {
  console.log("🚀 Starting Supervisor Workflow with Slack Integration\n");

  const metaSupervisor = createMetaSupervisor();
  const assistant = createCloudAssistant();
  const notifications = createSupervisorNotifications({
    channel: "#dev-alerts",
  });

  // Step 1: Route task
  const route = metaSupervisor.route("feature-implementation", [
    "requires-testing",
  ]);
  console.log(`📍 Route: ${route.targetSystem} - ${route.reason}`);

  // Step 2: Start task execution
  assistant.startTask("FEAT-456", "Add payment integration");
  assistant.addStep("Research payment providers");
  assistant.addStep("Integrate Stripe API", "file:src/payment/stripe.ts");

  // Step 3: Detect risk
  assistant.recordRisk("No rollback plan for failed payments");
  const stopScore = computeStopScore([
    "MISSING_DEPLOY_CONFIG",
    "COST_OR_LOAD_RISK",
  ]);

  // Step 4: Send STOP alert
  if (stopScore.stopRequired) {
    console.log(`\n🛑 STOP Required: Score ${stopScore.score}/100`);
    await notifications.sendStopScoreAlert(
      "FEAT-456: Payment Integration",
      stopScore,
    );
  }

  // Step 5: Complete task
  const proposal = assistant.complete();
  await notifications.sendTaskCompletionNotification("FEAT-456", proposal);

  // Step 6: Update system health
  metaSupervisor.updateHealth("code-cloud-agents", {
    status: "healthy",
    stopRate: 0.1,
    avgStopScore: stopScore.score,
  });

  console.log("\n✅ Workflow completed with Slack notifications");
}

/**
 * Example 5: Custom Supervisor Messages
 * Send custom formatted messages from supervisor
 */
export async function exampleCustomMessages() {
  const notifications = createSupervisorNotifications();

  // Info message
  await notifications.sendCustomMessage(
    "Deployment Started",
    "Production deployment initiated by Engineering Lead Supervisor\n\n*Target:* production-eu\n*Version:* v2.1.0\n*ETA:* 5 minutes",
    "info",
  );

  // Warning message
  await notifications.sendCustomMessage(
    "High Memory Usage",
    "System memory usage at 85%\n\n*Action:* Monitoring for next 10 minutes\n*Threshold:* 90%",
    "warning",
  );

  // Error message
  await notifications.sendCustomMessage(
    "Deployment Failed",
    "Production deployment failed\n\n*Error:* Database migration timeout\n*Action:* Rolling back to v2.0.9",
    "error",
  );

  console.log("✅ Custom messages sent");
}

/**
 * Example 6: Real-time Monitoring Loop
 * Continuous monitoring with periodic Slack updates
 */
export async function exampleMonitoringLoop() {
  const metaSupervisor = createMetaSupervisor();
  const notifications = createSupervisorNotifications();

  console.log("🔄 Starting monitoring loop (Ctrl+C to stop)\n");

  // Monitor every 60 seconds
  setInterval(async () => {
    const metrics = metaSupervisor.getAggregatedMetrics();
    const alerts = metaSupervisor.checkAlerts();

    if (alerts.length > 0) {
      console.log(`⚠️  ${alerts.length} alerts detected`);

      // Send each alert to Slack
      for (const alert of alerts) {
        await notifications.sendCustomMessage(
          "System Alert",
          alert,
          alert.includes("CRITICAL") ? "error" : "warning",
        );
      }
    } else {
      console.log(
        `✅ All systems healthy - Avg STOP Score: ${metrics.avgStopScore.toFixed(1)}`,
      );
    }
  }, 60000); // Every 60 seconds
}

// Run examples (uncomment to test)
// exampleStopScoreAlert();
// exampleSystemHealthMonitoring();
// exampleTaskCompletion();
// exampleCompleteWorkflow();
// exampleCustomMessages();
// exampleMonitoringLoop();
