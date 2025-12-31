/**
 * Modules API Router
 *
 * Endpoints for module status tracking
 */

import { Router, type Request, type Response } from "express";
import {
  MODULES,
  getModule,
  getModulesByCategory,
  getModulesByStatus,
  getCategories,
} from "../modules/moduleRegistry.ts";
import { getStatusBadge } from "../modules/moduleStatus.ts";
import type { ModuleStatusReport } from "../modules/moduleStatus.ts";
import { requireAuth } from "../auth/middleware.js";

export function createModulesRouter(): Router {
  const router = Router();

  // Phase-1 Hardening: All module routes require authentication
  router.use(requireAuth);

  /**
   * GET /api/modules - List all modules
   */
  router.get("/", (_req: Request, res: Response) => {
    try {
      res.json({
        total: MODULES.length,
        modules: MODULES.map((m) => ({
          ...m,
          badge: getStatusBadge(m.status),
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to list modules",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/modules/:id - Get specific module
   */
  router.get("/:id", (req: Request, res: Response) => {
    try {
      const module = getModule(req.params.id);

      if (!module) {
        return res.status(404).json({ error: "Module not found" });
      }

      res.json({
        ...module,
        badge: getStatusBadge(module.status),
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to get module",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/modules/category/:category - Get modules by category
   */
  router.get("/category/:category", (req: Request, res: Response) => {
    try {
      const modules = getModulesByCategory(req.params.category);

      res.json({
        category: req.params.category,
        total: modules.length,
        modules: modules.map((m) => ({
          ...m,
          badge: getStatusBadge(m.status),
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to get modules by category",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/modules/status/:status - Get modules by status
   */
  router.get("/status/:status", (req: Request, res: Response) => {
    try {
      const modules = getModulesByStatus(req.params.status as any);

      res.json({
        status: req.params.status,
        total: modules.length,
        modules: modules.map((m) => ({
          ...m,
          badge: getStatusBadge(m.status),
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to get modules by status",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/modules/report - Get status report
   */
  router.get("/report", (_req: Request, res: Response) => {
    try {
      const byStatus = {
        ready: getModulesByStatus("ready").length,
        "ready-untested": getModulesByStatus("ready-untested").length,
        buggy: getModulesByStatus("buggy").length,
        "in-progress": getModulesByStatus("in-progress").length,
        "not-started": getModulesByStatus("not-started").length,
      };

      const byCategory: Record<string, any[]> = {};
      for (const category of getCategories()) {
        byCategory[category] = getModulesByCategory(category).map((m) => ({
          ...m,
          badge: getStatusBadge(m.status),
        }));
      }

      const report: ModuleStatusReport = {
        totalModules: MODULES.length,
        byStatus,
        byCategory,
        lastUpdated: new Date().toISOString(),
      };

      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/modules/categories - Get all categories
   */
  router.get("/categories", (_req: Request, res: Response) => {
    try {
      const categories = getCategories();

      res.json({ categories });
    } catch (error) {
      res.status(500).json({
        error: "Failed to get categories",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
