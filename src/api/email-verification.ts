/**
 * Email Verification API Endpoints
 * Handles email verification flow
 */

import { Router, type Request, type Response } from "express";
import type { Database } from "../db/database.js";
import { requireAuth, type AuthenticatedRequest } from "../auth/middleware.js";
import {
  generateVerificationToken,
  verifyEmailToken,
  getVerificationToken,
} from "../db/email-verification.js";
import { getUserById, updateUser } from "../db/users.js";
import { emailVerificationRateLimiter } from "../auth/rate-limiter.js";
import { sendVerificationEmail } from "../email/mailer.js";

export function createEmailVerificationRouter(db: Database): Router {
  const router = Router();
  const rawDb = db.getRawDb();

  /**
   * POST /api/email-verification/send
   * Send verification email (authenticated users only)
   * Rate limited: 3 attempts per hour
   */
  router.post(
    "/send",
    emailVerificationRateLimiter,
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const user = getUserById(rawDb, userId);

        if (!user) {
          return res.status(404).json({
            error: "User not found",
          });
        }

        if (user.emailVerified) {
          return res.status(400).json({
            error: "Email already verified",
          });
        }

        // Generate new verification token
        const token = generateVerificationToken(rawDb, userId, user.email);

        // Send verification email
        const emailResult = await sendVerificationEmail(user.email, token);

        if (!emailResult.success) {
          return res.status(500).json({
            error: "Failed to send verification email",
            details: emailResult.error,
          });
        }

        res.json({
          success: true,
          message: "Verification email sent successfully",
          // Include preview URL for development (Ethereal)
          ...(emailResult.previewUrl && { previewUrl: emailResult.previewUrl }),
        });
      } catch (error) {
        console.error("[Email Verification] Send error:", error);
        res.status(500).json({
          error: "Failed to send verification email",
        });
      }
    },
  );

  /**
   * POST /api/email-verification/verify
   * Verify email with token
   */
  router.post("/verify", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: "Verification token required",
        });
      }

      // Verify token
      const result = verifyEmailToken(rawDb, token);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
        });
      }

      // Mark user as verified
      updateUser(rawDb, result.userId!, { emailVerified: true });

      res.json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      console.error("[Email Verification] Verify error:", error);
      res.status(500).json({
        error: "Failed to verify email",
      });
    }
  });

  /**
   * GET /api/email-verification/status
   * Check verification status
   */
  router.get(
    "/status",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.userId!;
        const user = getUserById(rawDb, userId);

        if (!user) {
          return res.status(404).json({
            error: "User not found",
          });
        }

        const pendingToken = getVerificationToken(rawDb, userId);

        res.json({
          success: true,
          emailVerified: user.emailVerified,
          email: user.email,
          hasPendingToken: !!pendingToken,
          tokenExpiresAt: pendingToken?.expiresAt,
        });
      } catch (error) {
        console.error("[Email Verification] Status error:", error);
        res.status(500).json({
          error: "Failed to get verification status",
        });
      }
    },
  );

  return router;
}
