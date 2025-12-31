/**
 * Memory Embeddings - Vector embeddings for semantic search
 *
 * Provides semantic search capabilities using vector embeddings
 */

import type { Database } from "../db/database.js";
import { OpenAI } from "openai";

export interface Embedding {
  id: string;
  messageId: string;
  embedding: number[];
  model: string;
  createdAt: string;
}

export interface SemanticSearchResult {
  messageId: string;
  chatId: string;
  content: string;
  similarity: number;
  role: string;
  timestamp: string;
}

/**
 * Embeddings Manager for semantic search
 */
export class EmbeddingsManager {
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
      console.warn("⚠️ OPENAI_API_KEY not set - embeddings disabled");
    }
  }

  /**
   * Check if embeddings are enabled
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
   * Store embedding for a message
   */
  async storeEmbedding(messageId: string, text: string): Promise<void> {
    if (!this.enabled) {
      return; // Silent skip if disabled
    }

    try {
      const embedding = await this.generateEmbedding(text);
      const rawDb = this.db.getRawDb();
      const now = new Date().toISOString();

      const stmt = rawDb.prepare(`
        INSERT OR REPLACE INTO message_embeddings (message_id, embedding, model, created_at)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(messageId, JSON.stringify(embedding), this.embeddingModel, now);
    } catch (error) {
      console.error("Failed to store embedding:", error);
      // Don't throw - embeddings are optional
    }
  }

  /**
   * Get embedding for a message
   */
  getEmbedding(messageId: string): Embedding | null {
    const rawDb = this.db.getRawDb();

    const stmt = rawDb.prepare(`
      SELECT * FROM message_embeddings WHERE message_id = ?
    `);

    const row = stmt.get(messageId) as any;

    if (!row) return null;

    return {
      id: row.id,
      messageId: row.message_id,
      embedding: JSON.parse(row.embedding),
      model: row.model,
      createdAt: row.created_at,
    };
  }

  /**
   * Semantic search using cosine similarity
   */
  async semanticSearch(
    query: string,
    userId: string,
    limit: number = 10,
  ): Promise<SemanticSearchResult[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      const rawDb = this.db.getRawDb();

      // Get all embeddings for user's messages
      const stmt = rawDb.prepare(`
        SELECT
          e.message_id, e.embedding,
          m.chat_id, m.content, m.role, m.timestamp
        FROM message_embeddings e
        JOIN chat_messages m ON e.message_id = m.id
        JOIN chats c ON m.chat_id = c.id
        WHERE c.user_id = ?
      `);

      const rows = stmt.all(userId) as any[];

      // Calculate cosine similarity for each
      const results: SemanticSearchResult[] = rows.map((row) => {
        const embedding = JSON.parse(row.embedding);
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);

        return {
          messageId: row.message_id,
          chatId: row.chat_id,
          content: row.content,
          similarity,
          role: row.role,
          timestamp: row.timestamp,
        };
      });

      // Sort by similarity and return top N
      results.sort((a, b) => b.similarity - a.similarity);

      return results.slice(0, limit);
    } catch (error) {
      console.error("Semantic search failed:", error);
      return [];
    }
  }

  /**
   * Find similar messages to a given message
   */
  async findSimilarMessages(
    messageId: string,
    limit: number = 10,
  ): Promise<SemanticSearchResult[]> {
    if (!this.enabled) {
      return [];
    }

    const rawDb = this.db.getRawDb();

    // Get the reference message's embedding
    const refEmbedding = this.getEmbedding(messageId);
    if (!refEmbedding) {
      return [];
    }

    // Get user ID for filtering
    const userStmt = rawDb.prepare(`
      SELECT c.user_id FROM chat_messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE m.id = ?
    `);
    const userRow = userStmt.get(messageId) as any;
    if (!userRow) return [];

    // Get all embeddings for user's messages
    const stmt = rawDb.prepare(`
      SELECT
        e.message_id, e.embedding,
        m.chat_id, m.content, m.role, m.timestamp
      FROM message_embeddings e
      JOIN chat_messages m ON e.message_id = m.id
      JOIN chats c ON m.chat_id = c.id
      WHERE c.user_id = ? AND e.message_id != ?
    `);

    const rows = stmt.all(userRow.user_id, messageId) as any[];

    // Calculate cosine similarity
    const results: SemanticSearchResult[] = rows.map((row) => {
      const embedding = JSON.parse(row.embedding);
      const similarity = this.cosineSimilarity(
        refEmbedding.embedding,
        embedding,
      );

      return {
        messageId: row.message_id,
        chatId: row.chat_id,
        content: row.content,
        similarity,
        role: row.role,
        timestamp: row.timestamp,
      };
    });

    // Sort and return top N
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }

  /**
   * Batch generate embeddings for existing messages
   */
  async generateEmbeddingsForChat(chatId: string): Promise<number> {
    if (!this.enabled) {
      return 0;
    }

    const rawDb = this.db.getRawDb();

    // Get messages without embeddings
    const stmt = rawDb.prepare(`
      SELECT m.id, m.content FROM chat_messages m
      LEFT JOIN message_embeddings e ON m.id = e.message_id
      WHERE m.chat_id = ? AND e.message_id IS NULL
    `);

    const rows = stmt.all(chatId) as any[];

    let count = 0;

    for (const row of rows) {
      try {
        await this.storeEmbedding(row.id, row.content);
        count++;

        // Rate limiting: wait 100ms between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `Failed to generate embedding for message ${row.id}:`,
          error,
        );
      }
    }

    return count;
  }

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
   * Delete embeddings for a message
   */
  deleteEmbedding(messageId: string): boolean {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare(
      "DELETE FROM message_embeddings WHERE message_id = ?",
    );
    const result = stmt.run(messageId);
    return result.changes > 0;
  }

  /**
   * Delete all embeddings for a chat
   */
  deleteChatEmbeddings(chatId: string): number {
    const rawDb = this.db.getRawDb();

    const stmt = rawDb.prepare(`
      DELETE FROM message_embeddings
      WHERE message_id IN (
        SELECT id FROM chat_messages WHERE chat_id = ?
      )
    `);

    const result = stmt.run(chatId);
    return result.changes;
  }

  /**
   * Get embedding statistics
   */
  getStats(): {
    totalEmbeddings: number;
    embeddingsByModel: Record<string, number>;
    averageAge: number;
  } {
    const rawDb = this.db.getRawDb();

    const totalStmt = rawDb.prepare(
      "SELECT COUNT(*) as count FROM message_embeddings",
    );
    const totalRow = totalStmt.get() as any;

    const modelStmt = rawDb.prepare(`
      SELECT model, COUNT(*) as count
      FROM message_embeddings
      GROUP BY model
    `);
    const modelRows = modelStmt.all() as any[];

    const embeddingsByModel: Record<string, number> = {};
    modelRows.forEach((row) => {
      embeddingsByModel[row.model] = row.count;
    });

    const ageStmt = rawDb.prepare(`
      SELECT AVG(julianday('now') - julianday(created_at)) as avg_age
      FROM message_embeddings
    `);
    const ageRow = ageStmt.get() as any;

    return {
      totalEmbeddings: totalRow.count,
      embeddingsByModel,
      averageAge: ageRow.avg_age || 0,
    };
  }
}
