/**
 * Password Reset API Endpoints
 * Handles password reset flow with token-based verification
 */

import { Router, type Request, type Response } from "express";
import type { Database } from "../db/database.js";
import {
  generatePasswordResetToken,
  verifyPasswordResetToken,
  resetPassword,
} from "../db/password-reset.js";
import { getUserByEmail } from "../db/users.js";
import { passwordResetRateLimiter } from "../auth/rate-limiter.js";
import { sendPasswordResetEmail } from "../email/mailer.js";

/**
 * Password reset request payload
 */
interface PasswordResetRequestBody {
  email: string;
}

/**
 * Password reset verify payload
 */
interface PasswordResetVerifyBody {
  token: string;
}

/**
 * Password reset payload
 */
interface PasswordResetBody {
  token: string;
  newPassword: string;
}

export function createPasswordResetRouter(db: Database): Router {
  const router = Router();
  const rawDb = db.getRawDb();

  /**
   * POST /api/password-reset/request
   * Request password reset (generates token)
   * Rate limited: 3 attempts per hour
   */
  router.post(
    "/request",
    passwordResetRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const { email } = req.body as PasswordResetRequestBody;

        if (!email) {
          return res.status(400).json({
            error: "Email required",
          });
        }

        // Find user by email
        const user = getUserByEmail(rawDb, email);

        // Security: Always return success even if user doesn't exist
        // This prevents user enumeration attacks
        if (!user) {
          return res.json({
            success: true,
            message:
              "If an account with that email exists, a password reset link has been sent.",
          });
        }

        // Check if user is active
        if (!user.isActive) {
          return res.json({
            success: true,
            message:
              "If an account with that email exists, a password reset link has been sent.",
          });
        }

        // Generate reset token
        const token = generatePasswordResetToken(rawDb, user.id, user.email);

        // Send password reset email
        const emailResult = await sendPasswordResetEmail(user.email, token);

        if (!emailResult.success) {
          // Don't reveal email send failure to prevent user enumeration
          console.error(
            "[Password Reset] Email send failed:",
            emailResult.error,
          );
        }

        res.json({
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent.",
          // Include preview URL for development (Ethereal)
          ...(emailResult.previewUrl && { previewUrl: emailResult.previewUrl }),
        });
      } catch (error) {
        console.error("[Password Reset] Request error:", error);
        res.status(500).json({
          error: "Failed to process password reset request",
        });
      }
    },
  );

  /**
   * POST /api/password-reset/verify
   * Verify password reset token validity
   */
  router.post("/verify", async (req: Request, res: Response) => {
    try {
      const { token } = req.body as PasswordResetVerifyBody;

      if (!token) {
        return res.status(400).json({
          error: "Reset token required",
        });
      }

      // Verify token
      const result = verifyPasswordResetToken(rawDb, token);

      if (!result.valid) {
        return res.status(400).json({
          error: result.error,
          valid: false,
        });
      }

      res.json({
        success: true,
        valid: true,
        message: "Token is valid",
      });
    } catch (error) {
      console.error("[Password Reset] Verify error:", error);
      res.status(500).json({
        error: "Failed to verify reset token",
      });
    }
  });

  /**
   * POST /api/password-reset/reset
   * Reset password with token
   */
  router.post("/reset", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body as PasswordResetBody;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: "Reset token and new password required",
        });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: "Password must be at least 8 characters",
        });
      }

      // Reset password
      const result = await resetPassword(rawDb, token, newPassword);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("[Password Reset] Reset error:", error);
      res.status(500).json({
        error: "Failed to reset password",
      });
    }
  });

  return router;
}
