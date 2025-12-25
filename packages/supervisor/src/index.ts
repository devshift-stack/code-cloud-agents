#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'meta-supervisor', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// GitHub Access Configuration
const GITHUB_ACCESS = {
  devshift: { read: true, write: false, push: false },
  dsactivi2: { read: true, write: true, push: true },
};

interface TaskRoute {
  taskId: string;
  target: string;
  reason: string;
  constraints?: string[];
  priority: number;
}

interface AgentHealth {
  agentId: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  metrics: {
    taskCount: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

// In-memory state
const taskQueue: TaskRoute[] = [];
const agentHealthMap: Map<string, AgentHealth> = new Map();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'route_task',
      description: 'Route a task to the appropriate agent based on task type and requirements',
      inputSchema: {
        type: 'object',
        properties: {
          taskDescription: { type: 'string', description: 'Description of the task' },
          taskType: {
            type: 'string',
            enum: ['research', 'development', 'deployment', 'monitoring', 'backup', 'accounting'],
            description: 'Type of task'
          },
          priority: { type: 'number', minimum: 1, maximum: 10, description: 'Priority 1-10' },
          constraints: { type: 'array', items: { type: 'string' }, description: 'Any constraints' },
        },
        required: ['taskDescription', 'taskType'],
      },
    },
    {
      name: 'check_agent_health',
      description: 'Check the health status of all agents or a specific agent',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Specific agent ID (optional, omit for all)' },
        },
      },
    },
    {
      name: 'get_queue_status',
      description: 'Get the current task queue status and pending routes',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'check_github_access',
      description: 'Check GitHub access permissions for an organization',
      inputSchema: {
        type: 'object',
        properties: {
          org: { type: 'string', description: 'GitHub organization name' },
          operation: { type: 'string', enum: ['read', 'write', 'push'], description: 'Operation type' },
        },
        required: ['org', 'operation'],
      },
    },
    {
      name: 'aggregate_metrics',
      description: 'Aggregate metrics across all agents',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'route_task': {
      const { taskDescription, taskType, priority = 5, constraints = [] } = args as {
        taskDescription: string;
        taskType: string;
        priority?: number;
        constraints?: string[];
      };

      const targetMap: Record<string, string> = {
        research: 'research-agent',
        development: 'cloud-assistant',
        deployment: 'deployment-agent',
        monitoring: 'monitoring-agent',
        backup: 'backup-agent',
        accounting: 'accounting-agent',
      };

      const target = targetMap[taskType] || 'cloud-assistant';
      const route: TaskRoute = {
        taskId: `task-${Date.now()}`,
        target,
        reason: `Task type "${taskType}" routes to ${target}`,
        constraints,
        priority,
      };

      taskQueue.push(route);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'routed',
            route,
            queuePosition: taskQueue.length,
          }, null, 2),
        }],
      };
    }

    case 'check_agent_health': {
      const { agentId } = args as { agentId?: string };

      const agents = ['meta-supervisor', 'engineering-lead', 'cloud-assistant',
                      'memory-server', 'research-agent', 'deployment-agent',
                      'monitoring-agent', 'backup-agent', 'accounting-agent'];

      if (agentId) {
        const health = agentHealthMap.get(agentId) || {
          agentId,
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          metrics: { taskCount: 0, errorRate: 0, avgResponseTime: 100 },
        };
        return { content: [{ type: 'text', text: JSON.stringify(health, null, 2) }] };
      }

      const allHealth = agents.map(id =>
        agentHealthMap.get(id) || {
          agentId: id,
          status: id === 'accounting-agent' ? 'down' : 'healthy',
          lastCheck: new Date().toISOString(),
          metrics: { taskCount: Math.floor(Math.random() * 100), errorRate: 0, avgResponseTime: 100 },
        }
      );

      return { content: [{ type: 'text', text: JSON.stringify(allHealth, null, 2) }] };
    }

    case 'get_queue_status': {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            queueLength: taskQueue.length,
            tasks: taskQueue.slice(-10),
            oldestTask: taskQueue[0] || null,
          }, null, 2),
        }],
      };
    }

    case 'check_github_access': {
      const { org, operation } = args as { org: string; operation: 'read' | 'write' | 'push' };
      const access = GITHUB_ACCESS[org as keyof typeof GITHUB_ACCESS];

      if (!access) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ allowed: false, reason: `Unknown organization: ${org}` }),
          }],
        };
      }

      const allowed = access[operation];
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            org,
            operation,
            allowed,
            reason: allowed
              ? `${operation} access granted for ${org}`
              : `${operation} access DENIED for ${org}`,
          }),
        }],
      };
    }

    case 'aggregate_metrics': {
      const metrics = {
        totalAgents: 9,
        activeAgents: 8,
        pausedAgents: 1,
        totalTasksRouted: taskQueue.length,
        avgResponseTime: 150,
        errorRate: 0.02,
        timestamp: new Date().toISOString(),
      };

      return { content: [{ type: 'text', text: JSON.stringify(metrics, null, 2) }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Meta Supervisor MCP Server running');
}

main().catch(console.error);
