/**
 * Authentication API Endpoints
 * Handles login, logout, and token refresh
 */

import { Router, type Request, type Response } from "express";
import { initDatabase } from "../db/database.js";
import {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken,
  refreshAccessToken,
} from "../auth/jwt.js";
import { verifyUserPassword, getUserById } from "../db/users.js";
import { loginRateLimiter } from "../auth/rate-limiter.js";

const db = initDatabase();

export function createAuthRouter(): Router {
  const router = Router();

  /**
   * POST /api/auth/login
   * Login with email and password
   * Rate limited: 5 attempts per 15 minutes
   */
  router.post("/login", loginRateLimiter, async (req: Request, res: Response) => {
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
          message: "Your account has been deactivated. Please contact support.",
        });
      }

      // Generate tokens
      const tokens = generateTokenPair({
        userId: user.id,
        role: user.role,
        email: user.email,
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
  });

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

      // Get refresh token from body
      const { refreshToken } = req.body;

      // Revoke access token
      revokeToken(accessToken);

      // Revoke refresh token if provided
      if (refreshToken) {
        revokeToken(refreshToken);
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

  return router;
}
