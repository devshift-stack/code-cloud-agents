/**
 * Agent Worker System - Processes tasks using Claude/GPT APIs
 * Each agent has specialized capabilities and system prompts
 * Automatic fallback: Claude → OpenAI when rate limited
 */

import { EventEmitter } from 'events';
import { taskQueue, type AgentTask, type CodeFile } from './task-queue.ts';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

interface AgentConfig {
  name: string;
  role: string;
  model: string;
  openaiModel: string;
  systemPrompt: string;
  capabilities: string[];
}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  emir: {
    name: 'Emir (Supervisor)',
    role: 'Lead Supervisor',
    model: 'claude-sonnet-4-20250514',
    openaiModel: 'gpt-4o',
    systemPrompt: `Du bist Emir, der Lead Supervisor des Cloud Agents Teams.

Deine Aufgaben:
- Analysiere eingehende Tasks und teile sie in Subtasks auf
- Weise Tasks den richtigen Agenten zu (Coder, Tester, Security, Docs)
- Überwache den Fortschritt und qualität der Arbeit
- Kommuniziere klar mit dem Benutzer

Du hast folgende Agenten zur Verfügung:
- Coder: Schreibt Code, implementiert Features
- Tester: Schreibt und führt Tests aus
- Security: Prüft Sicherheit
- Docs: Schreibt Dokumentation

Antworte strukturiert mit klaren Aktionspunkten.`,
    capabilities: ['delegate', 'plan', 'review', 'communicate']
  },
  coder: {
    name: 'Coder',
    role: 'Developer',
    model: 'claude-sonnet-4-20250514',
    openaiModel: 'gpt-4o',
    systemPrompt: `Du bist der Coder Agent, ein erfahrener Full-Stack Entwickler.

Deine Aufgaben:
- Schreibe sauberen, wartbaren Code
- Implementiere Features nach Spezifikation
- Nutze Best Practices und Design Patterns
- Dokumentiere deinen Code mit klaren Kommentaren

Wenn du Code schreibst, formatiere ihn so:
\`\`\`language:path/to/file.ext
// Code hier
\`\`\`

Beispiel:
\`\`\`typescript:src/utils/helper.ts
export function formatDate(date: Date): string {
  return date.toISOString();
}
\`\`\`

Gib immer den vollständigen Dateipfad an.`,
    capabilities: ['code', 'debug', 'implement', 'refactor']
  },
  tester: {
    name: 'Tester',
    role: 'QA Engineer',
    model: 'claude-sonnet-4-20250514',
    openaiModel: 'gpt-4o',
    systemPrompt: `Du bist der Tester Agent, spezialisiert auf Qualitätssicherung.

Deine Aufgaben:
- Schreibe Unit Tests, Integration Tests
- Identifiziere Edge Cases und Bugs
- Prüfe Code Coverage
- Dokumentiere Testergebnisse

Nutze die gleiche Code-Formatierung wie der Coder Agent.`,
    capabilities: ['test', 'qa', 'coverage', 'debug']
  },
  security: {
    name: 'Security',
    role: 'Security Analyst',
    model: 'claude-sonnet-4-20250514',
    openaiModel: 'gpt-4o',
    systemPrompt: `Du bist der Security Agent, spezialisiert auf Sicherheit.

Deine Aufgaben:
- Prüfe Code auf Sicherheitslücken
- Identifiziere OWASP Top 10 Vulnerabilities
- Empfehle sichere Alternativen
- Dokumentiere Sicherheitsrisiken

Kategorisiere Findings: CRITICAL, HIGH, MEDIUM, LOW`,
    capabilities: ['security', 'audit', 'scan', 'report']
  },
  docs: {
    name: 'Docs',
    role: 'Technical Writer',
    model: 'claude-sonnet-4-20250514',
    openaiModel: 'gpt-4o',
    systemPrompt: `Du bist der Docs Agent, spezialisiert auf Dokumentation.

Deine Aufgaben:
- Schreibe klare README.md Dateien
- Dokumentiere APIs und Interfaces
- Erstelle Code-Kommentare
- Schreibe Benutzeranleitungen

Formatiere Dokumentation als Markdown.`,
    capabilities: ['documentation', 'readme', 'api-docs', 'comments']
  }
};

class AgentWorker extends EventEmitter {
  private isRunning = false;
  private currentTask: AgentTask | null = null;
  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private projectRoot = '/root/cloud-agents';
  private currentProvider: 'anthropic' | 'openai' = 'anthropic';
  private clientsInitialized = false;

  constructor() {
    super();
    // Don't initialize clients here - wait until start() is called
    // This ensures dotenv has loaded the environment variables
  }

  /**
   * Initialize API clients (called lazily when needed)
   */
  private initClients() {
    if (this.clientsInitialized) return;

    // Initialize Anthropic client
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.anthropicClient = new Anthropic({ apiKey: anthropicKey });
      console.log('[AgentWorker] Anthropic client initialized');
    } else {
      console.warn('[AgentWorker] ANTHROPIC_API_KEY not set');
    }

    // Initialize OpenAI client
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
      console.log('[AgentWorker] OpenAI client initialized (fallback)');
    } else {
      console.warn('[AgentWorker] OPENAI_API_KEY not set');
    }

    this.clientsInitialized = true;
  }

  /**
   * Start the worker loop
   */
  start() {
    if (this.isRunning) return;

    // Initialize clients now that dotenv has loaded
    this.initClients();

    this.isRunning = true;
    console.log('[AgentWorker] Started');
    this.emit('worker:started');
    this.processLoop();
  }

  /**
   * Stop the worker
   */
  stop() {
    this.isRunning = false;
    console.log('[AgentWorker] Stopped');
    this.emit('worker:stopped');
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      currentProvider: this.currentProvider,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      agents: Object.entries(AGENT_CONFIGS).map(([id, config]) => ({
        id,
        name: config.name,
        role: config.role,
        status: this.currentTask?.assignedAgent === id ? 'working' : 'idle'
      }))
    };
  }

  /**
   * Main processing loop
   */
  private async processLoop() {
    while (this.isRunning) {
      try {
        // Get next pending task
        const pendingTasks = taskQueue.getPendingTasks();

        if (pendingTasks.length > 0) {
          const task = pendingTasks[0];
          await this.processTask(task);
        } else {
          // Wait before checking again
          await this.sleep(2000);
        }
      } catch (error) {
        console.error('[AgentWorker] Loop error:', error);
        await this.sleep(5000);
      }
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: AgentTask) {
    this.currentTask = task;

    try {
      // Determine which agent should handle this
      const agentId = this.selectAgent(task);
      const agentConfig = AGENT_CONFIGS[agentId];

      // Assign task
      taskQueue.assignTask(task.id, agentId);
      this.emit('task:assigned', { task, agent: agentConfig.name });

      // Start task
      taskQueue.startTask(task.id);
      this.emit('task:started', { task, agent: agentConfig.name });

      // Call AI with automatic fallback
      const result = await this.callAgentWithFallback(agentConfig, task);

      // Extract and write code files if any
      const codeFiles = this.extractCodeBlocks(result);
      for (const file of codeFiles) {
        await this.writeCodeFile(file);
        taskQueue.addCodeFile(task.id, file);
        this.emit('task:code', { task, file });
      }

      // Complete task
      taskQueue.completeTask(task.id, result);
      this.emit('task:completed', { task, result, codeFiles });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      taskQueue.failTask(task.id, errorMsg);
      this.emit('task:failed', { task, error: errorMsg });
    } finally {
      this.currentTask = null;
    }
  }

  /**
   * Select best agent for task
   */
  private selectAgent(task: AgentTask): string {
    switch (task.type) {
      case 'code':
      case 'refactor':
        return 'coder';
      case 'test':
        return 'tester';
      case 'review':
        return 'security';
      case 'docs':
        return 'docs';
      default:
        // Default to Emir for general tasks
        return 'emir';
    }
  }

  /**
   * Call agent with automatic fallback from Claude to OpenAI
   */
  private async callAgentWithFallback(config: AgentConfig, task: AgentTask): Promise<string> {
    // Ensure clients are initialized
    this.initClients();

    // Try Anthropic first
    if (this.anthropicClient) {
      try {
        console.log(`[AgentWorker] Trying Anthropic for ${config.name}...`);
        this.currentProvider = 'anthropic';
        return await this.callAnthropic(config, task);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[AgentWorker] Anthropic failed: ${errorMsg}`);

        // Check if it's a rate limit or quota error
        if (errorMsg.includes('rate_limit') || errorMsg.includes('429') || errorMsg.includes('quota')) {
          console.log('[AgentWorker] Anthropic rate limited, switching to OpenAI fallback...');
        } else {
          // For other errors, still try OpenAI but log the error
          console.log('[AgentWorker] Anthropic error, trying OpenAI as fallback...');
        }
      }
    }

    // Fallback to OpenAI
    if (this.openaiClient) {
      try {
        console.log(`[AgentWorker] Using OpenAI for ${config.name}...`);
        this.currentProvider = 'openai';
        return await this.callOpenAI(config, task);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[AgentWorker] OpenAI also failed: ${errorMsg}`);
        throw new Error(`Both APIs failed. OpenAI: ${errorMsg}`);
      }
    }

    throw new Error('No AI provider available. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY');
  }

  /**
   * Call Anthropic Claude API
   */
  private async callAnthropic(config: AgentConfig, task: AgentTask): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    console.log(`[AgentWorker] Calling Claude ${config.model} for task: ${task.title}`);

    // Update progress
    taskQueue.updateProgress(task.id, 10, `${config.name} analysiert Aufgabe (Claude)...`);
    this.emit('progress', { task, progress: 10, message: `${config.name} analysiert Aufgabe (Claude)...` });

    const response = await this.anthropicClient.messages.create({
      model: config.model,
      max_tokens: 4096,
      system: config.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Aufgabe: ${task.title}

Beschreibung:
${task.description}

Bitte bearbeite diese Aufgabe vollständig. Wenn Code geschrieben werden soll, formatiere ihn als:
\`\`\`language:pfad/zur/datei.ext
// Code
\`\`\``
        }
      ]
    });

    // Update progress
    taskQueue.updateProgress(task.id, 80, `${config.name} hat Lösung erstellt (Claude)`);
    this.emit('progress', { task, progress: 80, message: `${config.name} hat Lösung erstellt (Claude)` });

    // Extract text from response
    let result = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        result += block.text;
      }
    }

    return result;
  }

  /**
   * Call OpenAI GPT API (fallback)
   */
  private async callOpenAI(config: AgentConfig, task: AgentTask): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    console.log(`[AgentWorker] Calling OpenAI ${config.openaiModel} for task: ${task.title}`);

    // Update progress
    taskQueue.updateProgress(task.id, 10, `${config.name} analysiert Aufgabe (OpenAI)...`);
    this.emit('progress', { task, progress: 10, message: `${config.name} analysiert Aufgabe (OpenAI)...` });

    const response = await this.openaiClient.chat.completions.create({
      model: config.openaiModel,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: config.systemPrompt
        },
        {
          role: 'user',
          content: `Aufgabe: ${task.title}

Beschreibung:
${task.description}

Bitte bearbeite diese Aufgabe vollständig. Wenn Code geschrieben werden soll, formatiere ihn als:
\`\`\`language:pfad/zur/datei.ext
// Code
\`\`\``
        }
      ]
    });

    // Update progress
    taskQueue.updateProgress(task.id, 80, `${config.name} hat Lösung erstellt (OpenAI)`);
    this.emit('progress', { task, progress: 80, message: `${config.name} hat Lösung erstellt (OpenAI)` });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Extract code blocks from response
   */
  private extractCodeBlocks(content: string): CodeFile[] {
    const codeFiles: CodeFile[] = [];

    // Match code blocks with path: ```language:path/to/file.ext
    const codeBlockRegex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1];
      const filePath = match[2].trim();
      const code = match[3];

      codeFiles.push({
        path: filePath,
        content: code,
        language,
        action: 'create'
      });
    }

    return codeFiles;
  }

  /**
   * Write code file to disk
   */
  private async writeCodeFile(file: CodeFile): Promise<void> {
    const fullPath = path.join(this.projectRoot, file.path);
    const dir = path.dirname(fullPath);

    // Create directory if needed
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(fullPath, file.content, 'utf-8');
    console.log(`[AgentWorker] Wrote file: ${fullPath}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const agentWorker = new AgentWorker();
