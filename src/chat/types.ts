/**
 * Chat System Types
 *
 * Chat interface for user-agent communication
 */

export interface ChatMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  agentName?: string; // Which agent handled this
  timestamp: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  metadata?: Record<string, unknown>;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  agentName: string; // Primary agent for this chat
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

export interface ChatRequest {
  chatId?: string; // If continuing existing chat
  userId: string;
  agentName: string; // Which agent to use
  message: string;
  modelProvider?: "anthropic" | "openai" | "gemini";
  model?: string;
  includeHistory?: boolean; // Include previous messages
  maxHistory?: number; // Max messages to include (default 10)
}

export interface ChatResponse {
  chatId: string;
  messageId: string;
  agentName: string;
  content: string;
  timestamp: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: {
    usd: number;
    eur: number;
  };
}

export interface ChatHistory {
  chatId: string;
  title: string;
  agentName: string;
  messageCount: number;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatListResponse {
  chats: ChatHistory[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ChatMessagesResponse {
  chatId: string;
  messages: ChatMessage[];
  total: number;
  hasMore: boolean;
}
