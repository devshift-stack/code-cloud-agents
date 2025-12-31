/**
 * Memory Search Tests
 * Tests for full-text and semantic search in conversations
 */

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert";
import { MemorySearch } from "../src/memory/search.js";
import { initDatabase, type Database } from "../src/db/database.js";
import fs from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.join(process.cwd(), "test-memory-search.db");

function setupTestDatabase(): Database {
  // Remove existing test DB
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  // Also remove WAL files
  if (fs.existsSync(TEST_DB_PATH + "-shm")) {
    fs.unlinkSync(TEST_DB_PATH + "-shm");
  }
  if (fs.existsSync(TEST_DB_PATH + "-wal")) {
    fs.unlinkSync(TEST_DB_PATH + "-wal");
  }

  process.env.SQLITE_PATH = TEST_DB_PATH;
  return initDatabase();
}

function cleanupTestDatabase() {
  try {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    if (fs.existsSync(TEST_DB_PATH + "-shm"))
      fs.unlinkSync(TEST_DB_PATH + "-shm");
    if (fs.existsSync(TEST_DB_PATH + "-wal"))
      fs.unlinkSync(TEST_DB_PATH + "-wal");
  } catch {
    // Ignore cleanup errors
  }
}

function insertTestData(db: Database) {
  const rawDb = db.getRawDb();

  // Create test user
  rawDb
    .prepare(
      `
    INSERT OR IGNORE INTO users (id, email, password_hash, role, created_at)
    VALUES ('user-1', 'test@example.com', 'hash', 'user', datetime('now'))
  `,
    )
    .run();

  // Create test chats
  rawDb
    .prepare(
      `
    INSERT INTO chats (id, user_id, title, agent_name, message_count, last_message, created_at, updated_at)
    VALUES
      ('chat-1', 'user-1', 'TypeScript Help', 'CodeAssistant', 3, 'Thanks for the help!', datetime('now', '-1 hour'), datetime('now')),
      ('chat-2', 'user-1', 'React Components', 'CodeAssistant', 2, 'Great explanation!', datetime('now', '-2 hours'), datetime('now', '-1 hour'))
  `,
    )
    .run();

  // Create test messages
  rawDb
    .prepare(
      `
    INSERT INTO chat_messages (id, chat_id, role, content, agent_name, input_tokens, output_tokens, total_tokens, timestamp)
    VALUES
      ('msg-1', 'chat-1', 'user', 'How do I fix TypeScript errors in my React app?', NULL, 0, 0, 0, datetime('now', '-1 hour')),
      ('msg-2', 'chat-1', 'assistant', 'To fix TypeScript errors, first check your tsconfig.json settings. Make sure strict mode is enabled.', 'CodeAssistant', 10, 50, 60, datetime('now', '-59 minutes')),
      ('msg-3', 'chat-1', 'user', 'Thanks for the help!', NULL, 0, 0, 0, datetime('now', '-58 minutes')),
      ('msg-4', 'chat-2', 'user', 'Explain React hooks to me', NULL, 0, 0, 0, datetime('now', '-2 hours')),
      ('msg-5', 'chat-2', 'assistant', 'React hooks are functions that let you use state and lifecycle features in functional components. The most common hooks are useState and useEffect.', 'CodeAssistant', 8, 40, 48, datetime('now', '-119 minutes'))
  `,
    )
    .run();
}

describe("MemorySearch", () => {
  let db: Database;
  let search: MemorySearch;

  beforeEach(() => {
    db = setupTestDatabase();
    insertTestData(db);
    search = new MemorySearch(db);
  });

  after(() => {
    cleanupTestDatabase();
  });

  describe("searchMessages()", () => {
    it("should find messages containing search query", () => {
      const results = search.searchMessages({ query: "TypeScript" });

      assert.ok(results.length > 0, "Should find TypeScript messages");
      assert.ok(
        results.some((r) => r.message.content.includes("TypeScript")),
        "Results should contain TypeScript",
      );
    });

    it("should filter by userId", () => {
      const results = search.searchMessages({
        query: "React",
        userId: "user-1",
      });

      assert.ok(results.length > 0);
      results.forEach((r) => {
        assert.strictEqual(r.chat.userId, "user-1");
      });
    });

    it("should filter by chatId", () => {
      const results = search.searchMessages({
        query: "help",
        chatId: "chat-1",
      });

      results.forEach((r) => {
        assert.strictEqual(r.message.chatId, "chat-1");
      });
    });

    it("should filter by role", () => {
      const results = search.searchMessages({
        query: "TypeScript",
        role: "assistant",
      });

      results.forEach((r) => {
        assert.strictEqual(r.message.role, "assistant");
      });
    });

    it("should respect limit parameter", () => {
      const results = search.searchMessages({
        query: "the",
        limit: 2,
      });

      assert.ok(results.length <= 2);
    });

    it("should include relevance score", () => {
      const results = search.searchMessages({ query: "TypeScript" });

      results.forEach((r) => {
        assert.ok(typeof r.relevance === "number");
        assert.ok(r.relevance >= 0 && r.relevance <= 1);
      });
    });

    it("should include snippet with context", () => {
      const results = search.searchMessages({ query: "TypeScript" });

      results.forEach((r) => {
        assert.ok(typeof r.snippet === "string");
        assert.ok(r.snippet.length > 0);
      });
    });

    it("should return empty array for no matches", () => {
      const results = search.searchMessages({ query: "xyznonexistent123" });

      assert.strictEqual(results.length, 0);
    });
  });

  describe("searchChats()", () => {
    it("should find chats by title", () => {
      const results = search.searchChats("user-1", "TypeScript");

      assert.ok(results.length > 0);
      assert.ok(results.some((c) => c.title.includes("TypeScript")));
    });

    it("should find chats by last message", () => {
      const results = search.searchChats("user-1", "Thanks");

      assert.ok(results.length > 0);
    });

    it("should respect limit parameter", () => {
      const results = search.searchChats("user-1", "a", 1);

      assert.ok(results.length <= 1);
    });

    it("should return empty for non-matching user", () => {
      const results = search.searchChats("nonexistent-user", "TypeScript");

      assert.strictEqual(results.length, 0);
    });
  });

  describe("getContext()", () => {
    it("should return message with before and after context", () => {
      const context = search.getContext("msg-2");

      assert.ok(context.message !== null);
      assert.strictEqual(context.message!.id, "msg-2");
      assert.ok(Array.isArray(context.before));
      assert.ok(Array.isArray(context.after));
    });

    it("should return messages before the target", () => {
      const context = search.getContext("msg-2");

      // msg-1 should be before msg-2
      assert.ok(context.before.length > 0 || context.after.length > 0);
    });

    it("should return null message for non-existent ID", () => {
      const context = search.getContext("nonexistent-msg");

      assert.strictEqual(context.message, null);
      assert.strictEqual(context.before.length, 0);
      assert.strictEqual(context.after.length, 0);
    });

    it("should respect contextSize parameter", () => {
      const context = search.getContext("msg-2", 1);

      assert.ok(context.before.length <= 1);
      assert.ok(context.after.length <= 1);
    });
  });

  describe("findSimilar()", () => {
    it("should find similar messages", () => {
      const results = search.findSimilar("msg-1", 5);

      // Should find messages with similar keywords
      assert.ok(Array.isArray(results));
    });

    it("should exclude the reference message", () => {
      const results = search.findSimilar("msg-1", 10);

      results.forEach((r) => {
        assert.notStrictEqual(r.message.id, "msg-1");
      });
    });

    it("should return empty for non-existent message", () => {
      const results = search.findSimilar("nonexistent-msg");

      assert.strictEqual(results.length, 0);
    });
  });

  describe("getTrendingTopics()", () => {
    it("should return trending keywords", () => {
      const topics = search.getTrendingTopics("user-1", 10, 30);

      assert.ok(Array.isArray(topics));
      topics.forEach((t) => {
        assert.ok(typeof t.keyword === "string");
        assert.ok(typeof t.count === "number");
        assert.ok(t.count > 0);
      });
    });

    it("should respect limit parameter", () => {
      const topics = search.getTrendingTopics("user-1", 3, 30);

      assert.ok(topics.length <= 3);
    });

    it("should return empty for user with no messages", () => {
      const topics = search.getTrendingTopics("nonexistent-user", 10, 7);

      assert.strictEqual(topics.length, 0);
    });
  });
});
