/**
 * Supervisor Notifications Service
 * Connects Mujo bot (Slack) with Supervisor system
 * With Mujo's multilingual humor (DE/EN/BS)
 */

import {
  createSlackClient,
  type SlackMessage,
} from "../integrations/slack/client.js";
import type { StopScoreResult, Severity } from "../audit/stopScorer.js";
import type { SystemHealth } from "../meta/metaSupervisor.js";
import type { StatusProposal } from "../assistant/cloudAssistant.js";
import {
  getMujoSignature,
  type Language,
} from "../integrations/slack/humor.js";

export interface NotificationConfig {
  channel: string; // Default channel for notifications (e.g., "#alerts")
  enabled: boolean;
  language: Language; // Mujo's language: de, en, or bs
  humor: boolean; // Enable Mujo's humor
  thresholds: {
    stopScore: number; // Notify if stop score >= this value (default: 40)
    stopRate: number; // Notify if system stop rate >= this value (default: 0.3)
    queueDepth: number; // Notify if queue depth >= this value (default: 50)
  };
}

/**
 * Supervisor Notification Service
 * Sends alerts from Supervisor to Slack (Mujo bot)
 */
export class SupervisorNotifications {
  private slack = createSlackClient();
  private config: NotificationConfig;

  constructor(config?: Partial<NotificationConfig>) {
    this.config = {
      channel: config?.channel || process.env.SLACK_ALERT_CHANNEL || "#alerts",
      enabled:
        config?.enabled ?? process.env.SLACK_NOTIFICATIONS_ENABLED === "true",
      language:
        config?.language || (process.env.MUJO_LANGUAGE as Language) || "de",
      humor: config?.humor ?? process.env.MUJO_HUMOR_ENABLED === "true",
      thresholds: {
        stopScore: config?.thresholds?.stopScore ?? 40,
        stopRate: config?.thresholds?.stopRate ?? 0.3,
        queueDepth: config?.thresholds?.queueDepth ?? 50,
      },
    };
  }

  /**
   * Send STOP score alert to Slack
   * @param taskName Name of the task
   * @param stopScore Stop score result
   * @param context Additional context (optional)
   */
  async sendStopScoreAlert(
    taskName: string,
    stopScore: StopScoreResult,
    context?: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled || !this.slack.isEnabled()) {
      return { success: false, error: "Slack notifications disabled" };
    }

    if (stopScore.score < this.config.thresholds.stopScore) {
      return { success: true }; // Below threshold, no notification needed
    }

    const emoji = this.getSeverityEmoji(stopScore.severity);
    // Color available via getSeverityColor() for rich formatting

    const message: SlackMessage = {
      channel: this.config.channel,
      text: `${emoji} STOP Score Alert: ${taskName}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} STOP Score Alert`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Task:* ${taskName}\n*STOP Score:* ${stopScore.score}/100\n*Severity:* ${stopScore.severity}\n*Stop Required:* ${stopScore.stopRequired ? "YES" : "NO"}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Reasons:*\n${stopScore.reasons.map((r) => `• ${r.replace(/_/g, " ")}`).join("\n")}`,
          },
        },
      ],
    };

    if (context) {
      message.blocks!.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Context:*\n${context}`,
        },
      });
    }

    message.blocks!.push({
      type: "divider",
    });

    message.blocks!.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: this.getFooter("Supervisor Alert"),
        },
      ],
    });

    return await this.slack.sendMessage(message);
  }

  /**
   * Send system health alert to Slack
   * @param systemId System identifier
   * @param health System health data
   */
  async sendSystemHealthAlert(
    systemId: string,
    health: SystemHealth,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled || !this.slack.isEnabled()) {
      return { success: false, error: "Slack notifications disabled" };
    }

    // Check if alert is needed
    const needsAlert =
      health.status !== "healthy" ||
      health.stopRate >= this.config.thresholds.stopRate ||
      health.queueDepth >= this.config.thresholds.queueDepth;

    if (!needsAlert) {
      return { success: true }; // No alert needed
    }

    const emoji =
      health.status === "unhealthy"
        ? "🔴"
        : health.status === "degraded"
          ? "🟡"
          : "🟢";

    const message: SlackMessage = {
      channel: this.config.channel,
      text: `${emoji} System Health Alert: ${systemId}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} System Health Alert`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*System:* ${systemId}\n*Status:* ${health.status.toUpperCase()}\n*Task Completion Rate:* ${(health.taskCompletionRate * 100).toFixed(1)}%\n*Stop Rate:* ${(health.stopRate * 100).toFixed(1)}%\n*Avg Stop Score:* ${health.avgStopScore.toFixed(1)}\n*Queue Depth:* ${health.queueDepth}`,
          },
        },
      ],
    };

    // Add warnings
    const warnings: string[] = [];
    if (health.status !== "healthy") {
      warnings.push(`System is ${health.status}`);
    }
    if (health.stopRate >= this.config.thresholds.stopRate) {
      warnings.push(`High stop rate: ${(health.stopRate * 100).toFixed(1)}%`);
    }
    if (health.queueDepth >= this.config.thresholds.queueDepth) {
      warnings.push(`Queue overload: ${health.queueDepth} tasks pending`);
    }

    if (warnings.length > 0) {
      message.blocks!.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Warnings:*\n${warnings.map((w) => `• ${w}`).join("\n")}`,
        },
      });
    }

    message.blocks!.push({
      type: "divider",
    });

    message.blocks!.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: this.getFooter("Meta Supervisor"),
        },
      ],
    });

    return await this.slack.sendMessage(message);
  }

  /**
   * Send task completion notification to Slack
   * @param taskId Task identifier
   * @param proposal Status proposal from CloudAssistant
   */
  async sendTaskCompletionNotification(
    taskId: string,
    proposal: StatusProposal,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled || !this.slack.isEnabled()) {
      return { success: false, error: "Slack notifications disabled" };
    }

    // Only notify on STOP_REQUIRED or COMPLETE_WITH_GAPS
    if (proposal.status === "COMPLETE") {
      return { success: true }; // No notification for clean completions
    }

    const emoji =
      proposal.status === "STOP_REQUIRED"
        ? "🛑"
        : proposal.status === "COMPLETE_WITH_GAPS"
          ? "⚠️"
          : "✅";

    const message: SlackMessage = {
      channel: this.config.channel,
      text: `${emoji} Task ${proposal.status}: ${taskId}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} Task ${proposal.status.replace(/_/g, " ")}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Task ID:* ${taskId}\n*Status:* ${proposal.status}`,
          },
        },
      ],
    };

    if (proposal.risks.length > 0) {
      message.blocks!.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Risks:*\n${proposal.risks.map((r) => `• ${r}`).join("\n")}`,
        },
      });
    }

    if (proposal.gaps.length > 0) {
      message.blocks!.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Gaps:*\n${proposal.gaps.map((g) => `• ${g}`).join("\n")}`,
        },
      });
    }

    if (proposal.nextSteps.length > 0) {
      message.blocks!.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Next Steps:*\n${proposal.nextSteps.map((s) => `• ${s}`).join("\n")}`,
        },
      });
    }

    if (proposal.evidence.length > 0) {
      message.blocks!.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Evidence:* ${proposal.evidence.length} artefacts collected`,
        },
      });
    }

    message.blocks!.push({
      type: "divider",
    });

    message.blocks!.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: this.getFooter("Cloud Assistant"),
        },
      ],
    });

    return await this.slack.sendMessage(message);
  }

  /**
   * Send custom supervisor message to Slack
   * @param title Message title
   * @param message Message content
   * @param level Alert level (info, warning, error)
   */
  async sendCustomMessage(
    title: string,
    message: string,
    level: "info" | "warning" | "error" = "info",
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled || !this.slack.isEnabled()) {
      return { success: false, error: "Slack notifications disabled" };
    }

    const emoji = level === "error" ? "🔴" : level === "warning" ? "⚠️" : "ℹ️";

    const slackMessage: SlackMessage = {
      channel: this.config.channel,
      text: `${emoji} ${title}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} ${title}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: message,
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
              text: this.getFooter("Supervisor System"),
            },
          ],
        },
      ],
    };

    return await this.slack.sendMessage(slackMessage);
  }

  /**
   * Get severity emoji
   */
  private getSeverityEmoji(severity: Severity): string {
    switch (severity) {
      case "CRITICAL":
        return "🔴";
      case "HIGH":
        return "🟠";
      case "MEDIUM":
        return "🟡";
      case "LOW":
        return "🟢";
      default:
        return "ℹ️";
    }
  }

  /**
   * Get severity color for rich formatting
   */
  getSeverityColor(severity: Severity): string {
    switch (severity) {
      case "CRITICAL":
        return "#FF0000";
      case "HIGH":
        return "#FF8C00";
      case "MEDIUM":
        return "#FFD700";
      case "LOW":
        return "#00FF00";
      default:
        return "#808080";
    }
  }

  /**
   * Get footer with Mujo's signature
   */
  private getFooter(source: string): string {
    const timestamp = new Date().toLocaleString();
    const signature = getMujoSignature(this.config.language);
    return `${signature} | ${source} | ${timestamp}`;
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.slack.isEnabled();
  }

  /**
   * Get current configuration
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<NotificationConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      thresholds: {
        ...this.config.thresholds,
        ...(updates.thresholds || {}),
      },
    };
  }
}

/**
 * Create a Supervisor Notifications instance
 */
export function createSupervisorNotifications(
  config?: Partial<NotificationConfig>,
): SupervisorNotifications {
  return new SupervisorNotifications(config);
}
