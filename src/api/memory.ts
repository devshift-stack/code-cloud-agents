/**
 * Memory Management REST API
 *
 * Provides endpoints for conversation memory, search, and embeddings
 */

import { Router } from "express";
import { z } from "zod";
import type { Database } from "../db/database.js";
import { MemoryManager } from "../memory/manager.js";
import { MemorySearch } from "../memory/search.js";
import { EmbeddingsManager } from "../memory/embeddings.js";
import { requireAuth } from "../auth/middleware.js";

// Validation schemas
const CreateChatSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  agentName: z.string().optional(),
  initialMessage: z.string().optional(),
});

const UpdateChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  agentName: z.string().optional(),
});

const AddMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
  agentName: z.string().optional(),
  tokensInput: z.number().int().min(0).optional(),
  tokensOutput: z.number().int().min(0).optional(),
});

const SearchSchema = z.object({
  query: z.string().min(1),
  chatId: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Creates Memory Management API router
 */
export function createMemoryRouter(db: Database): Router {
  const router = Router();

  // Phase-1 Hardening: All memory routes require authentication
  router.use(requireAuth);

  const memoryManager = new MemoryManager(db);
  const memorySearch = new MemorySearch(db);
  const embeddingsManager = new EmbeddingsManager(db);

  /**
   * GET /api/memory/chats/:userId
   * List chats for a user
   */
  router.get("/chats/:userId", (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const chats = memoryManager.listChats(userId, limit, offset);

      res.json({
        success: true,
        chats,
        count: chats.length,
      });
    } catch (error) {
      console.error("Failed to list chats:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/memory/chats
   * Create a new chat
   */
  router.post("/chats", (req, res) => {
    try {
      const parsed = CreateChatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const chat = memoryManager.createChat(parsed.data);

      res.status(201).json({
        success: true,
        chat,
      });
    } catch (error) {
      console.error("Failed to create chat:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/memory/chats/:chatId/details
   * Get chat details
   */
  router.get("/chats/:chatId/details", (req, res) => {
    try {
      const { chatId } = req.params;

      const chat = memoryManager.getChat(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      const tokens = memoryManager.getChatTokens(chatId);

      res.json({
        success: true,
        chat,
        tokens,
      });
    } catch (error) {
      console.error("Failed to get chat:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * PATCH /api/memory/chats/:chatId
   * Update chat metadata
   */
  router.patch("/chats/:chatId", (req, res) => {
    try {
      const { chatId } = req.params;

      const parsed = UpdateChatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const success = memoryManager.updateChat(chatId, parsed.data);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      res.json({
        success: true,
      });
    } catch (error) {
      console.error("Failed to update chat:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * DELETE /api/memory/chats/:chatId
   * Delete a chat and all its messages
   */
  router.delete("/chats/:chatId", (req, res) => {
    try {
      const { chatId } = req.params;

      const success = memoryManager.deleteChat(chatId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      res.json({
        success: true,
      });
    } catch (error) {
      console.error("Failed to delete chat:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/memory/chats/:chatId/messages
   * Get messages for a chat
   */
  router.get("/chats/:chatId/messages", (req, res) => {
    try {
      const { chatId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const messages = memoryManager.getMessages(chatId, limit, offset);

      res.json({
        success: true,
        messages,
        count: messages.length,
      });
    } catch (error) {
      console.error("Failed to get messages:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/memory/chats/:chatId/messages
   * Add a message to a chat
   */
  router.post("/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;

      const parsed = AddMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const message = memoryManager.addMessage({
        chatId,
        ...parsed.data,
      });

      // Generate embedding in background (non-blocking)
      if (embeddingsManager.isEnabled()) {
        embeddingsManager
          .storeEmbedding(message.id, message.content)
          .catch((error) => {
            console.error("Failed to generate embedding:", error);
          });
      }

      res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      console.error("Failed to add message:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/memory/chats/:chatId/recent
   * Get recent messages for context
   */
  router.get("/chats/:chatId/recent", (req, res) => {
    try {
      const { chatId } = req.params;
      const count = parseInt(req.query.count as string) || 10;

      const messages = memoryManager.getRecentMessages(chatId, count);

      res.json({
        success: true,
        messages,
        count: messages.length,
      });
    } catch (error) {
      console.error("Failed to get recent messages:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * DELETE /api/memory/chats/:chatId/messages/old
   * Clear old messages (keep last N)
   */
  router.delete("/chats/:chatId/messages/old", (req, res) => {
    try {
      const { chatId } = req.params;
      const keepLast = parseInt(req.query.keepLast as string) || 100;

      const deleted = memoryManager.clearOldMessages(chatId, keepLast);

      res.json({
        success: true,
        deleted,
      });
    } catch (error) {
      console.error("Failed to clear old messages:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/memory/search
   * Search messages
   */
  router.post("/search", (req, res) => {
    try {
      const parsed = SearchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const results = memorySearch.searchMessages({
        ...parsed.data,
        userId: req.body.userId, // Required but not in schema for optional use
      });

      res.json({
        success: true,
        results,
        count: results.length,
      });
    } catch (error) {
      console.error("Failed to search messages:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/memory/search/chats/:userId
   * Search chats by title or content
   */
  router.get("/search/chats/:userId", (req, res) => {
    try {
      const { userId } = req.params;
      const query = req.query.query as string;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Query parameter required",
        });
      }

      const chats = memorySearch.searchChats(userId, query, limit);

      res.json({
        success: true,
        chats,
        count: chats.length,
      });
    } catch (error) {
      console.error("Failed to search chats:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/memory/messages/:messageId/context
   * Get context around a message
   */
  router.get("/messages/:messageId/context", (req, res) => {
    try {
      const { messageId } = req.params;
      const contextSize = parseInt(req.query.contextSize as string) || 5;

      const context = memorySearch.getContext(messageId, contextSize);

      res.json({
        success: true,
        context,
      });
    } catch (error) {
      console.error("Failed to get context:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/memory/messages/:messageId/similar
   * Find similar messages
   */
  router.get("/messages/:messageId/similar", (req, res) => {
    try {
      const { messageId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const results = memorySearch.findSimilar(messageId, limit);

      res.json({
        success: true,
        results,
        count: results.length,
      });
    } catch (error) {
      console.error("Failed to find similar:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/memory/trending/:userId
   * Get trending topics
   */
  router.get("/trending/:userId", (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const days = parseInt(req.query.days as string) || 7;

      const topics = memorySearch.getTrendingTopics(userId, limit, days);

      res.json({
        success: true,
        topics,
      });
    } catch (error) {
      console.error("Failed to get trending topics:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/memory/semantic/search
   * Semantic search using embeddings
   */
  router.post("/semantic/search", async (req, res) => {
    try {
      if (!embeddingsManager.isEnabled()) {
        return res.status(503).json({
          success: false,
          error: "Embeddings not enabled (OPENAI_API_KEY not set)",
        });
      }

      const { query, userId, limit } = req.body;

      if (!query || !userId) {
        return res.status(400).json({
          success: false,
          error: "Query and userId required",
        });
      }

      const results = await embeddingsManager.semanticSearch(
        query,
        userId,
        limit || 10,
      );

      res.json({
        success: true,
        results,
        count: results.length,
      });
    } catch (error) {
      console.error("Semantic search failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/memory/chats/:chatId/embeddings/generate
   * Generate embeddings for a chat
   */
  router.post("/chats/:chatId/embeddings/generate", async (req, res) => {
    try {
      if (!embeddingsManager.isEnabled()) {
        return res.status(503).json({
          success: false,
          error: "Embeddings not enabled (OPENAI_API_KEY not set)",
        });
      }

      const { chatId } = req.params;

      const count = await embeddingsManager.generateEmbeddingsForChat(chatId);

      res.json({
        success: true,
        generated: count,
      });
    } catch (error) {
      console.error("Failed to generate embeddings:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/memory/embeddings/stats
   * Get embedding statistics
   */
  router.get("/embeddings/stats", (_req, res) => {
    try {
      const stats = embeddingsManager.getStats();

      res.json({
        success: true,
        enabled: embeddingsManager.isEnabled(),
        stats,
      });
    } catch (error) {
      console.error("Failed to get embeddings stats:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/memory/stats/:userId
   * Get user memory statistics
   */
  router.get("/stats/:userId", (req, res) => {
    try {
      const { userId } = req.params;

      const stats = memoryManager.getUserStats(userId);

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error("Failed to get user stats:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/memory/chats/:chatId/export
   * Export chat to JSON
   */
  router.get("/chats/:chatId/export", (req, res) => {
    try {
      const { chatId } = req.params;

      const data = memoryManager.exportChat(chatId);

      if (!data) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Failed to export chat:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
