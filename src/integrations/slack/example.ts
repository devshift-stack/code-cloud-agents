/**
 * Slack Integration - Usage Examples
 */

import { createSlackClient } from "./client.js";

/**
 * Example 1: Send a simple message
 */
export async function exampleSendMessage() {
  const slack = createSlackClient();

  const result = await slack.sendMessage({
    channel: "#general",
    text: "Hello from Cloud Agents! 👋",
  });

  if (result.success && result.message) {
    console.log(`✅ Message sent: ${result.message.messageUrl}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * Example 2: Send message with rich formatting (blocks)
 */
export async function exampleSendRichMessage() {
  const slack = createSlackClient();

  const result = await slack.sendMessage({
    channel: "#general",
    text: "Task Completed",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "✅ Task Completed Successfully",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Task:*\nImplement GitHub Integration",
          },
          {
            type: "mrkdwn",
            text: "*Agent:*\nCloud Assistant",
          },
          {
            type: "mrkdwn",
            text: "*Duration:*\n2.5 hours",
          },
          {
            type: "mrkdwn",
            text: "*STOP Score:*\n15/100 (LOW)",
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View on GitHub",
            },
            url: "https://github.com/dsactivi-2/Optimizecodecloudagents",
          },
        ],
      },
    ],
  });

  if (result.success) {
    console.log(`✅ Rich message sent`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * Example 3: Send message via Webhook (simpler, no token needed)
 */
export async function exampleSendWebhook() {
  const slack = createSlackClient();

  const result = await slack.sendWebhook(
    "🚨 Critical error detected by Supervisor!",
  );

  if (result.success) {
    console.log(`✅ Webhook message sent`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * Example 4: List all channels
 */
export async function exampleListChannels() {
  const slack = createSlackClient();

  const result = await slack.listChannels();

  if (result.success && result.channels) {
    console.log(`✅ Found ${result.channels.length} channels:`);
    result.channels.slice(0, 10).forEach((ch) => {
      const member = ch.isMember ? "✅" : "❌";
      const type = ch.isPrivate ? "🔒" : "🌐";
      console.log(`   ${member} ${type} #${ch.name} (${ch.id})`);
    });
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * Example 5: Check connection status
 */
export async function exampleCheckStatus() {
  const slack = createSlackClient();

  const result = await slack.getStatus();

  if (result.connected) {
    console.log(`✅ Connected to Slack`);
    console.log(`   Team: ${result.team}`);
    console.log(`   User: ${result.user}`);
  } else {
    console.error(`❌ Not connected: ${result.error}`);
  }
}

/**
 * Example 6: Send message in thread (reply)
 */
export async function exampleReplyInThread() {
  const slack = createSlackClient();

  // First message
  const first = await slack.sendMessage({
    channel: "#general",
    text: "Starting deployment...",
  });

  if (first.success && first.message) {
    // Reply in thread
    const reply = await slack.sendMessage({
      channel: "#general",
      text: "✅ Deployment completed successfully!",
      threadTs: first.message.ts, // Reply to first message
    });

    if (reply.success) {
      console.log(`✅ Thread reply sent`);
    }
  }
}

/**
 * Example 7: STOP Score Alert
 */
export async function exampleStopScoreAlert() {
  const slack = createSlackClient();

  const stopScore = 75;
  const taskName = "Database Migration";

  const result = await slack.sendMessage({
    channel: "#alerts",
    text: `🚨 HIGH STOP Score: ${stopScore}/100`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🚨 STOP Required: ${taskName}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*STOP Score:* ${stopScore}/100 (CRITICAL)\n*Task:* ${taskName}\n*Reason:* Missing rollback plan and testing evidence`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Action Required:*\n- Add rollback procedure\n- Provide test results\n- Security review",
          },
        ],
      },
    ],
  });

  if (result.success) {
    console.log(`✅ STOP alert sent`);
  }
}

// Run examples (uncomment to test)
// exampleCheckStatus();
// exampleSendMessage();
// exampleSendRichMessage();
// exampleSendWebhook();
// exampleListChannels();
// exampleReplyInThread();
// exampleStopScoreAlert();
