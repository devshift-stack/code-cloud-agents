import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
config();

const server = new Server(
  { name: 'deployment-agent', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'build',
      description: 'Baut das Projekt (npm run build)',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Projekt-Pfad' },
          command: { type: 'string', description: 'Build-Command (default: npm run build)' },
        },
        required: ['path'],
      },
    },
    {
      name: 'deploy',
      description: 'Deployed das Projekt zu einer Umgebung',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Projekt-Pfad' },
          environment: {
            type: 'string',
            enum: ['development', 'staging', 'production'],
            description: 'Zielumgebung'
          },
          dryRun: { type: 'boolean', description: 'Nur simulieren' },
        },
        required: ['path', 'environment'],
      },
    },
    {
      name: 'rollback',
      description: 'Rollt auf eine vorherige Version zurück',
      inputSchema: {
        type: 'object',
        properties: {
          environment: { type: 'string', description: 'Umgebung' },
          version: { type: 'string', description: 'Ziel-Version (oder "previous")' },
        },
        required: ['environment'],
      },
    },
    {
      name: 'status',
      description: 'Zeigt Deployment-Status aller Umgebungen',
      inputSchema: {
        type: 'object',
        properties: {
          environment: { type: 'string', description: 'Spezifische Umgebung (optional)' },
        },
      },
    },
    {
      name: 'pre_deploy_check',
      description: 'Führt Pre-Deploy Checkliste aus',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Projekt-Pfad' },
        },
        required: ['path'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'build': {
      try {
        const cmd = args.command || 'npm run build';
        const { stdout, stderr } = await execAsync(cmd, { cwd: args.path as string });
        return {
          content: [{
            type: 'text',
            text: `Build erfolgreich!\n\nOutput:\n${stdout}\n${stderr ? `Warnings:\n${stderr}` : ''}`,
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Build fehlgeschlagen!\n\nError:\n${error.message}\n${error.stderr || ''}`,
          }],
        };
      }
    }

    case 'deploy': {
      if (args.dryRun) {
        return {
          content: [{
            type: 'text',
            text: `[DRY RUN] Deploy zu ${args.environment}\nPfad: ${args.path}\n\nKeine Änderungen vorgenommen.`,
          }],
        };
      }
      // TODO: Implement actual deployment (Vercel, AWS, etc.)
      return {
        content: [{
          type: 'text',
          text: `[STUB] Deploy zu ${args.environment}\nPfad: ${args.path}`,
        }],
      };
    }

    case 'rollback': {
      const version = args.version || 'previous';
      // TODO: Implement rollback logic
      return {
        content: [{
          type: 'text',
          text: `[STUB] Rollback in ${args.environment} zu Version: ${version}`,
        }],
      };
    }

    case 'status': {
      // TODO: Implement status check for deployment platforms
      return {
        content: [{
          type: 'text',
          text: `[STUB] Deployment Status\n\nDevelopment: ✅ v1.2.3\nStaging: ✅ v1.2.3\nProduction: ✅ v1.2.2`,
        }],
      };
    }

    case 'pre_deploy_check': {
      try {
        const checks: string[] = [];

        // Check build
        try {
          await execAsync('npm run build', { cwd: args.path as string });
          checks.push('✅ Build erfolgreich');
        } catch {
          checks.push('❌ Build fehlgeschlagen');
        }

        // Check tests
        try {
          await execAsync('npm test', { cwd: args.path as string });
          checks.push('✅ Tests bestanden');
        } catch {
          checks.push('⚠️ Tests fehlgeschlagen oder nicht vorhanden');
        }

        // Check TypeScript
        try {
          await execAsync('npx tsc --noEmit', { cwd: args.path as string });
          checks.push('✅ TypeScript OK');
        } catch {
          checks.push('⚠️ TypeScript Fehler');
        }

        return {
          content: [{
            type: 'text',
            text: `Pre-Deploy Check:\n\n${checks.join('\n')}`,
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Pre-Deploy Check fehlgeschlagen: ${error.message}`,
          }],
        };
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Deployment Agent MCP Server running...');
}

main().catch(console.error);
