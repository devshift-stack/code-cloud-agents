/**
 * Webhooks API Router
 *
 * Endpoints for webhook management
 */

import { Router, type Request, type Response } from "express";
import { webhookManager } from "../integrations/webhooks/index.ts";
import { generateSecret } from "../integrations/webhooks/security.ts";
import type { WebhookRegistration } from "../integrations/webhooks/types.ts";

export function createWebhookRouter(): Router {
  const router = Router();

  /**
   * GET /api/webhooks - List all webhooks
   */
  router.get("/", (_req: Request, res: Response) => {
    try {
      const webhooks = webhookManager.list();
      res.json({
        total: webhooks.length,
        webhooks: webhooks.map((w) => ({
          ...w,
          secret: w.secret ? "***" : undefined, // Hide secret
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to list webhooks",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/webhooks/:id - Get specific webhook
   */
  router.get("/:id", (req: Request, res: Response) => {
    try {
      const webhook = webhookManager.get(req.params.id);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      res.json({
        ...webhook,
        secret: webhook.secret ? "***" : undefined, // Hide secret
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to get webhook",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/webhooks - Register new webhook
   */
  router.post("/", (req: Request, res: Response) => {
    try {
      const registration: WebhookRegistration = req.body;

      // Validate required fields
      if (!registration.url) {
        return res.status(400).json({ error: "Missing required field: url" });
      }

      if (!registration.events || registration.events.length === 0) {
        return res
          .status(400)
          .json({ error: "Missing required field: events" });
      }

      // Generate secret if not provided
      if (!registration.secret) {
        registration.secret = generateSecret();
      }

      const webhook = webhookManager.register(registration);

      res.status(201).json({
        ...webhook,
        secret: webhook.secret, // Show secret on creation (only time)
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to register webhook",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * PATCH /api/webhooks/:id - Update webhook
   */
  router.patch("/:id", (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const webhook = webhookManager.update(req.params.id, updates);

      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      res.json({
        ...webhook,
        secret: webhook.secret ? "***" : undefined, // Hide secret
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to update webhook",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * DELETE /api/webhooks/:id - Unregister webhook
   */
  router.delete("/:id", (req: Request, res: Response) => {
    try {
      const deleted = webhookManager.unregister(req.params.id);

      if (!deleted) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: "Failed to unregister webhook",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/webhooks/:id/deliveries - Get delivery history
   */
  router.get("/:id/deliveries", (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const deliveries = webhookManager.getDeliveries(req.params.id, limit);

      res.json({
        total: deliveries.length,
        deliveries,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to get deliveries",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/webhooks/deliveries/all - Get all recent deliveries
   */
  router.get("/deliveries/all", (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const deliveries = webhookManager.getAllDeliveries(limit);

      res.json({
        total: deliveries.length,
        deliveries,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to get all deliveries",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/webhooks/test - Test webhook delivery
   */
  router.post("/test", async (req: Request, res: Response) => {
    try {
      const { webhookId } = req.body;

      if (!webhookId) {
        return res
          .status(400)
          .json({ error: "Missing required field: webhookId" });
      }

      const webhook = webhookManager.get(webhookId);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      // Trigger test event
      await webhookManager.trigger("task.created", {
        id: "test-123",
        title: "Test webhook delivery",
        priority: "low",
        status: "pending",
        test: true,
      });

      res.json({ message: "Test webhook triggered" });
    } catch (error) {
      res.status(500).json({
        error: "Failed to test webhook",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * POST /api/webhooks/incoming - Receive incoming webhooks
   */
  router.post("/incoming", (req: Request, res: Response) => {
    try {
      const signature = req.headers["x-webhook-signature"] as string;
      const secret = process.env.WEBHOOK_SECRET;

      if (!secret) {
        return res.status(500).json({ error: "Webhook secret not configured" });
      }

      if (!signature) {
        return res.status(401).json({ error: "Missing webhook signature" });
      }

      const payload = JSON.stringify(req.body);
      const isValid = webhookManager.verifyIncoming(payload, signature, secret);

      if (!isValid) {
        return res.status(403).json({ error: "Invalid webhook signature" });
      }

      // Process webhook payload
      console.log("📥 Incoming webhook:", req.body);

      res.status(200).json({ message: "Webhook received" });
    } catch (error) {
      res.status(500).json({
        error: "Failed to process incoming webhook",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
