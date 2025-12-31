/**
 * User Management API
 * CRUD operations for users with role-based access control
 */

import { Router, type Request, type Response } from "express";
import type { Database } from "../db/database.js";
import {
  requireAdmin,
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/middleware.js";
import {
  createUser,
  getUserById,
  getUserByEmail,
  listUsers,
  updateUser,
  deleteUser,
  changeUserPassword,
  getUserStats,
  type UserCreateData,
  type UserUpdateData,
} from "../db/users.js";
import bcrypt from "bcrypt";

export function createUsersRouter(db: Database): Router {
  const router = Router();
  const rawDb = db.getRawDb();

  /**
   * GET /api/users
   * List all users (Admin only)
   */
  router.get("/", requireAdmin, async (req: Request, res: Response) => {
    try {
      const role = req.query.role as "admin" | "user" | "demo" | undefined;
      const isActive =
        req.query.isActive === "true"
          ? true
          : req.query.isActive === "false"
            ? false
            : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string)
        : 0;

      const users = listUsers(rawDb, { role, isActive, limit, offset });

      res.json({
        success: true,
        users,
        count: users.length,
      });
    } catch (error) {
      console.error("[Users API] List error:", error);
      res.status(500).json({
        error: "Failed to list users",
      });
    }
  });

  /**
   * GET /api/users/stats
   * Get user statistics (Admin only)
   */
  router.get(
    "/stats",
    requireAdmin,
    async (_req: AuthenticatedRequest, res: Response) => {
      try {
        const stats = getUserStats(rawDb);

        res.json({
          success: true,
          stats,
        });
      } catch (error) {
        console.error("[Users API] Stats error:", error);
        res.status(500).json({
          error: "Failed to get user stats",
        });
      }
    },
  );

  /**
   * GET /api/users/me
   * Get current user's profile
   */
  router.get(
    "/me",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const user = getUserById(rawDb, req.userId!);

        if (!user) {
          return res.status(404).json({
            error: "User not found",
          });
        }

        // Exclude password hash
        const { passwordHash, ...userWithoutPassword } = user;

        res.json({
          success: true,
          user: userWithoutPassword,
        });
      } catch (error) {
        console.error("[Users API] Get me error:", error);
        res.status(500).json({
          error: "Failed to get user",
        });
      }
    },
  );

  /**
   * GET /api/users/:id
   * Get user by ID (Admin only, or own profile)
   */
  router.get(
    "/:id",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;

        // Users can only view their own profile, admins can view any
        if (!req.isAdmin && id !== req.userId) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only view your own profile",
          });
        }

        const user = getUserById(rawDb, id);

        if (!user) {
          return res.status(404).json({
            error: "User not found",
          });
        }

        // Exclude password hash
        const { passwordHash, ...userWithoutPassword } = user;

        res.json({
          success: true,
          user: userWithoutPassword,
        });
      } catch (error) {
        console.error("[Users API] Get user error:", error);
        res.status(500).json({
          error: "Failed to get user",
        });
      }
    },
  );

  /**
   * POST /api/users
   * Create new user (Admin only)
   */
  router.post("/", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email, password, role, displayName } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password required",
        });
      }

      if (!role || !["admin", "user", "demo"].includes(role)) {
        return res.status(400).json({
          error: "Valid role required (admin, user, or demo)",
        });
      }

      // Check if email already exists
      const existing = getUserByEmail(rawDb, email);
      if (existing) {
        return res.status(409).json({
          error: "User with this email already exists",
        });
      }

      // Create user
      const userData: UserCreateData = {
        email,
        password,
        role,
        displayName,
      };

      const user = await createUser(rawDb, userData);

      // Exclude password hash
      const { passwordHash, ...userWithoutPassword } = user;

      res.status(201).json({
        success: true,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("[Users API] Create error:", error);
      res.status(500).json({
        error: "Failed to create user",
      });
    }
  });

  /**
   * PATCH /api/users/:id
   * Update user (Admin only, or own profile with limited fields)
   */
  router.patch(
    "/:id",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { email, role, displayName, isActive } = req.body;

        // Check permissions
        const isOwnProfile = id === req.userId;
        if (!req.isAdmin && !isOwnProfile) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only update your own profile",
          });
        }

        // Non-admins can't change role or isActive
        if (!req.isAdmin && (role !== undefined || isActive !== undefined)) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You cannot change role or active status",
          });
        }

        // Check if user exists
        const user = getUserById(rawDb, id);
        if (!user) {
          return res.status(404).json({
            error: "User not found",
          });
        }

        // Update user
        const updates: UserUpdateData = {};
        if (email !== undefined) updates.email = email;
        if (role !== undefined) updates.role = role;
        if (displayName !== undefined) updates.displayName = displayName;
        if (isActive !== undefined) updates.isActive = isActive;

        const updatedUser = updateUser(rawDb, id, updates);

        if (!updatedUser) {
          return res.status(404).json({
            error: "User not found",
          });
        }

        // Exclude password hash
        const { passwordHash, ...userWithoutPassword } = updatedUser;

        res.json({
          success: true,
          user: userWithoutPassword,
        });
      } catch (error) {
        console.error("[Users API] Update error:", error);
        res.status(500).json({
          error: "Failed to update user",
        });
      }
    },
  );

  /**
   * POST /api/users/:id/password
   * Change user password (Admin only, or own password)
   */
  router.post(
    "/:id/password",
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        // Check permissions
        const isOwnProfile = id === req.userId;
        if (!req.isAdmin && !isOwnProfile) {
          return res.status(403).json({
            error: "Forbidden",
            message: "You can only change your own password",
          });
        }

        // Validation
        if (!newPassword || newPassword.length < 8) {
          return res.status(400).json({
            error: "New password must be at least 8 characters",
          });
        }

        // Check if user exists
        const user = getUserById(rawDb, id);
        if (!user) {
          return res.status(404).json({
            error: "User not found",
          });
        }

        // Non-admins must provide current password
        if (!req.isAdmin) {
          if (!currentPassword) {
            return res.status(400).json({
              error: "Current password required",
            });
          }

          // Verify current password
          const isValid = await bcrypt.compare(
            currentPassword,
            user.passwordHash,
          );
          if (!isValid) {
            return res.status(401).json({
              error: "Current password incorrect",
            });
          }
        }

        // Change password
        const success = await changeUserPassword(rawDb, id, newPassword);

        if (!success) {
          return res.status(500).json({
            error: "Failed to change password",
          });
        }

        res.json({
          success: true,
          message: "Password changed successfully",
        });
      } catch (error) {
        console.error("[Users API] Change password error:", error);
        res.status(500).json({
          error: "Failed to change password",
        });
      }
    },
  );

  /**
   * DELETE /api/users/:id
   * Delete user (Admin only)
   */
  router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const user = getUserById(rawDb, id);
      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      // Prevent deleting yourself
      const authReq = req as AuthenticatedRequest;
      if (id === authReq.userId) {
        return res.status(400).json({
          error: "Cannot delete your own account",
        });
      }

      // Delete user
      const success = deleteUser(rawDb, id);

      if (!success) {
        return res.status(500).json({
          error: "Failed to delete user",
        });
      }

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("[Users API] Delete error:", error);
      res.status(500).json({
        error: "Failed to delete user",
      });
    }
  });

  return router;
}
