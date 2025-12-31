/**
 * Sentry Error Monitoring Integration
 * Captures and reports errors to Sentry for production monitoring
 * Includes AI Agent Monitoring for LLM calls and Profiling
 */

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { Request, Response, NextFunction } from "express";

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV ?? "development";

/**
 * Initialize Sentry SDK with AI monitoring and Logs
 * Must be called before any other code runs
 */
export function initSentry(): boolean {
  if (!SENTRY_DSN) {
    console.log("⚠️  Sentry: No DSN configured, error tracking disabled");
    return false;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    integrations: [
      // Profiling integration for performance analysis
      nodeProfilingIntegration(),
      // OpenAI automatic instrumentation
      Sentry.openAIIntegration({
        recordInputs: true,
        recordOutputs: true,
      }),
      // Anthropic automatic instrumentation
      Sentry.anthropicAIIntegration({
        recordInputs: true,
        recordOutputs: true,
      }),
      // Send console.log, console.warn, console.error as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    // Tracing must be enabled for AI monitoring and Profiling
    tracesSampleRate: 1.0,
    // Set sampling rate for profiling - evaluated once per SDK.init call
    profileSessionSampleRate: 1.0,
    // Trace lifecycle automatically enables profiling during active traces
    profileLifecycle: "trace",
    sendDefaultPii: true,
    // Enable Sentry Logs
    _experiments: {
      enableLogs: true,
    },
    beforeSend(event) {
      // Redact sensitive data
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });

  console.log("✅ Sentry initialized with AI monitoring + Logs + Profiling (env:", NODE_ENV, ")");
  return true;
}

/**
 * Sentry request handler middleware (no-op in v8, automatic instrumentation)
 */
export function sentryRequestHandler() {
  return (_req: Request, _res: Response, next: NextFunction) => next();
}

/**
 * Sentry tracing handler middleware (no-op in v8, automatic instrumentation)
 */
export function sentryTracingHandler() {
  return (_req: Request, _res: Response, next: NextFunction) => next();
}

/**
 * Sentry error handler middleware
 * Captures errors and sends to Sentry
 */
export function sentryErrorHandler() {
  return (err: Error, req: Request, _res: Response, next: NextFunction) => {
    if (SENTRY_DSN) {
      Sentry.captureException(err, {
        extra: {
          url: req.url,
          method: req.method,
          body: req.body,
        },
      });
    }
    next(err);
  };
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, unknown>): string | null {
  if (!SENTRY_DSN) {
    console.error("❌ Error (Sentry disabled):", error.message);
    return null;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message manually
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info"): string | null {
  if (!SENTRY_DSN) {
    console.log(`[${level.toUpperCase()}] ${message}`);
    return null;
  }

  return Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: "debug" | "info" | "warning" | "error";
  data?: Record<string, unknown>;
}): void {
  if (!SENTRY_DSN) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Flush pending events before shutdown
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  if (!SENTRY_DSN) return true;
  return Sentry.close(timeout);
}

/**
 * Track AI/LLM call with Sentry
 * Creates a span for AI monitoring dashboard
 */
export async function trackAICall<T>(
  options: {
    provider: string;
    model: string;
    agentName: string;
    prompt: string;
  },
  fn: () => Promise<T & { tokens?: { input: number; output: number }; cost?: { usd: number } }>
): Promise<T> {
  if (!SENTRY_DSN) {
    return fn();
  }

  return Sentry.startSpan(
    {
      op: "ai.chat_completions.create",
      name: `${options.provider}/${options.model}`,
      attributes: {
        "ai.model.id": options.model,
        "ai.model.provider": options.provider,
        "ai.agent.name": options.agentName,
        "ai.prompt.length": options.prompt.length,
      },
    },
    async (span) => {
      try {
        const result = await fn();

        // Add token and cost metrics
        if (result.tokens) {
          span.setAttribute("ai.usage.input_tokens", result.tokens.input);
          span.setAttribute("ai.usage.output_tokens", result.tokens.output);
          span.setAttribute("ai.usage.total_tokens", result.tokens.input + result.tokens.output);
        }
        if (result.cost) {
          span.setAttribute("ai.usage.cost_usd", result.cost.usd);
        }

        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: String(error) }); // ERROR
        throw error;
      }
    }
  );
}

// ============================================
// SENTRY LOGS - Real-time logging to Sentry
// ============================================

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

interface LogAttributes {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Send a log message to Sentry Logs
 * @param level - Log level (trace, debug, info, warn, error, fatal)
 * @param message - Log message (supports printf-style formatting)
 * @param attributes - Additional attributes to attach to the log
 */
export function sentryLog(
  level: LogLevel,
  message: string,
  attributes?: LogAttributes
): void {
  if (!SENTRY_DSN) {
    // Fallback to console
    const consoleFn = level === "fatal" ? "error" : level === "trace" ? "debug" : level;
    console[consoleFn]?.(`[${level.toUpperCase()}]`, message, attributes || "");
    return;
  }

  const logger = Sentry.logger;

  switch (level) {
    case "trace":
      logger.trace(message, attributes);
      break;
    case "debug":
      logger.debug(message, attributes);
      break;
    case "info":
      logger.info(message, attributes);
      break;
    case "warn":
      logger.warn(message, attributes);
      break;
    case "error":
      logger.error(message, attributes);
      break;
    case "fatal":
      logger.fatal(message, attributes);
      break;
  }
}

// Convenience functions for each log level
export const log = {
  trace: (message: string, attrs?: LogAttributes) => sentryLog("trace", message, attrs),
  debug: (message: string, attrs?: LogAttributes) => sentryLog("debug", message, attrs),
  info: (message: string, attrs?: LogAttributes) => sentryLog("info", message, attrs),
  warn: (message: string, attrs?: LogAttributes) => sentryLog("warn", message, attrs),
  error: (message: string, attrs?: LogAttributes) => sentryLog("error", message, attrs),
  fatal: (message: string, attrs?: LogAttributes) => sentryLog("fatal", message, attrs),
};

/**
 * Flush all pending logs before shutdown
 */
export async function flushLogs(timeout = 2000): Promise<boolean> {
  if (!SENTRY_DSN) return true;
  return Sentry.flush(timeout);
}

// ============================================
// SENTRY METRICS - Application metrics
// ============================================

type MetricTags = Record<string, string>;

/**
 * Sentry Metrics - Track application metrics
 *
 * Usage:
 * metrics.increment("api.requests", 1, { endpoint: "/health" });
 * metrics.gauge("queue.size", 42);
 * metrics.distribution("response.time", 235, { route: "/api/chat" });
 * metrics.set("users.active", "user-123");
 */
export const metrics = {
  /**
   * Counter - Count incrementing values (e.g., request count, errors)
   * @param name - Metric name
   * @param value - Value to increment (default 1)
   * @param tags - Additional attributes for filtering
   */
  increment: (name: string, value = 1, tags?: MetricTags) => {
    if (!SENTRY_DSN) return;
    Sentry.metrics.count(name, value, { attributes: tags });
  },

  /**
   * Gauge - Set a value that can go up or down (e.g., queue size, memory usage)
   */
  gauge: (name: string, value: number, tags?: MetricTags) => {
    if (!SENTRY_DSN) return;
    Sentry.metrics.gauge(name, value, { attributes: tags });
  },

  /**
   * Distribution - Track value distributions (e.g., response times, sizes)
   */
  distribution: (name: string, value: number, tags?: MetricTags) => {
    if (!SENTRY_DSN) return;
    Sentry.metrics.distribution(name, value, { attributes: tags });
  },

  /**
   * Set - Track unique values (e.g., unique users, unique IPs)
   * Note: @sentry/node uses count for unique tracking with unique attribute
   */
  set: (name: string, value: string | number, tags?: MetricTags) => {
    if (!SENTRY_DSN) return;
    // Use count with unique identifier as attribute
    Sentry.metrics.count(name, 1, { attributes: { ...tags, unique_id: String(value) } });
  },

  /**
   * Timing helper - Measure execution time
   */
  timing: async <T>(name: string, fn: () => Promise<T>, tags?: MetricTags): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      if (SENTRY_DSN) {
        Sentry.metrics.distribution(name, duration, { attributes: tags, unit: "millisecond" });
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      if (SENTRY_DSN) {
        Sentry.metrics.distribution(name, duration, {
          attributes: { ...tags, error: "true" },
          unit: "millisecond"
        });
      }
      throw error;
    }
  },
};
