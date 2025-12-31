/**
 * Common Types - Shared across Frontend and Backend
 */

/**
 * Risk severity levels
 */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Task/Agent status
 */
export type Status =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "stopped";

/**
 * Agent status
 */
export type AgentStatus = "online" | "offline" | "paused" | "review" | "error";

/**
 * Model provider types
 */
export type ModelProvider =
  | "anthropic"
  | "openai"
  | "gemini"
  | "xai"
  | "ollama";

/**
 * Currency types
 */
export type Currency = "USD" | "EUR";

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Common metadata type
 */
export type Metadata = Record<string, unknown>;

/**
 * Common timestamp fields
 */
export interface Timestamps {
  createdAt: string;
  updatedAt?: string;
}

/**
 * ID field
 */
export interface WithId {
  id: string;
}
