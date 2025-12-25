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

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'remember',
      description: 'Speichert eine Erinnerung in der Vector DB. Nutze dies für wichtige Entscheidungen, User-Präferenzen, Learnings, und Projekt-Kontext.',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Der Inhalt der Erinnerung',
          },
          type: {
            type: 'string',
            enum: ['conversation', 'decision', 'preference', 'learning', 'project', 'todo', 'error', 'solution'],
            description: 'Art der Erinnerung',
          },
          project: {
            type: 'string',
            description: 'Projekt-Name (optional, default: global)',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tags für die Erinnerung',
          },
          importance: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Wichtigkeit (default: medium)',
          },
        },
        required: ['content', 'type'],
      },
    },
    {
      name: 'recall',
      description: 'Sucht nach relevanten Erinnerungen. Nutze dies am Anfang jeder Session und wenn du Kontext brauchst.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Suchanfrage (semantisch)',
          },
          type: {
            type: 'string',
            enum: ['conversation', 'decision', 'preference', 'learning', 'project', 'todo', 'error', 'solution'],
            description: 'Filter nach Typ (optional)',
          },
          project: {
            type: 'string',
            description: 'Filter nach Projekt (optional)',
          },
          limit: {
            type: 'number',
            description: 'Max Ergebnisse (default: 10)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'forget',
      description: 'Löscht eine spezifische Erinnerung',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID der Erinnerung',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'forget_all',
      description: 'Löscht alle Erinnerungen (optional: nur für ein Projekt)',
      inputSchema: {
        type: 'object',
        properties: {
          project: {
            type: 'string',
            description: 'Projekt-Name (optional - wenn leer, wird ALLES gelöscht)',
          },
          confirm: {
            type: 'boolean',
            description: 'Muss true sein um zu löschen',
          },
        },
        required: ['confirm'],
      },
    },
    {
      name: 'recall_context',
      description: 'Lädt den kompletten Kontext für eine Session: User-Präferenzen, aktuelle Projekte, offene Todos',
      inputSchema: {
        type: 'object',
        properties: {
          project: {
            type: 'string',
            description: 'Aktuelles Projekt (optional)',
          },
        },
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'remember': {
      const memory: Memory = {
        id: uuid(),
        type: args.type as MemoryType,
        content: args.content as string,
        metadata: {
          project: args.project as string || 'global',
          tags: args.tags as string[],
          importance: args.importance as Memory['metadata']['importance'] || 'medium',
          timestamp: new Date().toISOString(),
        },
      };

      await remember(memory);

      return {
        content: [
          {
            type: 'text',
            text: `Erinnerung gespeichert: [${memory.type}] ${memory.content.substring(0, 100)}...`,
          },
        ],
      };
    }

    case 'recall': {
      const query: RecallQuery = {
        query: args.query as string,
        type: args.type as MemoryType,
        project: args.project as string,
        limit: args.limit as number,
      };

      const results = await recall(query);

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'Keine relevanten Erinnerungen gefunden.',
            },
          ],
        };
      }

      const formatted = results
        .map((r, i) => `${i + 1}. [${r.memory.type}] (${Math.round(r.score * 100)}% relevant)\n   ${r.memory.content}\n   Tags: ${r.memory.metadata.tags?.join(', ') || 'keine'}`)
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `Gefundene Erinnerungen:\n\n${formatted}`,
          },
        ],
      };
    }

    case 'forget': {
      await forget(args.id as string);
      return {
        content: [
          {
            type: 'text',
            text: `Erinnerung ${args.id} gelöscht.`,
          },
        ],
      };
    }

    case 'forget_all': {
      if (!args.confirm) {
        return {
          content: [
            {
              type: 'text',
              text: 'Abgebrochen. Setze confirm: true um zu löschen.',
            },
          ],
        };
      }

      await forgetAll(args.project as string);
      return {
        content: [
          {
            type: 'text',
            text: args.project
              ? `Alle Erinnerungen für Projekt "${args.project}" gelöscht.`
              : 'ALLE Erinnerungen gelöscht.',
          },
        ],
      };
    }

    case 'recall_context': {
      const project = args.project as string;

      // Lade verschiedene Kontext-Typen parallel
      const [preferences, decisions, todos, learnings] = await Promise.all([
        recall({ query: 'user preferences settings', type: 'preference', limit: 5 }),
        recall({ query: 'decisions architecture', type: 'decision', project, limit: 5 }),
        recall({ query: 'open todos tasks', type: 'todo', project, limit: 10 }),
        recall({ query: 'learnings what works', type: 'learning', project, limit: 5 }),
      ]);

      let context = '## Session-Kontext\n\n';

      if (preferences.length > 0) {
        context += '### User-Präferenzen\n';
        context += preferences.map(p => `- ${p.memory.content}`).join('\n');
        context += '\n\n';
      }

      if (decisions.length > 0) {
        context += '### Entscheidungen\n';
        context += decisions.map(d => `- ${d.memory.content}`).join('\n');
        context += '\n\n';
      }

      if (todos.length > 0) {
        context += '### Offene Todos\n';
        context += todos.map(t => `- ${t.memory.content}`).join('\n');
        context += '\n\n';
      }

      if (learnings.length > 0) {
        context += '### Learnings\n';
        context += learnings.map(l => `- ${l.memory.content}`).join('\n');
        context += '\n\n';
      }

      return {
        content: [
          {
            type: 'text',
            text: context || 'Noch keine Erinnerungen gespeichert.',
          },
        ],
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
  console.error('Memory MCP Server running...');
}

main().catch(console.error);
