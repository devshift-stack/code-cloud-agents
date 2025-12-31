/**
 * Rate Limiter Module
 * Prevents brute force attacks on authentication endpoints
 * Supports Redis for production, falls back to in-memory for development
 */

import type { Request, Response, NextFunction } from "express";

// Optional Redis import - falls back to in-memory if not available
let Redis: any = null;
try {
  Redis = require("ioredis");
} catch {
  console.log("ℹ️ ioredis not installed, using in-memory rate limiting only");
}

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
  /**
   * Prefix for Redis keys
   */
  keyPrefix?: string;
}

/**
 * Rate limit entry (for in-memory store)
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Redis client singleton
 */
let redisClient: any = null;
let redisAvailable = false;

/**
 * Initialize Redis connection
 */
function initRedis(): void {
  // Skip if ioredis is not installed
  if (!Redis) {
    console.log("ℹ️ ioredis not available, using in-memory rate limiting");
    return;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redisClient.on("connect", () => {
      console.log("✅ Rate limiter connected to Redis");
      redisAvailable = true;
    });

    redisClient.on("error", (err: Error) => {
      console.warn(
        "⚠️ Redis connection error, falling back to in-memory rate limiting:",
        err.message,
      );
      redisAvailable = false;
    });

    redisClient.on("close", () => {
      console.warn("⚠️ Redis connection closed, using in-memory rate limiting");
      redisAvailable = false;
    });

    // Attempt to connect
    redisClient.connect().catch(() => {
      console.log("ℹ️ Redis not available, using in-memory rate limiting");
      redisAvailable = false;
    });
  } catch (err) {
    console.log(
      "ℹ️ Redis initialization failed, using in-memory rate limiting",
    );
    redisAvailable = false;
  }
}

// Initialize Redis on module load
initRedis();

/**
 * In-memory rate limit store (fallback)
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically (for in-memory store)
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
  const ip =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const ipStr = Array.isArray(ip) ? ip[0] : ip;
  return `ratelimit:${prefix}:${ipStr}`;
}

/**
 * Check rate limit using Redis
 */
async function checkRateLimitRedis(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; count: number; resetAt: number }> {
  if (!redisClient || !redisAvailable) {
    throw new Error("Redis not available");
  }

  const now = Date.now();
  const windowKey = `${key}:${Math.floor(now / windowMs)}`;

  // Use Redis MULTI for atomic increment
  const pipeline = redisClient.pipeline();
  pipeline.incr(windowKey);
  pipeline.pexpire(windowKey, windowMs);

  const results = await pipeline.exec();

  if (!results || !results[0]) {
    throw new Error("Redis pipeline failed");
  }

  const count = results[0][1] as number;
  const resetAt = (Math.floor(now / windowMs) + 1) * windowMs;

  return {
    allowed: count <= maxRequests,
    count,
    resetAt,
  };
}

/**
 * Check rate limit using in-memory store (fallback)
 */
function checkRateLimitMemory(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; count: number; resetAt: number } {
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    return { allowed: true, count: 1, resetAt: entry.resetAt };
  }

  entry.count++;

  return {
    allowed: entry.count <= maxRequests,
    count: entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Create rate limiting middleware
 * Uses Redis if available, falls back to in-memory
 * @param config - Rate limit configuration
 * @returns Express middleware function
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs, message, keyPrefix = "default" } = config;

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const key = getRateLimitKey(req, keyPrefix);

    try {
      let result: { allowed: boolean; count: number; resetAt: number };

      if (redisAvailable && redisClient) {
        // Use Redis
        result = await checkRateLimitRedis(key, maxRequests, windowMs);
      } else {
        // Fallback to in-memory
        result = checkRateLimitMemory(key, maxRequests, windowMs);
      }

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader(
        "X-RateLimit-Remaining",
        Math.max(0, maxRequests - result.count),
      );
      res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000));

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        res.setHeader("Retry-After", retryAfter);

        res.status(429).json({
          error: message || "Too many requests, please try again later",
          retryAfter,
          limit: maxRequests,
          windowMs,
        });
        return;
      }

      next();
    } catch (err) {
      // If Redis fails during request, fall back to in-memory
      const result = checkRateLimitMemory(key, maxRequests, windowMs);

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        res.status(429).json({
          error: message || "Too many requests, please try again later",
          retryAfter,
          limit: maxRequests,
          windowMs,
        });
        return;
      }

      next();
    }
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
  keyPrefix: "login",
});

/**
 * Preset: Password reset rate limiter
 * 3 attempts per hour
 */
export const passwordResetRateLimiter = createRateLimiter({
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too many password reset requests, please try again in 1 hour",
  keyPrefix: "password-reset",
});

/**
 * Preset: Email verification rate limiter
 * 3 attempts per hour
 */
export const emailVerificationRateLimiter = createRateLimiter({
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too many verification emails sent, please try again in 1 hour",
  keyPrefix: "email-verify",
});

/**
 * Preset: API rate limiter (general)
 * 100 requests per minute
 */
export const apiRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  message: "Too many API requests, please slow down",
  keyPrefix: "api",
});

/**
 * Manually reset rate limit for a request
 * Useful for testing or manual intervention
 */
export async function resetRateLimit(
  req: Request,
  prefix: string,
): Promise<void> {
  const key = getRateLimitKey(req, prefix);

  if (redisAvailable && redisClient) {
    const pattern = `${key}:*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }

  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status for a request
 */
export async function getRateLimitStatus(
  req: Request,
  prefix: string,
  maxRequests: number,
  windowMs: number,
): Promise<{
  count: number;
  limit: number;
  resetAt: number;
  remaining: number;
} | null> {
  const key = getRateLimitKey(req, prefix);

  if (redisAvailable && redisClient) {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;
    const count = await redisClient.get(windowKey);

    if (!count) {
      return null;
    }

    const countNum = parseInt(count, 10);
    const resetAt = (Math.floor(now / windowMs) + 1) * windowMs;

    return {
      count: countNum,
      limit: maxRequests,
      resetAt,
      remaining: Math.max(0, maxRequests - countNum),
    };
  }

  const entry = rateLimitStore.get(key);
  if (!entry) {
    return null;
  }

  return {
    count: entry.count,
    limit: maxRequests,
    resetAt: entry.resetAt,
    remaining: Math.max(0, maxRequests - entry.count),
  };
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}

/**
 * Get rate limiter mode
 */
export function getRateLimiterMode(): "redis" | "in-memory" {
  return redisAvailable ? "redis" : "in-memory";
}
