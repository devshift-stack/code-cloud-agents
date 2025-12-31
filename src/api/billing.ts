/**
 * Billing API Router
 *
 * Endpoints for cost tracking and user limit management
 */

import { Router, type Request, type Response } from "express";
import { costTracker } from "../billing/costTracker.ts";
import { selectModel, compareCosts } from "../billing/modelSelector.ts";
import { MODEL_PRICING, formatCost } from "../billing/pricing.ts";
import type { UserLimit } from "../billing/types.ts";
import {
  requireAdmin,
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/middleware.ts";

export function createBillingRouter(): Router {
  const router = Router();

  /**
   * GET /api/billing/summary - Get cost summary for time period
   * Requires authentication
   */
  router.get(
    "/summary",
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const startDate =
          (req.query.start as string) ||
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = (req.query.end as string) || new Date().toISOString();

        const summary = costTracker.getSummary(startDate, endDate);

        res.json(summary);
      } catch (error) {
        res.status(500).json({
          error: "Failed to get cost summary",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  /**
   * GET /api/billing/usage/:userId - Get user usage for current month
   * Requires authentication
   */
  router.get(
    "/usage/:userId",
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = req.params.userId;
        const month = (req.query.month as string) || undefined;

        const usage = costTracker.getUserUsage(userId, month);

        if (!usage) {
          return res.status(404).json({ error: "No usage found for user" });
        }

        res.json(usage);
      } catch (error) {
        res.status(500).json({
          error: "Failed to get user usage",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  /**
   * GET /api/billing/costs - Get all cost entries
   * Requires admin privileges
   */
  router.get(
    "/costs",
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const limit = parseInt(req.query.limit as string) || 1000;
        const costs = costTracker.getAllCosts(limit);

        res.json({
          total: costs.length,
          costs,
        });
      } catch (error) {
        res.status(500).json({
          error: "Failed to get costs",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  /**
   * POST /api/billing/log - Log a cost entry
   * Requires authentication
   */
  router.post(
    "/log",
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const entry = req.body;

        // Validate required fields
        if (!entry.userId || !entry.model || !entry.provider) {
          return res.status(400).json({
            error: "Missing required fields: userId, model, provider",
          });
        }

        if (
          entry.inputTokens === undefined ||
          entry.outputTokens === undefined
        ) {
          return res.status(400).json({
            error: "Missing token counts: inputTokens, outputTokens",
          });
        }

        const costEntry = costTracker.log(entry);

        res.status(201).json(costEntry);
      } catch (error) {
        res.status(500).json({
          error: "Failed to log cost",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  /**
   * GET /api/billing/limits - Get all user limits (Admin only)
   * Requires admin privileges
   */
  router.get(
    "/limits",
    requireAdmin,
    (_req: AuthenticatedRequest, res: Response) => {
      try {
        const limits = costTracker.getAllLimits();

        res.json({
          total: limits.length,
          limits,
        });
      } catch (error) {
        res.status(500).json({
          error: "Failed to get limits",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  /**
   * GET /api/billing/limits/:userId - Get user limit
   * Requires authentication
   */
  router.get(
    "/limits/:userId",
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const limit = costTracker.getUserLimit(req.params.userId);

        if (!limit) {
          return res.status(404).json({ error: "No limit set for user" });
        }

        res.json(limit);
      } catch (error) {
        res.status(500).json({
          error: "Failed to get user limit",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  /**
   * POST /api/billing/limits - Set user limit (Admin only)
   * Requires admin privileges
   */
  router.post(
    "/limits",
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const limitData: Omit<UserLimit, "createdAt" | "updatedAt"> = req.body;

        // Validate required fields
        if (
          !limitData.userId ||
          !limitData.monthlyLimitUSD ||
          !limitData.currency
        ) {
          return res.status(400).json({
            error: "Missing required fields: userId, monthlyLimitUSD, currency",
          });
        }

        const limit = costTracker.setUserLimit(limitData);

        res.status(201).json(limit);
      } catch (error) {
        res.status(500).json({
          error: "Failed to set user limit",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  /**
   * DELETE /api/billing/limits/:userId - Remove user limit (Admin only)
   * Requires admin privileges
   */
  router.delete(
    "/limits/:userId",
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const deleted = costTracker.removeUserLimit(req.params.userId);

        if (!deleted) {
          return res.status(404).json({ error: "No limit found for user" });
        }

        res.status(204).send();
      } catch (error) {
        res.status(500).json({
          error: "Failed to remove user limit",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  /**
   * GET /api/billing/limits/:userId/status - Check limit status
   * Requires authentication
   */
  router.get(
    "/limits/:userId/status",
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const status = costTracker.checkLimit(req.params.userId);

        if (!status) {
          return res.status(404).json({ error: "No limit set for user" });
        }

        res.json(status);
      } catch (error) {
        res.status(500).json({
          error: "Failed to check limit status",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  /**
   * POST /api/billing/model-select - Get model recommendation
   * Requires authentication
   */
  router.post(
    "/model-select",
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskDescription, preferLocal, maxCostUSD, forceModel } =
          req.body;

        if (!taskDescription) {
          return res.status(400).json({ error: "Missing taskDescription" });
        }

        const recommendation = selectModel(taskDescription, {
          preferLocal,
          maxCostUSD,
          forceModel,
        });

        res.json(recommendation);
      } catch (error) {
        res.status(500).json({
          error: "Failed to select model",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  /**
   * POST /api/billing/compare - Compare costs for different models
   * Requires authentication
   */
  router.post(
    "/compare",
    requireAuth,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const { taskDescription, models } = req.body;

        if (!taskDescription || !models) {
          return res
            .status(400)
            .json({ error: "Missing taskDescription or models" });
        }

        const comparison = compareCosts(taskDescription, models);

        res.json({
          taskDescription,
          recommendations: comparison,
        });
      } catch (error) {
        res.status(500).json({
          error: "Failed to compare costs",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  /**
   * GET /api/billing/pricing - Get all model pricing
   */
  router.get("/pricing", (_req: Request, res: Response) => {
    try {
      const pricing = MODEL_PRICING.map((p) => ({
        ...p,
        inputCostFormatted: formatCost(p.inputTokenCost / 1000, p.currency),
        outputCostFormatted: formatCost(p.outputTokenCost / 1000, p.currency),
      }));

      res.json({ pricing });
    } catch (error) {
      res.status(500).json({
        error: "Failed to get pricing",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
