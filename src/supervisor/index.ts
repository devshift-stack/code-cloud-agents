/**
 * Supervisor Module Index
 * Exports all supervisor components
 */

export {
  MetaSupervisor,
  createMetaSupervisor,
} from "../meta/metaSupervisor.js";
export type {
  RouteDecision,
  SystemHealth,
  AggregatedMetrics,
} from "../meta/metaSupervisor.js";

export {
  CloudAssistant,
  createCloudAssistant,
} from "../assistant/cloudAssistant.js";
export type {
  TaskExecution,
  ExecutionStep,
  Artefact,
  StatusProposal,
} from "../assistant/cloudAssistant.js";

export { computeStopScore, analyzeContent } from "../audit/stopScorer.js";
export type {
  StopReason,
  Severity,
  StopScoreResult,
} from "../audit/stopScorer.js";

export {
  SupervisorNotifications,
  createSupervisorNotifications,
} from "./notifications.js";
export type { NotificationConfig } from "./notifications.js";
