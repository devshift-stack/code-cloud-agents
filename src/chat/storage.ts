/**
 * Chat Storage - SQLite persistence for chats and messages
 */

import { randomUUID } from "crypto";
import type { Database as BetterSqlite3Database } from "better-sqlite3";
import type { Chat, ChatMessage } from "./types.ts";
import type { Database } from "../db/database.ts";

// Database row types
interface ChatRow {
  id: string;
  user_id: string;
  title: string;
  agent_name: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message: string | null;
}

interface CountRow {
  count: number;
}

export class ChatStorage {
  private db: BetterSqlite3Database;

  constructor(database: Database) {
    // Get raw better-sqlite3 instance (tables already created by initDatabase)
    this.db = database.getRawDb();
  }

  // Create new chat
  createChat(userId: string, title: string, agentName: string): Chat {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO chats (id, user_id, title, agent_name, created_at, updated_at, message_count)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
      )
      .run(id, userId, title, agentName, now, now);

    return {
      id,
      userId,
      title,
      agentName,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };
  }

  // Get chat by ID
  getChat(chatId: string): Chat | null {
    const row = this.db
      .prepare(
        `SELECT id, user_id, title, agent_name, created_at, updated_at, message_count, last_message
         FROM chats WHERE id = ?`,
      )
      .get(chatId) as ChatRow | undefined;

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      agentName: row.agent_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count,
      lastMessage: row.last_message ?? undefined,
    };
  }

  // List chats for user
  listChats(userId: string, limit = 50, offset = 0): Chat[] {
    const rows = this.db
      .prepare(
        `SELECT id, user_id, title, agent_name, created_at, updated_at, message_count, last_message
         FROM chats
         WHERE user_id = ?
         ORDER BY updated_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(userId, limit, offset);

    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      agentName: row.agent_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count,
      lastMessage: row.last_message ?? undefined,
    }));
  }

  // Count chats for user
  countChats(userId: string): number {
    const result = this.db
      .prepare(`SELECT COUNT(*) as count FROM chats WHERE user_id = ?`)
      .get(userId) as CountRow;
    return result.count;
  }

  // Add message to chat
  addMessage(message: Omit<ChatMessage, "id" | "timestamp">): ChatMessage {
    const id = randomUUID();
    const timestamp = new Date().toISOString();

    const metadata = message.metadata ? JSON.stringify(message.metadata) : null;

    this.db
      .prepare(
        `INSERT INTO chat_messages
         (id, chat_id, role, content, agent_name, timestamp, input_tokens, output_tokens, total_tokens, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        message.chatId,
        message.role,
        message.content,
        message.agentName || null,
        timestamp,
        message.tokens?.input || null,
        message.tokens?.output || null,
        message.tokens?.total || null,
        metadata,
      );

    // Update chat metadata
    this.db
      .prepare(
        `UPDATE chats
         SET updated_at = ?,
             message_count = message_count + 1,
             last_message = ?
         WHERE id = ?`,
      )
      .run(timestamp, message.content.substring(0, 100), message.chatId);

    return {
      id,
      timestamp,
      ...message,
    };
  }

  // Get messages for chat
  getMessages(chatId: string, limit = 50, offset = 0): ChatMessage[] {
    const rows = this.db
      .prepare(
        `SELECT id, chat_id, role, content, agent_name, timestamp,
                input_tokens, output_tokens, total_tokens, metadata
         FROM chat_messages
         WHERE chat_id = ?
         ORDER BY timestamp ASC
         LIMIT ? OFFSET ?`,
      )
      .all(chatId, limit, offset);

    return rows.map((row: any) => ({
      id: row.id,
      chatId: row.chat_id,
      role: row.role,
      content: row.content,
      agentName: row.agent_name,
      timestamp: row.timestamp,
      tokens: row.input_tokens
        ? {
            input: row.input_tokens,
            output: row.output_tokens,
            total: row.total_tokens,
          }
        : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  // Get recent messages for context (most recent N messages)
  getRecentMessages(chatId: string, limit = 10): ChatMessage[] {
    const rows = this.db
      .prepare(
        `SELECT id, chat_id, role, content, agent_name, timestamp,
                input_tokens, output_tokens, total_tokens, metadata
         FROM chat_messages
         WHERE chat_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
      )
      .all(chatId, limit);

    // Reverse to get chronological order
    return rows.reverse().map((row: any) => ({
      id: row.id,
      chatId: row.chat_id,
      role: row.role,
      content: row.content,
      agentName: row.agent_name,
      timestamp: row.timestamp,
      tokens: row.input_tokens
        ? {
            input: row.input_tokens,
            output: row.output_tokens,
            total: row.total_tokens,
          }
        : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  // Count messages in chat
  countMessages(chatId: string): number {
    const result = this.db
      .prepare(`SELECT COUNT(*) as count FROM chat_messages WHERE chat_id = ?`)
      .get(chatId) as CountRow;
    return result.count;
  }

  // Delete chat (cascade deletes messages)
  deleteChat(chatId: string): void {
    this.db.prepare(`DELETE FROM chats WHERE id = ?`).run(chatId);
  }

  // Update chat title
  updateChatTitle(chatId: string, title: string): void {
    this.db
      .prepare(`UPDATE chats SET title = ?, updated_at = ? WHERE id = ?`)
      .run(title, new Date().toISOString(), chatId);
  }
}
