/**
 * Agent Types - Shared across Frontend and Backend
 */

import type {
  AgentStatus,
  ModelProvider,
  Timestamps,
  WithId,
} from "./common.js";

/**
 * Agent entity
 */
export interface Agent extends WithId, Timestamps {
  name: string;
  type: AgentType;
  status: AgentStatus;
  supervisor?: string;
  description?: string;
  config?: AgentConfig;
}

/**
 * Agent types
 */
export type AgentType =
  | "supervisor"
  | "assistant"
  | "engineering"
  | "design"
  | "testing"
  | "security"
  | "documentation"
  | "custom";

/**
 * Agent configuration
 */
export interface AgentConfig {
  model?: string;
  provider?: ModelProvider;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[];
  memory?: boolean;
}

/**
 * Agent statistics
 */
export interface AgentStatistics {
  agentId: string;
  agentName: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageRisk: number;
  stopRate: number;
  criticalIncidents: number;
  totalCostUSD: number;
  totalCostEUR: number;
  totalTokens: number;
  lastActiveAt?: string;
}

/**
 * Agent performance metrics
 */
export interface AgentPerformance {
  agentId: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    successRate: number;
    averageResponseTime: number;
    averageRisk: number;
    stopRate: number;
    costPerTask: number;
    tasksPerDay: number;
  };
  riskDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}
