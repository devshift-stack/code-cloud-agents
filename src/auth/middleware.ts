/**
 * Authentication & Authorization Middleware
 *
 * Provides role-based access control using JWT tokens.
 * Phase 2: JWT-only authentication (no more x-user-id headers)
 */

import type { Request, Response, NextFunction } from "express";
import type { Database } from "../db/database.js";
import { log } from "../monitoring/sentry.js";
import { verifyAccessToken, type TokenPayload } from "./jwt.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: "admin" | "user" | "demo";
  isAdmin?: boolean;
}

/**
 * Extract and verify JWT from Authorization header
 * Returns TokenPayload if valid, null otherwise
 */
function extractJwtPayload(req: Request): TokenPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix
  return verifyAccessToken(token);
}

/**
 * Check if userId is a system diagnostic ID
 */
function isSystemId(userId: string | undefined): boolean {
  if (!userId) return false;
  return (
    userId.startsWith("system-") ||
    userId === "health-check" ||
    userId === "diagnostics"
  );
}

/**
 * Admin role verification (JWT-based)
 * Extracts userId and role from JWT token
 * Returns 403 Forbidden if user is not admin
 *
 * Usage:
 *   router.post("/admin-only", requireAdmin, handler);
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const payload = extractJwtPayload(req);

  // Check if JWT is valid
  if (!payload) {
    log.warn("Auth failed: invalid or missing JWT", {
      endpoint: req.path,
      method: req.method,
    });
    res.status(401).json({
      error: "Authentication required",
      message: "Valid JWT token required in Authorization header",
      code: "UNAUTHORIZED",
    });
    return;
  }

  const { userId, role } = payload;

  // Log authentication attempt (skip for system diagnostics)
  if (!isSystemId(userId)) {
    console.log(`[AUTH] Admin access attempt - User: ${userId}, Role: ${role}`);
  }

  // Check if user has admin role
  if (role !== "admin") {
    log.warn("Auth failed: insufficient privileges", {
      userId,
      role,
      endpoint: req.path,
    });
    res.status(403).json({
      error: "Admin access required",
      message: "This endpoint requires admin privileges",
      code: "FORBIDDEN",
      user: userId,
      role,
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
 * User authentication (JWT-based)
 * Extracts userId and role from JWT token
 * Returns 401 if not authenticated
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const payload = extractJwtPayload(req);

  if (!payload) {
    res.status(401).json({
      error: "Authentication required",
      message: "Valid JWT token required in Authorization header",
      code: "UNAUTHORIZED",
    });
    return;
  }

  req.userId = payload.userId;
  req.userRole = payload.role;
  req.isAdmin = payload.role === "admin";

  next();
}

/**
 * Optional authentication (JWT-based)
 * Adds user info if valid JWT available, but doesn't block
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const payload = extractJwtPayload(req);

  if (payload) {
    req.userId = payload.userId;
    req.userRole = payload.role;
    req.isAdmin = payload.role === "admin";
  }

  next();
}

/**
 * Cron job authentication
 * Validates cron API key
 */
export function requireCronAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const apiKey = req.headers["x-api-key"] as string;
  const expectedKey =
    process.env.CRON_API_KEY || "dev-cron-key-change-in-production";

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
    log.error("Security: Invalid cron API key", {
      ip: req.ip,
      endpoint: req.path,
    });
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
    const validRequests = userRequests.filter((time) => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
      log.warn("Rate limit exceeded", {
        ip: identifier,
        requests: validRequests.length,
        maxRequests,
        endpoint: req.path,
      });
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
 * Database-backed user verification
 * Uses JWT for authentication, can be extended for database role checks
 */
export function createDatabaseAuth(_db: Database) {
  return {
    requireAdmin: (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ) => {
      requireAdmin(req, res, next);
    },
    requireAuth: (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ) => {
      requireAuth(req, res, next);
    },
  };
}
