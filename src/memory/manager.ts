/**
 * Memory Manager - Conversation Memory Management
 *
 * Manages conversation storage, retrieval, and context management
 */

import type { Database } from "../db/database.js";
import { randomUUID } from "crypto";

export interface Chat {
  id: string;
  userId: string;
  title: string;
  agentName?: string;
  messageCount: number;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  agentName?: string;
  tokensInput?: number;
  tokensOutput?: number;
  tokensTotal?: number;
  timestamp: string;
}

export interface CreateChatOptions {
  userId: string;
  title: string;
  agentName?: string;
  initialMessage?: string;
}

export interface AddMessageOptions {
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  agentName?: string;
  tokensInput?: number;
  tokensOutput?: number;
}

/**
 * Memory Manager for conversation storage
 */
export class MemoryManager {
  constructor(private db: Database) {}

  /**
   * Create a new chat conversation
   */
  createChat(options: CreateChatOptions): Chat {
    const chatId = randomUUID();
    const now = new Date().toISOString();

    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare(`
      INSERT INTO chats (id, user_id, title, agent_name, message_count, last_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      chatId,
      options.userId,
      options.title,
      options.agentName || null,
      0,
      options.initialMessage || null,
      now,
      now,
    );

    return {
      id: chatId,
      userId: options.userId,
      title: options.title,
      agentName: options.agentName,
      messageCount: 0,
      lastMessage: options.initialMessage,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get a chat by ID
   */
  getChat(chatId: string): Chat | null {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare("SELECT * FROM chats WHERE id = ?");
    const row = stmt.get(chatId) as any;

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      agentName: row.agent_name,
      messageCount: row.message_count,
      lastMessage: row.last_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * List chats for a user
   */
  listChats(userId: string, limit: number = 50, offset: number = 0): Chat[] {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare(`
      SELECT * FROM chats
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(userId, limit, offset) as any[];

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
   * Update chat metadata
   */
  updateChat(
    chatId: string,
    updates: { title?: string; agentName?: string },
  ): boolean {
    const rawDb = this.db.getRawDb();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push("title = ?");
      values.push(updates.title);
    }

    if (updates.agentName !== undefined) {
      fields.push("agent_name = ?");
      values.push(updates.agentName);
    }

    if (fields.length === 0) return false;

    fields.push("updated_at = ?");
    values.push(now);
    values.push(chatId);

    const stmt = rawDb.prepare(`
      UPDATE chats SET ${fields.join(", ")}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * Delete a chat and all its messages
   */
  deleteChat(chatId: string): boolean {
    const rawDb = this.db.getRawDb();

    // Messages will be deleted automatically via CASCADE
    const stmt = rawDb.prepare("DELETE FROM chats WHERE id = ?");
    const result = stmt.run(chatId);

    return result.changes > 0;
  }

  /**
   * Add a message to a chat
   */
  addMessage(options: AddMessageOptions): ChatMessage {
    const messageId = randomUUID();
    const now = new Date().toISOString();
    const tokensTotal =
      (options.tokensInput || 0) + (options.tokensOutput || 0);

    const rawDb = this.db.getRawDb();

    // Insert message
    const msgStmt = rawDb.prepare(`
      INSERT INTO chat_messages (id, chat_id, role, content, agent_name, input_tokens, output_tokens, total_tokens, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    msgStmt.run(
      messageId,
      options.chatId,
      options.role,
      options.content,
      options.agentName || null,
      options.tokensInput || null,
      options.tokensOutput || null,
      tokensTotal || null,
      now,
    );

    // Update chat metadata
    const updateStmt = rawDb.prepare(`
      UPDATE chats
      SET message_count = message_count + 1,
          last_message = ?,
          updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      options.content.substring(0, 200), // First 200 chars
      now,
      options.chatId,
    );

    return {
      id: messageId,
      chatId: options.chatId,
      role: options.role,
      content: options.content,
      agentName: options.agentName,
      tokensInput: options.tokensInput,
      tokensOutput: options.tokensOutput,
      tokensTotal,
      timestamp: now,
    };
  }

  /**
   * Get messages for a chat
   */
  getMessages(
    chatId: string,
    limit: number = 100,
    offset: number = 0,
  ): ChatMessage[] {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare(`
      SELECT * FROM chat_messages
      WHERE chat_id = ?
      ORDER BY timestamp ASC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(chatId, limit, offset) as any[];

    return rows.map((row) => ({
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
  }

  /**
   * Get recent messages for context (last N messages)
   */
  getRecentMessages(chatId: string, count: number = 10): ChatMessage[] {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare(`
      SELECT * FROM chat_messages
      WHERE chat_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(chatId, count) as any[];

    // Reverse to get chronological order
    return rows.reverse().map((row) => ({
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
  }

  /**
   * Get message count for a chat
   */
  getMessageCount(chatId: string): number {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare("SELECT message_count FROM chats WHERE id = ?");
    const row = stmt.get(chatId) as any;
    return row?.message_count || 0;
  }

  /**
   * Get total token usage for a chat
   */
  getChatTokens(chatId: string): {
    input: number;
    output: number;
    total: number;
  } {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare(`
      SELECT
        COALESCE(SUM(input_tokens), 0) as input,
        COALESCE(SUM(output_tokens), 0) as output,
        COALESCE(SUM(total_tokens), 0) as total
      FROM chat_messages
      WHERE chat_id = ?
    `);

    const row = stmt.get(chatId) as any;

    return {
      input: row.input,
      output: row.output,
      total: row.total,
    };
  }

  /**
   * Clear old messages from a chat (keep last N)
   */
  clearOldMessages(chatId: string, keepLast: number = 100): number {
    const rawDb = this.db.getRawDb();

    // Get IDs of messages to delete
    const selectStmt = rawDb.prepare(`
      SELECT id FROM chat_messages
      WHERE chat_id = ?
      ORDER BY timestamp DESC
      LIMIT -1 OFFSET ?
    `);

    const idsToDelete = selectStmt.all(chatId, keepLast) as any[];

    if (idsToDelete.length === 0) return 0;

    const ids = idsToDelete.map((row) => row.id);
    const placeholders = ids.map(() => "?").join(",");

    const deleteStmt = rawDb.prepare(`
      DELETE FROM chat_messages
      WHERE id IN (${placeholders})
    `);

    const result = deleteStmt.run(...ids);

    // Update message count
    const updateStmt = rawDb.prepare(`
      UPDATE chats
      SET message_count = (
        SELECT COUNT(*) FROM chat_messages WHERE chat_id = ?
      ),
      updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(chatId, new Date().toISOString(), chatId);

    return result.changes;
  }

  /**
   * Export chat to JSON
   */
  exportChat(chatId: string): { chat: Chat; messages: ChatMessage[] } | null {
    const chat = this.getChat(chatId);
    if (!chat) return null;

    const messages = this.getMessages(chatId, 10000); // Export all messages

    return { chat, messages };
  }

  /**
   * Get statistics for a user
   */
  getUserStats(userId: string): {
    totalChats: number;
    totalMessages: number;
    totalTokens: number;
  } {
    const rawDb = this.db.getRawDb();

    const chatStmt = rawDb.prepare(
      "SELECT COUNT(*) as count FROM chats WHERE user_id = ?",
    );
    const chatRow = chatStmt.get(userId) as any;

    const msgStmt = rawDb.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_tokens), 0) as tokens
      FROM chat_messages
      WHERE chat_id IN (SELECT id FROM chats WHERE user_id = ?)
    `);
    const msgRow = msgStmt.get(userId) as any;

    return {
      totalChats: chatRow.count,
      totalMessages: msgRow.count,
      totalTokens: msgRow.tokens,
    };
  }
}
