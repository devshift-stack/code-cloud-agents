/**
 * Agent Control REST API
 *
 * Provides REST endpoints for controlling and monitoring agents:
 * - List all agents
 * - Get agent details
 * - Start/Stop/Restart agents
 * - Get agent status and logs
 * - Assign tasks to agents
 */

import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth/middleware.js";

// Agent types and statuses
export type AgentStatus =
  | "online"
  | "offline"
  | "starting"
  | "stopping"
  | "error";

export interface Agent {
  id: number;
  name: string;
  role: string;
  status: AgentStatus;
  currentTask: string | null;
  completedTasks: number;
  uptime: number; // in seconds
  lastActivity: string; // ISO timestamp
  metadata: {
    version: string;
    capabilities: string[];
  };
}

// In-memory agent store (in production, this would be in a database)
const agents: Map<number, Agent> = new Map([
  [
    0,
    {
      id: 0,
      name: "Agent 0",
      role: "Lead Developer & Orchestrator",
      status: "online",
      currentTask: "Koordiniert Team, macht Code Reviews",
      completedTasks: 13,
      uptime: 86400, // 1 day
      lastActivity: new Date().toISOString(),
      metadata: {
        version: "1.0.0",
        capabilities: [
          "coordination",
          "code-review",
          "deployment",
          "architecture",
        ],
      },
    },
  ],
  [
    1,
    {
      id: 1,
      name: "Agent 1",
      role: "Frontend Developer",
      status: "offline",
      currentTask: null,
      completedTasks: 0,
      uptime: 0,
      lastActivity: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      metadata: {
        version: "1.0.0",
        capabilities: ["react", "typescript", "ui-design", "testing"],
      },
    },
  ],
  [
    2,
    {
      id: 2,
      name: "Agent 2",
      role: "Security & Backend Infrastructure",
      status: "offline",
      currentTask: null,
      completedTasks: 0,
      uptime: 0,
      lastActivity: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      metadata: {
        version: "1.0.0",
        capabilities: ["jwt", "authentication", "security", "infrastructure"],
      },
    },
  ],
  [
    3,
    {
      id: 3,
      name: "Agent 3",
      role: "Integrations & APIs",
      status: "online",
      currentTask: "Implementiert Agent Control API",
      completedTasks: 2,
      uptime: 3600, // 1 hour
      lastActivity: new Date().toISOString(),
      metadata: {
        version: "1.0.0",
        capabilities: ["github", "linear", "slack", "webhooks", "rest-api"],
      },
    },
  ],
  [
    4,
    {
      id: 4,
      name: "Agent 4",
      role: "Documentation & DevOps",
      status: "offline",
      currentTask: null,
      completedTasks: 0,
      uptime: 0,
      lastActivity: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      metadata: {
        version: "1.0.0",
        capabilities: ["swagger", "postman", "devops", "ci-cd"],
      },
    },
  ],
]);

// Agent logs storage (in-memory for now)
const agentLogs: Map<number, string[]> = new Map();

// Helper function to get default agents (for testing)
function getDefaultAgents(): Map<number, Agent> {
  return new Map([
    [
      0,
      {
        id: 0,
        name: "Agent 0",
        role: "Lead Developer & Orchestrator",
        status: "online",
        currentTask: "Koordiniert Team, macht Code Reviews",
        completedTasks: 13,
        uptime: 86400,
        lastActivity: new Date().toISOString(),
        metadata: {
          version: "1.0.0",
          capabilities: [
            "coordination",
            "code-review",
            "deployment",
            "architecture",
          ],
        },
      },
    ],
    [
      1,
      {
        id: 1,
        name: "Agent 1",
        role: "Frontend Developer",
        status: "offline",
        currentTask: null,
        completedTasks: 0,
        uptime: 0,
        lastActivity: new Date(Date.now() - 3600000).toISOString(),
        metadata: {
          version: "1.0.0",
          capabilities: ["react", "typescript", "ui-design", "testing"],
        },
      },
    ],
    [
      2,
      {
        id: 2,
        name: "Agent 2",
        role: "Security & Backend Infrastructure",
        status: "offline",
        currentTask: null,
        completedTasks: 0,
        uptime: 0,
        lastActivity: new Date(Date.now() - 7200000).toISOString(),
        metadata: {
          version: "1.0.0",
          capabilities: ["jwt", "authentication", "security", "infrastructure"],
        },
      },
    ],
    [
      3,
      {
        id: 3,
        name: "Agent 3",
        role: "Integrations & APIs",
        status: "online",
        currentTask: "Implementiert Agent Control API",
        completedTasks: 2,
        uptime: 3600,
        lastActivity: new Date().toISOString(),
        metadata: {
          version: "1.0.0",
          capabilities: ["github", "linear", "slack", "webhooks", "rest-api"],
        },
      },
    ],
    [
      4,
      {
        id: 4,
        name: "Agent 4",
        role: "Documentation & DevOps",
        status: "offline",
        currentTask: null,
        completedTasks: 0,
        uptime: 0,
        lastActivity: new Date(Date.now() - 86400000).toISOString(),
        metadata: {
          version: "1.0.0",
          capabilities: ["swagger", "postman", "devops", "ci-cd"],
        },
      },
    ],
  ]);
}

/**
 * Reset agents to default state (for testing)
 */
export function resetAgents(): void {
  agents.clear();
  const defaults = getDefaultAgents();
  defaults.forEach((agent, id) => agents.set(id, agent));
  agentLogs.clear();
}

// Initialize logs for all agents
agents.forEach((_, id) => {
  agentLogs.set(id, [`[${new Date().toISOString()}] Agent ${id} initialized`]);
});

// Request validation schemas
const AssignTaskSchema = z.object({
  task: z.string().min(1).max(500),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  deadline: z.string().optional(), // ISO timestamp
});

/**
 * Creates Agent Control REST API router
 * @returns Express Router with Agent Control endpoints
 */
export function createAgentControlRouter(): Router {
  const router = Router();

  // Phase-1 Hardening: All agent control routes require admin privileges
  router.use(requireAdmin);

  /**
   * GET /api/agents/status
   * Get status overview of all agents (for MCP tools / dashboard)
   * Returns: [{ name, status, pid?, uptime?, queueDepth?, lastError? }]
   */
  router.get("/status", (_req, res) => {
    const statusList = Array.from(agents.values()).map((agent) => ({
      name: agent.name,
      status: agent.status,
      pid: agent.status === "online" ? process.pid : null, // In production: real worker PID
      uptime: agent.uptime,
      queueDepth: agent.currentTask ? 1 : 0, // Simple queue depth estimation
      lastError: agent.status === "error" ? "Unknown error" : null,
      lastActivity: agent.lastActivity,
    }));

    res.json({
      success: true,
      agents: statusList,
      count: statusList.length,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/agents
   * List all agents
   */
  router.get("/", (_req, res) => {
    const allAgents = Array.from(agents.values()).map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      currentTask: agent.currentTask,
      completedTasks: agent.completedTasks,
      uptime: agent.uptime,
      lastActivity: agent.lastActivity,
    }));

    res.json({
      success: true,
      agents: allAgents,
      count: allAgents.length,
    });
  });

  /**
   * GET /api/agents/:id
   * Get specific agent details
   */
  router.get("/:id", (req, res) => {
    const agentId = parseInt(req.params.id, 10);

    if (isNaN(agentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid agent ID",
      });
    }

    const agent = agents.get(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    res.json({
      success: true,
      agent,
    });
  });

  /**
   * POST /api/agents/:id/start
   * Start an agent
   */
  router.post("/:id/start", (req, res) => {
    const agentId = parseInt(req.params.id, 10);

    if (isNaN(agentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid agent ID",
      });
    }

    const agent = agents.get(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    if (agent.status === "online") {
      return res.status(400).json({
        success: false,
        error: `Agent ${agentId} is already online`,
      });
    }

    // Update agent status
    agent.status = "starting";
    agent.lastActivity = new Date().toISOString();

    // Log action
    const logs = agentLogs.get(agentId) || [];
    logs.push(`[${new Date().toISOString()}] Agent starting...`);
    agentLogs.set(agentId, logs);

    // Simulate async start (in production, this would be a real process spawn)
    setTimeout(() => {
      const updatedAgent = agents.get(agentId);
      if (updatedAgent && updatedAgent.status === "starting") {
        updatedAgent.status = "online";
        updatedAgent.uptime = 0;
        updatedAgent.lastActivity = new Date().toISOString();

        const logs = agentLogs.get(agentId) || [];
        logs.push(`[${new Date().toISOString()}] Agent started successfully`);
        agentLogs.set(agentId, logs);
      }
    }, 2000);

    res.json({
      success: true,
      message: `Agent ${agentId} is starting`,
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
      },
    });
  });

  /**
   * POST /api/agents/:id/stop
   * Stop an agent
   */
  router.post("/:id/stop", (req, res) => {
    const agentId = parseInt(req.params.id, 10);

    if (isNaN(agentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid agent ID",
      });
    }

    const agent = agents.get(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    if (agent.status === "offline") {
      return res.status(400).json({
        success: false,
        error: `Agent ${agentId} is already offline`,
      });
    }

    // Update agent status
    agent.status = "stopping";
    agent.lastActivity = new Date().toISOString();

    // Log action
    const logs = agentLogs.get(agentId) || [];
    logs.push(`[${new Date().toISOString()}] Agent stopping...`);
    agentLogs.set(agentId, logs);

    // Simulate async stop
    setTimeout(() => {
      const updatedAgent = agents.get(agentId);
      if (updatedAgent && updatedAgent.status === "stopping") {
        updatedAgent.status = "offline";
        updatedAgent.currentTask = null;
        updatedAgent.lastActivity = new Date().toISOString();

        const logs = agentLogs.get(agentId) || [];
        logs.push(`[${new Date().toISOString()}] Agent stopped successfully`);
        agentLogs.set(agentId, logs);
      }
    }, 1500);

    res.json({
      success: true,
      message: `Agent ${agentId} is stopping`,
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
      },
    });
  });

  /**
   * POST /api/agents/:id/restart
   * Restart an agent
   */
  router.post("/:id/restart", (req, res) => {
    const agentId = parseInt(req.params.id, 10);

    if (isNaN(agentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid agent ID",
      });
    }

    const agent = agents.get(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    // Update agent status
    agent.status = "stopping";
    agent.lastActivity = new Date().toISOString();

    // Log action
    const logs = agentLogs.get(agentId) || [];
    logs.push(`[${new Date().toISOString()}] Agent restarting...`);
    agentLogs.set(agentId, logs);

    // Simulate restart (stop then start)
    setTimeout(() => {
      const updatedAgent = agents.get(agentId);
      if (updatedAgent) {
        updatedAgent.status = "starting";

        const logs = agentLogs.get(agentId) || [];
        logs.push(`[${new Date().toISOString()}] Agent stopped, starting...`);
        agentLogs.set(agentId, logs);

        setTimeout(() => {
          if (updatedAgent.status === "starting") {
            updatedAgent.status = "online";
            updatedAgent.uptime = 0;
            updatedAgent.lastActivity = new Date().toISOString();

            const logs = agentLogs.get(agentId) || [];
            logs.push(
              `[${new Date().toISOString()}] Agent restarted successfully`,
            );
            agentLogs.set(agentId, logs);
          }
        }, 2000);
      }
    }, 1500);

    res.json({
      success: true,
      message: `Agent ${agentId} is restarting`,
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
      },
    });
  });

  /**
   * GET /api/agents/:id/status
   * Get agent status
   */
  router.get("/:id/status", (req, res) => {
    const agentId = parseInt(req.params.id, 10);

    if (isNaN(agentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid agent ID",
      });
    }

    const agent = agents.get(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    res.json({
      success: true,
      status: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        currentTask: agent.currentTask,
        uptime: agent.uptime,
        lastActivity: agent.lastActivity,
      },
    });
  });

  /**
   * GET /api/agents/:id/logs
   * Get agent logs (query params: limit, offset)
   */
  router.get("/:id/logs", (req, res) => {
    const agentId = parseInt(req.params.id, 10);

    if (isNaN(agentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid agent ID",
      });
    }

    const agent = agents.get(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = agentLogs.get(agentId) || [];
    const paginatedLogs = logs.slice(offset, offset + limit);

    res.json({
      success: true,
      logs: paginatedLogs,
      count: paginatedLogs.length,
      total: logs.length,
    });
  });

  /**
   * POST /api/agents/:id/tasks
   * Assign a task to an agent
   */
  router.post("/:id/tasks", (req, res) => {
    const agentId = parseInt(req.params.id, 10);

    if (isNaN(agentId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid agent ID",
      });
    }

    const agent = agents.get(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: `Agent ${agentId} not found`,
      });
    }

    const parsed = AssignTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: parsed.error.issues,
      });
    }

    // Assign task to agent
    agent.currentTask = parsed.data.task;
    agent.lastActivity = new Date().toISOString();

    // Log action
    const logs = agentLogs.get(agentId) || [];
    logs.push(
      `[${new Date().toISOString()}] Task assigned: ${parsed.data.task} (priority: ${parsed.data.priority || "medium"})`,
    );
    agentLogs.set(agentId, logs);

    res.status(201).json({
      success: true,
      message: `Task assigned to Agent ${agentId}`,
      task: {
        agentId: agent.id,
        agentName: agent.name,
        task: parsed.data.task,
        priority: parsed.data.priority || "medium",
        deadline: parsed.data.deadline,
        assignedAt: new Date().toISOString(),
      },
    });
  });

  return router;
}
