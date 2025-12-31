/**
 * Sentry Error Monitoring Integration
 * Captures and reports errors to Sentry for production monitoring
 * Includes AI Agent Monitoring for LLM calls and Profiling
 */

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { Request, Response, NextFunction } from "express";

// Note: Read env vars inside functions, not at module scope,
// to ensure dotenv.config() has run first
let SENTRY_DSN: string | undefined;

/**
 * Initialize Sentry SDK with AI monitoring and Logs
 * Must be called AFTER dotenv.config() has run
 */
export function initSentry(): boolean {
  // Read env vars now (after dotenv has loaded)
  SENTRY_DSN = process.env.SENTRY_DSN;
  const NODE_ENV = process.env.NODE_ENV ?? "development";
  const SENTRY_RELEASE =
    process.env.SENTRY_RELEASE || process.env.npm_package_version || "0.1.0";

  if (!SENTRY_DSN) {
    console.log("⚠️  Sentry: No DSN configured, error tracking disabled");
    return false;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    release: SENTRY_RELEASE,
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
    // Distributed Tracing - propagate trace context to connected services
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/.*\.activi\.dev/,
      /^http:\/\/178\.156\.178\.70/,
      /^http:\/\/49\.13\.158\.176/,
    ],
    // Enhanced Data Scrubbing
    beforeSend(event) {
      // Redact sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers["x-api-key"];
      }
      // Redact sensitive body fields
      if (event.request?.data && typeof event.request.data === "object") {
        const sensitiveKeys = [
          "password",
          "token",
          "apiKey",
          "secret",
          "api_key",
          "access_token",
        ];
        const data = event.request.data as Record<string, unknown>;
        for (const key of sensitiveKeys) {
          if (key in data) {
            data[key] = "[REDACTED]";
          }
        }
      }
      // Redact from extra context
      if (event.extra) {
        const sensitiveKeys = ["password", "token", "apiKey", "secret"];
        for (const key of sensitiveKeys) {
          if (key in event.extra) {
            event.extra[key] = "[REDACTED]";
          }
        }
      }
      return event;
    },
    // Ignore common non-actionable errors
    ignoreErrors: ["ECONNRESET", "ECONNREFUSED", "socket hang up", "ETIMEDOUT"],
  });

  console.log(
    "✅ Sentry initialized with AI monitoring + Logs + Profiling (env:",
    NODE_ENV,
    ")",
  );
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
export function captureException(
  error: Error,
  context?: Record<string, unknown>,
): string | null {
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
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
): string | null {
  if (!SENTRY_DSN) {
    console.log(`[${level.toUpperCase()}] ${message}`);
    return null;
  }

  return Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(
  user: { id: string; email?: string; username?: string } | null,
): void {
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
  fn: () => Promise<
    T & { tokens?: { input: number; output: number }; cost?: { usd: number } }
  >,
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
          span.setAttribute(
            "ai.usage.total_tokens",
            result.tokens.input + result.tokens.output,
          );
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
    },
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
  attributes?: LogAttributes,
): void {
  if (!SENTRY_DSN) {
    // Fallback to console
    const consoleFn =
      level === "fatal" ? "error" : level === "trace" ? "debug" : level;
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
  trace: (message: string, attrs?: LogAttributes) =>
    sentryLog("trace", message, attrs),
  debug: (message: string, attrs?: LogAttributes) =>
    sentryLog("debug", message, attrs),
  info: (message: string, attrs?: LogAttributes) =>
    sentryLog("info", message, attrs),
  warn: (message: string, attrs?: LogAttributes) =>
    sentryLog("warn", message, attrs),
  error: (message: string, attrs?: LogAttributes) =>
    sentryLog("error", message, attrs),
  fatal: (message: string, attrs?: LogAttributes) =>
    sentryLog("fatal", message, attrs),
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
    Sentry.metrics.count(name, 1, {
      attributes: { ...tags, unique_id: String(value) },
    });
  },

  /**
   * Timing helper - Measure execution time
   */
  timing: async <T>(
    name: string,
    fn: () => Promise<T>,
    tags?: MetricTags,
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      if (SENTRY_DSN) {
        Sentry.metrics.distribution(name, duration, {
          attributes: tags,
          unit: "millisecond",
        });
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      if (SENTRY_DSN) {
        Sentry.metrics.distribution(name, duration, {
          attributes: { ...tags, error: "true" },
          unit: "millisecond",
        });
      }
      throw error;
    }
  },
};

// ============================================
// SENTRY CRON MONITORING
// ============================================

interface CronMonitorConfig {
  /** Unique identifier for this cron job */
  slug: string;
  /** Cron schedule in crontab format (e.g., "0 * * * *" for hourly) */
  schedule: string;
  /** Maximum runtime in minutes before considered failed */
  maxRuntimeMinutes?: number;
  /** Timezone for the schedule (default: UTC) */
  timezone?: string;
}

/**
 * Sentry Cron Monitoring - Track scheduled jobs
 *
 * Usage:
 * ```typescript
 * const checkIn = cronMonitor.start("daily-cleanup");
 * try {
 *   await runCleanup();
 *   cronMonitor.success(checkIn);
 * } catch (error) {
 *   cronMonitor.failure(checkIn, error);
 * }
 * ```
 *
 * Or use the wrapper:
 * ```typescript
 * await cronMonitor.wrap("daily-cleanup", async () => {
 *   await runCleanup();
 * });
 * ```
 */
export const cronMonitor = {
  /**
   * Start a cron check-in (call when job starts)
   * @param slug - Unique identifier for this cron job
   * @returns Check-in ID to use with success/failure
   */
  start: (slug: string): string | null => {
    if (!SENTRY_DSN) return null;
    return Sentry.captureCheckIn({
      monitorSlug: slug,
      status: "in_progress",
    });
  },

  /**
   * Mark cron job as successful
   * @param checkInId - The ID returned from start()
   */
  success: (checkInId: string | null): void => {
    if (!SENTRY_DSN || !checkInId) return;
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "",
      status: "ok",
    });
  },

  /**
   * Mark cron job as failed
   * @param checkInId - The ID returned from start()
   * @param error - Optional error to capture
   */
  failure: (checkInId: string | null, error?: Error): void => {
    if (!SENTRY_DSN || !checkInId) return;
    if (error) {
      Sentry.captureException(error);
    }
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: "",
      status: "error",
    });
  },

  /**
   * Wrap a cron job function with automatic monitoring
   * @param slug - Unique identifier for this cron job
   * @param fn - The cron job function to run
   * @param config - Optional monitor configuration
   */
  wrap: async <T>(
    slug: string,
    fn: () => Promise<T>,
    config?: Omit<CronMonitorConfig, "slug">,
  ): Promise<T> => {
    if (!SENTRY_DSN) {
      return fn();
    }

    // Create or update monitor configuration
    // Note: MonitorConfig type may not be exported in all Sentry versions
    const monitorConfig = {
      schedule: {
        type: "crontab" as const,
        value: config?.schedule || "* * * * *",
      },
      timezone: config?.timezone || "UTC",
      ...(config?.maxRuntimeMinutes && {
        maxRuntime: config.maxRuntimeMinutes * 60,
      }),
    };

    return Sentry.withMonitor(
      slug,
      async () => {
        return fn();
      },
      monitorConfig,
    );
  },

  /**
   * Create a heartbeat check-in (for long-running processes)
   * Call periodically to indicate the process is still alive
   * @param slug - Unique identifier for this process
   */
  heartbeat: (slug: string): void => {
    if (!SENTRY_DSN) return;
    Sentry.captureCheckIn({
      monitorSlug: slug,
      status: "ok",
    });
  },
};
