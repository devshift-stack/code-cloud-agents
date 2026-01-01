/**
 * Brain API Proxy
 *
 * Proxies all brain requests to the central Brain-Server (49.13.158.176:5001)
 * Maps between Cloud-Agents brain API and The-Brain memory API
 */

import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";

const BRAIN_SERVER_URL =
  process.env.BRAIN_SERVER_URL || "http://49.13.158.176:5001";

interface BrainProxyOptions {
  fallbackToLocal?: boolean;
}

/**
 * Creates Brain API Proxy router
 */
export function createBrainProxyRouter(
  _options: BrainProxyOptions = {},
): Router {
  const router = Router();
  router.use(requireAuth);

  // Helper to proxy requests
  async function proxyToBrain(
    endpoint: string,
    method: string,
    userId: string,
    body?: any,
  ): Promise<any> {
    const url = `${BRAIN_SERVER_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-user-id": userId,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(error.error || "Brain server error");
    }

    return response.json();
  }

  // ===== INGEST ENDPOINTS =====
  // Maps to /api/memory/store with type="document"

  router.post("/ingest/text", async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { title, content, metadata } = req.body;

      if (!title || !content) {
        return res
          .status(400)
          .json({ success: false, error: "title and content required" });
      }

      const result = await proxyToBrain("/api/memory/store", "POST", userId, {
        type: "document",
        content: `# ${title}\n\n${content}`,
        tags: metadata?.tags || ["ingested", "text"],
      });

      res.status(201).json({
        success: true,
        doc: {
          id: result.id,
          userId,
          title,
          sourceType: "text",
          status: "ready",
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Brain proxy ingest/text failed:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/ingest/url", async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { title, url, content, metadata } = req.body;

      if (!title || !url || !content) {
        return res
          .status(400)
          .json({ success: false, error: "title, url and content required" });
      }

      const result = await proxyToBrain("/api/memory/store", "POST", userId, {
        type: "document",
        content: `# ${title}\n\nSource: ${url}\n\n${content}`,
        tags: metadata?.tags || ["ingested", "url"],
      });

      res.status(201).json({
        success: true,
        doc: {
          id: result.id,
          userId,
          title,
          url,
          sourceType: "url",
          status: "ready",
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Brain proxy ingest/url failed:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post("/ingest/file", async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { title, filePath, fileName, fileType, content, metadata } =
        req.body;

      if (!title || !content) {
        return res
          .status(400)
          .json({ success: false, error: "title and content required" });
      }

      const result = await proxyToBrain("/api/memory/store", "POST", userId, {
        type: "document",
        content: `# ${title}\n\nFile: ${fileName || filePath}\nType: ${fileType}\n\n${content}`,
        tags: metadata?.tags || ["ingested", "file", fileType || "unknown"],
      });

      res.status(201).json({
        success: true,
        doc: {
          id: result.id,
          userId,
          title,
          filePath,
          fileName,
          fileType,
          sourceType: "file",
          status: "ready",
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Brain proxy ingest/file failed:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== SEARCH ENDPOINTS =====

  router.post("/search", async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { query, limit = 10, mode = "keyword" } = req.body;

      if (!query) {
        return res
          .status(400)
          .json({ success: false, error: "query required" });
      }

      const result = await proxyToBrain("/api/memory/search", "POST", userId, {
        query,
        limit,
      });

      // Transform memory results to brain search results
      const results = (result.results || []).map((r: any) => ({
        docId: r.id,
        chunkId: r.id,
        content: r.content,
        score: 1.0,
        title: r.content.split("\n")[0].replace(/^#\s*/, "") || "Untitled",
        snippet: r.content.substring(0, 200),
      }));

      res.json({ success: true, results, count: results.length, mode });
    } catch (error: any) {
      console.error("Brain proxy search failed:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get("/search", async (req, res) => {
    try {
      const userId = (req as any).userId;
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!query) {
        return res
          .status(400)
          .json({ success: false, error: "q parameter required" });
      }

      const result = await proxyToBrain("/api/memory/search", "POST", userId, {
        query,
        limit,
      });

      const results = (result.results || []).map((r: any) => ({
        docId: r.id,
        chunkId: r.id,
        content: r.content,
        score: 1.0,
        title: r.content.split("\n")[0].replace(/^#\s*/, "") || "Untitled",
        snippet: r.content.substring(0, 200),
      }));

      res.json({
        success: true,
        results,
        count: results.length,
        mode: "keyword",
      });
    } catch (error: any) {
      console.error("Brain proxy search failed:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== DOCUMENT MANAGEMENT =====

  router.get("/docs", async (req, res) => {
    try {
      const userId = (req as any).userId;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await proxyToBrain(
        `/api/memory/recent?limit=${limit}`,
        "GET",
        userId,
      );

      // Transform memory entries to docs
      const docs = (result.results || []).map((r: any) => ({
        id: r.id,
        userId,
        title: r.content.split("\n")[0].replace(/^#\s*/, "") || "Untitled",
        sourceType: r.type === "document" ? "text" : r.type,
        status: "ready",
        createdAt: r.createdAt,
      }));

      res.json({ success: true, docs, count: docs.length });
    } catch (error: any) {
      console.error("Brain proxy docs list failed:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== STATS =====

  router.get("/stats", async (req, res) => {
    try {
      const userId = (req as any).userId;

      // Get recent documents to calculate stats
      const result = await proxyToBrain(
        "/api/memory/recent?limit=50",
        "GET",
        userId,
      );
      const docs = result.results || [];

      res.json({
        success: true,
        enabled: true,
        proxyMode: true,
        brainServer: BRAIN_SERVER_URL,
        stats: {
          totalDocs: docs.length,
          totalChunks: docs.length, // Each memory entry is one "chunk"
          searchCount: 0,
          lastSearchAt: null,
        },
      });
    } catch (error: any) {
      console.error("Brain proxy stats failed:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Health check for proxy
  router.get("/proxy/health", async (_req, res) => {
    try {
      const response = await fetch(`${BRAIN_SERVER_URL}/health`);
      const health = await response.json();
      res.json({
        success: true,
        proxyMode: true,
        brainServer: BRAIN_SERVER_URL,
        brainHealth: health,
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        proxyMode: true,
        brainServer: BRAIN_SERVER_URL,
        error: error.message,
      });
    }
  });

  return router;
}
