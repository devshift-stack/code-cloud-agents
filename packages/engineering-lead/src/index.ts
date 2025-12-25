#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'engineering-lead', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

interface TaskPlan {
  taskId: string;
  steps: string[];
  assignedTo: string;
  estimatedTime: string;
  dependencies: string[];
}

interface VerificationResult {
  taskId: string;
  status: 'approved' | 'rejected' | 'needs_revision';
  stopScore: number;
  issues: string[];
  suggestions: string[];
}

// STOP Score calculation
function calculateStopScore(issues: string[]): number {
  // Base score starts at 0, each issue adds points
  let score = 0;
  const weights: Record<string, number> = {
    security: 20,
    performance: 10,
    code_quality: 5,
    documentation: 3,
    testing: 8,
    architecture: 15,
  };

  issues.forEach(issue => {
    const category = Object.keys(weights).find(k => issue.toLowerCase().includes(k));
    score += category ? weights[category] : 5;
  });

  return Math.min(score, 100);
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'plan_task',
      description: 'Create a detailed execution plan for a task',
      inputSchema: {
        type: 'object',
        properties: {
          taskDescription: { type: 'string', description: 'Description of the task' },
          complexity: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task complexity' },
          requirements: { type: 'array', items: { type: 'string' }, description: 'Task requirements' },
        },
        required: ['taskDescription'],
      },
    },
    {
      name: 'delegate_task',
      description: 'Delegate a planned task to the appropriate agent',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the planned task' },
          targetAgent: { type: 'string', description: 'Agent to delegate to' },
          priority: { type: 'number', minimum: 1, maximum: 10 },
          deadline: { type: 'string', description: 'Deadline in ISO format' },
        },
        required: ['taskId', 'targetAgent'],
      },
    },
    {
      name: 'verify_artifacts',
      description: 'Verify the artifacts produced by a task execution',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'ID of the completed task' },
          artifacts: { type: 'array', items: { type: 'string' }, description: 'List of artifact paths/names' },
          checkTypes: {
            type: 'array',
            items: { type: 'string', enum: ['code_quality', 'security', 'performance', 'testing', 'documentation'] },
            description: 'Types of checks to perform'
          },
        },
        required: ['taskId', 'artifacts'],
      },
    },
    {
      name: 'calculate_stop_score',
      description: 'Calculate the STOP score for a task based on issues found',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID' },
          issues: { type: 'array', items: { type: 'string' }, description: 'List of issues found' },
        },
        required: ['taskId', 'issues'],
      },
    },
    {
      name: 'approve_or_reject',
      description: 'Make final decision to approve, reject, or request revision',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID' },
          decision: { type: 'string', enum: ['approve', 'reject', 'needs_revision'] },
          reason: { type: 'string', description: 'Reason for decision' },
          requiredChanges: { type: 'array', items: { type: 'string' }, description: 'Changes required if not approved' },
        },
        required: ['taskId', 'decision', 'reason'],
      },
    },
    {
      name: 'code_review',
      description: 'Perform a code review on specified files',
      inputSchema: {
        type: 'object',
        properties: {
          files: { type: 'array', items: { type: 'string' }, description: 'File paths to review' },
          focusAreas: {
            type: 'array',
            items: { type: 'string', enum: ['security', 'performance', 'readability', 'testing', 'architecture'] },
          },
        },
        required: ['files'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'plan_task': {
      const { taskDescription, complexity = 'medium', requirements = [] } = args as {
        taskDescription: string;
        complexity?: string;
        requirements?: string[];
      };

      const stepsMap: Record<string, string[]> = {
        low: ['Analyze requirements', 'Implement solution', 'Test', 'Document'],
        medium: ['Analyze requirements', 'Design solution', 'Implement core', 'Add error handling', 'Test', 'Document', 'Review'],
        high: ['Analyze requirements', 'Research options', 'Design architecture', 'Review design', 'Implement core', 'Add error handling', 'Add tests', 'Performance optimization', 'Security review', 'Document', 'Final review'],
      };

      const plan: TaskPlan = {
        taskId: `plan-${Date.now()}`,
        steps: stepsMap[complexity] || stepsMap.medium,
        assignedTo: 'pending',
        estimatedTime: complexity === 'low' ? '1h' : complexity === 'medium' ? '4h' : '1d',
        dependencies: requirements,
      };

      return { content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }] };
    }

    case 'delegate_task': {
      const { taskId, targetAgent, priority = 5, deadline } = args as {
        taskId: string;
        targetAgent: string;
        priority?: number;
        deadline?: string;
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'delegated',
            taskId,
            targetAgent,
            priority,
            deadline: deadline || 'none',
            delegatedAt: new Date().toISOString(),
          }, null, 2),
        }],
      };
    }

    case 'verify_artifacts': {
      const { taskId, artifacts, checkTypes = ['code_quality'] } = args as {
        taskId: string;
        artifacts: string[];
        checkTypes?: string[];
      };

      // Simulated verification
      const issues: string[] = [];
      const suggestions: string[] = [];

      if (checkTypes.includes('testing') && artifacts.some(a => !a.includes('test'))) {
        issues.push('Missing test files for some artifacts');
        suggestions.push('Add unit tests for all new code');
      }

      if (checkTypes.includes('documentation') && !artifacts.some(a => a.endsWith('.md'))) {
        suggestions.push('Consider adding documentation');
      }

      const stopScore = calculateStopScore(issues);

      const result: VerificationResult = {
        taskId,
        status: issues.length === 0 ? 'approved' : issues.length < 3 ? 'needs_revision' : 'rejected',
        stopScore,
        issues,
        suggestions,
      };

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    case 'calculate_stop_score': {
      const { taskId, issues } = args as { taskId: string; issues: string[] };
      const score = calculateStopScore(issues);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            taskId,
            stopScore: score,
            threshold: 50,
            shouldStop: score >= 50,
            breakdown: issues.map(i => ({ issue: i, weight: 5 })),
          }, null, 2),
        }],
      };
    }

    case 'approve_or_reject': {
      const { taskId, decision, reason, requiredChanges = [] } = args as {
        taskId: string;
        decision: string;
        reason: string;
        requiredChanges?: string[];
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            taskId,
            decision,
            reason,
            requiredChanges,
            decidedAt: new Date().toISOString(),
            decidedBy: 'engineering-lead',
          }, null, 2),
        }],
      };
    }

    case 'code_review': {
      const { files, focusAreas = ['readability'] } = args as {
        files: string[];
        focusAreas?: string[];
      };

      const findings = files.map(file => ({
        file,
        issues: [],
        suggestions: [`Review ${focusAreas.join(', ')} aspects`],
        score: 85 + Math.floor(Math.random() * 15),
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            reviewedFiles: files.length,
            focusAreas,
            findings,
            overallScore: Math.floor(findings.reduce((a, f) => a + f.score, 0) / findings.length),
            reviewedAt: new Date().toISOString(),
          }, null, 2),
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
  console.error('Engineering Lead MCP Server running');
}

main().catch(console.error);
