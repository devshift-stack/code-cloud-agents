/**
 * Settings Management API
 *
 * Provides REST endpoints for managing user and system settings:
 * - User settings (per-user preferences)
 * - System settings (admin-only global configuration)
 * - Preferences (theme, language, notifications)
 * - Settings history (audit trail)
 */

import { Router } from "express";
import { z } from "zod";
import type { Database } from "../db/database.js";
import { SettingsDB } from "../db/settings.js";
import {
  requireAdmin,
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/middleware.js";

// Default user settings
const DEFAULT_USER_SETTINGS = {
  theme: "auto",
  language: "en",
  notifications: {
    email: true,
    push: true,
    inApp: true,
  },
  preferences: {
    showAgentStatus: true,
    showSystemNotifications: true,
    autoSaveInterval: 30,
  },
};

// Default system settings
const DEFAULT_SYSTEM_SETTINGS = {
  appName: "Code Cloud Agents",
  maintenanceMode: false,
  maxConcurrentAgents: 3,
  defaultAgentTimeout: 300,
  enableWebhooks: true,
  enableWebSocket: true,
  logLevel: "info",
};

// Validation schemas
const UserSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "auto"]).optional(),
  language: z.enum(["en", "de", "bs"]).optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      inApp: z.boolean().optional(),
    })
    .optional(),
  preferences: z
    .object({
      showAgentStatus: z.boolean().optional(),
      showSystemNotifications: z.boolean().optional(),
      autoSaveInterval: z.number().min(10).max(300).optional(),
    })
    .optional(),
});

const SystemSettingsSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  maintenanceMode: z.boolean().optional(),
  maxConcurrentAgents: z.number().min(1).max(10).optional(),
  defaultAgentTimeout: z.number().min(60).max(3600).optional(),
  enableWebhooks: z.boolean().optional(),
  enableWebSocket: z.boolean().optional(),
  logLevel: z.enum(["debug", "info", "warn", "error"]).optional(),
});

const PreferencesSchema = z.object({
  showAgentStatus: z.boolean().optional(),
  showSystemNotifications: z.boolean().optional(),
  autoSaveInterval: z.number().min(10).max(300).optional(),
});

/**
 * Creates Settings Management API router
 */
export function createSettingsRouter(db: Database): Router {
  const router = Router();
  const settingsDB = new SettingsDB(db.getRawDb());

  /**
   * GET /api/settings/user/:userId
   * Get user settings
   * Phase-1 Hardening: Requires authentication + owner check
   */
  router.get("/user/:userId", requireAuth, (req: AuthenticatedRequest, res) => {
    // Owner check: Users can only access their own settings
    const authReq = req as AuthenticatedRequest;
    if (!authReq.isAdmin && authReq.userId !== req.params.userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You can only access your own settings",
      });
    }
    try {
      const { userId } = req.params;

      let userSettings = settingsDB.getUserSettings(userId);

      // Create default settings if not exists
      if (!userSettings) {
        userSettings = settingsDB.createUserSettings(
          userId,
          DEFAULT_USER_SETTINGS,
        );
      }

      res.json({
        success: true,
        settings: JSON.parse(userSettings.settings),
        metadata: {
          createdAt: userSettings.createdAt,
          updatedAt: userSettings.updatedAt,
        },
      });
    } catch (error) {
      console.error("Failed to get user settings:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * PUT /api/settings/user/:userId
   * Update user settings (full replace)
   * Phase-1 Hardening: Requires authentication + owner check
   */
  router.put("/user/:userId", requireAuth, (req: AuthenticatedRequest, res) => {
    // Owner check: Users can only update their own settings
    const authReq = req as AuthenticatedRequest;
    if (!authReq.isAdmin && authReq.userId !== req.params.userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You can only update your own settings",
      });
    }
    try {
      const { userId } = req.params;

      const parsed = UserSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid settings format",
          details: parsed.error.issues,
        });
      }

      // Merge with existing or default settings
      let existingSettings = settingsDB.getUserSettings(userId);
      let currentSettings = existingSettings
        ? JSON.parse(existingSettings.settings)
        : DEFAULT_USER_SETTINGS;

      // Deep merge
      const newSettings = {
        ...currentSettings,
        ...parsed.data,
        notifications: {
          ...currentSettings.notifications,
          ...parsed.data.notifications,
        },
        preferences: {
          ...currentSettings.preferences,
          ...parsed.data.preferences,
        },
      };

      // Update or create
      let success: boolean;
      if (existingSettings) {
        success = settingsDB.updateUserSettings(userId, newSettings, userId);
      } else {
        settingsDB.createUserSettings(userId, newSettings);
        success = true;
      }

      res.json({
        success,
        settings: newSettings,
      });
    } catch (error) {
      console.error("Failed to update user settings:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * DELETE /api/settings/user/:userId
   * Delete user settings (reset to defaults)
   * Phase-1 Hardening: Requires authentication + owner check
   */
  router.delete(
    "/user/:userId",
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      // Owner check: Users can only delete their own settings
      const authReq = req as AuthenticatedRequest;
      if (!authReq.isAdmin && authReq.userId !== req.params.userId) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: You can only delete your own settings",
        });
      }
      try {
        const { userId } = req.params;

        const success = settingsDB.deleteUserSettings(userId);

        res.json({
          success,
          message: success
            ? "Settings deleted successfully"
            : "Settings not found",
        });
      } catch (error) {
        console.error("Failed to delete user settings:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  /**
   * GET /api/settings/preferences/:userId
   * Get user preferences (subset of settings)
   * Phase-1 Hardening: Requires authentication + owner check
   */
  router.get(
    "/preferences/:userId",
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      // Owner check
      const authReq = req as AuthenticatedRequest;
      if (!authReq.isAdmin && authReq.userId !== req.params.userId) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: You can only access your own preferences",
        });
      }
      try {
        const { userId } = req.params;

        let userSettings = settingsDB.getUserSettings(userId);

        if (!userSettings) {
          userSettings = settingsDB.createUserSettings(
            userId,
            DEFAULT_USER_SETTINGS,
          );
        }

        const settings = JSON.parse(userSettings.settings);
        const preferences =
          settings.preferences || DEFAULT_USER_SETTINGS.preferences;

        res.json({
          success: true,
          preferences,
        });
      } catch (error) {
        console.error("Failed to get preferences:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  /**
   * PATCH /api/settings/preferences/:userId
   * Update user preferences (partial update)
   * Phase-1 Hardening: Requires authentication + owner check
   */
  router.patch(
    "/preferences/:userId",
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      // Owner check
      const authReq = req as AuthenticatedRequest;
      if (!authReq.isAdmin && authReq.userId !== req.params.userId) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: You can only update your own preferences",
        });
      }
      try {
        const { userId } = req.params;

        const parsed = PreferencesSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            success: false,
            error: "Invalid preferences format",
            details: parsed.error.issues,
          });
        }

        // Get current settings
        let userSettings = settingsDB.getUserSettings(userId);
        let currentSettings = userSettings
          ? JSON.parse(userSettings.settings)
          : DEFAULT_USER_SETTINGS;

        // Update preferences
        const newSettings = {
          ...currentSettings,
          preferences: {
            ...currentSettings.preferences,
            ...parsed.data,
          },
        };

        // Update or create
        let success: boolean;
        if (userSettings) {
          success = settingsDB.updateUserSettings(userId, newSettings, userId);
        } else {
          settingsDB.createUserSettings(userId, newSettings);
          success = true;
        }

        res.json({
          success,
          preferences: newSettings.preferences,
        });
      } catch (error) {
        console.error("Failed to update preferences:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  /**
   * GET /api/settings/system
   * Get all system settings (Admin-only)
   */
  router.get("/system", requireAdmin, (_req: AuthenticatedRequest, res) => {
    try {
      const systemSettings = settingsDB.getAllSystemSettings();

      // Parse JSON values
      const settings: Record<string, unknown> = { ...DEFAULT_SYSTEM_SETTINGS };
      systemSettings.forEach((setting) => {
        settings[setting.key] = JSON.parse(setting.value);
      });

      res.json({
        success: true,
        settings,
      });
    } catch (error) {
      console.error("Failed to get system settings:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/settings/system/:key
   * Get specific system setting (Admin-only)
   */
  router.get("/system/:key", (req, res) => {
    try {
      const { key } = req.params;

      const setting = settingsDB.getSystemSetting(key);

      if (!setting) {
        // Return default if exists
        const defaultValue =
          DEFAULT_SYSTEM_SETTINGS[key as keyof typeof DEFAULT_SYSTEM_SETTINGS];
        if (defaultValue !== undefined) {
          return res.json({
            success: true,
            key,
            value: defaultValue,
            isDefault: true,
          });
        }

        return res.status(404).json({
          success: false,
          error: "Setting not found",
        });
      }

      res.json({
        success: true,
        key: setting.key,
        value: JSON.parse(setting.value),
        description: setting.description,
        updatedBy: setting.updatedBy,
        updatedAt: setting.updatedAt,
        isDefault: false,
      });
    } catch (error) {
      console.error("Failed to get system setting:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * PUT /api/settings/system
   * Update system settings (Admin-only, partial update)
   */
  router.put("/system", requireAdmin, (req: AuthenticatedRequest, res) => {
    try {
      const updatedBy = req.userId || "admin";

      const parsed = SystemSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid settings format",
          details: parsed.error.issues,
        });
      }

      const updatedSettings: Record<string, unknown> = {};

      // Update each setting
      Object.entries(parsed.data).forEach(([key, value]) => {
        if (value !== undefined && key !== "_updatedBy") {
          const description = `System setting: ${key}`;
          settingsDB.setSystemSetting(key, value, description, updatedBy);
          updatedSettings[key] = value;
        }
      });

      res.json({
        success: true,
        updatedSettings,
        updatedBy,
      });
    } catch (error) {
      console.error("Failed to update system settings:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/settings/history/user/:userId
   * Get user settings history (audit trail)
   */
  router.get("/history/user/:userId", (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const history = settingsDB.getHistory("user", userId, limit);

      res.json({
        success: true,
        history,
        count: history.length,
      });
    } catch (error) {
      console.error("Failed to get settings history:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/settings/history/system/:key
   * Get system setting history (audit trail, Admin-only)
   */
  router.get("/history/system/:key", (req, res) => {
    try {
      const { key } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const history = settingsDB.getHistory("system", key, limit);

      res.json({
        success: true,
        history,
        count: history.length,
      });
    } catch (error) {
      console.error("Failed to get settings history:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
