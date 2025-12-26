# 🔌 WebSocket Real-time Communication

## Overview

The Code Cloud Agents system includes a WebSocket server for real-time bidirectional communication between the server and clients (frontend, CLI, etc.).

## Connection

### URL
```
ws://localhost:3000/ws?token=YOUR_AUTH_TOKEN
```

### Authentication
Include your authentication token as a query parameter:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws?token=abc123');
```

**Note:** In production, use proper JWT tokens. The current implementation uses simplified token-based auth for development.

---

## Message Format

All messages are JSON objects with the following structure:

```typescript
interface WSMessage {
  type: string;           // Message type
  data?: any;            // Message payload
  timestamp?: string;    // ISO 8601 timestamp (added by server)
}
```

---

## Message Types

### 1. Authentication (`auth`)

**Direction:** Server → Client

Sent immediately after connection to confirm authentication status.

```json
{
  "type": "auth",
  "data": {
    "success": true,
    "userId": "user_abc123"
  },
  "timestamp": "2025-12-26T13:00:00.000Z"
}
```

---

### 2. Ping/Pong (`ping`, `pong`)

**Direction:** Bidirectional

Keep-alive mechanism to maintain connection.

**Client sends:**
```json
{
  "type": "ping"
}
```

**Server responds:**
```json
{
  "type": "pong",
  "timestamp": "2025-12-26T13:00:00.000Z"
}
```

**Auto-Heartbeat:**
- Server sends `ping` every 30 seconds
- Client should respond with `pong` or send own `ping`
- Clients that don't respond within 60 seconds are disconnected

---

### 3. Agent Status (`agent_status`)

**Direction:** Server → Client

Real-time updates about agent state and progress.

```json
{
  "type": "agent_status",
  "data": {
    "agentName": "CLOUD_ASSISTANT",
    "state": "working",
    "currentTask": "Processing webhook event",
    "progress": 45
  },
  "timestamp": "2025-12-26T13:00:00.000Z"
}
```

**Agent States:**
- `idle` - Agent is ready for work
- `working` - Agent is processing a task
- `stopped` - Agent has stopped (e.g., STOP decision)

---

### 4. Chat Message (`chat_message`)

**Direction:** Server → Client

Real-time chat message updates for active conversations.

```json
{
  "type": "chat_message",
  "data": {
    "conversationId": "conv-123",
    "messageId": "msg-456",
    "content": "Task completed successfully!",
    "sender": "ENGINEERING_LEAD_SUPERVISOR",
    "timestamp": "2025-12-26T13:00:00.000Z"
  },
  "timestamp": "2025-12-26T13:00:00.000Z"
}
```

---

### 5. Notification (`notification`)

**Direction:** Server → Client

System notifications (info, success, warning, error).

```json
{
  "type": "notification",
  "data": {
    "level": "success",
    "message": "All tests passed!"
  },
  "timestamp": "2025-12-26T13:00:00.000Z"
}
```

**Notification Levels:**
- `info` - Informational message
- `success` - Success message
- `warning` - Warning message
- `error` - Error message

---

### 6. User Presence (`user_presence`)

**Direction:** Bidirectional

Track user online/offline status.

**Client sends:**
```json
{
  "type": "user_presence",
  "data": "online"
}
```

**Server broadcasts:**
```json
{
  "type": "user_presence",
  "data": {
    "userId": "user_abc123",
    "status": "online"
  },
  "timestamp": "2025-12-26T13:00:00.000Z"
}
```

**Presence Status:**
- `online` - User is active
- `away` - User is idle
- `busy` - User is busy (do not disturb)
- `offline` - User disconnected

---

### 7. Error (`error`)

**Direction:** Server → Client

Error messages from the server.

```json
{
  "type": "error",
  "data": {
    "error": "Invalid message format"
  },
  "timestamp": "2025-12-26T13:00:00.000Z"
}
```

---

## Client Implementation

### Browser (JavaScript)

```javascript
class CloudAgentsWebSocket {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this.reconnectDelay = 5000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`ws://localhost:3000/ws?token=${this.token}`);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleMessage(message) {
    switch (message.type) {
      case 'agent_status':
        this.onAgentStatus(message.data);
        break;
      case 'chat_message':
        this.onChatMessage(message.data);
        break;
      case 'notification':
        this.onNotification(message.data);
        break;
      case 'user_presence':
        this.onUserPresence(message.data);
        break;
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  reconnect() {
    clearInterval(this.heartbeatInterval);
    setTimeout(() => {
      console.log('🔄 Reconnecting...');
      this.connect();
    }, this.reconnectDelay);
  }

  send(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  setPresence(status) {
    this.send({
      type: 'user_presence',
      data: status
    });
  }

  // Override these in your app
  onAgentStatus(data) { console.log('Agent status:', data); }
  onChatMessage(data) { console.log('Chat message:', data); }
  onNotification(data) { console.log('Notification:', data); }
  onUserPresence(data) { console.log('User presence:', data); }

  close() {
    clearInterval(this.heartbeatInterval);
    this.ws.close();
  }
}

// Usage
const client = new CloudAgentsWebSocket('your-token-here');

// Custom handlers
client.onAgentStatus = (data) => {
  document.getElementById('agent-status').innerText = data.state;
};

client.onNotification = (data) => {
  showToast(data.level, data.message);
};
```

---

### React Hook

```typescript
import { useEffect, useState, useRef } from 'react';

interface AgentStatus {
  agentName: string;
  state: 'idle' | 'working' | 'stopped';
  currentTask?: string;
  progress?: number;
}

interface Notification {
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export function useWebSocket(token: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'agent_status':
          setAgentStatus(message.data);
          break;
        case 'notification':
          setNotifications(prev => [...prev, message.data]);
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [token]);

  const sendPresence = (status: string) => {
    wsRef.current?.send(JSON.stringify({
      type: 'user_presence',
      data: status
    }));
  };

  return {
    isConnected,
    agentStatus,
    notifications,
    sendPresence
  };
}

// Usage in component
function Dashboard() {
  const { isConnected, agentStatus, notifications } = useWebSocket('your-token');

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      <div>Agent: {agentStatus?.state}</div>
      {notifications.map((n, i) => (
        <div key={i} className={`alert-${n.level}`}>{n.message}</div>
      ))}
    </div>
  );
}
```

---

### Node.js Client

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws?token=test-token');

ws.on('open', () => {
  console.log('✅ Connected');

  // Send presence
  ws.send(JSON.stringify({
    type: 'user_presence',
    data: 'online'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('📨', message);
});

ws.on('close', () => {
  console.log('🔌 Disconnected');
});
```

---

## Server-Side Broadcasting

From backend code, access the global `wsManager` to broadcast messages:

```typescript
// Get WebSocket manager
const wsManager = (global as any).wsManager;

// Broadcast agent status to all authenticated clients
wsManager.broadcastAgentStatus({
  agentName: 'CLOUD_ASSISTANT',
  state: 'working',
  currentTask: 'Analyzing code',
  progress: 50
});

// Broadcast chat message
wsManager.broadcastChatMessage({
  conversationId: 'conv-123',
  messageId: 'msg-456',
  content: 'Analysis complete!',
  sender: 'CLOUD_ASSISTANT',
  timestamp: new Date().toISOString()
});

// Send notification to all users
wsManager.sendNotification('success', 'All tests passed!');

// Send notification to specific user
wsManager.sendNotification('error', 'Task failed', 'user-123');
```

---

## Security

### Authentication
- Tokens should be JWT in production
- Current implementation uses simplified token auth for development
- Token is validated on connection
- Unauthenticated clients can connect but won't receive sensitive updates

### Best Practices
1. **Always use WSS (WebSocket Secure) in production**
   ```
   wss://your-domain.com/ws?token=...
   ```

2. **Implement proper JWT verification**
   - Verify signature
   - Check expiration
   - Validate claims

3. **Rate limiting**
   - Limit messages per client
   - Disconnect abusive clients

4. **Message validation**
   - Validate message structure
   - Sanitize user input

---

## Troubleshooting

### Connection Issues

**Problem:** "Connection failed"
```
Solution: Check that the server is running and WebSocket port is open
```

**Problem:** "Disconnects frequently"
```
Solution: Ensure ping/pong heartbeat is working. Check network stability.
```

### Authentication Issues

**Problem:** "Auth failed"
```
Solution: Check token format and validity. Verify token is passed in URL query.
```

### Message Delivery

**Problem:** "Not receiving messages"
```
Solution: Check that client is authenticated. Verify message filters.
```

---

## Monitoring

### Server Metrics

```typescript
// Get connection statistics
const totalClients = wsManager.getClientsCount();
const authenticatedClients = wsManager.getAuthenticatedClientsCount();

console.log(`Connected: ${totalClients}, Authenticated: ${authenticatedClients}`);
```

---

## Testing

### Manual Testing with wscat

Install wscat:
```bash
npm install -g wscat
```

Connect and test:
```bash
# Connect
wscat -c "ws://localhost:3000/ws?token=test-123"

# Send ping
> {"type":"ping"}

# Send presence
> {"type":"user_presence","data":"online"}
```

---

## Examples

See `/src/websocket/client-example.ts` for complete implementation examples.

---

**Last Updated:** 2025-12-26
**Version:** 1.0.0

🤖 Generated with Claude Code
