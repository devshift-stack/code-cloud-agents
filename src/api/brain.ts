/**
 * Brain REST API - Knowledge Base Endpoints
 *
 * Provides endpoints for document ingestion and semantic search
 */

import { Router } from "express";
import { z } from "zod";
import type { Database } from "../db/database.js";
import { BrainManager } from "../brain/manager.js";
import { BrainSearch } from "../brain/search.js";
import { requireAuth } from "../auth/middleware.js";

// Validation schemas
const IngestTextSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

const IngestUrlSchema = z.object({
  title: z.string().min(1).max(500),
  url: z.string().url(),
  content: z.string().min(1), // Pre-fetched content
  metadata: z.record(z.unknown()).optional(),
});

const IngestFileSchema = z.object({
  title: z.string().min(1).max(500),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().min(0),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

const SearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  mode: z.enum(["semantic", "keyword", "hybrid"]).optional(),
});

const UpdateDocSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const LinkChatSchema = z.object({
  chatId: z.string().min(1),
  docId: z.string().min(1),
});

/**
 * Creates Brain API router
 */
export function createBrainRouter(db: Database): Router {
  const router = Router();

  // All brain routes require authentication
  router.use(requireAuth);

  const brainManager = new BrainManager(db);
  const brainSearch = new BrainSearch(db);

  // ===== INGEST ENDPOINTS =====

  /**
   * POST /api/brain/ingest/text
   * Ingest plain text into knowledge base
   */
  router.post("/ingest/text", async (req, res) => {
    try {
      const parsed = IngestTextSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID required",
        });
      }

      const doc = brainManager.ingestText({
        userId,
        ...parsed.data,
      });

      // Generate embeddings in background
      if (brainSearch.isEnabled()) {
        brainSearch.generateEmbeddingsForDoc(doc.id).catch((error) => {
          console.error("Failed to generate embeddings:", error);
        });
      }

      // Log brain ingest event
      db.audit.log({
        kind: "brain_ingest",
        message: `Document "${doc.title}" ingested`,
        userId,
        severity: "info",
        meta: {
          docId: doc.id,
          sourceType: doc.sourceType,
          contentLength: parsed.data.content.length,
        },
      });

      res.status(201).json({
        success: true,
        doc,
      });
    } catch (error) {
      console.error("Failed to ingest text:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/brain/ingest/url
   * Ingest URL content into knowledge base
   */
  router.post("/ingest/url", async (req, res) => {
    try {
      const parsed = IngestUrlSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID required",
        });
      }

      const doc = brainManager.ingestUrl(
        {
          userId,
          title: parsed.data.title,
          url: parsed.data.url,
          metadata: parsed.data.metadata,
        },
        parsed.data.content,
      );

      // Generate embeddings in background
      if (brainSearch.isEnabled()) {
        brainSearch.generateEmbeddingsForDoc(doc.id).catch((error) => {
          console.error("Failed to generate embeddings:", error);
        });
      }

      res.status(201).json({
        success: true,
        doc,
      });
    } catch (error) {
      console.error("Failed to ingest URL:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/brain/ingest/file
   * Ingest file content into knowledge base
   */
  router.post("/ingest/file", async (req, res) => {
    try {
      const parsed = IngestFileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID required",
        });
      }

      const doc = brainManager.ingestFile({
        userId,
        ...parsed.data,
      });

      // Generate embeddings in background
      if (brainSearch.isEnabled()) {
        brainSearch.generateEmbeddingsForDoc(doc.id).catch((error) => {
          console.error("Failed to generate embeddings:", error);
        });
      }

      res.status(201).json({
        success: true,
        doc,
      });
    } catch (error) {
      console.error("Failed to ingest file:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ===== SEARCH ENDPOINTS =====

  /**
   * POST /api/brain/search
   * Search knowledge base
   */
  router.post("/search", async (req, res) => {
    try {
      const parsed = SearchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID required",
        });
      }

      const { query, limit = 10, mode = "hybrid" } = parsed.data;

      let results;
      switch (mode) {
        case "semantic":
          if (!brainSearch.isEnabled()) {
            return res.status(503).json({
              success: false,
              error: "Semantic search not enabled (OPENAI_API_KEY not set)",
            });
          }
          results = await brainSearch.semanticSearch(query, userId, limit);
          break;

        case "keyword":
          results = brainSearch.keywordSearch(query, userId, limit);
          break;

        case "hybrid":
        default:
          if (!brainSearch.isEnabled()) {
            // Fall back to keyword search if embeddings disabled
            results = brainSearch.keywordSearch(query, userId, limit);
          } else {
            results = await brainSearch.hybridSearch(query, userId, { limit });
          }
          break;
      }

      // Log brain search event (POST)
      db.audit.log({
        kind: "brain_search",
        message: `Search: "${query.substring(0, 50)}${query.length > 50 ? "..." : ""}"`,
        userId,
        severity: "info",
        meta: { query, mode, resultCount: results.length },
      });

      res.json({
        success: true,
        results,
        count: results.length,
        mode,
      });
    } catch (error) {
      console.error("Brain search failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/brain/search
   * Quick search (GET method)
   */
  router.get("/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;
      const mode = (req.query.mode as string) || "hybrid";

      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Query parameter 'q' required",
        });
      }

      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID required",
        });
      }

      let results;
      switch (mode) {
        case "semantic":
          if (!brainSearch.isEnabled()) {
            return res.status(503).json({
              success: false,
              error: "Semantic search not enabled",
            });
          }
          results = await brainSearch.semanticSearch(query, userId, limit);
          break;

        case "keyword":
          results = brainSearch.keywordSearch(query, userId, limit);
          break;

        case "hybrid":
        default:
          if (!brainSearch.isEnabled()) {
            results = brainSearch.keywordSearch(query, userId, limit);
          } else {
            results = await brainSearch.hybridSearch(query, userId, { limit });
          }
          break;
      }

      // Log brain search event (GET)
      db.audit.log({
        kind: "brain_search",
        message: `Search: "${query.substring(0, 50)}${query.length > 50 ? "..." : ""}"`,
        userId,
        severity: "info",
        meta: { query, mode, resultCount: results.length },
      });

      res.json({
        success: true,
        results,
        count: results.length,
        mode,
      });
    } catch (error) {
      console.error("Brain search failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ===== DOCUMENT MANAGEMENT =====

  /**
   * GET /api/brain/docs
   * List documents
   */
  router.get("/docs", (req, res) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID required",
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const sourceType = req.query.sourceType as string;
      const status = req.query.status as string;

      const docs = brainManager.listDocs(userId, {
        limit,
        offset,
        sourceType,
        status,
      });

      res.json({
        success: true,
        docs,
        count: docs.length,
      });
    } catch (error) {
      console.error("Failed to list docs:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/brain/docs/:docId
   * Get document details
   */
  router.get("/docs/:docId", (req, res) => {
    try {
      const { docId } = req.params;
      const doc = brainManager.getDoc(docId);

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: "Document not found",
        });
      }

      // Check ownership
      const userId = (req as any).userId;
      if (doc.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      const chunks = brainManager.getChunks(docId);

      res.json({
        success: true,
        doc,
        chunks,
      });
    } catch (error) {
      console.error("Failed to get doc:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * PATCH /api/brain/docs/:docId
   * Update document
   */
  router.patch("/docs/:docId", (req, res) => {
    try {
      const { docId } = req.params;
      const doc = brainManager.getDoc(docId);

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: "Document not found",
        });
      }

      // Check ownership
      const userId = (req as any).userId;
      if (doc.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      const parsed = UpdateDocSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const success = brainManager.updateDoc(docId, parsed.data);

      res.json({
        success,
      });
    } catch (error) {
      console.error("Failed to update doc:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * DELETE /api/brain/docs/:docId
   * Delete document
   */
  router.delete("/docs/:docId", (req, res) => {
    try {
      const { docId } = req.params;
      const doc = brainManager.getDoc(docId);

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: "Document not found",
        });
      }

      // Check ownership
      const userId = (req as any).userId;
      if (doc.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      const success = brainManager.deleteDoc(docId);

      res.json({
        success,
      });
    } catch (error) {
      console.error("Failed to delete doc:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ===== SIMILAR DOCUMENTS =====

  /**
   * GET /api/brain/docs/:docId/similar
   * Find similar documents
   */
  router.get("/docs/:docId/similar", async (req, res) => {
    try {
      const { docId } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;

      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID required",
        });
      }

      if (!brainSearch.isEnabled()) {
        return res.status(503).json({
          success: false,
          error: "Semantic search not enabled",
        });
      }

      const results = await brainSearch.findSimilar(docId, userId, limit);

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

  // ===== EMBEDDINGS =====

  /**
   * POST /api/brain/docs/:docId/embeddings
   * Generate embeddings for a document
   */
  router.post("/docs/:docId/embeddings", async (req, res) => {
    try {
      const { docId } = req.params;

      if (!brainSearch.isEnabled()) {
        return res.status(503).json({
          success: false,
          error: "Embeddings not enabled (OPENAI_API_KEY not set)",
        });
      }

      const doc = brainManager.getDoc(docId);
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: "Document not found",
        });
      }

      // Check ownership
      const userId = (req as any).userId;
      if (doc.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      const count = await brainSearch.generateEmbeddingsForDoc(docId);

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

  // ===== CHAT LINKS =====

  /**
   * POST /api/brain/link
   * Link document to chat
   */
  router.post("/link", (req, res) => {
    try {
      const parsed = LinkChatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const { chatId, docId } = parsed.data;
      const link = brainManager.linkToChat(chatId, docId);

      res.status(201).json({
        success: true,
        link,
      });
    } catch (error) {
      console.error("Failed to link:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * DELETE /api/brain/link
   * Unlink document from chat
   */
  router.delete("/link", (req, res) => {
    try {
      const { chatId, docId } = req.body;

      if (!chatId || !docId) {
        return res.status(400).json({
          success: false,
          error: "chatId and docId required",
        });
      }

      const success = brainManager.unlinkFromChat(chatId, docId);

      res.json({
        success,
      });
    } catch (error) {
      console.error("Failed to unlink:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/brain/chat/:chatId/docs
   * Get documents linked to a chat
   */
  router.get("/chat/:chatId/docs", (req, res) => {
    try {
      const { chatId } = req.params;
      const docs = brainManager.getLinkedDocs(chatId);

      res.json({
        success: true,
        docs,
        count: docs.length,
      });
    } catch (error) {
      console.error("Failed to get linked docs:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ===== STATISTICS =====

  /**
   * GET /api/brain/stats
   * Get brain statistics
   */
  router.get("/stats", (req, res) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User ID required",
        });
      }

      const docStats = brainManager.getUserStats(userId);
      const searchStats = brainSearch.getStats(userId);

      res.json({
        success: true,
        enabled: brainSearch.isEnabled(),
        stats: {
          ...docStats,
          ...searchStats,
        },
      });
    } catch (error) {
      console.error("Failed to get stats:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
