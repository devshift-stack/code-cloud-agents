/**
 * Demo Invite API Router
 *
 * Endpoints für Demo-Einladungen und Demo-User
 */

import { Router, type Request, type Response } from "express";
import { DemoInviteManager } from "../demo/inviteManager.ts";
import type { CreateInviteRequest, RedeemInviteRequest } from "../demo/types.ts";
import type { Database } from "../db/database.ts";
import { requireAdmin, requireCronAuth, type AuthenticatedRequest } from "../auth/middleware.ts";

export function createDemoRouter(db: Database): Router {
  const router = Router();
  const demoManager = new DemoInviteManager(db);

  /**
   * POST /api/demo/invites
   * Erstellt einen neuen Demo-Invite (Admin only)
   */
  router.post("/invites", requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminUserId = req.userId!;

      const request: CreateInviteRequest = req.body;

      // Validate
      if (!request.creditLimitUSD || request.creditLimitUSD <= 0) {
        return res.status(400).json({ error: "creditLimitUSD must be positive" });
      }
      if (!request.maxMessages || request.maxMessages <= 0) {
        return res.status(400).json({ error: "maxMessages must be positive" });
      }
      if (!request.maxDays || request.maxDays <= 0) {
        return res.status(400).json({ error: "maxDays must be positive" });
      }

      const invite = demoManager.createInvite(adminUserId, request);

      res.status(201).json({
        success: true,
        invite,
        inviteUrl: `${req.protocol}://${req.get("host")}/demo/register?code=${invite.code}`,
      });
    } catch (error: any) {
      console.error("Create demo invite error:", error);
      res.status(500).json({ error: error.message || "Failed to create invite" });
    }
  });

  /**
   * GET /api/demo/invites
   * Listet alle Demo-Invites (Admin only)
   */
  router.get("/invites", requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminUserId = req.userId!;

      const invites = demoManager.listInvites(adminUserId);

      res.json({
        invites,
        total: invites.length,
      });
    } catch (error: any) {
      console.error("List invites error:", error);
      res.status(500).json({ error: error.message || "Failed to list invites" });
    }
  });

  /**
   * GET /api/demo/invites/:code
   * Ruft Invite-Details ab (public)
   */
  router.get("/invites/:code", (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const invite = demoManager.getInviteByCode(code);

      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      // Nur public info zurückgeben
      res.json({
        code: invite.code,
        creditLimitUSD: invite.creditLimitUSD,
        maxMessages: invite.maxMessages,
        maxDays: invite.maxDays,
        expiresAt: invite.expiresAt,
        active: invite.active,
        available: invite.active && new Date(invite.expiresAt) > new Date() && invite.usedCount < invite.maxUses,
      });
    } catch (error: any) {
      console.error("Get invite error:", error);
      res.status(500).json({ error: error.message || "Failed to get invite" });
    }
  });

  /**
   * POST /api/demo/redeem
   * Löst Invite ein und erstellt Demo-User
   */
  router.post("/redeem", async (req: Request, res: Response) => {
    try {
      const request: RedeemInviteRequest = req.body;

      // Validate
      if (!request.code) {
        return res.status(400).json({ error: "code is required" });
      }
      if (!request.email) {
        return res.status(400).json({ error: "email is required" });
      }
      if (!request.password || request.password.length < 8) {
        return res.status(400).json({ error: "password must be at least 8 characters" });
      }

      // TODO: Hash password properly (use bcrypt)
      const passwordHash = `hashed_${request.password}`;

      const demoUser = demoManager.redeemInvite(request, passwordHash);

      res.status(201).json({
        success: true,
        user: {
          id: demoUser.id,
          email: demoUser.email,
          isDemo: true,
          expiresAt: demoUser.expiresAt,
          credits: {
            limitUSD: demoUser.creditLimitUSD,
            usedUSD: demoUser.creditUsedUSD,
            remainingUSD: demoUser.creditLimitUSD - demoUser.creditUsedUSD,
          },
          messages: {
            limit: demoUser.maxMessages,
            used: demoUser.messagesUsed,
            remaining: demoUser.maxMessages - demoUser.messagesUsed,
          },
        },
        message: "Demo account created successfully",
      });
    } catch (error: any) {
      console.error("Redeem invite error:", error);
      res.status(400).json({ error: error.message || "Failed to redeem invite" });
    }
  });

  /**
   * GET /api/demo/users/:userId
   * Ruft Demo-User Details ab
   */
  router.get("/users/:userId", (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const demoUser = demoManager.getDemoUser(userId);

      if (!demoUser) {
        return res.status(404).json({ error: "Demo user not found" });
      }

      res.json({
        id: demoUser.id,
        email: demoUser.email,
        isDemo: true,
        active: demoUser.active,
        blocked: demoUser.blocked,
        createdAt: demoUser.createdAt,
        expiresAt: demoUser.expiresAt,
        daysRemaining: Math.ceil((new Date(demoUser.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        credits: {
          limitUSD: demoUser.creditLimitUSD,
          usedUSD: demoUser.creditUsedUSD,
          remainingUSD: demoUser.creditLimitUSD - demoUser.creditUsedUSD,
          percentageUsed: (demoUser.creditUsedUSD / demoUser.creditLimitUSD) * 100,
        },
        messages: {
          limit: demoUser.maxMessages,
          used: demoUser.messagesUsed,
          remaining: demoUser.maxMessages - demoUser.messagesUsed,
          percentageUsed: (demoUser.messagesUsed / demoUser.maxMessages) * 100,
        },
      });
    } catch (error: any) {
      console.error("Get demo user error:", error);
      res.status(500).json({ error: error.message || "Failed to get demo user" });
    }
  });

  /**
   * DELETE /api/demo/invites/:inviteId
   * Deaktiviert einen Invite (Admin only)
   */
  router.delete("/invites/:inviteId", requireAdmin, (req: Request, res: Response) => {
    try {
      const { inviteId } = req.params;

      demoManager.deactivateInvite(inviteId);

      res.json({
        success: true,
        message: "Invite deactivated",
      });
    } catch (error: any) {
      console.error("Deactivate invite error:", error);
      res.status(500).json({ error: error.message || "Failed to deactivate invite" });
    }
  });

  /**
   * DELETE /api/demo/users/:userId
   * Deaktiviert einen Demo-User (Admin only)
   */
  router.delete("/users/:userId", requireAdmin, (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      demoManager.deactivateDemoUser(userId);

      res.json({
        success: true,
        message: "Demo user deactivated",
      });
    } catch (error: any) {
      console.error("Deactivate demo user error:", error);
      res.status(500).json({ error: error.message || "Failed to deactivate demo user" });
    }
  });

  /**
   * GET /api/demo/stats
   * Statistiken über Demo-System (Admin only)
   */
  router.get("/stats", requireAdmin, (_req: Request, res: Response) => {
    try {
      const stats = demoManager.getStats();

      res.json(stats);
    } catch (error: any) {
      console.error("Get demo stats error:", error);
      res.status(500).json({ error: error.message || "Failed to get stats" });
    }
  });

  /**
   * POST /api/demo/cron/expire
   * Deaktiviert abgelaufene Demo-User (Cron-Job)
   */
  router.post("/cron/expire", requireCronAuth, (_req: Request, res: Response) => {
    try {
      const expiredCount = demoManager.expireOldDemoUsers();

      res.json({
        success: true,
        expiredCount,
        message: `${expiredCount} demo users expired`,
      });
    } catch (error: any) {
      console.error("Expire demo users error:", error);
      res.status(500).json({ error: error.message || "Failed to expire users" });
    }
  });

  return router;
}
