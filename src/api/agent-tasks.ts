/**
 * Agent Tasks API - REST endpoints for task management
 */

import { Router } from "express";
import { taskQueue } from "../agents/task-queue.ts";
import { agentWorker } from "../agents/agent-worker.ts";
import { requireAuth } from "../auth/middleware.js";

export function createAgentTasksRouter(): Router {
  const router = Router();

  // Phase-1 Hardening: All agent task routes require authentication
  router.use(requireAuth);

  /**
   * GET /api/agent-tasks - Get all tasks
   */
  router.get("/", (_req, res) => {
    try {
      const tasks = taskQueue.getAllTasks();
      res.json({
        tasks,
        count: tasks.length,
        stats: taskQueue.getStats(),
      });
    } catch {
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  /**
   * GET /api/agent-tasks/status/all - Get worker and task status
   * MUST be before /:id route!
   */
  router.get("/status/all", (_req, res) => {
    try {
      res.json({
        worker: agentWorker.getStatus(),
        stats: taskQueue.getStats(),
        recentTasks: taskQueue.getAllTasks().slice(0, 5),
      });
    } catch {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  /**
   * POST /api/agent-tasks/worker/start - Start agent worker
   */
  router.post("/worker/start", (_req, res) => {
    try {
      agentWorker.start();
      res.json({ success: true, message: "Worker started" });
    } catch {
      res.status(500).json({ error: "Failed to start worker" });
    }
  });

  /**
   * POST /api/agent-tasks/worker/stop - Stop agent worker
   */
  router.post("/worker/stop", (_req, res) => {
    try {
      agentWorker.stop();
      res.json({ success: true, message: "Worker stopped" });
    } catch {
      res.status(500).json({ error: "Failed to stop worker" });
    }
  });

  /**
   * POST /api/agent-tasks - Create new task
   */
  router.post("/", (req, res) => {
    try {
      const { title, description, type, priority, userId } = req.body;

      if (!title || !description) {
        return res
          .status(400)
          .json({ error: "Title and description required" });
      }

      const task = taskQueue.createTask({
        title,
        description,
        type: type || "general",
        priority: priority || "medium",
        userId: userId || (req.headers["x-user-id"] as string) || "system",
      });

      res.status(201).json(task);
    } catch {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  /**
   * GET /api/agent-tasks/:id - Get single task
   * MUST be after specific routes like /status/all!
   */
  router.get("/:id", (req, res) => {
    try {
      const task = taskQueue.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch {
      res.status(500).json({ error: "Failed to get task" });
    }
  });

  return router;
}
