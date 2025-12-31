/**
 * Memory Search - Full-text and semantic search for conversations
 *
 * Provides search capabilities across conversation history
 */

import type { Database } from "../db/database.js";
import type { Chat, ChatMessage } from "./manager.js";

export interface SearchOptions {
  userId?: string;
  chatId?: string;
  query: string;
  limit?: number;
  offset?: number;
  role?: "user" | "assistant" | "system";
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchResult {
  message: ChatMessage;
  chat: Chat;
  relevance: number;
  snippet: string;
}

/**
 * Memory Search Engine
 */
export class MemorySearch {
  constructor(private db: Database) {}

  /**
   * Search messages by full-text query
   */
  searchMessages(options: SearchOptions): SearchResult[] {
    const rawDb = this.db.getRawDb();

    // Build WHERE clauses
    const whereClauses: string[] = [];
    const params: any[] = [];

    // Search in message content
    whereClauses.push("m.content LIKE ?");
    params.push(`%${options.query}%`);

    // Filter by user
    if (options.userId) {
      whereClauses.push("c.user_id = ?");
      params.push(options.userId);
    }

    // Filter by chat
    if (options.chatId) {
      whereClauses.push("m.chat_id = ?");
      params.push(options.chatId);
    }

    // Filter by role
    if (options.role) {
      whereClauses.push("m.role = ?");
      params.push(options.role);
    }

    // Filter by date range
    if (options.dateFrom) {
      whereClauses.push("m.timestamp >= ?");
      params.push(options.dateFrom);
    }

    if (options.dateTo) {
      whereClauses.push("m.timestamp <= ?");
      params.push(options.dateTo);
    }

    const whereClause = whereClauses.join(" AND ");
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const stmt = rawDb.prepare(`
      SELECT
        m.*,
        c.user_id, c.title, c.agent_name as chat_agent_name,
        c.message_count, c.last_message, c.created_at as chat_created_at, c.updated_at as chat_updated_at
      FROM chat_messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE ${whereClause}
      ORDER BY m.timestamp DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(...params, limit, offset) as any[];

    return rows.map((row) => {
      const message: ChatMessage = {
        id: row.id,
        chatId: row.chat_id,
        role: row.role,
        content: row.content,
        agentName: row.agent_name,
        tokensInput: row.input_tokens,
        tokensOutput: row.output_tokens,
        tokensTotal: row.total_tokens,
        timestamp: row.timestamp,
      };

      const chat: Chat = {
        id: row.chat_id,
        userId: row.user_id,
        title: row.title,
        agentName: row.chat_agent_name,
        messageCount: row.message_count,
        lastMessage: row.last_message,
        createdAt: row.chat_created_at,
        updatedAt: row.chat_updated_at,
      };

      // Calculate relevance (simple: count query occurrences)
      const lowerContent = row.content.toLowerCase();
      const lowerQuery = options.query.toLowerCase();
      const occurrences = (
        lowerContent.match(new RegExp(lowerQuery, "g")) || []
      ).length;
      const relevance = Math.min(occurrences / 10, 1); // Normalize to 0-1

      // Generate snippet (context around first match)
      const snippet = this.generateSnippet(row.content, options.query);

      return {
        message,
        chat,
        relevance,
        snippet,
      };
    });
  }

  /**
   * Search chats by title or last message
   */
  searchChats(userId: string, query: string, limit: number = 20): Chat[] {
    const rawDb = this.db.getRawDb();

    const stmt = rawDb.prepare(`
      SELECT * FROM chats
      WHERE user_id = ? AND (
        title LIKE ? OR
        last_message LIKE ?
      )
      ORDER BY updated_at DESC
      LIMIT ?
    `);

    const searchPattern = `%${query}%`;
    const rows = stmt.all(userId, searchPattern, searchPattern, limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      agentName: row.agent_name,
      messageCount: row.message_count,
      lastMessage: row.last_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Find similar messages (by keyword overlap)
   */
  findSimilar(messageId: string, limit: number = 10): SearchResult[] {
    const rawDb = this.db.getRawDb();

    // Get the reference message
    const refStmt = rawDb.prepare("SELECT * FROM chat_messages WHERE id = ?");
    const refMessage = refStmt.get(messageId) as any;

    if (!refMessage) return [];

    // Extract keywords (simple: split by space, filter common words)
    const keywords = this.extractKeywords(refMessage.content);

    if (keywords.length === 0) return [];

    // Search for messages containing these keywords
    // Future: use keywords.join("|") for regex search
    const results = this.searchMessages({
      query: keywords[0], // Use most relevant keyword
      limit,
    });

    return results.filter((r) => r.message.id !== messageId);
  }

  /**
   * Get conversation context (messages before and after)
   */
  getContext(
    messageId: string,
    contextSize: number = 5,
  ): {
    before: ChatMessage[];
    message: ChatMessage | null;
    after: ChatMessage[];
  } {
    const rawDb = this.db.getRawDb();

    // Get the message
    const msgStmt = rawDb.prepare("SELECT * FROM chat_messages WHERE id = ?");
    const msgRow = msgStmt.get(messageId) as any;

    if (!msgRow) {
      return { before: [], message: null, after: [] };
    }

    const message: ChatMessage = {
      id: msgRow.id,
      chatId: msgRow.chat_id,
      role: msgRow.role,
      content: msgRow.content,
      agentName: msgRow.agent_name,
      tokensInput: msgRow.input_tokens,
      tokensOutput: msgRow.output_tokens,
      tokensTotal: msgRow.total_tokens,
      timestamp: msgRow.timestamp,
    };

    // Get messages before
    const beforeStmt = rawDb.prepare(`
      SELECT * FROM chat_messages
      WHERE chat_id = ? AND timestamp < ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const beforeRows = beforeStmt.all(
      msgRow.chat_id,
      msgRow.timestamp,
      contextSize,
    ) as any[];
    const before = beforeRows.reverse().map((row) => ({
      id: row.id,
      chatId: row.chat_id,
      role: row.role,
      content: row.content,
      agentName: row.agent_name,
      tokensInput: row.input_tokens,
      tokensOutput: row.output_tokens,
      tokensTotal: row.total_tokens,
      timestamp: row.timestamp,
    }));

    // Get messages after
    const afterStmt = rawDb.prepare(`
      SELECT * FROM chat_messages
      WHERE chat_id = ? AND timestamp > ?
      ORDER BY timestamp ASC
      LIMIT ?
    `);
    const afterRows = afterStmt.all(
      msgRow.chat_id,
      msgRow.timestamp,
      contextSize,
    ) as any[];
    const after = afterRows.map((row) => ({
      id: row.id,
      chatId: row.chat_id,
      role: row.role,
      content: row.content,
      agentName: row.agent_name,
      tokensInput: row.input_tokens,
      tokensOutput: row.output_tokens,
      tokensTotal: row.total_tokens,
      timestamp: row.timestamp,
    }));

    return { before, message, after };
  }

  /**
   * Generate search snippet with highlighted query
   */
  private generateSnippet(
    content: string,
    query: string,
    maxLength: number = 200,
  ): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) {
      // Query not found, return first N chars
      return (
        content.substring(0, maxLength) +
        (content.length > maxLength ? "..." : "")
      );
    }

    // Calculate start position (with context before match)
    const contextBefore = 50;
    const start = Math.max(0, index - contextBefore);

    // Calculate end position (with context after match)
    const contextAfter = maxLength - query.length - contextBefore;
    const end = Math.min(content.length, index + query.length + contextAfter);

    let snippet = content.substring(start, end);

    // Add ellipsis
    if (start > 0) snippet = "..." + snippet;
    if (end < content.length) snippet = snippet + "...";

    return snippet;
  }

  /**
   * Extract keywords from text (simple implementation)
   */
  private extractKeywords(text: string): string[] {
    const commonWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "as",
      "is",
      "was",
      "are",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
    ]);

    // Split by word boundaries and filter
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];

    const keywords = words
      .filter((word) => word.length > 3 && !commonWords.has(word))
      .reduce(
        (acc, word) => {
          acc[word] = (acc[word] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

    // Sort by frequency and return top 5
    return Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);
  }

  /**
   * Get trending topics (most discussed keywords)
   */
  getTrendingTopics(
    userId: string,
    limit: number = 10,
    days: number = 7,
  ): Array<{ keyword: string; count: number }> {
    const rawDb = this.db.getRawDb();

    // Get recent messages
    const dateFrom = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const stmt = rawDb.prepare(`
      SELECT m.content FROM chat_messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE c.user_id = ? AND m.timestamp >= ?
    `);

    const rows = stmt.all(userId, dateFrom) as any[];

    // Extract all keywords
    const allKeywords: Record<string, number> = {};

    rows.forEach((row) => {
      const keywords = this.extractKeywords(row.content);
      keywords.forEach((keyword) => {
        allKeywords[keyword] = (allKeywords[keyword] || 0) + 1;
      });
    });

    // Sort and return top N
    return Object.entries(allKeywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([keyword, count]) => ({ keyword, count }));
  }
}
