/**
 * Rate Limiter Module
 * Prevents brute force attacks on authentication endpoints
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  /**
   * Message to send when rate limit is exceeded
   */
  message?: string;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limit store
 * TODO: Replace with Redis for production
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

/**
 * Get rate limit key from request
 * Uses IP address as identifier
 */
function getRateLimitKey(req: Request, prefix: string): string {
  // Get real IP from X-Forwarded-For header (if behind proxy) or use socket IP
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  return `${prefix}:${ip}`;
}

/**
 * Create rate limiting middleware
 * @param config - Rate limit configuration
 * @returns Express middleware function
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs, message } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getRateLimitKey(req, "rate-limit");
    const now = Date.now();

    // Get or create entry
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetAt: now + windowMs,
      };
      rateLimitStore.set(key, entry);
      return next();
    }

    // Increment count
    entry.count++;

    if (entry.count > maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000); // seconds

      res.status(429).json({
        error: message || "Too many requests, please try again later",
        retryAfter,
        limit: maxRequests,
        windowMs,
      });
      return;
    }

    // Allow request
    next();
  };
}

/**
 * Preset: Login rate limiter
 * 5 attempts per 15 minutes
 */
export const loginRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: "Too many login attempts, please try again in 15 minutes",
});

/**
 * Preset: Password reset rate limiter
 * 3 attempts per hour
 */
export const passwordResetRateLimiter = createRateLimiter({
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too many password reset requests, please try again in 1 hour",
});

/**
 * Preset: Email verification rate limiter
 * 3 attempts per hour
 */
export const emailVerificationRateLimiter = createRateLimiter({
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too many verification emails sent, please try again in 1 hour",
});

/**
 * Manually reset rate limit for a request
 * Useful for testing or manual intervention
 */
export function resetRateLimit(req: Request, prefix: string): void {
  const key = getRateLimitKey(req, prefix);
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status for a request
 */
export function getRateLimitStatus(
  req: Request,
  prefix: string
): { count: number; limit: number; resetAt: number } | null {
  const key = getRateLimitKey(req, prefix);
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return null;
  }

  return {
    count: entry.count,
    limit: 0, // Would need to store config to return this
    resetAt: entry.resetAt,
  };
}
