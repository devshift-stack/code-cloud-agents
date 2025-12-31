/**
 * Live Updates - WebSocket integration for real-time agent activity
 * Broadcasts task and agent events to all connected clients
 */

import type { WebSocketServer, WebSocket } from 'ws';
import { taskQueue } from './task-queue.ts';
import { agentWorker } from './agent-worker.ts';

interface LiveMessage {
  type: string;
  data: unknown;
  timestamp: string;
}

let wss: WebSocketServer | null = null;

/**
 * Broadcast message to all connected clients
 */
function broadcast(message: LiveMessage) {
  if (!wss) return;

  const data = JSON.stringify(message);

  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  });
}

/**
 * Initialize live updates with WebSocket server
 */
export function initializeLiveUpdates(wsServer: WebSocketServer) {
  wss = wsServer;
  console.log('[LiveUpdates] Initializing...');

  // Subscribe to task queue events
  taskQueue.on('task:created', (task) => {
    broadcast({
      type: 'task:created',
      data: task,
      timestamp: new Date().toISOString()
    });
  });

  taskQueue.on('task:assigned', ({ task, agent }) => {
    broadcast({
      type: 'task:assigned',
      data: { taskId: task.id, title: task.title, agent },
      timestamp: new Date().toISOString()
    });
  });

  taskQueue.on('task:started', (task) => {
    broadcast({
      type: 'task:started',
      data: { taskId: task.id, title: task.title, agent: task.assignedAgent },
      timestamp: new Date().toISOString()
    });
  });

  taskQueue.on('task:progress', ({ task, progress, message }) => {
    broadcast({
      type: 'task:progress',
      data: { taskId: task.id, title: task.title, progress, message },
      timestamp: new Date().toISOString()
    });
  });

  taskQueue.on('task:completed', (task) => {
    broadcast({
      type: 'task:completed',
      data: { taskId: task.id, title: task.title, result: task.result?.substring(0, 200) },
      timestamp: new Date().toISOString()
    });
  });

  taskQueue.on('task:failed', ({ task, error }) => {
    broadcast({
      type: 'task:failed',
      data: { taskId: task.id, title: task.title, error },
      timestamp: new Date().toISOString()
    });
  });

  taskQueue.on('task:code', ({ task, file }) => {
    broadcast({
      type: 'task:code',
      data: { taskId: task.id, file: { path: file.path, language: file.language } },
      timestamp: new Date().toISOString()
    });
  });

  taskQueue.on('subtask:completed', ({ task, subtask }) => {
    broadcast({
      type: 'subtask:completed',
      data: { taskId: task.id, subtaskId: subtask.id, subtaskTitle: subtask.title },
      timestamp: new Date().toISOString()
    });
  });

  // Subscribe to agent worker events
  agentWorker.on('worker:started', () => {
    broadcast({
      type: 'worker:started',
      data: { status: 'running' },
      timestamp: new Date().toISOString()
    });
  });

  agentWorker.on('worker:stopped', () => {
    broadcast({
      type: 'worker:stopped',
      data: { status: 'stopped' },
      timestamp: new Date().toISOString()
    });
  });

  agentWorker.on('progress', ({ task, progress, message }) => {
    broadcast({
      type: 'agent:progress',
      data: { taskId: task.id, progress, message },
      timestamp: new Date().toISOString()
    });
  });

  // Handle new WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    console.log('[LiveUpdates] Client connected');

    // Send current status on connect
    const status = {
      type: 'status',
      data: {
        worker: agentWorker.getStatus(),
        tasks: taskQueue.getStats(),
        allTasks: taskQueue.getAllTasks().slice(0, 10)
      },
      timestamp: new Date().toISOString()
    };
    ws.send(JSON.stringify(status));

    ws.on('close', () => {
      console.log('[LiveUpdates] Client disconnected');
    });
  });

  console.log('[LiveUpdates] Initialized successfully');
}
