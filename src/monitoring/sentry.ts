/**
 * Sentry Error Monitoring Integration
 * Captures and reports errors to Sentry for production monitoring
 * Includes AI Agent Monitoring for LLM calls
 */

import * as Sentry from "@sentry/node";
import type { Request, Response, NextFunction } from "express";

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV ?? "development";

/**
 * Initialize Sentry SDK with AI monitoring
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
    tracesSampleRate: NODE_ENV === "production" ? 0.2 : 1.0,
    // Enable AI monitoring
    sendDefaultPii: true,
    beforeSend(event) {
      // Redact sensitive data
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });

  console.log("✅ Sentry initialized with AI monitoring (env:", NODE_ENV, ")");
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
