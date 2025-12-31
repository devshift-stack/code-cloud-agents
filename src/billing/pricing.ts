/**
 * Model Pricing Configuration
 *
 * Pricing as of December 2024
 * Source: Official pricing pages
 */

import type { ModelPricing } from "./types.ts";

export const MODEL_PRICING: ModelPricing[] = [
  // Anthropic Claude
  {
    model: "claude-opus-4-5",
    provider: "anthropic",
    inputTokenCost: 15.0, // $15 per 1M input tokens
    outputTokenCost: 75.0, // $75 per 1M output tokens
    currency: "USD",
  },
  {
    model: "claude-sonnet-4-5",
    provider: "anthropic",
    inputTokenCost: 3.0, // $3 per 1M input tokens
    outputTokenCost: 15.0, // $15 per 1M output tokens
    currency: "USD",
  },
  {
    model: "claude-sonnet-3-5",
    provider: "anthropic",
    inputTokenCost: 3.0,
    outputTokenCost: 15.0,
    currency: "USD",
  },
  {
    model: "claude-haiku-3-5",
    provider: "anthropic",
    inputTokenCost: 0.25, // $0.25 per 1M input tokens
    outputTokenCost: 1.25, // $1.25 per 1M output tokens
    currency: "USD",
  },

  // OpenAI GPT
  {
    model: "gpt-4",
    provider: "openai",
    inputTokenCost: 30.0, // $30 per 1M input tokens
    outputTokenCost: 60.0, // $60 per 1M output tokens
    currency: "USD",
  },
  {
    model: "gpt-4-turbo",
    provider: "openai",
    inputTokenCost: 10.0,
    outputTokenCost: 30.0,
    currency: "USD",
  },
  {
    model: "gpt-3.5-turbo",
    provider: "openai",
    inputTokenCost: 0.5, // $0.50 per 1M input tokens
    outputTokenCost: 1.5, // $1.50 per 1M output tokens
    currency: "USD",
  },

  // xAI Grok
  {
    model: "grok-beta",
    provider: "xai",
    inputTokenCost: 5.0, // $5 per 1M input tokens
    outputTokenCost: 15.0, // $15 per 1M output tokens
    currency: "USD",
  },

  // Ollama (Local - FREE)
  {
    model: "llama3",
    provider: "ollama",
    inputTokenCost: 0.0,
    outputTokenCost: 0.0,
    currency: "USD",
  },
  {
    model: "mistral",
    provider: "ollama",
    inputTokenCost: 0.0,
    outputTokenCost: 0.0,
    currency: "USD",
  },
  {
    model: "codellama",
    provider: "ollama",
    inputTokenCost: 0.0,
    outputTokenCost: 0.0,
    currency: "USD",
  },
];

/**
 * USD to EUR exchange rate (update regularly)
 */
export const USD_TO_EUR_RATE = 0.92; // Approximate rate

/**
 * Get pricing for a specific model
 */
export function getModelPricing(model: string): ModelPricing | undefined {
  return MODEL_PRICING.find(
    (p) =>
      p.model === model || model.toLowerCase().includes(p.model.toLowerCase()),
  );
}

/**
 * Calculate cost for a given token usage
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { costUSD: number; costEUR: number } {
  const pricing = getModelPricing(model);

  if (!pricing) {
    console.warn(`⚠️  No pricing found for model: ${model}`);
    return { costUSD: 0, costEUR: 0 };
  }

  // Calculate cost per 1000 tokens, then scale to actual usage
  const inputCostUSD = (inputTokens / 1_000_000) * pricing.inputTokenCost;
  const outputCostUSD = (outputTokens / 1_000_000) * pricing.outputTokenCost;
  const totalCostUSD = inputCostUSD + outputCostUSD;

  const totalCostEUR = totalCostUSD * USD_TO_EUR_RATE;

  return {
    costUSD: parseFloat(totalCostUSD.toFixed(6)),
    costEUR: parseFloat(totalCostEUR.toFixed(6)),
  };
}

/**
 * Format cost for display
 */
export function formatCost(cost: number, currency: "USD" | "EUR"): string {
  const symbol = currency === "USD" ? "$" : "€";
  return `${symbol}${cost.toFixed(4)}`;
}
