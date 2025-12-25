import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);
config();

const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/cloud-agents-backups';

const server = new Server(
  { name: 'backup-agent', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_backup',
      description: 'Erstellt ein Backup von Dateien oder Verzeichnissen',
      inputSchema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Quellpfad' },
          name: { type: 'string', description: 'Backup-Name (optional)' },
          compress: { type: 'boolean', description: 'Komprimieren (default: true)' },
        },
        required: ['source'],
      },
    },
    {
      name: 'restore_backup',
      description: 'Stellt ein Backup wieder her',
      inputSchema: {
        type: 'object',
        properties: {
          backupId: { type: 'string', description: 'Backup-ID oder Name' },
          destination: { type: 'string', description: 'Zielpfad (optional)' },
        },
        required: ['backupId'],
      },
    },
    {
      name: 'list_backups',
      description: 'Listet alle verfügbaren Backups',
      inputSchema: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Filter nach Name' },
          limit: { type: 'number', description: 'Max Anzahl' },
        },
      },
    },
    {
      name: 'delete_backup',
      description: 'Löscht ein Backup',
      inputSchema: {
        type: 'object',
        properties: {
          backupId: { type: 'string', description: 'Backup-ID oder Name' },
          confirm: { type: 'boolean', description: 'Bestätigung' },
        },
        required: ['backupId', 'confirm'],
      },
    },
    {
      name: 'schedule_backup',
      description: 'Plant ein regelmäßiges Backup',
      inputSchema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Quellpfad' },
          schedule: {
            type: 'string',
            enum: ['hourly', 'daily', 'weekly', 'monthly'],
            description: 'Zeitplan'
          },
          retention: { type: 'number', description: 'Aufbewahrung in Tagen' },
        },
        required: ['source', 'schedule'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Ensure backup directory exists
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  switch (name) {
    case 'create_backup': {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = args.name || path.basename(args.source as string);
      const backupFile = path.join(BACKUP_DIR, `${backupName}_${timestamp}.tar.gz`);

      try {
        const compress = args.compress !== false;
        if (compress) {
          await execAsync(`tar -czf "${backupFile}" -C "$(dirname "${args.source}")" "$(basename "${args.source}")"`);
        } else {
          await execAsync(`cp -r "${args.source}" "${backupFile.replace('.tar.gz', '')}"`);
        }

        const stats = await fs.stat(backupFile);
        return {
          content: [{
            type: 'text',
            text: `Backup erstellt!\n\nName: ${backupName}\nDatei: ${backupFile}\nGröße: ${(stats.size / 1024 / 1024).toFixed(2)} MB\nZeit: ${new Date().toISOString()}`,
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Backup fehlgeschlagen: ${error.message}`,
          }],
        };
      }
    }

    case 'restore_backup': {
      // TODO: Implement restore logic
      return {
        content: [{
          type: 'text',
          text: `[STUB] Restore von Backup: ${args.backupId}\nZiel: ${args.destination || 'original location'}`,
        }],
      };
    }

    case 'list_backups': {
      try {
        const files = await fs.readdir(BACKUP_DIR);
        const backups = files.filter(f => f.endsWith('.tar.gz') || !f.includes('.'));

        if (args.filter) {
          const filtered = backups.filter(b => b.includes(args.filter as string));
          return {
            content: [{
              type: 'text',
              text: `Backups (Filter: ${args.filter}):\n\n${filtered.join('\n') || 'Keine gefunden'}`,
            }],
          };
        }

        const limit = args.limit || 20;
        return {
          content: [{
            type: 'text',
            text: `Backups (${Math.min(backups.length, limit)} von ${backups.length}):\n\n${backups.slice(0, limit).join('\n') || 'Keine Backups vorhanden'}`,
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Fehler beim Auflisten: ${error.message}`,
          }],
        };
      }
    }

    case 'delete_backup': {
      if (!args.confirm) {
        return {
          content: [{
            type: 'text',
            text: 'Abgebrochen. Setze confirm: true um zu löschen.',
          }],
        };
      }

      try {
        const backupPath = path.join(BACKUP_DIR, args.backupId as string);
        await fs.rm(backupPath, { recursive: true });
        return {
          content: [{
            type: 'text',
            text: `Backup gelöscht: ${args.backupId}`,
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Löschen fehlgeschlagen: ${error.message}`,
          }],
        };
      }
    }

    case 'schedule_backup': {
      // TODO: Implement cron-based scheduling
      return {
        content: [{
          type: 'text',
          text: `[STUB] Backup geplant:\nQuelle: ${args.source}\nZeitplan: ${args.schedule}\nAufbewahrung: ${args.retention || 30} Tage`,
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
  console.error('Backup Agent MCP Server running...');
}

main().catch(console.error);
