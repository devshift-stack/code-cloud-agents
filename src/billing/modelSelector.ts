/**
 * Model Selector - Supervisor chooses optimal model to minimize costs
 *
 * Decision logic:
 * - Simple tasks → Haiku (cheapest)
 * - Medium complexity → Sonnet (balanced)
 * - High complexity → Opus (most capable)
 * - Local preference → Ollama (free)
 */

export type TaskComplexity = "simple" | "medium" | "high";

export interface ModelRecommendation {
  model: string;
  provider: "anthropic" | "openai" | "xai" | "ollama";
  reasoning: string;
  estimatedCostUSD: number;
  estimatedCostEUR: number;
}

/**
 * Analyze task complexity based on description
 */
export function analyzeTaskComplexity(taskDescription: string): TaskComplexity {
  const desc = taskDescription.toLowerCase();

  // High complexity indicators
  const highComplexityKeywords = [
    "refactor",
    "architect",
    "design system",
    "migration",
    "complex",
    "multi-step",
    "integration",
    "security",
    "performance optimization",
    "algorithm",
    "ai model",
  ];

  // Simple task indicators
  const simpleKeywords = [
    "typo",
    "fix typo",
    "update text",
    "change color",
    "add comment",
    "simple fix",
    "quick fix",
    "minor",
    "small",
  ];

  // Check for high complexity
  if (highComplexityKeywords.some((keyword) => desc.includes(keyword))) {
    return "high";
  }

  // Check for simple tasks
  if (simpleKeywords.some((keyword) => desc.includes(keyword))) {
    return "simple";
  }

  // Default to medium
  return "medium";
}

/**
 * Select optimal model based on task complexity and preferences
 */
export function selectModel(
  taskDescription: string,
  options: {
    preferLocal?: boolean;
    maxCostUSD?: number;
    forceModel?: string;
  } = {},
): ModelRecommendation {
  const complexity = analyzeTaskComplexity(taskDescription);

  // If forceModel is specified, use it
  if (options.forceModel) {
    return {
      model: options.forceModel,
      provider: getProviderForModel(options.forceModel),
      reasoning: "Forced by user preference",
      estimatedCostUSD: estimateCost(options.forceModel, 1000, 500).costUSD,
      estimatedCostEUR: estimateCost(options.forceModel, 1000, 500).costEUR,
    };
  }

  // Prefer local models if requested
  if (options.preferLocal) {
    return {
      model: "llama3",
      provider: "ollama",
      reasoning: "Local model preferred (FREE)",
      estimatedCostUSD: 0,
      estimatedCostEUR: 0,
    };
  }

  // Select based on complexity
  switch (complexity) {
    case "simple":
      // Use cheapest model for simple tasks
      return {
        model: "claude-haiku-3-5",
        provider: "anthropic",
        reasoning: "Simple task - using most cost-effective model (Haiku)",
        estimatedCostUSD: estimateCost("claude-haiku-3-5", 1000, 500).costUSD,
        estimatedCostEUR: estimateCost("claude-haiku-3-5", 1000, 500).costEUR,
      };

    case "medium":
      // Use balanced model
      if (options.maxCostUSD && options.maxCostUSD < 0.01) {
        // Budget constrained - use Haiku
        return {
          model: "claude-haiku-3-5",
          provider: "anthropic",
          reasoning: "Budget constrained - using Haiku for medium task",
          estimatedCostUSD: estimateCost("claude-haiku-3-5", 2000, 1000)
            .costUSD,
          estimatedCostEUR: estimateCost("claude-haiku-3-5", 2000, 1000)
            .costEUR,
        };
      }

      return {
        model: "claude-sonnet-4-5",
        provider: "anthropic",
        reasoning: "Medium complexity - using balanced model (Sonnet)",
        estimatedCostUSD: estimateCost("claude-sonnet-4-5", 2000, 1000).costUSD,
        estimatedCostEUR: estimateCost("claude-sonnet-4-5", 2000, 1000).costEUR,
      };

    case "high":
      // Use most capable model
      if (options.maxCostUSD && options.maxCostUSD < 0.05) {
        // Budget constrained - use Sonnet instead of Opus
        return {
          model: "claude-sonnet-4-5",
          provider: "anthropic",
          reasoning: "High complexity but budget constrained - using Sonnet",
          estimatedCostUSD: estimateCost("claude-sonnet-4-5", 5000, 2000)
            .costUSD,
          estimatedCostEUR: estimateCost("claude-sonnet-4-5", 5000, 2000)
            .costEUR,
        };
      }

      return {
        model: "claude-opus-4-5",
        provider: "anthropic",
        reasoning: "High complexity - using most capable model (Opus)",
        estimatedCostUSD: estimateCost("claude-opus-4-5", 5000, 2000).costUSD,
        estimatedCostEUR: estimateCost("claude-opus-4-5", 5000, 2000).costEUR,
      };
  }
}

/**
 * Get provider for a specific model
 */
function getProviderForModel(
  model: string,
): "anthropic" | "openai" | "xai" | "ollama" {
  if (model.startsWith("claude")) return "anthropic";
  if (model.startsWith("gpt")) return "openai";
  if (model.startsWith("grok")) return "xai";
  return "ollama";
}

/**
 * Estimate cost for a model (rough estimate)
 */
function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { costUSD: number; costEUR: number } {
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-opus-4-5": { input: 15.0, output: 75.0 },
    "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
    "claude-haiku-3-5": { input: 0.25, output: 1.25 },
    "gpt-4": { input: 30.0, output: 60.0 },
    "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
    "grok-beta": { input: 5.0, output: 15.0 },
    llama3: { input: 0, output: 0 },
  };

  const price = pricing[model] || { input: 3.0, output: 15.0 };

  const costUSD =
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output;
  const costEUR = costUSD * 0.92;

  return {
    costUSD: parseFloat(costUSD.toFixed(6)),
    costEUR: parseFloat(costEUR.toFixed(6)),
  };
}

/**
 * Compare cost of different models for the same task
 */
export function compareCosts(
  taskDescription: string,
  models: string[],
): ModelRecommendation[] {
  return models.map((model) => {
    const complexity = analyzeTaskComplexity(taskDescription);
    const tokens =
      complexity === "simple"
        ? { input: 1000, output: 500 }
        : complexity === "medium"
          ? { input: 2000, output: 1000 }
          : { input: 5000, output: 2000 };

    const cost = estimateCost(model, tokens.input, tokens.output);

    return {
      model,
      provider: getProviderForModel(model),
      reasoning: `Estimated for ${complexity} complexity task`,
      estimatedCostUSD: cost.costUSD,
      estimatedCostEUR: cost.costEUR,
    };
  });
}
