/**
 * Chat Manager - Orchestrates chat sessions with agents
 * Supports tool-calling for code analysis and file access
 */

import { ChatStorage } from "./storage.ts";
import type { ChatRequest, ChatResponse, ChatMessage, Chat } from "./types.ts";
import { costTracker } from "../billing/costTracker.ts";
import { selectModel } from "../billing/modelSelector.ts";
import { agentTools, executeTool } from "./tools.ts";
import { trackAICall, log, metrics } from "../monitoring/sentry.js";
import { events } from "../lib/events.js";
import {
  coreBrainSearch,
  coreBrainStore,
  buildCoreBrainContext,
} from "../brain/core-brain.js";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

// System prompt for the code assistant
const SYSTEM_PROMPT = `Du bist ein erfahrener Software-Entwickler und Code-Assistent für das "Code Cloud Agents" Projekt.

## Deine Fähigkeiten:
- Du kannst Dateien im Projekt lesen und analysieren
- Du kannst nach Code-Mustern und Definitionen suchen
- Du kannst die Projektstruktur erkunden
- Du kannst Code erklären, Bugs finden und Lösungen vorschlagen

## Das Projekt:
Code Cloud Agents ist ein Multi-Agent-System mit:
- Backend: Express.js + TypeScript auf Port 3000
- Frontend: Next.js Admin-Dashboard auf Port 3001
- Datenbank: SQLite mit better-sqlite3
- AI-Integration: Anthropic Claude, OpenAI, Google Gemini
- Features: Chat, Tasks, Audit-Logs, Webhooks, Memory-System

## Wichtige Verzeichnisse:
- src/api/ - API-Routen
- src/chat/ - Chat-System
- src/db/ - Datenbank
- src/auth/ - Authentifizierung
- src/memory/ - Conversation Memory

## Dein Verhalten:
1. Nutze die Tools um Code zu lesen bevor du antwortest
2. Gib konkrete Code-Beispiele
3. Erkläre Änderungen Schritt für Schritt
4. Antworte auf Deutsch (Code-Kommentare auf Englisch)
5. Sei präzise und hilfreich`;

export class ChatManager {
  private storage: ChatStorage;

  constructor(storage: ChatStorage) {
    this.storage = storage;
  }

  /**
   * Send message to agent and get response
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    log.info("Chat message received", {
      userId: request.userId,
      agentName: request.agentName,
      chatId: request.chatId || "new",
      messageLength: request.message.length,
    });

    // Track chat metrics
    metrics.increment("chat.messages.received", 1, {
      agentName: request.agentName,
    });
    metrics.set("chat.users.active", request.userId);

    // Get or create chat
    let chat: Chat;
    if (request.chatId) {
      chat = this.storage.getChat(request.chatId)!;
      if (!chat) {
        log.warn("Chat not found", { chatId: request.chatId });
        throw new Error(`Chat ${request.chatId} not found`);
      }
    } else {
      // Create new chat with auto-generated title
      const title = this.generateTitle(request.message);
      chat = this.storage.createChat(request.userId, title, request.agentName);
      log.info("New chat created", {
        chatId: chat.id,
        userId: request.userId,
        agentName: request.agentName,
      });
    }

    // Store user message
    this.storage.addMessage({
      chatId: chat.id,
      role: "user",
      content: request.message,
    });

    // Get chat history for context (if requested)
    const history: ChatMessage[] = request.includeHistory
      ? this.storage.getRecentMessages(chat.id, request.maxHistory || 10)
      : [];

    // Pre-Recall: Search core brain for relevant context
    let coreBrainContext = "";
    try {
      const coreBrainResults = await coreBrainSearch({
        userId: request.userId,
        query: request.message,
        limit: 5,
      });
      if (coreBrainResults.length > 0) {
        coreBrainContext = buildCoreBrainContext(coreBrainResults);
        log.info("Core brain pre-recall", {
          userId: request.userId,
          resultsCount: coreBrainResults.length,
        });
      }
    } catch (error) {
      log.warn("Core brain pre-recall failed", {
        error: error instanceof Error ? error.message : "Unknown",
      });
    }

    // Build prompt with history and core brain context
    const prompt = this.buildPrompt(
      request.message,
      history,
      request.agentName,
      coreBrainContext,
    );

    // Select optimal model
    const modelRecommendation = selectModel(request.message, {
      preferLocal: false,
    });

    const modelToUse = request.model || modelRecommendation.model;
    const providerToUse = request.modelProvider || modelRecommendation.provider;

    // Call AI provider
    const aiResponse = await this.callAIProvider(
      providerToUse,
      modelToUse,
      prompt,
      request.agentName,
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

      log.info("AI response completed", {
        chatId: chat.id,
        provider: providerToUse,
        model: modelToUse,
        inputTokens: aiResponse.tokens.input,
        outputTokens: aiResponse.tokens.output,
        costUSD: aiResponse.cost?.usd,
        responseLength: aiResponse.content.length,
      });

      // Track AI usage metrics
      metrics.increment("ai.requests.total", 1, {
        provider: providerToUse,
        model: modelToUse,
      });
      metrics.distribution("ai.tokens.input", aiResponse.tokens.input, {
        provider: providerToUse,
      });
      metrics.distribution("ai.tokens.output", aiResponse.tokens.output, {
        provider: providerToUse,
      });
      if (aiResponse.cost?.usd) {
        metrics.distribution("ai.cost.usd", aiResponse.cost.usd * 100, {
          provider: providerToUse,
        }); // in cents
      }
    }

    // Log chat event for audit trail
    events.chatSent(request.userId, request.agentName, request.message);

    // Writeback: Store conversation in core brain (append-only, no overwrites)
    try {
      // Store the Q&A pair as a single memory entry
      const memoryContent = `Q: ${request.message.substring(0, 500)}\nA: ${aiResponse.content.substring(0, 1000)}`;
      await coreBrainStore({
        userId: request.userId,
        content: memoryContent,
        type: "chat",
        tags: ["chat", request.agentName],
      });
      log.info("Core brain writeback", {
        userId: request.userId,
        chatId: chat.id,
        agentName: request.agentName,
      });
    } catch (error) {
      log.warn("Core brain writeback failed", {
        error: error instanceof Error ? error.message : "Unknown",
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

  /**
   * Create new chat
   */
  createChat(userId: string, title: string, agentName: string) {
    return this.storage.createChat(userId, title, agentName);
  }

  updateChatTitle(chatId: string, title: string): void {
    this.storage.updateChatTitle(chatId, title);
  }

  /**
   * Generate chat title from first message
   */
  private generateTitle(message: string): string {
    // Take first 50 chars or first sentence
    const shortened = message.substring(0, 50);
    return shortened.length < message.length ? shortened + "..." : shortened;
  }

  /**
   * Build prompt with chat history and core brain context
   */
  private buildPrompt(
    message: string,
    history: ChatMessage[],
    agentName: string,
    coreBrainContext: string = "",
  ): string {
    let prompt = "";

    // Add system message for agent
    prompt += `You are ${agentName}, a helpful AI assistant.\n\n`;

    // Add core brain context if available
    if (coreBrainContext) {
      prompt += coreBrainContext;
      prompt += "\n";
    }

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
   * Get provider fallback order
   * Returns array of providers to try in sequence
   */
  private getProviderOrder(preferredProvider: string): string[] {
    const allProviders = ["anthropic", "openai", "gemini"];
    const preferred = preferredProvider.toLowerCase();

    if (allProviders.includes(preferred)) {
      return [preferred, ...allProviders.filter((p) => p !== preferred)];
    }
    return allProviders;
  }

  /**
   * Call AI provider with automatic fallback
   * Tries providers in order: preferred -> anthropic -> openai -> gemini
   * Includes Sentry AI monitoring for token usage, costs, and latency
   */
  private async callAIProvider(
    provider: string,
    model: string,
    prompt: string,
    agentName: string,
  ): Promise<{
    content: string;
    tokens?: { input: number; output: number; total: number };
    cost?: { usd: number; eur: number };
  }> {
    console.log(`[Chat] Calling ${provider}/${model} for agent ${agentName}`);

    // Wrap AI call with Sentry tracking
    return trackAICall({ provider, model, agentName, prompt }, async () => {
      const providers = this.getProviderOrder(provider);
      let lastError: Error | null = null;

      for (const p of providers) {
        try {
          console.log(`[Chat] Trying provider: ${p}`);

          switch (p.toLowerCase()) {
            case "anthropic":
              if (!process.env.ANTHROPIC_API_KEY) {
                console.log("[Chat] Anthropic: No API key, skipping");
                continue;
              }
              return await this.callAnthropic(model, prompt, agentName);

            case "openai":
              if (!process.env.OPENAI_API_KEY) {
                console.log("[Chat] OpenAI: No API key, skipping");
                continue;
              }
              // Use gpt-4o as fallback model
              return await this.callOpenAI("gpt-4o", prompt, agentName);

            case "gemini":
              if (!process.env.GEMINI_API_KEY) {
                console.log("[Chat] Gemini: No API key, skipping");
                continue;
              }
              return await this.callGemini(model, prompt, agentName);

            default:
              continue;
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.warn(`[Chat] ${p} failed: ${errorMessage}`);

          // Check if it's a rate limit error - try next provider
          if (
            errorMessage.includes("429") ||
            errorMessage.includes("rate_limit")
          ) {
            console.log(`[Chat] ${p} rate limited, trying next provider...`);
            log.warn("AI provider rate limited, trying fallback", {
              provider: p,
              error: errorMessage,
            });
          } else {
            log.error("AI provider call failed", {
              provider: p,
              model,
              agentName,
              error: errorMessage,
            });
          }

          lastError = error instanceof Error ? error : new Error(errorMessage);
          continue; // Try next provider
        }
      }

      // All providers failed
      log.error("All AI providers failed", {
        attemptedProviders: providers.join(", "),
        lastError: lastError?.message,
      });
      throw lastError || new Error("All AI providers failed");
    });
  }

  /**
   * Call Anthropic Claude API with tool support
   */
  private async callAnthropic(
    model: string,
    prompt: string,
    _agentName: string,
  ): Promise<{
    content: string;
    tokens: { input: number; output: number; total: number };
    cost: { usd: number; eur: number };
  }> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Build messages array for conversation
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    // Tool-calling loop (max 10 iterations)
    let finalContent = "";
    for (let i = 0; i < 10; i++) {
      const response = await client.messages.create({
        model: model || "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages,
        system: SYSTEM_PROMPT,
        tools: agentTools,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Check if we need to handle tool use
      if (response.stop_reason === "tool_use") {
        // Find tool use blocks and execute them
        const toolResults: Anthropic.MessageParam["content"] = [];
        const assistantContent: Anthropic.ContentBlock[] = [];

        for (const block of response.content) {
          if (block.type === "tool_use") {
            console.log(`[Chat] Executing tool: ${block.name}`);
            log.debug("Tool execution started", {
              tool: block.name,
              toolId: block.id,
            });
            const result = await executeTool(
              block.name,
              block.input as Record<string, unknown>,
            );
            log.debug("Tool execution completed", {
              tool: block.name,
              toolId: block.id,
              resultLength: result.length,
            });
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
            assistantContent.push(block);
          } else if (block.type === "text") {
            assistantContent.push(block);
          }
        }

        // Add assistant message with tool use
        messages.push({
          role: "assistant",
          content: assistantContent,
        });

        // Add tool results
        messages.push({
          role: "user",
          content: toolResults,
        });

        // Continue the loop to get final response
        continue;
      }

      // No more tool calls - extract final text
      for (const block of response.content) {
        if (block.type === "text") {
          finalContent += block.text;
        }
      }
      break;
    }

    // Cost calculation (Claude 3.5 Sonnet pricing: $3/MTok input, $15/MTok output)
    const inputCostUSD = (totalInputTokens / 1_000_000) * 3;
    const outputCostUSD = (totalOutputTokens / 1_000_000) * 15;
    const totalCostUSD = inputCostUSD + outputCostUSD;

    return {
      content: finalContent,
      tokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      cost: {
        usd: totalCostUSD,
        eur: totalCostUSD * 0.92,
      },
    };
  }

  /**
   * Call OpenAI GPT API
   */
  private async callOpenAI(
    model: string,
    prompt: string,
    agentName: string,
  ): Promise<{
    content: string;
    tokens: { input: number; output: number; total: number };
    cost: { usd: number; eur: number };
  }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: model || "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are ${agentName}, a helpful AI assistant.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 4096,
    });

    const content = response.choices[0].message.content || "";
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    // Cost calculation (GPT-4 pricing: $30/MTok input, $60/MTok output)
    const inputCostUSD = (inputTokens / 1_000_000) * 30;
    const outputCostUSD = (outputTokens / 1_000_000) * 60;
    const totalCostUSD = inputCostUSD + outputCostUSD;

    return {
      content,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      cost: {
        usd: totalCostUSD,
        eur: totalCostUSD * 0.92,
      },
    };
  }

  /**
   * Call Google Gemini API
   */
  private async callGemini(
    model: string,
    prompt: string,
    agentName: string,
  ): Promise<{
    content: string;
    tokens: { input: number; output: number; total: number };
    cost: { usd: number; eur: number };
  }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model: model || "gemini-pro",
    });

    const systemInstruction = `You are ${agentName}, a helpful AI assistant.`;
    const fullPrompt = `${systemInstruction}\n\n${prompt}`;

    const result = await geminiModel.generateContent(fullPrompt);
    const response = result.response;
    const content = response.text();

    // Gemini doesn't provide detailed token usage, estimate it
    const inputTokens = Math.floor(fullPrompt.length / 4);
    const outputTokens = Math.floor(content.length / 4);

    // Cost calculation (Gemini pricing: $0.5/MTok input, $1.5/MTok output)
    const inputCostUSD = (inputTokens / 1_000_000) * 0.5;
    const outputCostUSD = (outputTokens / 1_000_000) * 1.5;
    const totalCostUSD = inputCostUSD + outputCostUSD;

    return {
      content,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      cost: {
        usd: totalCostUSD,
        eur: totalCostUSD * 0.92,
      },
    };
  }
}
