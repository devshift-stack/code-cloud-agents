import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';

config();

interface AgentStatus {
  name: string;
  status: 'active' | 'paused' | 'stopped' | 'error';
  lastHeartbeat: Date;
  metrics: {
    tasksCompleted: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

// In-memory status tracking
const agentStatuses: Map<string, AgentStatus> = new Map();

const server = new Server(
  { name: 'monitoring-agent', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'health_check',
      description: 'Führt Health-Check für alle oder spezifische Agents durch',
      inputSchema: {
        type: 'object',
        properties: {
          agent: { type: 'string', description: 'Spezifischer Agent (optional)' },
        },
      },
    },
    {
      name: 'get_metrics',
      description: 'Holt Metriken für Agents',
      inputSchema: {
        type: 'object',
        properties: {
          agent: { type: 'string', description: 'Spezifischer Agent (optional)' },
          timeRange: {
            type: 'string',
            enum: ['1h', '24h', '7d', '30d'],
            description: 'Zeitraum'
          },
        },
      },
    },
    {
      name: 'set_alert',
      description: 'Setzt einen Alert für eine Metrik',
      inputSchema: {
        type: 'object',
        properties: {
          agent: { type: 'string', description: 'Agent Name' },
          metric: {
            type: 'string',
            enum: ['error_rate', 'response_time', 'task_queue'],
            description: 'Metrik'
          },
          threshold: { type: 'number', description: 'Schwellwert' },
          action: {
            type: 'string',
            enum: ['notify', 'pause', 'restart'],
            description: 'Aktion bei Überschreitung'
          },
        },
        required: ['agent', 'metric', 'threshold', 'action'],
      },
    },
    {
      name: 'get_logs',
      description: 'Holt Logs für einen Agent',
      inputSchema: {
        type: 'object',
        properties: {
          agent: { type: 'string', description: 'Agent Name' },
          level: {
            type: 'string',
            enum: ['debug', 'info', 'warn', 'error'],
            description: 'Log Level Filter'
          },
          limit: { type: 'number', description: 'Max Einträge' },
        },
        required: ['agent'],
      },
    },
    {
      name: 'register_heartbeat',
      description: 'Registriert einen Heartbeat von einem Agent',
      inputSchema: {
        type: 'object',
        properties: {
          agent: { type: 'string', description: 'Agent Name' },
          status: {
            type: 'string',
            enum: ['active', 'paused', 'stopped'],
            description: 'Status'
          },
          metrics: {
            type: 'object',
            properties: {
              tasksCompleted: { type: 'number' },
              errorRate: { type: 'number' },
              avgResponseTime: { type: 'number' },
            },
          },
        },
        required: ['agent', 'status'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'health_check': {
      if (args.agent) {
        const status = agentStatuses.get(args.agent as string);
        if (!status) {
          return {
            content: [{
              type: 'text',
              text: `Agent "${args.agent}" nicht gefunden oder noch kein Heartbeat registriert.`,
            }],
          };
        }
        const timeSinceHeartbeat = Date.now() - status.lastHeartbeat.getTime();
        const isHealthy = timeSinceHeartbeat < 60000; // 1 minute
        return {
          content: [{
            type: 'text',
            text: `Health Check: ${args.agent}\n\nStatus: ${status.status}\nHealthy: ${isHealthy ? '✅' : '❌'}\nLast Heartbeat: ${Math.round(timeSinceHeartbeat / 1000)}s ago`,
          }],
        };
      }

      // All agents
      const results: string[] = ['Health Check - Alle Agents\n'];
      for (const [name, status] of agentStatuses) {
        const timeSinceHeartbeat = Date.now() - status.lastHeartbeat.getTime();
        const isHealthy = timeSinceHeartbeat < 60000;
        results.push(`${isHealthy ? '✅' : '❌'} ${name}: ${status.status}`);
      }

      if (agentStatuses.size === 0) {
        results.push('Keine Agents registriert.');
      }

      return {
        content: [{
          type: 'text',
          text: results.join('\n'),
        }],
      };
    }

    case 'get_metrics': {
      const timeRange = args.timeRange || '24h';
      // TODO: Implement actual metrics collection
      return {
        content: [{
          type: 'text',
          text: `[STUB] Metriken für ${args.agent || 'alle Agents'}\nZeitraum: ${timeRange}\n\nTasks: 150\nErrors: 3 (2%)\nAvg Response: 1.2s`,
        }],
      };
    }

    case 'set_alert': {
      // TODO: Implement alert system
      return {
        content: [{
          type: 'text',
          text: `Alert gesetzt:\nAgent: ${args.agent}\nMetrik: ${args.metric}\nSchwellwert: ${args.threshold}\nAktion: ${args.action}`,
        }],
      };
    }

    case 'get_logs': {
      // TODO: Implement log retrieval
      return {
        content: [{
          type: 'text',
          text: `[STUB] Logs für ${args.agent}\nLevel: ${args.level || 'all'}\nLimit: ${args.limit || 100}`,
        }],
      };
    }

    case 'register_heartbeat': {
      const status: AgentStatus = {
        name: args.agent as string,
        status: args.status as AgentStatus['status'],
        lastHeartbeat: new Date(),
        metrics: (args.metrics as AgentStatus['metrics']) || {
          tasksCompleted: 0,
          errorRate: 0,
          avgResponseTime: 0,
        },
      };
      agentStatuses.set(args.agent as string, status);
      return {
        content: [{
          type: 'text',
          text: `Heartbeat registriert für: ${args.agent}`,
        }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Monitoring Agent MCP Server running...');
}

main().catch(console.error);
