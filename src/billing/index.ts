/**
 * Billing and Cost Tracking Module
 *
 * Features:
 * - Track API costs by model, user, repo, task
 * - User monthly limits (USD/EUR)
 * - Admin controls for limit management
 * - Automatic model selection to minimize costs
 *
 * Usage:
 * ```typescript
 * import { costTracker, selectModel } from "./billing";
 *
 * // Select optimal model
 * const recommendation = selectModel("Fix typo in README");
 * // => Recommends Haiku (cheapest) for simple tasks
 *
 * // Log cost
 * costTracker.log({
 *   userId: "user-123",
 *   taskId: "task-456",
 *   repo: "my-project",
 *   model: "claude-haiku-3-5",
 *   provider: "anthropic",
 *   inputTokens: 1000,
 *   outputTokens: 500
 * });
 *
 * // Set user limit (admin only)
 * costTracker.setUserLimit({
 *   userId: "user-123",
 *   monthlyLimitUSD: 100,
 *   monthlyLimitEUR: 92,
 *   currency: "USD",
 *   enabled: true,
 *   notifyAt: 80 // Notify at 80%
 * });
 * ```
 */

export { costTracker } from "./costTracker.ts";
export {
  selectModel,
  analyzeTaskComplexity,
  compareCosts,
} from "./modelSelector.ts";
export {
  MODEL_PRICING,
  getModelPricing,
  calculateCost,
  formatCost,
} from "./pricing.ts";
export type {
  ModelPricing,
  CostEntry,
  UserLimit,
  UserUsage,
  LimitStatus,
  CostSummary,
  Currency,
} from "./types.ts";
export type { TaskComplexity, ModelRecommendation } from "./modelSelector.ts";
