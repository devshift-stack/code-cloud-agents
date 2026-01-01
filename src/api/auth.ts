/**
 * Authentication API Endpoints
 * Handles login, logout, and token refresh
 */

import { Router, type Request, type Response } from "express";
import { initDatabase } from "../db/database.js";
import {
  generateTokenPair,
  verifyAccessToken,
  revokeToken,
  refreshAccessToken,
} from "../auth/jwt.js";
import {
  verifyUserPassword,
  getUserById,
  changeUserPassword,
} from "../db/users.js";
import { loginRateLimiter } from "../auth/rate-limiter.js";
import { requireAdmin, type AuthenticatedRequest } from "../auth/middleware.js";

const db = initDatabase();

export function createAuthRouter(): Router {
  const router = Router();

  /**
   * POST /api/auth/login
   * Login with email and password
   * Rate limited: 5 attempts per 15 minutes
   */
  router.post(
    "/login",
    loginRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
          return res.status(400).json({
            error: "Email and password required",
          });
        }

        // Verify user credentials against database
        const rawDb = db.getRawDb();
        const user = await verifyUserPassword(rawDb, email, password);

        if (!user) {
          return res.status(401).json({
            error: "Invalid credentials",
          });
        }

        // Check if user is active
        if (!user.isActive) {
          return res.status(403).json({
            error: "Account deactivated",
            message:
              "Your account has been deactivated. Please contact support.",
          });
        }

        // Generate tokens
        const tokens = generateTokenPair({
          userId: user.id,
          role: user.role,
          email: user.email,
        });

        // Log login event
        db.audit.log({
          kind: "user_login",
          message: `User ${user.email} logged in`,
          userId: user.id,
          severity: "info",
          meta: { email: user.email, role: user.role },
        });

        // Return tokens
        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            displayName: user.displayName,
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
          },
        });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
          error: "Internal server error",
        });
      }
    },
  );

  /**
   * POST /api/auth/logout
   * Logout and revoke tokens
   */
  router.post("/logout", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace("Bearer ", "");

      if (!accessToken) {
        return res.status(400).json({
          error: "Access token required",
        });
      }

      // Get user from token before revoking
      const payload = verifyAccessToken(accessToken);

      // Get refresh token from body
      const { refreshToken } = req.body;

      // Revoke access token
      revokeToken(accessToken);

      // Revoke refresh token if provided
      if (refreshToken) {
        revokeToken(refreshToken);
      }

      // Log logout event
      if (payload) {
        db.audit.log({
          kind: "user_logout",
          message: `User ${payload.email} logged out`,
          userId: payload.userId,
          severity: "info",
          meta: { email: payload.email },
        });
      }

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  router.post("/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: "Refresh token required",
        });
      }

      // Refresh tokens
      const newTokens = refreshAccessToken(refreshToken);

      if (!newTokens) {
        return res.status(401).json({
          error: "Invalid or expired refresh token",
        });
      }

      res.json({
        success: true,
        tokens: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresIn: newTokens.expiresIn,
        },
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  /**
   * GET /api/auth/verify
   * Verify access token
   */
  router.get("/verify", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace("Bearer ", "");

      if (!accessToken) {
        return res.status(400).json({
          error: "Access token required",
        });
      }

      const payload = verifyAccessToken(accessToken);

      if (!payload) {
        return res.status(401).json({
          error: "Invalid or expired token",
        });
      }

      res.json({
        success: true,
        valid: true,
        user: {
          userId: payload.userId,
          role: payload.role,
          email: payload.email,
        },
      });
    } catch (error) {
      console.error("Verify token error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  /**
   * GET /api/auth/me
   * Get current user from token
   */
  router.get("/me", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace("Bearer ", "");

      if (!accessToken) {
        return res.status(401).json({
          error: "Access token required",
        });
      }

      const payload = verifyAccessToken(accessToken);

      if (!payload) {
        return res.status(401).json({
          error: "Invalid or expired token",
        });
      }

      // Get full user details from database
      const rawDb = db.getRawDb();
      const user = getUserById(rawDb, payload.userId);

      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      // Exclude password hash
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: user.displayName,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          isActive: user.isActive,
        },
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  });

  /**
   * POST /api/auth/reset-password
   * Reset user password (Admin only)
   * Body: { userId: string, newPassword: string }
   */
  router.post(
    "/reset-password",
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { userId, newPassword } = req.body;

        // Validation
        if (!userId || !newPassword) {
          return res.status(400).json({
            error: "Missing required fields",
            message: "userId and newPassword are required",
          });
        }

        // Password strength validation
        if (newPassword.length < 8) {
          return res.status(400).json({
            error: "Password too weak",
            message: "Password must be at least 8 characters",
          });
        }

        // Check if target user exists
        const rawDb = db.getRawDb();
        const targetUser = getUserById(rawDb, userId);

        if (!targetUser) {
          return res.status(404).json({
            error: "User not found",
            message: `No user found with ID: ${userId}`,
          });
        }

        // Reset password
        const success = await changeUserPassword(rawDb, userId, newPassword);

        if (!success) {
          return res.status(500).json({
            error: "Password reset failed",
            message: "Could not update password",
          });
        }

        // Log password reset event
        db.audit.log({
          kind: "password_reset",
          message: `Admin ${req.userId} reset password for user ${targetUser.email}`,
          userId: req.userId!,
          severity: "warn",
          meta: {
            targetUserId: userId,
            targetEmail: targetUser.email,
            adminId: req.userId,
          },
        });

        res.json({
          success: true,
          message: "Password reset successfully",
          user: {
            id: targetUser.id,
            email: targetUser.email,
          },
        });
      } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({
          error: "Internal server error",
        });
      }
    },
  );

  return router;
}
