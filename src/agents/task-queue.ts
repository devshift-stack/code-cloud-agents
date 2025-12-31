/**
 * Task Queue System - Manages agent tasks with status tracking
 * Supports real-time updates via EventEmitter
 */

import { EventEmitter } from "events";
import { randomUUID } from "crypto";

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  type: "code" | "review" | "test" | "docs" | "refactor" | "general";
  status: "pending" | "assigned" | "in_progress" | "completed" | "failed";
  assignedAgent: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  progress: number; // 0-100
  subtasks: SubTask[];
  result: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  userId: string;
  chatId: string | null;
  codeFiles: CodeFile[];
}

export interface SubTask {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  result: string | null;
}

export interface CodeFile {
  path: string;
  content: string;
  language: string;
  action: "create" | "modify" | "delete";
}

class TaskQueue extends EventEmitter {
  private tasks: Map<string, AgentTask> = new Map();

  constructor() {
    super();
  }

  /**
   * Create a new task
   */
  createTask(params: {
    title: string;
    description: string;
    type?: AgentTask["type"];
    priority?: AgentTask["priority"];
    userId: string;
    chatId?: string;
    subtasks?: string[];
  }): AgentTask {
    const now = new Date().toISOString();
    const task: AgentTask = {
      id: randomUUID(),
      title: params.title,
      description: params.description,
      type: params.type || "general",
      status: "pending",
      assignedAgent: null,
      priority: params.priority || "medium",
      progress: 0,
      subtasks: (params.subtasks || []).map((title) => ({
        id: randomUUID(),
        title,
        status: "pending" as const,
        result: null,
      })),
      result: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      userId: params.userId,
      chatId: params.chatId || null,
      codeFiles: [],
    };

    this.tasks.set(task.id, task);
    this.emit("task:created", task);
    console.log(`[TaskQueue] Created task: ${task.id} - ${task.title}`);
    return task;
  }

  /**
   * Create task from chat message
   */
  createTaskFromChat(
    message: string,
    userId: string,
    chatId: string,
  ): AgentTask | null {
    // Parse message to determine if it's a command
    // Command patterns
    const codePatterns = [
      /erstell(e|en)?.*code/i,
      /schreib(e|en)?.*funktion/i,
      /implementier(e|en)?/i,
      /baue?.*komponente/i,
      /create.*component/i,
      /write.*function/i,
      /implement/i,
      /add.*feature/i,
      /füge?.*hinzu/i,
    ];

    const reviewPatterns = [
      /review/i,
      /prüf(e|en)?/i,
      /check/i,
      /analysier(e|en)?/i,
    ];

    const testPatterns = [
      /test(e|en|s)?/i,
      /schreib(e|en)?.*test/i,
      /write.*test/i,
    ];

    const refactorPatterns = [
      /refactor/i,
      /optimier(e|en)?/i,
      /verbessere?/i,
      /improve/i,
      /cleanup/i,
    ];

    let taskType: AgentTask["type"] = "general";
    let priority: AgentTask["priority"] = "medium";

    if (codePatterns.some((p) => p.test(message))) {
      taskType = "code";
    } else if (reviewPatterns.some((p) => p.test(message))) {
      taskType = "review";
    } else if (testPatterns.some((p) => p.test(message))) {
      taskType = "test";
    } else if (refactorPatterns.some((p) => p.test(message))) {
      taskType = "refactor";
    }

    // Priority detection
    if (/dringend|urgent|asap|sofort|wichtig/i.test(message)) {
      priority = "urgent";
    } else if (/wichtig|important|high/i.test(message)) {
      priority = "high";
    }

    // Generate title from message
    const title =
      message.length > 60 ? message.substring(0, 60) + "..." : message;

    return this.createTask({
      title,
      description: message,
      type: taskType,
      priority,
      userId,
      chatId,
    });
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): AgentTask[] {
    return this.getAllTasks()
      .filter((t) => t.status === "pending")
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  /**
   * Assign task to agent
   */
  assignTask(taskId: string, agentName: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "pending") return false;

    task.assignedAgent = agentName;
    task.status = "assigned";
    task.updatedAt = new Date().toISOString();

    this.emit("task:assigned", { task, agent: agentName });
    console.log(`[TaskQueue] Assigned task ${taskId} to ${agentName}`);
    return true;
  }

  /**
   * Start working on task
   */
  startTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "assigned") return false;

    task.status = "in_progress";
    task.updatedAt = new Date().toISOString();

    this.emit("task:started", task);
    console.log(`[TaskQueue] Started task ${taskId}`);
    return true;
  }

  /**
   * Update task progress
   */
  updateProgress(taskId: string, progress: number, message?: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.progress = Math.min(100, Math.max(0, progress));
    task.updatedAt = new Date().toISOString();

    this.emit("task:progress", { task, progress, message });
    console.log(`[TaskQueue] Task ${taskId} progress: ${progress}%`);
    return true;
  }

  /**
   * Complete subtask
   */
  completeSubtask(taskId: string, subtaskId: string, result: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const subtask = task.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return false;

    subtask.status = "completed";
    subtask.result = result;

    // Update overall progress based on subtasks
    const completedCount = task.subtasks.filter(
      (s) => s.status === "completed",
    ).length;
    task.progress = Math.round((completedCount / task.subtasks.length) * 100);
    task.updatedAt = new Date().toISOString();

    this.emit("subtask:completed", { task, subtask });
    return true;
  }

  /**
   * Add code file to task
   */
  addCodeFile(taskId: string, file: CodeFile): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.codeFiles.push(file);
    task.updatedAt = new Date().toISOString();

    this.emit("task:code", { task, file });
    return true;
  }

  /**
   * Complete task
   */
  completeTask(taskId: string, result: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = "completed";
    task.progress = 100;
    task.result = result;
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();

    // Mark all subtasks as completed
    task.subtasks.forEach((s) => {
      if (s.status !== "completed") {
        s.status = "completed";
      }
    });

    this.emit("task:completed", task);
    console.log(`[TaskQueue] Completed task ${taskId}`);
    return true;
  }

  /**
   * Fail task
   */
  failTask(taskId: string, error: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = "failed";
    task.error = error;
    task.updatedAt = new Date().toISOString();

    this.emit("task:failed", { task, error });
    console.log(`[TaskQueue] Failed task ${taskId}: ${error}`);
    return true;
  }

  /**
   * Get task statistics
   */
  getStats() {
    const tasks = this.getAllTasks();
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      assigned: tasks.filter((t) => t.status === "assigned").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
    };
  }
}

// Singleton instance
export const taskQueue = new TaskQueue();
