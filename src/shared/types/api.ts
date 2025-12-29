/**
 * API Types - Request/Response interfaces
 */

import type { RiskLevel } from "./common.js";
import type { AgentStatistics, AgentPerformance } from "./agent.js";
import type { Task } from "./task.js";
// Re-export for external use
export type { TaskResult } from "./task.js";

/**
 * Health check response
 */
export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;
  timestamp: string;
  checks?: {
    database?: boolean;
    memory?: boolean;
    integrations?: Record<string, boolean>;
  };
}

/**
 * Dashboard summary
 */
export interface DashboardSummary {
  agentsActive: number;
  tasksTotal: number;
  tasksToday: number;
  tasksInProgress: number;
  stopScoreAverage: number;
  criticalCount: number;
  riskDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  recentAlerts: Alert[];
  topAgents: AgentStatistics[];
}

/**
 * Alert entity
 */
export interface Alert {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  riskLevel: RiskLevel;
  title: string;
  message: string;
  violations?: string[];
  timestamp: string;
  read: boolean;
  resolved: boolean;
}

/**
 * Alert list response
 */
export interface AlertListResponse {
  alerts: Alert[];
  total: number;
  unreadCount: number;
}

/**
 * Audit entry
 */
export interface AuditEntry {
  id: string;
  taskId: string;
  decision: "APPROVED" | "STOP_REQUIRED";
  finalStatus: string;
  riskLevel: RiskLevel;
  stopScore: number;
  verifiedArtefacts: string;
  missingInvalidParts: string;
  requiredNextAction: string;
  createdAt: string;
}

/**
 * STOP score statistics
 */
export interface StopScoreStats {
  total: number;
  average: number;
  distribution: {
    "0-19": number;
    "20-44": number;
    "45-69": number;
    "70-100": number;
  };
  bySeverity: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}

/**
 * System statistics
 */
export interface SystemStats {
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
  agents: {
    total: number;
    active: number;
    byType: Record<string, number>;
  };
  performance: {
    averageResponseTime: number;
    successRate: number;
    stopRate: number;
  };
  costs: {
    totalUSD: number;
    totalEUR: number;
    byModel: Record<string, { costUSD: number; costEUR: number }>;
  };
}

/**
 * Report generation request
 */
export interface ReportRequest {
  type: "daily" | "weekly" | "monthly" | "custom";
  startDate?: string;
  endDate?: string;
  agentIds?: string[];
  format?: "json" | "pdf" | "csv";
}

/**
 * Report response
 */
export interface ReportResponse {
  reportId: string;
  type: string;
  period: {
    start: string;
    end: string;
  };
  summary: DashboardSummary;
  agentPerformance: AgentPerformance[];
  tasks: Task[];
  stopScores: StopScoreStats;
  generatedAt: string;
}
