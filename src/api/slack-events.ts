/**
 * Slack Events API Handler
 * Webhook endpoint for Slack events (messages, mentions, etc.)
 */

import type { Request, Response } from "express";
import { createSlackClient } from "../integrations/slack/client.js";
import { getSmartResponse, isMentioningMujo, cleanMessage } from "../integrations/slack/bot-responses.js";
import { createMetaSupervisor } from "../meta/metaSupervisor.js";
import { computeStopScore } from "../audit/stopScorer.js";
import { getRandomJoke, type Language } from "../integrations/slack/humor.js";

const slack = createSlackClient();
const metaSupervisor = createMetaSupervisor();

/**
 * Slack Event Handler
 * POST /api/slack/events
 */
export async function handleSlackEvents(req: Request, res: Response) {
  const event = req.body;

  // URL Verification (Slack setup)
  if (event.type === "url_verification") {
    return res.json({ challenge: event.challenge });
  }

  // Event Callback
  if (event.type === "event_callback") {
    const eventData = event.event;

    // Handle message events
    if (eventData.type === "message" && !eventData.bot_id) {
      // Prevent responding to own messages
      if (eventData.subtype === "bot_message") {
        return res.status(200).send("OK");
      }

      await handleMessage(eventData);
    }

    // Handle app_mention events
    if (eventData.type === "app_mention") {
      await handleMention(eventData);
    }
  }

  // Always respond 200 to Slack
  res.status(200).send("OK");
}

/**
 * Handle regular message (check if Mujo is mentioned)
 */
async function handleMessage(event: any) {
  const message = event.text || "";
  const channel = event.channel;

  // Check if message mentions Mujo
  if (!isMentioningMujo(message)) {
    return; // Ignore messages that don't mention Mujo
  }

  // Get bot user ID to prevent responding to self
  const botUserId = process.env.SLACK_BOT_USER_ID;
  if (event.user === botUserId) {
    return; // Don't respond to self
  }

  // Clean message and get response
  const cleaned = cleanMessage(message);
  const language = (process.env.MUJO_LANGUAGE as Language) || "de";

  // Check for supervisor commands
  if (await handleSupervisorCommands(cleaned, channel, language)) {
    return; // Command handled
  }

  // Generate smart response
  const response = getSmartResponse(cleaned, language);

  // Send response
  await slack.sendMessage({
    channel,
    text: response.text,
    threadTs: event.ts, // Reply in thread
  });
}

/**
 * Handle direct mention (@Mujo)
 */
async function handleMention(event: any) {
  const message = event.text || "";
  const channel = event.channel;

  // Clean message
  const cleaned = cleanMessage(message);
  const language = (process.env.MUJO_LANGUAGE as Language) || "de";

  // Check for supervisor commands
  if (await handleSupervisorCommands(cleaned, channel, language)) {
    return; // Command handled
  }

  // Generate smart response
  const response = getSmartResponse(cleaned, language);

  // Send response
  await slack.sendMessage({
    channel,
    text: response.text,
    threadTs: event.ts, // Reply in thread
  });
}

/**
 * Handle supervisor-specific commands
 * Mujo uses supervisor knowledge
 */
async function handleSupervisorCommands(
  message: string,
  channel: string,
  language: Language
): Promise<boolean> {
  const messageLower = message.toLowerCase();

  // System Status Command
  if (
    messageLower.includes("system status") ||
    messageLower.includes("status") ||
    messageLower.includes("health")
  ) {
    const metrics = metaSupervisor.getAggregatedMetrics();
    const alerts = metaSupervisor.checkAlerts();

    const statusText = {
      de: `📊 **System Status:**\n\n${
        alerts.length === 0
          ? "✅ Alle Systeme gesund!\n\n"
          : `⚠️ ${alerts.length} Alerts:\n${alerts.map((a) => `• ${a}`).join("\n")}\n\n`
      }**Metrics:**\n• Total Tasks: ${metrics.totalTasks}\n• Completed: ${metrics.completedTasks}\n• Stopped: ${metrics.stoppedTasks}\n• Avg STOP Score: ${metrics.avgStopScore.toFixed(1)}\n\n🤖 Mujo Supervisor`,
      en: `📊 **System Status:**\n\n${
        alerts.length === 0
          ? "✅ All systems healthy!\n\n"
          : `⚠️ ${alerts.length} Alerts:\n${alerts.map((a) => `• ${a}`).join("\n")}\n\n`
      }**Metrics:**\n• Total Tasks: ${metrics.totalTasks}\n• Completed: ${metrics.completedTasks}\n• Stopped: ${metrics.stoppedTasks}\n• Avg STOP Score: ${metrics.avgStopScore.toFixed(1)}\n\n🤖 Mujo Supervisor`,
      bs: `📊 **Status Sistema:**\n\n${
        alerts.length === 0
          ? "✅ Svi sistemi zdravi!\n\n"
          : `⚠️ ${alerts.length} Upozorenja:\n${alerts.map((a) => `• ${a}`).join("\n")}\n\n`
      }**Metrike:**\n• Ukupno Taskova: ${metrics.totalTasks}\n• Završeno: ${metrics.completedTasks}\n• Zaustavljeno: ${metrics.stoppedTasks}\n• Prosječan STOP Score: ${metrics.avgStopScore.toFixed(1)}\n\n🤖 Mujo Supervisor`,
    };

    await slack.sendMessage({
      channel,
      text: statusText[language],
    });

    return true;
  }

  // STOP Score Info Command
  if (
    messageLower.includes("stop score") ||
    messageLower.includes("stop-score") ||
    messageLower.includes("stopcore")
  ) {
    const infoText = {
      de: `🛑 **STOP Score System:**\n\n**Was ist ein STOP Score?**\nEine Risiko-Bewertung von 0-100 für Tasks.\n\n**Levels:**\n• 0-19: 🟢 LOW\n• 20-39: 🟡 MEDIUM\n• 40-69: 🟠 HIGH\n• 70-100: 🔴 CRITICAL (STOP REQUIRED!)\n\n**Bei Score >= 40:**\nTask wird gestoppt und überprüft!\n\n**Gründe für hohen Score:**\n• Pricing ohne Fakten\n• Fehlende Tests\n• Ungeprüfte Claims\n• Cross-Layer Mismatch\n• Cost/Load Risiko\n\n🤖 Mujo Supervisor`,
      en: `🛑 **STOP Score System:**\n\n**What is a STOP Score?**\nA risk assessment from 0-100 for tasks.\n\n**Levels:**\n• 0-19: 🟢 LOW\n• 20-39: 🟡 MEDIUM\n• 40-69: 🟠 HIGH\n• 70-100: 🔴 CRITICAL (STOP REQUIRED!)\n\n**At Score >= 40:**\nTask is stopped and reviewed!\n\n**Reasons for high score:**\n• Pricing without facts\n• Missing tests\n• Unproven claims\n• Cross-layer mismatch\n• Cost/load risk\n\n🤖 Mujo Supervisor`,
      bs: `🛑 **STOP Score Sistem:**\n\n**Šta je STOP Score?**\nProcjena rizika od 0-100 za taskove.\n\n**Nivoi:**\n• 0-19: 🟢 NIZAK\n• 20-39: 🟡 SREDNJI\n• 40-69: 🟠 VISOK\n• 70-100: 🔴 KRITIČAN (STOP POTREBAN!)\n\n**Pri Score >= 40:**\nTask se zaustavlja i provjerava!\n\n**Razlozi za visok score:**\n• Cijene bez činjenica\n• Nedostaju testovi\n• Nedokazane tvrdnje\n• Cross-layer neusklađenost\n• Cost/load rizik\n\n🤖 Mujo Supervisor`,
    };

    await slack.sendMessage({
      channel,
      text: infoText[language],
    });

    return true;
  }

  // Calculate STOP Score (example)
  if (
    messageLower.includes("berechne stop score") ||
    messageLower.includes("calculate stop score") ||
    messageLower.includes("izračunaj stop score")
  ) {
    // Example calculation
    const stopScore = computeStopScore(["MISSING_TESTS", "UNPROVEN_CLAIM"]);

    const resultText = {
      de: `🛑 **STOP Score Berechnung:**\n\n**Score:** ${stopScore.score}/100\n**Severity:** ${stopScore.severity}\n**Stop Required:** ${stopScore.stopRequired ? "JA ⛔" : "Nein ✅"}\n\n**Gründe:**\n${stopScore.reasons.map((r) => `• ${r.replace(/_/g, " ")}`).join("\n")}\n\n💡 _Dies ist ein Beispiel. Für echte Tasks verwende den Supervisor!_\n\n🤖 Mujo Supervisor`,
      en: `🛑 **STOP Score Calculation:**\n\n**Score:** ${stopScore.score}/100\n**Severity:** ${stopScore.severity}\n**Stop Required:** ${stopScore.stopRequired ? "YES ⛔" : "No ✅"}\n\n**Reasons:**\n${stopScore.reasons.map((r) => `• ${r.replace(/_/g, " ")}`).join("\n")}\n\n💡 _This is an example. For real tasks use the Supervisor!_\n\n🤖 Mujo Supervisor`,
      bs: `🛑 **STOP Score Izračun:**\n\n**Score:** ${stopScore.score}/100\n**Severity:** ${stopScore.severity}\n**Stop Potreban:** ${stopScore.stopRequired ? "DA ⛔" : "Ne ✅"}\n\n**Razlozi:**\n${stopScore.reasons.map((r) => `• ${r.replace(/_/g, " ")}`).join("\n")}\n\n💡 _Ovo je primjer. Za prave taskove koristi Supervisor!_\n\n🤖 Mujo Supervisor`,
    };

    await slack.sendMessage({
      channel,
      text: resultText[language],
    });

    return true;
  }

  // Alerts Command
  if (
    messageLower.includes("alerts") ||
    messageLower.includes("warnungen") ||
    messageLower.includes("upozorenja")
  ) {
    const alerts = metaSupervisor.checkAlerts();

    const alertText = {
      de:
        alerts.length === 0
          ? "✅ **Keine Alerts!**\n\nAlle Systeme laufen normal. 💪\n\n🤖 Mujo Supervisor"
          : `⚠️ **${alerts.length} Aktive Alerts:**\n\n${alerts.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n\n🤖 Mujo Supervisor`,
      en:
        alerts.length === 0
          ? "✅ **No Alerts!**\n\nAll systems running normally. 💪\n\n🤖 Mujo Supervisor"
          : `⚠️ **${alerts.length} Active Alerts:**\n\n${alerts.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n\n🤖 Mujo Supervisor`,
      bs:
        alerts.length === 0
          ? "✅ **Nema Upozorenja!**\n\nSvi sistemi rade normalno. 💪\n\n🤖 Mujo Supervisor"
          : `⚠️ **${alerts.length} Aktivnih Upozorenja:**\n\n${alerts.map((a, i) => `${i + 1}. ${a}`).join("\n")}\n\n🤖 Mujo Supervisor`,
    };

    await slack.sendMessage({
      channel,
      text: alertText[language],
    });

    return true;
  }

  return false; // No supervisor command found
}

/**
 * Verify Slack request signature
 * Security measure to ensure requests come from Slack
 */
export function verifySlackSignature(req: Request): boolean {
  const slackSignature = req.headers["x-slack-signature"] as string;
  const slackTimestamp = req.headers["x-slack-request-timestamp"] as string;
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

  if (!slackSignature || !slackTimestamp || !slackSigningSecret) {
    return false;
  }

  // Check timestamp to prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(slackTimestamp)) > 60 * 5) {
    // 5 minutes
    return false;
  }

  // Verify signature
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", slackSigningSecret);
  const sigBasestring = `v0:${slackTimestamp}:${JSON.stringify(req.body)}`;
  hmac.update(sigBasestring);
  const mySignature = `v0=${hmac.digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(mySignature, "utf8"),
    Buffer.from(slackSignature, "utf8")
  );
}
