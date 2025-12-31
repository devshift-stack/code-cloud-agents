/**
 * Brain Module - Knowledge Base Management
 *
 * Exports all brain-related functionality
 */

export { BrainManager } from "./manager.js";
export type {
  IngestTextOptions,
  IngestUrlOptions,
  IngestFileOptions,
  UpdateDocOptions,
} from "./manager.js";

export { BrainSearch } from "./search.js";
export type { BrainSearchResult, KeywordSearchResult } from "./search.js";

// Re-export types from DB schema
export type { BrainDoc, BrainChunk, BrainEmbedding, BrainChatLink } from "../db/brain.js";
