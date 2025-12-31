/**
 * Chat API Router
 *
 * Endpoints for chat interface
 * Requires authentication for most endpoints
 */

import { Router, type Request, type Response } from "express";
import { ChatManager } from "../chat/manager.ts";
import type { ChatRequest } from "../chat/types.ts";
import { requireAuth } from "../auth/middleware.ts";
import { taskQueue } from "../agents/task-queue.js";

export function createChatRouter(chatManager: ChatManager): Router {
  const router = Router();

  /**
   * POST /api/chat/send
   * Send message to agent
   * Requires authentication
   */
  router.post("/send", requireAuth, async (req: Request, res: Response) => {
    try {
      const request: ChatRequest = req.body;

      // Validate request
      if (!request.userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      if (!request.agentName) {
        return res.status(400).json({ error: "agentName is required" });
      }
      if (!request.message) {
        return res.status(400).json({ error: "message is required" });
      }

      const response = await chatManager.sendMessage(request);

      // Create task from message if it looks like a command
      const task = taskQueue.createTaskFromChat(
        request.message,
        request.userId,
        response.chatId,
      );
      if (task) {
        console.log("[Chat] Created task from message:", task.id);
      }
      res.json(response);
    } catch (error: any) {
      console.error("Chat send error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  /**
   * GET /api/chat/:chatId/messages
   * Get chat history
   * Requires authentication
   */
  router.get(
    "/:chatId/messages",
    requireAuth,
    (req: Request, res: Response) => {
      try {
        const { chatId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const history = chatManager.getChatHistory(chatId, limit, offset);
        res.json(history);
      } catch (error: any) {
        console.error("Get chat history error:", error);
        res
          .status(500)
          .json({ error: error.message || "Internal server error" });
      }
    },
  );

  /**
   * GET /api/chat/list/:userId
   * List user's chats
   * Requires authentication
   */
  router.get("/list/:userId", requireAuth, (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const chats = chatManager.listChats(userId, page, pageSize);
      res.json(chats);
    } catch (error: any) {
      console.error("List chats error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  /**
   * DELETE /api/chat/:chatId
   * Delete chat
   * Requires authentication
   */
  router.delete("/:chatId", requireAuth, (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      chatManager.deleteChat(chatId);
      res.json({ success: true, message: "Chat deleted" });
    } catch (error: any) {
      console.error("Delete chat error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  /**
   * PUT /api/chat/:chatId/title
   * Update chat title
   * Requires authentication
   */
  router.put("/:chatId/title", requireAuth, (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      const { title } = req.body;

      if (!title) {
        return res.status(400).json({ error: "title is required" });
      }

      chatManager.updateChatTitle(chatId, title);
      res.json({ success: true, message: "Chat title updated" });
    } catch (error: any) {
      console.error("Update chat title error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  /**
   * GET /api/chat/agents
   * List available agents
   */
  router.get("/agents", (_req: Request, res: Response) => {
    // Available agents (from your system)
    const agents = [
      {
        name: "emir",
        displayName: "Emir (Supervisor)",
        description:
          "Lead supervisor, coordinates all agents and makes final decisions",
        capabilities: ["planning", "review", "coordination", "decision-making"],
      },
      {
        name: "planner",
        displayName: "Planner",
        description:
          "Creates detailed project plans with requirements and architecture",
        capabilities: ["planning", "architecture", "requirements"],
      },
      {
        name: "berater",
        displayName: "Berater (Consultant)",
        description:
          "Project intake specialist, asks precise questions about requirements",
        capabilities: [
          "consultation",
          "requirements-gathering",
          "risk-analysis",
        ],
      },
      {
        name: "designer",
        displayName: "Designer",
        description:
          "UI/UX designer, creates design concepts and ensures accessibility",
        capabilities: ["ui-design", "ux-design", "accessibility"],
      },
      {
        name: "coder",
        displayName: "Coder",
        description:
          "Implements features according to plan and design specifications",
        capabilities: ["coding", "implementation", "debugging"],
      },
      {
        name: "tester",
        displayName: "Tester",
        description: "Creates test plans and writes unit/integration/E2E tests",
        capabilities: ["testing", "qa", "test-automation"],
      },
      {
        name: "security",
        displayName: "Security",
        description: "Security review specialist, checks for vulnerabilities",
        capabilities: [
          "security-review",
          "vulnerability-scanning",
          "secure-coding",
        ],
      },
      {
        name: "docs",
        displayName: "Docs",
        description:
          "Technical writer, creates README, guides, and API documentation",
        capabilities: ["documentation", "technical-writing", "api-docs"],
      },
    ];

    res.json({ agents });
  });

  // ===============================
  // Chat Threads API (for Dashboard)
  // ===============================

  /**
   * GET /api/chat/threads
   * List threads for current authenticated user
   */
  router.get("/threads", requireAuth, (req: Request, res: Response) => {
    try {
      const userId =
        (req as any).user?.id ||
        (req as any).user?.userId ||
        (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const page = parseInt(req.query.page as string) || 1;

      const result = chatManager.listChats(userId, page, limit);
      const chats = result.chats || [];

      const threads = chats.map((chat: any) => ({
        id: chat.id,
        title: chat.title,
        agentId: chat.agentName || chat.agent_name,
        userId: chat.userId || chat.user_id,
        lastMessage: chat.lastMessage || chat.last_message,
        messageCount: chat.messageCount || chat.message_count || 0,
        createdAt: chat.createdAt || chat.created_at,
        updatedAt: chat.updatedAt || chat.updated_at,
      }));

      res.json({ success: true, threads });
    } catch (error: any) {
      console.error("Get threads error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  /**
   * POST /api/chat/threads
   * Create new chat thread for current user
   */
  router.post("/threads", requireAuth, (req: Request, res: Response) => {
    try {
      const userId =
        (req as any).user?.id ||
        (req as any).user?.userId ||
        (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const title = req.body?.title || "New Chat";
      const agentId = req.body?.agentId || "cloud_assistant";

      const chat = chatManager.createChat(userId, title, agentId);

      res.status(201).json({
        success: true,
        thread: {
          id: chat.id,
          title: chat.title,
          agentId: chat.agentName || agentId,
          userId: chat.userId || userId,
          createdAt: chat.createdAt || new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Create thread error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  /**
   * GET /api/chat/threads/:id/messages
   * Get messages for a specific thread
   */
  router.get(
    "/threads/:id/messages",
    requireAuth,
    (req: Request, res: Response) => {
      try {
        const userId =
          (req as any).user?.id ||
          (req as any).user?.userId ||
          (req as any).userId;
        if (!userId) {
          return res.status(401).json({ error: "Authentication required" });
        }

        const threadId = req.params.id;
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;

        const history = chatManager.getChatHistory(threadId, limit, offset);

        const messages = (history.messages || []).map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp:
            msg.timestamp || msg.created_at || new Date().toISOString(),
        }));

        res.json({ success: true, messages });
      } catch (error: any) {
        console.error("Get thread messages error:", error);
        res
          .status(500)
          .json({ error: error.message || "Internal server error" });
      }
    },
  );

  return router;
}
