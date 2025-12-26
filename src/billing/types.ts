/**
 * Billing and Cost Tracking Types
 */

export type Currency = "USD" | "EUR";

export interface ModelPricing {
  model: string;
  provider: "anthropic" | "openai" | "xai" | "ollama";
  inputTokenCost: number; // Cost per 1000 input tokens
  outputTokenCost: number; // Cost per 1000 output tokens
  currency: Currency;
}

export interface CostEntry {
  id: string;
  timestamp: string;
  userId: string;
  taskId?: string;
  repo?: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  costEUR: number;
  metadata?: Record<string, unknown>;
}

export interface UserLimit {
  userId: string;
  monthlyLimitUSD: number;
  monthlyLimitEUR: number;
  currency: Currency;
  enabled: boolean;
  notifyAt: number; // Percentage threshold for notification (e.g., 80)
  createdAt: string;
  updatedAt?: string;
}

export interface UserUsage {
  userId: string;
  month: string; // Format: YYYY-MM
  totalCostUSD: number;
  totalCostEUR: number;
  totalTokens: number;
  requestCount: number;
  byModel: Record<
    string,
    {
      costUSD: number;
      costEUR: number;
      tokens: number;
      requests: number;
    }
  >;
  byRepo: Record<
    string,
    {
      costUSD: number;
      costEUR: number;
      tokens: number;
      requests: number;
    }
  >;
  byTask: Record<
    string,
    {
      costUSD: number;
      costEUR: number;
      tokens: number;
      requests: number;
    }
  >;
}

export interface CostSummary {
  totalCostUSD: number;
  totalCostEUR: number;
  totalTokens: number;
  requestCount: number;
  byModel: Record<string, { costUSD: number; costEUR: number; tokens: number }>;
  byUser: Record<string, { costUSD: number; costEUR: number; tokens: number }>;
  byRepo: Record<string, { costUSD: number; costEUR: number; tokens: number }>;
  byTask: Record<string, { costUSD: number; costEUR: number; tokens: number }>;
  period: {
    start: string;
    end: string;
  };
}

export interface LimitStatus {
  userId: string;
  limit: UserLimit;
  usage: UserUsage;
  percentageUsedUSD: number;
  percentageUsedEUR: number;
  remainingUSD: number;
  remainingEUR: number;
  isOverLimit: boolean;
  shouldNotify: boolean;
}
