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

// Core Brain Client (central knowledge base)
export {
  coreBrainSearch,
  coreBrainStore,
  coreBrainRecent,
  buildCoreBrainContext,
  coreBrainHealthCheck,
} from "./core-brain.js";
export type {
  CoreBrainMemory,
  CoreBrainSearchResult,
  CoreBrainStoreParams,
  CoreBrainSearchParams,
} from "./core-brain.js";

// Re-export types from DB schema
export type {
  BrainDoc,
  BrainChunk,
  BrainEmbedding,
  BrainChatLink,
} from "../db/brain.js";
