/**
 * Cost Tracker - Tracks API costs and enforces user limits
 */

import { randomUUID } from "crypto";
import type {
  CostEntry,
  UserLimit,
  UserUsage,
  LimitStatus,
  CostSummary,
} from "./types.ts";
import { calculateCost, formatCost } from "./pricing.ts";

class CostTracker {
  private costs: Map<string, CostEntry> = new Map();
  private userLimits: Map<string, UserLimit> = new Map();
  private usageCache: Map<string, UserUsage> = new Map();

  /**
   * Log a cost entry
   */
  log(
    entry: Omit<
      CostEntry,
      "id" | "timestamp" | "totalTokens" | "costUSD" | "costEUR"
    >,
  ): CostEntry {
    const { costUSD, costEUR } = calculateCost(
      entry.model,
      entry.inputTokens,
      entry.outputTokens,
    );

    const costEntry: CostEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      totalTokens: entry.inputTokens + entry.outputTokens,
      costUSD,
      costEUR,
      ...entry,
    };

    this.costs.set(costEntry.id, costEntry);

    console.log(
      `💰 Cost logged: ${entry.userId} | ${entry.model} | ${formatCost(costUSD, "USD")} / ${formatCost(costEUR, "EUR")}`,
    );

    // Update usage cache
    this.updateUsageCache(costEntry);

    // Check if user is over limit
    this.checkLimit(entry.userId);

    return costEntry;
  }

  /**
   * Set user limit (Admin only)
   */
  setUserLimit(limit: Omit<UserLimit, "createdAt" | "updatedAt">): UserLimit {
    const existing = this.userLimits.get(limit.userId);

    const userLimit: UserLimit = {
      ...limit,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.userLimits.set(limit.userId, userLimit);

    console.log(
      `✅ User limit set: ${limit.userId} | ${formatCost(limit.monthlyLimitUSD, "USD")} / ${formatCost(limit.monthlyLimitEUR, "EUR")}`,
    );

    return userLimit;
  }

  /**
   * Get user limit
   */
  getUserLimit(userId: string): UserLimit | undefined {
    return this.userLimits.get(userId);
  }

  /**
   * Get all user limits
   */
  getAllLimits(): UserLimit[] {
    return Array.from(this.userLimits.values());
  }

  /**
   * Remove user limit (Admin only)
   */
  removeUserLimit(userId: string): boolean {
    return this.userLimits.delete(userId);
  }

  /**
   * Update usage cache for a user
   */
  private updateUsageCache(entry: CostEntry): void {
    const month = entry.timestamp.substring(0, 7); // YYYY-MM
    const cacheKey = `${entry.userId}:${month}`;

    let usage = this.usageCache.get(cacheKey);

    if (!usage) {
      usage = {
        userId: entry.userId,
        month,
        totalCostUSD: 0,
        totalCostEUR: 0,
        totalTokens: 0,
        requestCount: 0,
        byModel: {},
        byRepo: {},
        byTask: {},
      };
    }

    // Update totals
    usage.totalCostUSD += entry.costUSD;
    usage.totalCostEUR += entry.costEUR;
    usage.totalTokens += entry.totalTokens;
    usage.requestCount += 1;

    // Update by model
    if (!usage.byModel[entry.model]) {
      usage.byModel[entry.model] = {
        costUSD: 0,
        costEUR: 0,
        tokens: 0,
        requests: 0,
      };
    }
    usage.byModel[entry.model].costUSD += entry.costUSD;
    usage.byModel[entry.model].costEUR += entry.costEUR;
    usage.byModel[entry.model].tokens += entry.totalTokens;
    usage.byModel[entry.model].requests += 1;

    // Update by repo
    if (entry.repo) {
      if (!usage.byRepo[entry.repo]) {
        usage.byRepo[entry.repo] = {
          costUSD: 0,
          costEUR: 0,
          tokens: 0,
          requests: 0,
        };
      }
      usage.byRepo[entry.repo].costUSD += entry.costUSD;
      usage.byRepo[entry.repo].costEUR += entry.costEUR;
      usage.byRepo[entry.repo].tokens += entry.totalTokens;
      usage.byRepo[entry.repo].requests += 1;
    }

    // Update by task
    if (entry.taskId) {
      if (!usage.byTask[entry.taskId]) {
        usage.byTask[entry.taskId] = {
          costUSD: 0,
          costEUR: 0,
          tokens: 0,
          requests: 0,
        };
      }
      usage.byTask[entry.taskId].costUSD += entry.costUSD;
      usage.byTask[entry.taskId].costEUR += entry.costEUR;
      usage.byTask[entry.taskId].tokens += entry.totalTokens;
      usage.byTask[entry.taskId].requests += 1;
    }

    this.usageCache.set(cacheKey, usage);
  }

  /**
   * Get user usage for current month
   */
  getUserUsage(userId: string, month?: string): UserUsage | undefined {
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const cacheKey = `${userId}:${targetMonth}`;
    return this.usageCache.get(cacheKey);
  }

  /**
   * Check if user is over limit
   */
  checkLimit(userId: string): LimitStatus | null {
    const limit = this.userLimits.get(userId);
    if (!limit || !limit.enabled) return null;

    const usage = this.getUserUsage(userId);
    if (!usage) return null;

    const percentageUsedUSD =
      (usage.totalCostUSD / limit.monthlyLimitUSD) * 100;
    const percentageUsedEUR =
      (usage.totalCostEUR / limit.monthlyLimitEUR) * 100;
    const remainingUSD = limit.monthlyLimitUSD - usage.totalCostUSD;
    const remainingEUR = limit.monthlyLimitEUR - usage.totalCostEUR;

    const isOverLimit =
      limit.currency === "USD"
        ? usage.totalCostUSD >= limit.monthlyLimitUSD
        : usage.totalCostEUR >= limit.monthlyLimitEUR;

    const shouldNotify =
      limit.currency === "USD"
        ? percentageUsedUSD >= limit.notifyAt
        : percentageUsedEUR >= limit.notifyAt;

    const status: LimitStatus = {
      userId,
      limit,
      usage,
      percentageUsedUSD,
      percentageUsedEUR,
      remainingUSD,
      remainingEUR,
      isOverLimit,
      shouldNotify,
    };

    if (isOverLimit) {
      console.warn(
        `⚠️  User ${userId} is OVER LIMIT: ${formatCost(usage.totalCostUSD, "USD")} / ${formatCost(limit.monthlyLimitUSD, "USD")}`,
      );
    } else if (shouldNotify) {
      console.warn(
        `⚠️  User ${userId} reached ${percentageUsedUSD.toFixed(1)}% of limit`,
      );
    }

    return status;
  }

  /**
   * Get cost summary for a time period
   */
  getSummary(startDate: string, endDate: string): CostSummary {
    const relevantCosts = Array.from(this.costs.values()).filter(
      (cost) => cost.timestamp >= startDate && cost.timestamp <= endDate,
    );

    const summary: CostSummary = {
      totalCostUSD: 0,
      totalCostEUR: 0,
      totalTokens: 0,
      requestCount: relevantCosts.length,
      byModel: {},
      byUser: {},
      byRepo: {},
      byTask: {},
      period: { start: startDate, end: endDate },
    };

    for (const cost of relevantCosts) {
      summary.totalCostUSD += cost.costUSD;
      summary.totalCostEUR += cost.costEUR;
      summary.totalTokens += cost.totalTokens;

      // By model
      if (!summary.byModel[cost.model]) {
        summary.byModel[cost.model] = { costUSD: 0, costEUR: 0, tokens: 0 };
      }
      summary.byModel[cost.model].costUSD += cost.costUSD;
      summary.byModel[cost.model].costEUR += cost.costEUR;
      summary.byModel[cost.model].tokens += cost.totalTokens;

      // By user
      if (!summary.byUser[cost.userId]) {
        summary.byUser[cost.userId] = { costUSD: 0, costEUR: 0, tokens: 0 };
      }
      summary.byUser[cost.userId].costUSD += cost.costUSD;
      summary.byUser[cost.userId].costEUR += cost.costEUR;
      summary.byUser[cost.userId].tokens += cost.totalTokens;

      // By repo
      if (cost.repo) {
        if (!summary.byRepo[cost.repo]) {
          summary.byRepo[cost.repo] = { costUSD: 0, costEUR: 0, tokens: 0 };
        }
        summary.byRepo[cost.repo].costUSD += cost.costUSD;
        summary.byRepo[cost.repo].costEUR += cost.costEUR;
        summary.byRepo[cost.repo].tokens += cost.totalTokens;
      }

      // By task
      if (cost.taskId) {
        if (!summary.byTask[cost.taskId]) {
          summary.byTask[cost.taskId] = { costUSD: 0, costEUR: 0, tokens: 0 };
        }
        summary.byTask[cost.taskId].costUSD += cost.costUSD;
        summary.byTask[cost.taskId].costEUR += cost.costEUR;
        summary.byTask[cost.taskId].tokens += cost.totalTokens;
      }
    }

    return summary;
  }

  /**
   * Get all cost entries
   */
  getAllCosts(limit = 1000): CostEntry[] {
    return Array.from(this.costs.values())
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);
  }

  /**
   * Clear old cost entries (older than specified days)
   */
  clearOldCosts(days = 90): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    let deleted = 0;
    for (const [id, cost] of this.costs.entries()) {
      if (new Date(cost.timestamp) < cutoff) {
        this.costs.delete(id);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`🧹 Cleared ${deleted} old cost entries`);
    }

    return deleted;
  }
}

// Singleton instance
export const costTracker = new CostTracker();
