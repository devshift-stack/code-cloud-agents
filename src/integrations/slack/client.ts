/**
 * Slack Integration Client (FULLY IMPLEMENTED)
 */

import { WebClient } from "@slack/web-api";

export interface SlackConfig {
  token: string;
  webhookUrl?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: unknown[];
  attachments?: unknown[];
  threadTs?: string; // For replying in thread
}

export interface SlackMessageResult {
  ts: string;
  channel: string;
  messageUrl?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
}

export interface SlackClient {
  isEnabled(): boolean;
  sendMessage(message: SlackMessage): Promise<{
    success: boolean;
    message?: SlackMessageResult;
    error?: string;
  }>;
  sendWebhook(text: string): Promise<{ success: boolean; error?: string }>;
  listChannels(): Promise<{
    success: boolean;
    channels?: SlackChannel[];
    error?: string;
  }>;
  getStatus(): Promise<{
    connected: boolean;
    team?: string;
    user?: string;
    error?: string;
  }>;
}

/**
 * Creates a Slack client instance with WebClient
 * @param config - Slack configuration (optional, reads from ENV if not provided)
 * @returns SlackClient instance
 */
export function createSlackClient(config?: SlackConfig): SlackClient {
  const enabled = process.env.SLACK_ENABLED === "true";
  const token = config?.token || process.env.SLACK_TOKEN || "";
  const webhookUrl = config?.webhookUrl || process.env.SLACK_WEBHOOK_URL;

  let client: WebClient | null = null;

  if (enabled && token) {
    client = new WebClient(token);
  }

  return {
    /**
     * Check if Slack integration is enabled
     */
    isEnabled(): boolean {
      return enabled;
    },

    /**
     * Send a message to a Slack channel
     * @param message - Message details including channel and text
     * @returns Promise with message result
     */
    async sendMessage(message: SlackMessage): Promise<{
      success: boolean;
      message?: SlackMessageResult;
      error?: string;
    }> {
      if (!enabled) {
        return { success: false, error: "Slack integration disabled" };
      }

      if (!client) {
        return { success: false, error: "Slack token not configured" };
      }

      try {
        const result = await client.chat.postMessage({
          channel: message.channel,
          text: message.text,
          blocks: message.blocks as any,
          attachments: message.attachments as any,
          thread_ts: message.threadTs,
        });

        if (!result.ok) {
          return { success: false, error: `Slack API error: ${result.error}` };
        }

        return {
          success: true,
          message: {
            ts: result.ts || "",
            channel: result.channel || message.channel,
            messageUrl: result.ts
              ? `https://slack.com/app_redirect?channel=${result.channel}&message_ts=${result.ts}`
              : undefined,
          },
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Slack API error: ${errorMessage}` };
      }
    },

    /**
     * Send a simple message via Webhook URL (no auth required)
     * @param text - Message text
     * @returns Promise with success status
     */
    async sendWebhook(
      text: string,
    ): Promise<{ success: boolean; error?: string }> {
      if (!enabled) {
        return { success: false, error: "Slack integration disabled" };
      }

      if (!webhookUrl) {
        return { success: false, error: "Slack webhook URL not configured" };
      }

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return { success: false, error: `Webhook error: ${errorText}` };
        }

        return { success: true };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Webhook error: ${errorMessage}` };
      }
    },

    /**
     * List all channels the bot has access to
     * @returns Promise with channels list
     */
    async listChannels(): Promise<{
      success: boolean;
      channels?: SlackChannel[];
      error?: string;
    }> {
      if (!enabled) {
        return { success: false, error: "Slack integration disabled" };
      }

      if (!client) {
        return { success: false, error: "Slack token not configured" };
      }

      try {
        const result = await client.conversations.list({
          exclude_archived: true,
          types: "public_channel,private_channel",
        });

        if (!result.ok) {
          return { success: false, error: `Slack API error: ${result.error}` };
        }

        const channels = (result.channels || []).map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          isPrivate: ch.is_private || false,
          isMember: ch.is_member || false,
        }));

        return { success: true, channels };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Slack API error: ${errorMessage}` };
      }
    },

    /**
     * Get connection status and workspace info
     * @returns Promise with connection status
     */
    async getStatus(): Promise<{
      connected: boolean;
      team?: string;
      user?: string;
      error?: string;
    }> {
      if (!enabled) {
        return { connected: false, error: "Slack integration disabled" };
      }

      if (!client) {
        return { connected: false, error: "Slack token not configured" };
      }

      try {
        const result = await client.auth.test();

        if (!result.ok) {
          return {
            connected: false,
            error: `Slack API error: ${result.error}`,
          };
        }

        return {
          connected: true,
          team: result.team,
          user: result.user,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { connected: false, error: `Slack API error: ${errorMessage}` };
      }
    },
  };
}
