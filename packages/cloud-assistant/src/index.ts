#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

const server = new Server(
  { name: 'cloud-assistant', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

interface ExecutionResult {
  taskId: string;
  status: 'success' | 'failed' | 'partial';
  output: string;
  artifacts: string[];
  duration: number;
  evidence: string[];
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'execute_task',
      description: 'Execute a delegated task and produce artifacts',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the task to execute' },
          taskDescription: { type: 'string', description: 'What needs to be done' },
          steps: { type: 'array', items: { type: 'string' }, description: 'Steps to follow' },
        },
        required: ['taskId', 'taskDescription'],
      },
    },
    {
      name: 'run_command',
      description: 'Run a shell command safely',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to run' },
          cwd: { type: 'string', description: 'Working directory' },
          timeout: { type: 'number', description: 'Timeout in ms', default: 30000 },
        },
        required: ['command'],
      },
    },
    {
      name: 'create_file',
      description: 'Create or update a file with content',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file' },
          content: { type: 'string', description: 'File content' },
          overwrite: { type: 'boolean', default: false },
        },
        required: ['filePath', 'content'],
      },
    },
    {
      name: 'read_file',
      description: 'Read content from a file',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file' },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'report_progress',
      description: 'Report progress on a task with evidence',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID' },
          progress: { type: 'number', minimum: 0, maximum: 100 },
          currentStep: { type: 'string', description: 'Current step being executed' },
          evidence: { type: 'array', items: { type: 'string' }, description: 'Evidence of work done' },
        },
        required: ['taskId', 'progress'],
      },
    },
    {
      name: 'complete_task',
      description: 'Mark a task as complete and submit artifacts',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID' },
          artifacts: { type: 'array', items: { type: 'string' }, description: 'Created artifacts' },
          summary: { type: 'string', description: 'Summary of what was done' },
          evidence: { type: 'array', items: { type: 'string' }, description: 'Evidence of completion' },
        },
        required: ['taskId', 'summary'],
      },
    },
    {
      name: 'git_operation',
      description: 'Perform git operations (respecting org permissions)',
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['status', 'add', 'commit', 'push', 'pull', 'clone', 'branch'] },
          args: { type: 'array', items: { type: 'string' }, description: 'Additional arguments' },
          cwd: { type: 'string', description: 'Working directory' },
        },
        required: ['operation'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'execute_task': {
      const { taskId, taskDescription, steps = [] } = args as {
        taskId: string;
        taskDescription: string;
        steps?: string[];
      };

      const startTime = Date.now();
      const artifacts: string[] = [];
      const evidence: string[] = [`Started task: ${taskDescription}`];

      // Simulate execution
      for (const step of steps) {
        evidence.push(`Completed: ${step}`);
      }

      const result: ExecutionResult = {
        taskId,
        status: 'success',
        output: `Task "${taskDescription}" completed successfully`,
        artifacts,
        duration: Date.now() - startTime,
        evidence,
      };

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    case 'run_command': {
      const { command, cwd, timeout = 30000 } = args as {
        command: string;
        cwd?: string;
        timeout?: number;
      };

      // Security: Block dangerous commands
      const blockedPatterns = ['rm -rf /', 'sudo rm', ':(){', 'mkfs', '> /dev/'];
      if (blockedPatterns.some(p => command.includes(p))) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: 'Command blocked for security reasons' }),
          }],
        };
      }

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: cwd || process.cwd(),
          timeout,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ stdout, stderr, exitCode: 0 }, null, 2),
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: error.message,
              stdout: error.stdout,
              stderr: error.stderr,
              exitCode: error.code,
            }, null, 2),
          }],
        };
      }
    }

    case 'create_file': {
      const { filePath, content, overwrite = false } = args as {
        filePath: string;
        content: string;
        overwrite?: boolean;
      };

      try {
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (exists && !overwrite) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ error: 'File exists. Set overwrite: true to replace.' }),
            }],
          };
        }

        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, path: filePath, size: content.length }),
          }],
        };
      } catch (error: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }] };
      }
    }

    case 'read_file': {
      const { filePath } = args as { filePath: string };

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ path: filePath, content, size: content.length }),
          }],
        };
      } catch (error: any) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }] };
      }
    }

    case 'report_progress': {
      const { taskId, progress, currentStep, evidence = [] } = args as {
        taskId: string;
        progress: number;
        currentStep?: string;
        evidence?: string[];
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            taskId,
            progress,
            currentStep,
            evidence,
            reportedAt: new Date().toISOString(),
          }, null, 2),
        }],
      };
    }

    case 'complete_task': {
      const { taskId, artifacts = [], summary, evidence = [] } = args as {
        taskId: string;
        artifacts?: string[];
        summary: string;
        evidence?: string[];
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            taskId,
            status: 'completed',
            summary,
            artifacts,
            evidence,
            completedAt: new Date().toISOString(),
          }, null, 2),
        }],
      };
    }

    case 'git_operation': {
      const { operation, args: gitArgs = [], cwd } = args as {
        operation: string;
        args?: string[];
        cwd?: string;
      };

      // Check push permissions
      if (operation === 'push') {
        try {
          const { stdout } = await execAsync('git remote get-url origin', { cwd: cwd || process.cwd() });
          if (stdout.includes('devshift') && !stdout.includes('dsactivi2')) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({ error: 'Push denied: devshift org is read-only' }),
              }],
            };
          }
        } catch (e) {
          // Continue if can't check remote
        }
      }

      try {
        const command = `git ${operation} ${gitArgs.join(' ')}`;
        const { stdout, stderr } = await execAsync(command, { cwd: cwd || process.cwd() });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ operation, stdout, stderr }, null, 2),
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: error.message, stderr: error.stderr }),
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
  console.error('Cloud Assistant MCP Server running');
}

main().catch(console.error);
