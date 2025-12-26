/**
 * Chat Manager - Orchestrates chat sessions with agents
 */

import { ChatStorage } from "./storage.ts";
import type {
  ChatRequest,
  ChatResponse,
  ChatMessage,
  Chat,
} from "./types.ts";
import { costTracker } from "../billing/costTracker.ts";
import { selectModel } from "../billing/modelSelector.ts";

export class ChatManager {
  private storage: ChatStorage;

  constructor(storage: ChatStorage) {
    this.storage = storage;
  }

  /**
   * Send message to agent and get response
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    // Get or create chat
    let chat: Chat;
    if (request.chatId) {
      chat = this.storage.getChat(request.chatId)!;
      if (!chat) {
        throw new Error(`Chat ${request.chatId} not found`);
      }
    } else {
      // Create new chat with auto-generated title
      const title = this.generateTitle(request.message);
      chat = this.storage.createChat(
        request.userId,
        title,
        request.agentName
      );
    }

    // Store user message
    this.storage.addMessage({
      chatId: chat.id,
      role: "user",
      content: request.message,
    });

    // Get chat history for context (if requested)
    const history: ChatMessage[] = request.includeHistory
      ? this.storage.getRecentMessages(
          chat.id,
          request.maxHistory || 10
        )
      : [];

    // Build prompt with history
    const prompt = this.buildPrompt(request.message, history, request.agentName);

    // Select optimal model
    const modelRecommendation = selectModel(request.message, {
      preferLocal: false,
    });

    const modelToUse = request.model || modelRecommendation.model;
    const providerToUse = request.modelProvider || modelRecommendation.provider;

    // Call AI provider (simplified - you'll need to implement actual provider calls)
    const aiResponse = await this.callAIProvider(
      providerToUse,
      modelToUse,
      prompt,
      request.agentName
    );

    // Store assistant response
    const assistantMessage = this.storage.addMessage({
      chatId: chat.id,
      role: "assistant",
      content: aiResponse.content,
      agentName: request.agentName,
      tokens: aiResponse.tokens,
    });

    // Track costs
    if (aiResponse.tokens) {
      costTracker.log({
        userId: request.userId,
        taskId: chat.id,
        model: modelToUse,
        provider: providerToUse,
        inputTokens: aiResponse.tokens.input,
        outputTokens: aiResponse.tokens.output,
      });
    }

    return {
      chatId: chat.id,
      messageId: assistantMessage.id,
      agentName: request.agentName,
      content: aiResponse.content,
      timestamp: assistantMessage.timestamp,
      tokens: aiResponse.tokens,
      cost: aiResponse.cost,
    };
  }

  /**
   * Get chat history
   */
  getChatHistory(chatId: string, limit = 50, offset = 0) {
    const messages = this.storage.getMessages(chatId, limit, offset);
    const total = this.storage.countMessages(chatId);

    return {
      chatId,
      messages,
      total,
      hasMore: offset + messages.length < total,
    };
  }

  /**
   * List user's chats
   */
  listChats(userId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const chats = this.storage.listChats(userId, pageSize, offset);
    const total = this.storage.countChats(userId);

    return {
      chats: chats.map((chat) => ({
        chatId: chat.id,
        title: chat.title,
        agentName: chat.agentName,
        messageCount: chat.messageCount,
        lastMessage: chat.lastMessage || "",
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Delete chat
   */
  deleteChat(chatId: string): void {
    this.storage.deleteChat(chatId);
  }

  /**
   * Update chat title
   */
  updateChatTitle(chatId: string, title: string): void {
    this.storage.updateChatTitle(chatId, title);
  }

  /**
   * Generate chat title from first message
   */
  private generateTitle(message: string): string {
    // Take first 50 chars or first sentence
    const shortened = message.substring(0, 50);
    return shortened.length < message.length
      ? shortened + "..."
      : shortened;
  }

  /**
   * Build prompt with chat history
   */
  private buildPrompt(
    message: string,
    history: ChatMessage[],
    agentName: string
  ): string {
    let prompt = "";

    // Add system message for agent
    prompt += `You are ${agentName}, a helpful AI assistant.\n\n`;

    // Add chat history
    if (history.length > 0) {
      prompt += "Previous conversation:\n";
      for (const msg of history) {
        if (msg.role === "user") {
          prompt += `User: ${msg.content}\n`;
        } else if (msg.role === "assistant") {
          prompt += `${msg.agentName || "Assistant"}: ${msg.content}\n`;
        }
      }
      prompt += "\n";
    }

    // Add current message
    prompt += `User: ${message}\n`;
    prompt += `${agentName}: `;

    return prompt;
  }

  /**
   * Call AI provider (placeholder - implement actual provider logic)
   */
  private async callAIProvider(
    provider: string,
    model: string,
    prompt: string,
    agentName: string
  ): Promise<{
    content: string;
    tokens?: { input: number; output: number; total: number };
    cost?: { usd: number; eur: number };
  }> {
    // TODO: Implement actual provider calls
    // For now, return mock response
    console.log(`[Chat] Calling ${provider}/${model} for agent ${agentName}`);

    // Simulate AI response
    const content = `This is a simulated response from ${agentName} using ${model}.

In a real implementation, this would call the AI provider API (Anthropic/OpenAI/Gemini) with the prompt and return the actual response.

Prompt was: ${prompt.substring(0, 100)}...`;

    // Mock tokens (you'll get these from actual API response)
    const inputTokens = Math.floor(prompt.length / 4); // ~4 chars per token
    const outputTokens = Math.floor(content.length / 4);

    return {
      content,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      cost: {
        usd: 0.01, // Mock cost
        eur: 0.0092,
      },
    };
  }
}
