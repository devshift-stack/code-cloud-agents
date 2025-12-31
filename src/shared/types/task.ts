/**
 * Task Types - Shared across Frontend and Backend
 */

import type {
  RiskLevel,
  Status,
  Timestamps,
  WithId,
  Metadata,
} from "./common.js";

/**
 * Task priority levels
 */
export type TaskPriority = "low" | "medium" | "high" | "urgent";

/**
 * Task entity
 */
export interface Task extends WithId, Timestamps {
  title: string;
  description?: string;
  priority: TaskPriority;
  status: Status;
  assignee: string; // Agent name
  username?: string; // User who created the task
  stopScore?: number;
  riskLevel?: RiskLevel;
  metadata?: Metadata;
}

/**
 * Task creation request
 */
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignee: string;
  username?: string;
  metadata?: Metadata;
}

/**
 * Task update request
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: Status;
  stopScore?: number;
  riskLevel?: RiskLevel;
  metadata?: Metadata;
}

/**
 * Task result with artefacts
 */
export interface TaskResult {
  taskId: string;
  status: Status;
  stopScore: number;
  riskLevel: RiskLevel;
  artefacts: Artefact[];
  violations?: string[];
  timestamp: string;
}

/**
 * Artefact produced by task execution
 */
export interface Artefact {
  type: "file" | "config" | "test" | "deployment" | "documentation";
  path: string;
  description?: string;
  verified: boolean;
  evidence?: string;
}
