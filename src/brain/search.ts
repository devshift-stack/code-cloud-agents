/**
 * Brain Search - Semantic and keyword search for Knowledge Base
 *
 * Provides semantic search using embeddings and keyword search for documents
 */

import type { Database } from "../db/database.js";
import { OpenAI } from "openai";

export interface BrainSearchResult {
  docId: string;
  chunkId: string;
  content: string;
  similarity: number;
  docTitle: string;
  sourceType: string;
  chunkIndex: number;
}

export interface KeywordSearchResult {
  docId: string;
  title: string;
  content: string;
  sourceType: string;
  matchCount: number;
  snippet: string;
}

/**
 * Brain Search for knowledge base
 */
export class BrainSearch {
  private openai: OpenAI | null = null;
  private embeddingModel = "text-embedding-3-small"; // 1536 dimensions
  private enabled: boolean = false;

  constructor(private db: Database) {
    // Initialize OpenAI if API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.enabled = true;
    } else {
      console.warn(
        "⚠️ OPENAI_API_KEY not set - brain semantic search disabled",
      );
    }
  }

  /**
   * Check if semantic search is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
        encoding_format: "float",
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      throw error;
    }
  }

  /**
   * Store embedding for a chunk
   */
  async storeChunkEmbedding(
    chunkId: string,
    docId: string,
    text: string,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const embedding = await this.generateEmbedding(text);
      const rawDb = this.db.getRawDb();
      const now = new Date().toISOString();

      const stmt = rawDb.prepare(`
        INSERT OR REPLACE INTO brain_embeddings (chunk_id, doc_id, embedding, model, dimensions, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        chunkId,
        docId,
        JSON.stringify(embedding),
        this.embeddingModel,
        embedding.length,
        now,
      );
    } catch (error) {
      console.error("Failed to store chunk embedding:", error);
    }
  }

  /**
   * Generate embeddings for all chunks of a document
   */
  async generateEmbeddingsForDoc(docId: string): Promise<number> {
    if (!this.enabled) {
      return 0;
    }

    const rawDb = this.db.getRawDb();

    // Get chunks without embeddings
    const stmt = rawDb.prepare(`
      SELECT c.id, c.content FROM brain_chunks c
      LEFT JOIN brain_embeddings e ON c.id = e.chunk_id
      WHERE c.doc_id = ? AND e.chunk_id IS NULL
    `);

    const rows = stmt.all(docId) as any[];
    let count = 0;

    for (const row of rows) {
      try {
        await this.storeChunkEmbedding(row.id, docId, row.content);
        count++;
        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `Failed to generate embedding for chunk ${row.id}:`,
          error,
        );
      }
    }

    return count;
  }

  /**
   * Semantic search in knowledge base
   */
  async semanticSearch(
    query: string,
    userId: string,
    limit: number = 10,
  ): Promise<BrainSearchResult[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const rawDb = this.db.getRawDb();

      // Get all embeddings for user's documents
      const stmt = rawDb.prepare(`
        SELECT
          e.chunk_id, e.doc_id, e.embedding,
          c.content, c.chunk_index,
          d.title, d.source_type
        FROM brain_embeddings e
        JOIN brain_chunks c ON e.chunk_id = c.id
        JOIN brain_docs d ON e.doc_id = d.id
        WHERE d.user_id = ? AND d.status = 'ready'
      `);

      const rows = stmt.all(userId) as any[];

      // Calculate cosine similarity
      const results: BrainSearchResult[] = rows.map((row) => {
        const embedding = JSON.parse(row.embedding);
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);

        return {
          docId: row.doc_id,
          chunkId: row.chunk_id,
          content: row.content,
          similarity,
          docTitle: row.title,
          sourceType: row.source_type,
          chunkIndex: row.chunk_index,
        };
      });

      // Sort by similarity and return top N
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, limit);
    } catch (error) {
      console.error("Brain semantic search failed:", error);
      return [];
    }
  }

  /**
   * Keyword search in knowledge base
   */
  keywordSearch(
    query: string,
    userId: string,
    limit: number = 20,
  ): KeywordSearchResult[] {
    const rawDb = this.db.getRawDb();

    // Split query into words for matching
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (words.length === 0) {
      return [];
    }

    // Build LIKE conditions for each word
    const likeConditions = words
      .map(() => "(LOWER(d.content) LIKE ? OR LOWER(d.title) LIKE ?)")
      .join(" AND ");
    const params: any[] = [userId];

    words.forEach((word) => {
      params.push(`%${word}%`, `%${word}%`);
    });

    params.push(limit);

    const stmt = rawDb.prepare(`
      SELECT
        d.id as doc_id,
        d.title,
        d.content,
        d.source_type
      FROM brain_docs d
      WHERE d.user_id = ? AND d.status = 'ready' AND (${likeConditions})
      ORDER BY d.updated_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(...params) as any[];

    return rows.map((row) => {
      // Count matches
      let matchCount = 0;
      const contentLower = (row.content || "").toLowerCase();
      const titleLower = (row.title || "").toLowerCase();

      words.forEach((word) => {
        const contentMatches = (contentLower.match(new RegExp(word, "g")) || [])
          .length;
        const titleMatches = (titleLower.match(new RegExp(word, "g")) || [])
          .length;
        matchCount += contentMatches + titleMatches;
      });

      // Generate snippet around first match
      const snippet = this.generateSnippet(row.content || "", words[0], 150);

      return {
        docId: row.doc_id,
        title: row.title,
        content: row.content,
        sourceType: row.source_type,
        matchCount,
        snippet,
      };
    });
  }

  /**
   * Hybrid search combining semantic and keyword
   */
  async hybridSearch(
    query: string,
    userId: string,
    options: { semanticWeight?: number; limit?: number } = {},
  ): Promise<BrainSearchResult[]> {
    const { semanticWeight = 0.7, limit = 10 } = options;

    // Get semantic results
    const semanticResults = await this.semanticSearch(query, userId, limit * 2);

    // Get keyword results
    const keywordResults = this.keywordSearch(query, userId, limit * 2);

    // Combine and re-rank
    const scoreMap = new Map<
      string,
      { result: BrainSearchResult; score: number }
    >();

    // Add semantic scores
    semanticResults.forEach((result, index) => {
      const score = (1 - index / semanticResults.length) * semanticWeight;
      scoreMap.set(result.chunkId, { result, score });
    });

    // Add keyword scores
    keywordResults.forEach((kwResult, index) => {
      const keywordScore =
        (1 - index / keywordResults.length) * (1 - semanticWeight);

      // Find matching chunks from this doc
      const docChunks = semanticResults.filter(
        (r) => r.docId === kwResult.docId,
      );

      if (docChunks.length > 0) {
        // Boost existing chunks
        docChunks.forEach((chunk) => {
          const existing = scoreMap.get(chunk.chunkId);
          if (existing) {
            existing.score += keywordScore;
          }
        });
      }
    });

    // Sort and return
    const combined = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.result);

    return combined;
  }

  /**
   * Find similar documents
   */
  async findSimilar(
    docId: string,
    userId: string,
    limit: number = 5,
  ): Promise<BrainSearchResult[]> {
    if (!this.enabled) {
      return [];
    }

    const rawDb = this.db.getRawDb();

    // Get embeddings for the reference document
    const refStmt = rawDb.prepare(`
      SELECT embedding FROM brain_embeddings
      WHERE doc_id = ?
      LIMIT 1
    `);
    const refRow = refStmt.get(docId) as any;

    if (!refRow) {
      return [];
    }

    const refEmbedding = JSON.parse(refRow.embedding);

    // Get all other document embeddings for the user
    const stmt = rawDb.prepare(`
      SELECT
        e.chunk_id, e.doc_id, e.embedding,
        c.content, c.chunk_index,
        d.title, d.source_type
      FROM brain_embeddings e
      JOIN brain_chunks c ON e.chunk_id = c.id
      JOIN brain_docs d ON e.doc_id = d.id
      WHERE d.user_id = ? AND d.id != ? AND d.status = 'ready'
    `);

    const rows = stmt.all(userId, docId) as any[];

    const results: BrainSearchResult[] = rows.map((row) => {
      const embedding = JSON.parse(row.embedding);
      const similarity = this.cosineSimilarity(refEmbedding, embedding);

      return {
        docId: row.doc_id,
        chunkId: row.chunk_id,
        content: row.content,
        similarity,
        docTitle: row.title,
        sourceType: row.source_type,
        chunkIndex: row.chunk_index,
      };
    });

    results.sort((a, b) => b.similarity - a.similarity);

    // Deduplicate by docId (keep highest similarity per doc)
    const seenDocs = new Set<string>();
    const unique: BrainSearchResult[] = [];

    for (const result of results) {
      if (!seenDocs.has(result.docId)) {
        seenDocs.add(result.docId);
        unique.push(result);
      }
      if (unique.length >= limit) break;
    }

    return unique;
  }

  /**
   * Get embedding statistics
   */
  getStats(userId?: string): {
    totalEmbeddings: number;
    totalDocs: number;
    embeddingCoverage: number;
  } {
    const rawDb = this.db.getRawDb();

    let embeddingsQuery = "SELECT COUNT(*) as count FROM brain_embeddings";
    let chunksQuery = "SELECT COUNT(*) as count FROM brain_chunks";
    let docsQuery = "SELECT COUNT(*) as count FROM brain_docs";

    const params: any[] = [];

    if (userId) {
      embeddingsQuery = `
        SELECT COUNT(*) as count FROM brain_embeddings e
        JOIN brain_docs d ON e.doc_id = d.id
        WHERE d.user_id = ?
      `;
      chunksQuery = `
        SELECT COUNT(*) as count FROM brain_chunks c
        JOIN brain_docs d ON c.doc_id = d.id
        WHERE d.user_id = ?
      `;
      docsQuery = "SELECT COUNT(*) as count FROM brain_docs WHERE user_id = ?";
      params.push(userId);
    }

    const embeddingsRow = rawDb.prepare(embeddingsQuery).get(...params) as any;
    const chunksRow = rawDb.prepare(chunksQuery).get(...params) as any;
    const docsRow = rawDb.prepare(docsQuery).get(...params) as any;

    const totalEmbeddings = embeddingsRow.count;
    const totalChunks = chunksRow.count;
    const totalDocs = docsRow.count;

    return {
      totalEmbeddings,
      totalDocs,
      embeddingCoverage:
        totalChunks > 0 ? Math.round((totalEmbeddings / totalChunks) * 100) : 0,
    };
  }

  // === Private helpers ===

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have same length");
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Generate snippet around a keyword
   */
  private generateSnippet(
    text: string,
    keyword: string,
    maxLength: number,
  ): string {
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const index = lowerText.indexOf(lowerKeyword);

    if (index === -1) {
      return text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
    }

    const start = Math.max(0, index - Math.floor(maxLength / 2));
    const end = Math.min(text.length, start + maxLength);

    let snippet = text.slice(start, end);

    if (start > 0) snippet = "..." + snippet;
    if (end < text.length) snippet = snippet + "...";

    return snippet;
  }
}
