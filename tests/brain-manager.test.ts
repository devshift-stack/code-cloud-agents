/**
 * Brain Manager Tests
 * Tests for Knowledge Base document management
 */

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert";
import { BrainManager } from "../src/brain/manager.js";
import { initDatabase, type Database } from "../src/db/database.js";
import fs from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.join(process.cwd(), "test-brain-manager.db");

function setupTestDatabase(): Database {
  // Remove existing test DB
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
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

function insertTestUser(db: Database) {
  const rawDb = db.getRawDb();
  rawDb
    .prepare(
      `
    INSERT OR IGNORE INTO users (id, email, password_hash, role, created_at)
    VALUES ('user-1', 'test@example.com', 'hash', 'user', datetime('now'))
  `,
    )
    .run();
}

describe("BrainManager", () => {
  let db: Database;
  let manager: BrainManager;

  beforeEach(() => {
    db = setupTestDatabase();
    insertTestUser(db);
    manager = new BrainManager(db);
  });

  after(() => {
    cleanupTestDatabase();
  });

  describe("ingestText()", () => {
    it("should create a new document from text", () => {
      const doc = manager.ingestText({
        userId: "user-1",
        title: "Test Document",
        content: "This is a test document with some content for testing.",
      });

      assert.ok(doc.id, "Document should have an ID");
      assert.strictEqual(doc.title, "Test Document");
      assert.strictEqual(doc.sourceType, "text");
      assert.strictEqual(doc.status, "ready");
      assert.ok(doc.chunkCount >= 1, "Should have at least one chunk");
    });

    it("should chunk long content", () => {
      const longContent = "A".repeat(3000); // Long content to force multiple chunks
      const doc = manager.ingestText({
        userId: "user-1",
        title: "Long Document",
        content: longContent,
      });

      assert.ok(
        doc.chunkCount >= 2,
        "Should have multiple chunks for long content",
      );
    });

    it("should store metadata", () => {
      const doc = manager.ingestText({
        userId: "user-1",
        title: "Doc with Metadata",
        content: "Content here",
        metadata: { source: "test", tags: ["important"] },
      });

      assert.ok(doc.metadata);
      assert.strictEqual(doc.metadata.source, "test");
    });
  });

  describe("getDoc()", () => {
    it("should retrieve a document by ID", () => {
      const created = manager.ingestText({
        userId: "user-1",
        title: "Retrievable Doc",
        content: "Content",
      });

      const retrieved = manager.getDoc(created.id);

      assert.ok(retrieved);
      assert.strictEqual(retrieved.id, created.id);
      assert.strictEqual(retrieved.title, "Retrievable Doc");
    });

    it("should return null for non-existent document", () => {
      const result = manager.getDoc("nonexistent-id");
      assert.strictEqual(result, null);
    });
  });

  describe("listDocs()", () => {
    it("should list documents for a user", () => {
      manager.ingestText({
        userId: "user-1",
        title: "Doc 1",
        content: "Content 1",
      });
      manager.ingestText({
        userId: "user-1",
        title: "Doc 2",
        content: "Content 2",
      });

      const docs = manager.listDocs("user-1");

      assert.ok(docs.length >= 2);
    });

    it("should filter by sourceType", () => {
      manager.ingestText({
        userId: "user-1",
        title: "Text Doc",
        content: "Content",
      });

      const docs = manager.listDocs("user-1", { sourceType: "text" });

      docs.forEach((doc) => {
        assert.strictEqual(doc.sourceType, "text");
      });
    });

    it("should respect limit and offset", () => {
      manager.ingestText({ userId: "user-1", title: "Doc A", content: "A" });
      manager.ingestText({ userId: "user-1", title: "Doc B", content: "B" });
      manager.ingestText({ userId: "user-1", title: "Doc C", content: "C" });

      const docs = manager.listDocs("user-1", { limit: 2 });

      assert.ok(docs.length <= 2);
    });

    it("should return empty array for user with no documents", () => {
      const docs = manager.listDocs("nonexistent-user");
      assert.strictEqual(docs.length, 0);
    });
  });

  describe("updateDoc()", () => {
    it("should update document title", () => {
      const doc = manager.ingestText({
        userId: "user-1",
        title: "Original Title",
        content: "Content",
      });

      const success = manager.updateDoc(doc.id, { title: "New Title" });
      assert.strictEqual(success, true);

      const updated = manager.getDoc(doc.id);
      assert.strictEqual(updated?.title, "New Title");
    });

    it("should update document metadata", () => {
      const doc = manager.ingestText({
        userId: "user-1",
        title: "Doc",
        content: "Content",
      });

      manager.updateDoc(doc.id, { metadata: { updated: true } });

      const updated = manager.getDoc(doc.id);
      assert.ok(updated?.metadata);
      assert.strictEqual(updated?.metadata.updated, true);
    });

    it("should return false for non-existent document", () => {
      const success = manager.updateDoc("nonexistent", { title: "New" });
      assert.strictEqual(success, false);
    });
  });

  describe("deleteDoc()", () => {
    it("should delete a document", () => {
      const doc = manager.ingestText({
        userId: "user-1",
        title: "To Delete",
        content: "Content",
      });

      const success = manager.deleteDoc(doc.id);
      assert.strictEqual(success, true);

      const deleted = manager.getDoc(doc.id);
      assert.strictEqual(deleted, null);
    });

    it("should delete associated chunks", () => {
      const doc = manager.ingestText({
        userId: "user-1",
        title: "With Chunks",
        content: "Content",
      });

      const chunksBefore = manager.getChunks(doc.id);
      assert.ok(chunksBefore.length > 0);

      manager.deleteDoc(doc.id);

      const chunksAfter = manager.getChunks(doc.id);
      assert.strictEqual(chunksAfter.length, 0);
    });

    it("should return false for non-existent document", () => {
      const success = manager.deleteDoc("nonexistent");
      assert.strictEqual(success, false);
    });
  });

  describe("getChunks()", () => {
    it("should return chunks for a document", () => {
      const doc = manager.ingestText({
        userId: "user-1",
        title: "Chunked Doc",
        content: "This is content that will be chunked.",
      });

      const chunks = manager.getChunks(doc.id);

      assert.ok(chunks.length > 0);
      chunks.forEach((chunk) => {
        assert.strictEqual(chunk.docId, doc.id);
        assert.ok(typeof chunk.content === "string");
        assert.ok(chunk.chunkIndex >= 0);
      });
    });

    it("should order chunks by index", () => {
      const longContent =
        "First paragraph. ".repeat(100) + "Second paragraph. ".repeat(100);
      const doc = manager.ingestText({
        userId: "user-1",
        title: "Long Doc",
        content: longContent,
      });

      const chunks = manager.getChunks(doc.id);

      for (let i = 1; i < chunks.length; i++) {
        assert.ok(chunks[i].chunkIndex > chunks[i - 1].chunkIndex);
      }
    });
  });

  describe("getUserStats()", () => {
    it("should return statistics for a user", () => {
      manager.ingestText({
        userId: "user-1",
        title: "Doc 1",
        content: "Content 1",
      });
      manager.ingestText({
        userId: "user-1",
        title: "Doc 2",
        content: "Content 2",
      });

      const stats = manager.getUserStats("user-1");

      assert.ok(stats.totalDocs >= 2);
      assert.ok(stats.totalChunks >= 2);
      assert.ok(stats.bySourceType.text >= 2);
      assert.ok(stats.byStatus.ready >= 2);
    });

    it("should return zeros for user with no documents", () => {
      const stats = manager.getUserStats("nonexistent-user");

      assert.strictEqual(stats.totalDocs, 0);
      assert.strictEqual(stats.totalChunks, 0);
    });
  });

  describe("ingestUrl()", () => {
    it("should create a document from URL content", () => {
      const doc = manager.ingestUrl(
        {
          userId: "user-1",
          title: "Web Article",
          url: "https://example.com/article",
        },
        "This is the fetched content from the URL.",
      );

      assert.ok(doc.id);
      assert.strictEqual(doc.sourceType, "url");
      assert.strictEqual(doc.sourceUrl, "https://example.com/article");
      assert.strictEqual(doc.status, "ready");
    });
  });

  describe("ingestFile()", () => {
    it("should create a document from file content", () => {
      const doc = manager.ingestFile({
        userId: "user-1",
        title: "Uploaded File",
        filePath: "/uploads/file.txt",
        fileName: "file.txt",
        fileType: "text/plain",
        fileSize: 1024,
        content: "File content here.",
      });

      assert.ok(doc.id);
      assert.strictEqual(doc.sourceType, "file");
      assert.strictEqual(doc.fileName, "file.txt");
      assert.strictEqual(doc.fileType, "text/plain");
      assert.strictEqual(doc.fileSize, 1024);
    });
  });

  describe("Chat Links", () => {
    it("should link document to chat", () => {
      // First create a chat
      const rawDb = db.getRawDb();
      rawDb
        .prepare(
          `
        INSERT INTO chats (id, user_id, title, message_count, created_at, updated_at)
        VALUES ('chat-1', 'user-1', 'Test Chat', 0, datetime('now'), datetime('now'))
      `,
        )
        .run();

      const doc = manager.ingestText({
        userId: "user-1",
        title: "Linked Doc",
        content: "Content",
      });

      const link = manager.linkToChat("chat-1", doc.id);

      assert.ok(link.id);
      assert.strictEqual(link.chatId, "chat-1");
      assert.strictEqual(link.docId, doc.id);
    });

    it("should get linked documents for a chat", () => {
      const rawDb = db.getRawDb();
      rawDb
        .prepare(
          `
        INSERT INTO chats (id, user_id, title, message_count, created_at, updated_at)
        VALUES ('chat-2', 'user-1', 'Test Chat 2', 0, datetime('now'), datetime('now'))
      `,
        )
        .run();

      const doc1 = manager.ingestText({
        userId: "user-1",
        title: "Doc 1",
        content: "C1",
      });
      const doc2 = manager.ingestText({
        userId: "user-1",
        title: "Doc 2",
        content: "C2",
      });

      manager.linkToChat("chat-2", doc1.id);
      manager.linkToChat("chat-2", doc2.id);

      const linkedDocs = manager.getLinkedDocs("chat-2");

      assert.strictEqual(linkedDocs.length, 2);
    });

    it("should unlink document from chat", () => {
      const rawDb = db.getRawDb();
      rawDb
        .prepare(
          `
        INSERT INTO chats (id, user_id, title, message_count, created_at, updated_at)
        VALUES ('chat-3', 'user-1', 'Test Chat 3', 0, datetime('now'), datetime('now'))
      `,
        )
        .run();

      const doc = manager.ingestText({
        userId: "user-1",
        title: "Doc",
        content: "C",
      });
      manager.linkToChat("chat-3", doc.id);

      const success = manager.unlinkFromChat("chat-3", doc.id);
      assert.strictEqual(success, true);

      const linkedDocs = manager.getLinkedDocs("chat-3");
      assert.strictEqual(linkedDocs.length, 0);
    });
  });
});
