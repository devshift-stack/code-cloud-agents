/**
 * WebSocket Client Example
 *
 * This file demonstrates how to connect to and use the WebSocket server
 * from a frontend application or Node.js client.
 */

/**
 * Browser WebSocket Client Example
 */
export function createWebSocketClient(token: string) {
  const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

  // Connection opened
  ws.addEventListener("open", () => {
    console.log("✅ WebSocket connected");

    // Send ping to keep connection alive
    setInterval(() => {
      ws.send(JSON.stringify({ type: "ping" }));
    }, 30000);
  });

  // Listen for messages
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case "auth":
        console.log("🔐 Authentication:", message.data);
        break;

      case "pong":
        // Pong received, connection alive
        break;

      case "agent_status":
        console.log("🤖 Agent Status Update:", message.data);
        // Update UI with agent status
        // Example: updateAgentStatusUI(message.data)
        break;

      case "chat_message":
        console.log("💬 New Chat Message:", message.data);
        // Update chat UI
        // Example: appendChatMessage(message.data)
        break;

      case "notification":
        console.log("🔔 Notification:", message.data);
        // Show notification to user
        // Example: showNotification(message.data.level, message.data.message)
        break;

      case "user_presence":
        console.log("👤 User Presence:", message.data);
        // Update user presence indicator
        // Example: updateUserPresence(message.data.userId, message.data.status)
        break;

      case "error":
        console.error("❌ WebSocket Error:", message.data);
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  });

  // Connection closed
  ws.addEventListener("close", () => {
    console.log("🔌 WebSocket disconnected");
    // Attempt to reconnect after 5 seconds
    setTimeout(() => {
      console.log("🔄 Reconnecting...");
      createWebSocketClient(token);
    }, 5000);
  });

  // Error handling
  ws.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });

  return {
    ws,

    // Send user presence update
    sendPresence(status: "online" | "away" | "busy" | "offline") {
      ws.send(
        JSON.stringify({
          type: "user_presence",
          data: status,
        })
      );
    },

    // Close connection
    close() {
      ws.close();
    },
  };
}

/**
 * React Hook Example
 */
export function useWebSocket(token: string) {
  // In a real React app:
  /*
  import { useEffect, useState } from 'react';

  const [agentStatus, setAgentStatus] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const client = createWebSocketClient(token);
    setIsConnected(true);

    // Override message handler
    client.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'agent_status') {
        setAgentStatus(message.data);
      } else if (message.type === 'notification') {
        setNotifications(prev => [...prev, message.data]);
      }
    });

    client.ws.addEventListener('close', () => {
      setIsConnected(false);
    });

    return () => {
      client.close();
    };
  }, [token]);

  return { agentStatus, notifications, isConnected };
  */
}

/**
 * Node.js Client Example (for testing)
 */
export async function testNodeJSClient() {
  // Install: npm install ws
  const WebSocket = require("ws");

  const ws = new WebSocket("ws://localhost:3000/ws?token=test-token-123");

  ws.on("open", () => {
    console.log("✅ Connected to WebSocket server");

    // Send a test message
    ws.send(
      JSON.stringify({
        type: "user_presence",
        data: "online",
      })
    );
  });

  ws.on("message", (data: string) => {
    const message = JSON.parse(data);
    console.log("📨 Received:", message);
  });

  ws.on("close", () => {
    console.log("🔌 Connection closed");
  });

  ws.on("error", (error: Error) => {
    console.error("❌ Error:", error);
  });
}

/**
 * Server-Side Broadcasting Example
 *
 * From your backend code, you can access the WebSocket manager
 * and broadcast messages to all connected clients.
 */
export function serverBroadcastExamples() {
  // Access global wsManager (set in src/index.ts)
  const wsManager = (global as typeof global & { wsManager?: unknown }).wsManager;

  if (!wsManager || typeof wsManager !== "object") {
    console.warn("WebSocket manager not available");
    return;
  }

  // Type assertion for TypeScript
  const ws = wsManager as {
    broadcastAgentStatus: (status: unknown) => void;
    broadcastChatMessage: (message: unknown) => void;
    sendNotification: (level: string, message: string, userId?: string) => void;
  };

  // Example 1: Broadcast agent status change
  ws.broadcastAgentStatus({
    agentName: "CLOUD_ASSISTANT",
    state: "working",
    currentTask: "Processing webhook event",
    progress: 45,
  });

  // Example 2: Broadcast new chat message
  ws.broadcastChatMessage({
    conversationId: "conv-123",
    messageId: "msg-456",
    content: "Task completed successfully!",
    sender: "ENGINEERING_LEAD_SUPERVISOR",
    timestamp: new Date().toISOString(),
  });

  // Example 3: Send notification to all users
  ws.sendNotification("success", "All tests passed!");

  // Example 4: Send notification to specific user
  ws.sendNotification("error", "Your task failed", "user_123");
}
