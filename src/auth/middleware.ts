/**
 * Authentication & Authorization Middleware
 *
 * Provides role-based access control for admin endpoints.
 * Currently uses header-based auth, ready for JWT upgrade.
 */

import type { Request, Response, NextFunction } from "express";
import type { Database } from "../db/database.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: "admin" | "user" | "demo";
  isAdmin?: boolean;
}

/**
 * Admin role verification
 * Returns 403 Forbidden if user is not admin
 *
 * Usage:
 *   router.post("/admin-only", requireAdmin, handler);
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const userId = req.headers["x-user-id"] as string;
  const userRole = req.headers["x-user-role"] as string;

  // Log authentication attempt
  console.log(`[AUTH] Admin access attempt - User: ${userId || "anonymous"}, Role: ${userRole || "none"}`);

  // Check if user is authenticated
  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
      message: "Missing x-user-id header",
      code: "UNAUTHORIZED",
    });
    return;
  }

  // Check if user has admin role
  if (userRole !== "admin") {
    res.status(403).json({
      error: "Admin access required",
      message: "This endpoint requires admin privileges",
      code: "FORBIDDEN",
      user: userId,
      role: userRole || "none",
    });
    return;
  }

  // User is authenticated and authorized
  req.userId = userId;
  req.userRole = "admin";
  req.isAdmin = true;

  next();
}

/**
 * User authentication (any authenticated user)
 * Returns 401 if not authenticated
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const userId = req.headers["x-user-id"] as string;
  const userRole = req.headers["x-user-role"] as string;

  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
      message: "Missing x-user-id header",
      code: "UNAUTHORIZED",
    });
    return;
  }

  req.userId = userId;
  req.userRole = (userRole as "admin" | "user" | "demo") || "user";
  req.isAdmin = userRole === "admin";

  next();
}

/**
 * Optional authentication
 * Adds user info if available, but doesn't block
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const userId = req.headers["x-user-id"] as string;
  const userRole = req.headers["x-user-role"] as string;

  if (userId) {
    req.userId = userId;
    req.userRole = (userRole as "admin" | "user" | "demo") || "user";
    req.isAdmin = userRole === "admin";
  }

  next();
}

/**
 * Cron job authentication
 * Validates cron API key
 */
export function requireCronAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers["x-api-key"] as string;
  const expectedKey = process.env.CRON_API_KEY || "dev-cron-key-change-in-production";

  if (!apiKey) {
    res.status(401).json({
      error: "API key required",
      message: "Missing x-api-key header",
      code: "UNAUTHORIZED",
    });
    return;
  }

  if (apiKey !== expectedKey) {
    console.error(`[SECURITY] Invalid cron API key attempt from ${req.ip}`);
    res.status(403).json({
      error: "Invalid API key",
      code: "FORBIDDEN",
    });
    return;
  }

  next();
}

/**
 * Rate limiting helper (to be enhanced later)
 * Currently just logs, but structure ready for redis-based rate limiting
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || "unknown";
    const now = Date.now();
    const userRequests = requests.get(identifier) || [];

    // Remove old requests outside window
    const validRequests = userRequests.filter(time => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
      res.status(429).json({
        error: "Rate limit exceeded",
        message: `Max ${maxRequests} requests per ${windowMs / 1000}s`,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000),
      });
      return;
    }

    validRequests.push(now);
    requests.set(identifier, validRequests);
    next();
  };
}

/**
 * Database-backed user verification (for future JWT implementation)
 * TODO: Implement when JWT auth is ready
 */
export function createDatabaseAuth(db: Database) {
  return {
    requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      // TODO: Verify JWT token and check user role in database
      // For now, fallback to header-based auth
      requireAdmin(req, res, next);
    },
    requireAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      // TODO: Verify JWT token
      requireAuth(req, res, next);
    },
  };
}
