import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuid } from 'uuid';
import { config } from 'dotenv';
import { Memory, MemoryType, RecallQuery } from './types.js';
import { remember, recall, forget, forgetAll } from './pinecone.js';

config();

const server = new Server(
  {
    name: 'memory-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'memory_remember',
      description: 'Speichert eine Erinnerung im Langzeitgedächtnis',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Was soll gespeichert werden' },
          type: {
            type: 'string',
            enum: ['conversation', 'decision', 'preference', 'learning', 'project', 'todo', 'error', 'solution'],
            description: 'Art der Erinnerung',
          },
          project: { type: 'string', description: 'Projekt-Name' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
          importance: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          security: { type: 'string', enum: ['public', 'internal', 'confidential', 'secret'] },
        },
        required: ['content', 'type'],
      },
    },
    {
      name: 'memory_recall',
      description: 'Durchsucht das Langzeitgedächtnis nach relevanten Erinnerungen',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Suchanfrage' },
          type: { type: 'string', description: 'Nur bestimmter Typ' },
          project: { type: 'string', description: 'Nur bestimmtes Projekt' },
          limit: { type: 'number', description: 'Max Ergebnisse' },
          securityLevel: { type: 'string', enum: ['public', 'internal', 'confidential', 'secret'] },
          accessKey: { type: 'string', description: 'Für secret Level' },
        },
        required: ['query'],
      },
    },
    {
      name: 'memory_forget',
      description: 'Löscht eine Erinnerung',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID der Erinnerung' },
        },
        required: ['id'],
      },
    },
    {
      name: 'memory_context',
      description: 'Lädt relevanten Kontext für eine Session',
      inputSchema: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'Projekt-Name' },
        },
        required: ['project'],
      },
    },
  ],
}));

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'memory_remember': {
      const memory: Memory = {
        id: uuid(),
        type: args.type as MemoryType,
        content: args.content as string,
        metadata: {
          project: args.project as string,
          tags: args.tags as string[],
          importance: args.importance as Memory['metadata']['importance'],
          timestamp: new Date().toISOString(),
          security: args.security as Memory['metadata']['security'],
        },
      };
      await remember(memory);
      return {
        content: [{ type: 'text', text: `Gespeichert: ${memory.id}` }],
      };
    }

    case 'memory_recall': {
      const query: RecallQuery = {
        query: args.query as string,
        type: args.type as MemoryType,
        project: args.project as string,
        limit: args.limit as number,
        securityLevel: args.securityLevel as RecallQuery['securityLevel'],
        accessKey: args.accessKey as string,
      };
      const results = await recall(query);
      return {
        content: [{
          type: 'text',
          text: results.length
            ? results.map(r => `[${r.score.toFixed(2)}] ${r.memory.type}: ${r.memory.content}`).join('\n\n')
            : 'Keine Erinnerungen gefunden',
        }],
      };
    }

    case 'memory_forget': {
      await forget(args.id as string);
      return {
        content: [{ type: 'text', text: `Gelöscht: ${args.id}` }],
      };
    }

    case 'memory_context': {
      const results = await recall({
        query: 'context decisions preferences todos recent',
        project: args.project as string,
        limit: 20,
      });
      return {
        content: [{
          type: 'text',
          text: results.length
            ? `Kontext für ${args.project}:\n\n` + results.map(r => `- ${r.memory.content}`).join('\n')
            : `Kein Kontext für ${args.project} gefunden`,
        }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Memory MCP Server running');
}

main().catch(console.error);
