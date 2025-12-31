/**
 * Test Slack Message
 * Sendet eine Test-Nachricht in einen Channel
 */

import "dotenv/config";
import { createSlackClient } from "./src/integrations/slack/client.js";

const slack = createSlackClient();

console.log("📨 Sending test message to Slack...\n");

// Test-Nachricht in Channel
const result = await slack.sendMessage({
  channel: "#general", // Ändere zu deinem Channel
  text: "🚀 Mujo ist jetzt aktiv!",
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ Integration Test erfolgreich",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Mujo* ist jetzt verbunden und bereit!\n\n*Features:*\n• GitHub Issues erstellen\n• Linear Issues erstellen\n• Team Notifications\n• STOP Score Alerts",
      },
    },
    {
      type: "divider",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "🤖 Gesendet von Cloud Agents System",
        },
      ],
    },
  ],
});

if (result.success && result.message) {
  console.log("✅ Message sent successfully!");
  console.log(`   Channel: ${result.message.channel}`);
  console.log(`   Message URL: ${result.message.messageUrl}`);
} else {
  console.log(`❌ Failed: ${result.error}`);
  console.log("\n💡 Tipps:");
  console.log("   - Hast du Messages Tab aktiviert?");
  console.log("   - Ist Mujo im Channel eingeladen? (/invite @Mujo)");
  console.log("   - Channel-Name korrekt? (z.B. #general)");
}
