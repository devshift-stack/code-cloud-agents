/**
 * Brain Manager - Knowledge Base Management
 *
 * Handles document ingestion, chunking, and storage
 */

import type { Database } from "../db/database.js";
import type { BrainDoc, BrainChunk, BrainChatLink } from "../db/brain.js";
import { randomUUID } from "crypto";

// Chunking configuration
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200; // overlap between chunks

export interface IngestTextOptions {
  userId: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface IngestUrlOptions {
  userId: string;
  title: string;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface IngestFileOptions {
  userId: string;
  title: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDocOptions {
  title?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Brain Manager for knowledge base storage
 */
export class BrainManager {
  constructor(private db: Database) {}

  /**
   * Ingest plain text into knowledge base
   */
  ingestText(options: IngestTextOptions): BrainDoc {
    const docId = randomUUID();
    const now = new Date().toISOString();

    const rawDb = this.db.getRawDb();

    // Insert document
    const docStmt = rawDb.prepare(`
      INSERT INTO brain_docs (
        id, user_id, title, content, source_type, metadata, status, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    docStmt.run(
      docId,
      options.userId,
      options.title,
      options.content,
      "text",
      options.metadata ? JSON.stringify(options.metadata) : null,
      "processing",
      0,
      now,
      now,
    );

    // Chunk and store
    const chunks = this.chunkText(options.content);
    this.storeChunks(docId, chunks);

    // Update document status
    const updateStmt = rawDb.prepare(`
      UPDATE brain_docs SET status = 'ready', chunk_count = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(chunks.length, new Date().toISOString(), docId);

    return this.getDoc(docId)!;
  }

  /**
   * Ingest URL content into knowledge base
   */
  ingestUrl(options: IngestUrlOptions, fetchedContent: string): BrainDoc {
    const docId = randomUUID();
    const now = new Date().toISOString();

    const rawDb = this.db.getRawDb();

    // Insert document
    const docStmt = rawDb.prepare(`
      INSERT INTO brain_docs (
        id, user_id, title, content, source_type, source_url, metadata, status, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    docStmt.run(
      docId,
      options.userId,
      options.title,
      fetchedContent,
      "url",
      options.url,
      options.metadata ? JSON.stringify(options.metadata) : null,
      "processing",
      0,
      now,
      now,
    );

    // Chunk and store
    const chunks = this.chunkText(fetchedContent);
    this.storeChunks(docId, chunks);

    // Update document status
    const updateStmt = rawDb.prepare(`
      UPDATE brain_docs SET status = 'ready', chunk_count = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(chunks.length, new Date().toISOString(), docId);

    return this.getDoc(docId)!;
  }

  /**
   * Ingest file content into knowledge base
   */
  ingestFile(options: IngestFileOptions): BrainDoc {
    const docId = randomUUID();
    const now = new Date().toISOString();

    const rawDb = this.db.getRawDb();

    // Insert document
    const docStmt = rawDb.prepare(`
      INSERT INTO brain_docs (
        id, user_id, title, content, source_type, file_path, file_name, file_type, file_size,
        metadata, status, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    docStmt.run(
      docId,
      options.userId,
      options.title,
      options.content,
      "file",
      options.filePath,
      options.fileName,
      options.fileType,
      options.fileSize,
      options.metadata ? JSON.stringify(options.metadata) : null,
      "processing",
      0,
      now,
      now,
    );

    // Chunk and store
    const chunks = this.chunkText(options.content);
    this.storeChunks(docId, chunks);

    // Update document status
    const updateStmt = rawDb.prepare(`
      UPDATE brain_docs SET status = 'ready', chunk_count = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(chunks.length, new Date().toISOString(), docId);

    return this.getDoc(docId)!;
  }

  /**
   * Get a document by ID
   */
  getDoc(docId: string): BrainDoc | null {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare("SELECT * FROM brain_docs WHERE id = ?");
    const row = stmt.get(docId) as any;

    if (!row) return null;

    return this.rowToDoc(row);
  }

  /**
   * List documents for a user
   */
  listDocs(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      sourceType?: string;
      status?: string;
    } = {},
  ): BrainDoc[] {
    const rawDb = this.db.getRawDb();
    const { limit = 50, offset = 0, sourceType, status } = options;

    let query = "SELECT * FROM brain_docs WHERE user_id = ?";
    const params: any[] = [userId];

    if (sourceType) {
      query += " AND source_type = ?";
      params.push(sourceType);
    }

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const stmt = rawDb.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => this.rowToDoc(row));
  }

  /**
   * Update document metadata
   */
  updateDoc(docId: string, options: UpdateDocOptions): boolean {
    const rawDb = this.db.getRawDb();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];

    if (options.title !== undefined) {
      fields.push("title = ?");
      values.push(options.title);
    }

    if (options.metadata !== undefined) {
      fields.push("metadata = ?");
      values.push(JSON.stringify(options.metadata));
    }

    if (fields.length === 0) return false;

    fields.push("updated_at = ?");
    values.push(now);
    values.push(docId);

    const stmt = rawDb.prepare(`
      UPDATE brain_docs SET ${fields.join(", ")}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * Delete a document and all its chunks
   */
  deleteDoc(docId: string): boolean {
    const rawDb = this.db.getRawDb();

    // Chunks and embeddings will be deleted automatically via CASCADE
    const stmt = rawDb.prepare("DELETE FROM brain_docs WHERE id = ?");
    const result = stmt.run(docId);

    return result.changes > 0;
  }

  /**
   * Get chunks for a document
   */
  getChunks(docId: string): BrainChunk[] {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare(`
      SELECT * FROM brain_chunks
      WHERE doc_id = ?
      ORDER BY chunk_index ASC
    `);

    const rows = stmt.all(docId) as any[];

    return rows.map((row) => ({
      id: row.id,
      docId: row.doc_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      tokenCount: row.token_count,
      startOffset: row.start_offset,
      endOffset: row.end_offset,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get a single chunk by ID
   */
  getChunk(chunkId: string): BrainChunk | null {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare("SELECT * FROM brain_chunks WHERE id = ?");
    const row = stmt.get(chunkId) as any;

    if (!row) return null;

    return {
      id: row.id,
      docId: row.doc_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      tokenCount: row.token_count,
      startOffset: row.start_offset,
      endOffset: row.end_offset,
      createdAt: row.created_at,
    };
  }

  /**
   * Link a document to a chat
   */
  linkToChat(chatId: string, docId: string): BrainChatLink {
    const rawDb = this.db.getRawDb();
    const linkId = randomUUID();
    const now = new Date().toISOString();

    const stmt = rawDb.prepare(`
      INSERT OR IGNORE INTO brain_chat_links (id, chat_id, doc_id, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(linkId, chatId, docId, now);

    return {
      id: linkId,
      chatId,
      docId,
      createdAt: now,
    };
  }

  /**
   * Unlink a document from a chat
   */
  unlinkFromChat(chatId: string, docId: string): boolean {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare(`
      DELETE FROM brain_chat_links
      WHERE chat_id = ? AND doc_id = ?
    `);

    const result = stmt.run(chatId, docId);
    return result.changes > 0;
  }

  /**
   * Get documents linked to a chat
   */
  getLinkedDocs(chatId: string): BrainDoc[] {
    const rawDb = this.db.getRawDb();
    const stmt = rawDb.prepare(`
      SELECT d.* FROM brain_docs d
      INNER JOIN brain_chat_links l ON d.id = l.doc_id
      WHERE l.chat_id = ?
      ORDER BY l.created_at DESC
    `);

    const rows = stmt.all(chatId) as any[];
    return rows.map((row) => this.rowToDoc(row));
  }

  /**
   * Get statistics for a user
   */
  getUserStats(userId: string): {
    totalDocs: number;
    totalChunks: number;
    bySourceType: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const rawDb = this.db.getRawDb();

    const docsStmt = rawDb.prepare(
      "SELECT COUNT(*) as count FROM brain_docs WHERE user_id = ?",
    );
    const docsRow = docsStmt.get(userId) as any;

    const chunksStmt = rawDb.prepare(`
      SELECT COUNT(*) as count FROM brain_chunks
      WHERE doc_id IN (SELECT id FROM brain_docs WHERE user_id = ?)
    `);
    const chunksRow = chunksStmt.get(userId) as any;

    const typeStmt = rawDb.prepare(`
      SELECT source_type, COUNT(*) as count FROM brain_docs
      WHERE user_id = ?
      GROUP BY source_type
    `);
    const typeRows = typeStmt.all(userId) as any[];

    const statusStmt = rawDb.prepare(`
      SELECT status, COUNT(*) as count FROM brain_docs
      WHERE user_id = ?
      GROUP BY status
    `);
    const statusRows = statusStmt.all(userId) as any[];

    return {
      totalDocs: docsRow.count,
      totalChunks: chunksRow.count,
      bySourceType: Object.fromEntries(
        typeRows.map((r) => [r.source_type, r.count]),
      ),
      byStatus: Object.fromEntries(statusRows.map((r) => [r.status, r.count])),
    };
  }

  // === Private helpers ===

  /**
   * Split text into overlapping chunks
   */
  private chunkText(
    text: string,
  ): { content: string; start: number; end: number }[] {
    const chunks: { content: string; start: number; end: number }[] = [];

    if (text.length <= CHUNK_SIZE) {
      chunks.push({ content: text, start: 0, end: text.length });
      return chunks;
    }

    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + CHUNK_SIZE, text.length);

      // Try to break at sentence/paragraph boundary if not at end
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf(".", end);
        const lastNewline = text.lastIndexOf("\n", end);
        const breakPoint = Math.max(lastPeriod, lastNewline);

        if (breakPoint > start + CHUNK_SIZE / 2) {
          end = breakPoint + 1;
        }
      }

      chunks.push({
        content: text.slice(start, end).trim(),
        start,
        end,
      });

      start = end - CHUNK_OVERLAP;
      if (start >= text.length - CHUNK_OVERLAP) break;
    }

    return chunks;
  }

  /**
   * Store chunks in database
   */
  private storeChunks(
    docId: string,
    chunks: { content: string; start: number; end: number }[],
  ): void {
    const rawDb = this.db.getRawDb();
    const now = new Date().toISOString();

    const stmt = rawDb.prepare(`
      INSERT INTO brain_chunks (id, doc_id, chunk_index, content, token_count, start_offset, end_offset, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = rawDb.transaction((chunkList: typeof chunks) => {
      for (let i = 0; i < chunkList.length; i++) {
        const chunk = chunkList[i];
        const tokenCount = Math.ceil(chunk.content.length / 4); // rough estimate
        stmt.run(
          randomUUID(),
          docId,
          i,
          chunk.content,
          tokenCount,
          chunk.start,
          chunk.end,
          now,
        );
      }
    });

    insertMany(chunks);
  }

  /**
   * Convert database row to BrainDoc
   */
  private rowToDoc(row: any): BrainDoc {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      content: row.content,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      filePath: row.file_path,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      status: row.status,
      errorMessage: row.error_message,
      chunkCount: row.chunk_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
