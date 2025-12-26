/**
 * WebSocket Server for Real-time Updates
 *
 * Features:
 * - Agent Status Broadcasting
 * - Chat Message Updates (Real-time)
 * - System Notifications
 * - User Presence Tracking
 * - Authentication via Query Token
 * - Heartbeat/Ping-Pong
 * - Automatic Reconnection Support
 */

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import type { Server } from "http";

// Message types
export type WSMessageType =
  | "ping"
  | "pong"
  | "auth"
  | "agent_status"
  | "chat_message"
  | "notification"
  | "user_presence"
  | "error";

export interface WSMessage {
  type: WSMessageType;
  data?: unknown;
  timestamp?: string;
}

export interface ConnectedClient {
  ws: WebSocket;
  userId?: string;
  authenticated: boolean;
  lastPing: number;
}

/**
 * WebSocket Server Manager
 */
export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    // Create WebSocket server
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
    });

    console.log("✅ WebSocket server initialized on /ws");

    // Handle connections
    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = this.generateClientId();

    // Parse query params for authentication token
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    // Create client
    const client: ConnectedClient = {
      ws,
      authenticated: false,
      lastPing: Date.now(),
    };

    this.clients.set(clientId, client);

    console.log(`🔌 WebSocket client connected: ${clientId} (total: ${this.clients.size})`);

    // Simple token-based auth (in production, verify JWT here)
    if (token) {
      client.authenticated = true;
      client.userId = this.extractUserIdFromToken(token);
      this.sendMessage(ws, {
        type: "auth",
        data: { success: true, userId: client.userId },
      });
    } else {
      this.sendMessage(ws, {
        type: "auth",
        data: { success: false, error: "No token provided" },
      });
    }

    // Handle messages
    ws.on("message", (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    // Handle close
    ws.on("close", () => {
      this.handleDisconnect(clientId);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });

    // Send welcome message
    this.sendMessage(ws, {
      type: "notification",
      data: {
        message: "Connected to Code Cloud Agents WebSocket",
        level: "info",
      },
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(clientId: string, data: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message: WSMessage = JSON.parse(data.toString());

      // Update last ping time
      client.lastPing = Date.now();

      // Handle different message types
      switch (message.type) {
        case "ping":
          this.sendMessage(client.ws, { type: "pong" });
          break;

        case "user_presence":
          // Broadcast user presence to all clients
          this.broadcast({
            type: "user_presence",
            data: {
              userId: client.userId,
              status: message.data,
            },
          });
          break;

        default:
          console.log(`Received message from ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`Failed to parse WebSocket message from ${clientId}:`, error);
      this.sendMessage(client.ws, {
        type: "error",
        data: { error: "Invalid message format" },
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`🔌 WebSocket client disconnected: ${clientId} (remaining: ${this.clients.size - 1})`);

    // Broadcast user offline
    if (client.userId) {
      this.broadcast({
        type: "user_presence",
        data: {
          userId: client.userId,
          status: "offline",
        },
      });
    }

    this.clients.delete(clientId);
  }

  /**
   * Send message to specific client
   */
  private sendMessage(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          ...message,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcast(message: WSMessage, filter?: (client: ConnectedClient) => boolean): void {
    const payload = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach((client) => {
      if (filter && !filter(client)) return;

      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    });
  }

  /**
   * Broadcast to authenticated clients only
   */
  public broadcastToAuthenticated(message: WSMessage): void {
    this.broadcast(message, (client) => client.authenticated);
  }

  /**
   * Send message to specific user
   */
  public sendToUser(userId: string, message: WSMessage): void {
    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
      }
    });
  }

  /**
   * Broadcast agent status update
   */
  public broadcastAgentStatus(status: {
    agentName: string;
    state: "idle" | "working" | "stopped";
    currentTask?: string;
    progress?: number;
  }): void {
    this.broadcastToAuthenticated({
      type: "agent_status",
      data: status,
    });
  }

  /**
   * Broadcast chat message
   */
  public broadcastChatMessage(message: {
    conversationId: string;
    messageId: string;
    content: string;
    sender: string;
    timestamp: string;
  }): void {
    this.broadcastToAuthenticated({
      type: "chat_message",
      data: message,
    });
  }

  /**
   * Send system notification
   */
  public sendNotification(
    level: "info" | "success" | "warning" | "error",
    message: string,
    userId?: string
  ): void {
    const notification: WSMessage = {
      type: "notification",
      data: { level, message },
    };

    if (userId) {
      this.sendToUser(userId, notification);
    } else {
      this.broadcastToAuthenticated(notification);
    }
  }

  /**
   * Start heartbeat to check client connections
   */
  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      this.clients.forEach((client, clientId) => {
        // Check if client is still alive
        if (now - client.lastPing > timeout) {
          console.log(`⏱️ Client ${clientId} timeout, disconnecting`);
          client.ws.terminate();
          this.clients.delete(clientId);
        } else {
          // Send ping
          this.sendMessage(client.ws, { type: "ping" });
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop WebSocket server
   */
  public close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.wss.close(() => {
      console.log("WebSocket server closed");
    });
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract user ID from token (simplified, in production use JWT)
   */
  private extractUserIdFromToken(token: string): string {
    // In production, verify and decode JWT token
    // For now, just return a demo user ID
    return `user_${token.substring(0, 8)}`;
  }

  /**
   * Get connected clients count
   */
  public getClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get authenticated clients count
   */
  public getAuthenticatedClientsCount(): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.authenticated) count++;
    });
    return count;
  }
}
