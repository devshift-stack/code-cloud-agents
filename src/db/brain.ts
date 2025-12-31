/**
 * Brain Database Schema
 *
 * Tables for Knowledge Base storage:
 * - brain_docs: Documents (text, URL, file metadata)
 * - brain_chunks: Chunked text pieces
 * - brain_embeddings: Vector embeddings for semantic search
 */

import type Database from "better-sqlite3";

/**
 * Initialize brain tables
 */
export function initBrainTables(db: Database.Database): void {
  db.exec(`
    -- Documents table (text, URL, file references)
    CREATE TABLE IF NOT EXISTS brain_docs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      source_type TEXT NOT NULL CHECK(source_type IN ('text', 'url', 'file')),
      source_url TEXT,
      file_path TEXT,
      file_name TEXT,
      file_type TEXT,
      file_size INTEGER,
      metadata TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'ready', 'error')),
      error_message TEXT,
      chunk_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Chunked text pieces
    CREATE TABLE IF NOT EXISTS brain_chunks (
      id TEXT PRIMARY KEY,
      doc_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER,
      start_offset INTEGER,
      end_offset INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (doc_id) REFERENCES brain_docs(id) ON DELETE CASCADE
    );

    -- Vector embeddings for semantic search
    CREATE TABLE IF NOT EXISTS brain_embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chunk_id TEXT UNIQUE NOT NULL,
      doc_id TEXT NOT NULL,
      embedding TEXT NOT NULL,
      model TEXT NOT NULL,
      dimensions INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (chunk_id) REFERENCES brain_chunks(id) ON DELETE CASCADE,
      FOREIGN KEY (doc_id) REFERENCES brain_docs(id) ON DELETE CASCADE
    );

    -- Chat-Knowledge links (attach knowledge to chats)
    CREATE TABLE IF NOT EXISTS brain_chat_links (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (doc_id) REFERENCES brain_docs(id) ON DELETE CASCADE,
      UNIQUE(chat_id, doc_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_brain_docs_user_id ON brain_docs(user_id);
    CREATE INDEX IF NOT EXISTS idx_brain_docs_status ON brain_docs(status);
    CREATE INDEX IF NOT EXISTS idx_brain_docs_source_type ON brain_docs(source_type);
    CREATE INDEX IF NOT EXISTS idx_brain_chunks_doc_id ON brain_chunks(doc_id);
    CREATE INDEX IF NOT EXISTS idx_brain_embeddings_chunk_id ON brain_embeddings(chunk_id);
    CREATE INDEX IF NOT EXISTS idx_brain_embeddings_doc_id ON brain_embeddings(doc_id);
    CREATE INDEX IF NOT EXISTS idx_brain_chat_links_chat_id ON brain_chat_links(chat_id);
    CREATE INDEX IF NOT EXISTS idx_brain_chat_links_doc_id ON brain_chat_links(doc_id);
  `);

  console.log("✅ Brain tables initialized");
}

// Type definitions
export interface BrainDoc {
  id: string;
  userId: string;
  title: string;
  content?: string;
  sourceType: "text" | "url" | "file";
  sourceUrl?: string;
  filePath?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  metadata?: Record<string, unknown>;
  status: "pending" | "processing" | "ready" | "error";
  errorMessage?: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrainChunk {
  id: string;
  docId: string;
  chunkIndex: number;
  content: string;
  tokenCount?: number;
  startOffset?: number;
  endOffset?: number;
  createdAt: string;
}

export interface BrainEmbedding {
  id: number;
  chunkId: string;
  docId: string;
  embedding: number[];
  model: string;
  dimensions: number;
  createdAt: string;
}

export interface BrainChatLink {
  id: string;
  chatId: string;
  docId: string;
  createdAt: string;
}
