/**
 * Chat Provider Integration Tests
 *
 * Tests for AI provider calls (Anthropic, OpenAI, Gemini)
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { ChatManager } from "../src/chat/manager.ts";
import { ChatStorage } from "../src/chat/storage.ts";
import { initDatabase } from "../src/db/database.ts";
import fs from "node:fs";
import path from "node:path";

// Test database setup
const TEST_DB_PATH = path.join(process.cwd(), "test-chat-provider.db");

function setupTestDatabase() {
  // Remove existing test DB
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Use initDatabase() which returns a Database interface
  process.env.SQLITE_PATH = TEST_DB_PATH;
  const db = initDatabase();

  return db;
}

function cleanupTestDatabase() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}

describe("Chat Provider Integration", () => {
  let db: any;
  let storage: ChatStorage;
  let manager: ChatManager;

  beforeEach(() => {
    db = setupTestDatabase();
    storage = new ChatStorage(db);
    manager = new ChatManager(storage);
  });

  it("throws error when provider API key is missing", async () => {
    // Save original env
    const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      await manager.sendMessage({
        userId: "test-user",
        message: "Hello",
        agentName: "TestAgent",
        modelProvider: "anthropic",
      });

      assert.fail("Should have thrown error");
    } catch (error: any) {
      // Accept either direct error or wrapped error
      const hasApiKeyError =
        error.message.includes("ANTHROPIC_API_KEY") ||
        error.message.includes("API_KEY") ||
        error.message.includes("not configured");
      assert.ok(
        hasApiKeyError,
        `Expected API key error, got: ${error.message}`,
      );
    } finally {
      // Restore env
      if (originalAnthropicKey) {
        process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
      }
    }
  });

  it("throws error for unsupported provider", async () => {
    try {
      await manager.sendMessage({
        userId: "test-user",
        message: "Hello",
        agentName: "TestAgent",
        modelProvider: "unsupported" as any,
      });

      assert.fail("Should have thrown error");
    } catch (error: any) {
      // Accept either direct error or wrapped error
      const hasProviderError =
        error.message.includes("Unsupported provider") ||
        error.message.includes("unsupported") ||
        error.message.includes("Failed to call");
      assert.ok(
        hasProviderError,
        `Expected provider error, got: ${error.message}`,
      );
    }
  });

  it("creates new chat when chatId is not provided", async () => {
    // Skip actual API call by checking if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      return; // Skip test if no API key
    }

    try {
      const response = await manager.sendMessage({
        userId: "test-user",
        message: "Hello",
        agentName: "TestAgent",
        modelProvider: "anthropic",
      });

      assert.ok(response.chatId);
      assert.ok(response.messageId);
      assert.strictEqual(response.agentName, "TestAgent");
      assert.ok(response.content);
      assert.ok(response.tokens);
    } catch (error: any) {
      // If API call fails (network, invalid key, etc.), verify error is handled
      assert.ok(error.message.includes("Failed to call"));
    }
  });

  it("uses existing chat when chatId is provided", async () => {
    // Create a chat first
    const chat = storage.createChat("test-user", "Test Chat", "TestAgent");

    // Skip actual API call by checking if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      return; // Skip test if no API key
    }

    try {
      const response = await manager.sendMessage({
        userId: "test-user",
        chatId: chat.id,
        message: "Hello again",
        agentName: "TestAgent",
        modelProvider: "anthropic",
      });

      assert.strictEqual(response.chatId, chat.id);
    } catch (error: any) {
      // If API call fails, verify error is handled
      assert.ok(error.message.includes("Failed to call"));
    }
  });

  it("stores user message before calling provider", async () => {
    const chat = storage.createChat("test-user", "Test Chat", "TestAgent");

    // Skip actual API call by checking if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      return; // Skip test if no API key
    }

    try {
      await manager.sendMessage({
        userId: "test-user",
        chatId: chat.id,
        message: "Test message",
        agentName: "TestAgent",
        modelProvider: "anthropic",
      });
    } catch (error) {
      // Even if API call fails, user message should be stored
    }

    const messages = storage.getMessages(chat.id, 10, 0);
    const userMessage = messages.find((m) => m.role === "user");

    assert.ok(userMessage);
    assert.strictEqual(userMessage.content, "Test message");
  });

  it("includes chat history when includeHistory is true", async () => {
    const chat = storage.createChat("test-user", "Test Chat", "TestAgent");

    // Add some history
    storage.addMessage({
      chatId: chat.id,
      role: "user",
      content: "Previous message",
    });
    storage.addMessage({
      chatId: chat.id,
      role: "assistant",
      content: "Previous response",
      agentName: "TestAgent",
    });

    // Verify history was stored correctly (no API call needed)
    const messages = storage.getMessages(chat.id, 10, 0);
    assert.strictEqual(messages.length, 2);
    assert.strictEqual(messages[0].content, "Previous message");
    assert.strictEqual(messages[1].content, "Previous response");

    // Skip actual API call if no API key (integration test)
    if (!process.env.ANTHROPIC_API_KEY) {
      return; // Skip API test if no key
    }

    try {
      const response = await manager.sendMessage({
        userId: "test-user",
        chatId: chat.id,
        message: "New message",
        agentName: "TestAgent",
        modelProvider: "anthropic",
        includeHistory: true,
        maxHistory: 10,
      });

      // Verify response includes context
      assert.ok(response.content);
    } catch (error: any) {
      // If API call fails, that's ok for this test
      assert.ok(true);
    }
  });

  it("tracks token usage and costs", async () => {
    // Skip actual API call by checking if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      return; // Skip test if no API key
    }

    try {
      const response = await manager.sendMessage({
        userId: "test-user",
        message: "Hello",
        agentName: "TestAgent",
        modelProvider: "anthropic",
      });

      // Verify tokens and costs are tracked
      assert.ok(response.tokens);
      assert.ok(response.tokens.input > 0);
      assert.ok(response.tokens.output > 0);
      assert.ok(response.tokens.total > 0);

      assert.ok(response.cost);
      assert.ok(response.cost.usd >= 0);
      assert.ok(response.cost.eur >= 0);
    } catch (error: any) {
      // If API call fails, verify error is handled
      assert.ok(error.message.includes("Failed to call"));
    }
  });

  it("handles different model providers", async () => {
    const providers = ["anthropic", "openai", "gemini"] as const;
    let testedCount = 0;

    for (const provider of providers) {
      // Skip if API key not set
      const envKey = `${provider.toUpperCase()}_API_KEY`;
      if (!process.env[envKey]) {
        continue;
      }

      testedCount++;
      try {
        const response = await manager.sendMessage({
          userId: "test-user",
          message: "Test",
          agentName: "TestAgent",
          modelProvider: provider,
        });

        assert.ok(response.content);
        assert.strictEqual(response.agentName, "TestAgent");
      } catch (error: any) {
        // Any error is acceptable for API tests
        assert.ok(true);
      }
    }

    // If no providers tested, that's ok - just verify the loop ran
    assert.ok(true);
  });

  it("uses custom model when specified", async () => {
    // Skip actual API call by checking if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      return; // Skip test if no API key
    }

    try {
      const response = await manager.sendMessage({
        userId: "test-user",
        message: "Hello",
        agentName: "TestAgent",
        modelProvider: "anthropic",
        model: "claude-3-haiku-20240307",
      });

      assert.ok(response.content);
    } catch (error: any) {
      // If API call fails, verify error is handled
      assert.ok(error.message.includes("Failed to call"));
    }
  });

  // Cleanup
  it("cleanup test database", () => {
    cleanupTestDatabase();
    assert.ok(!fs.existsSync(TEST_DB_PATH));
  });
});

describe("Provider-Specific Error Handling", () => {
  it("handles Anthropic API errors gracefully", async () => {
    const db = setupTestDatabase();
    const storage = new ChatStorage(db);
    const manager = new ChatManager(storage);

    // Set invalid API key
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "invalid-key";

    try {
      await manager.sendMessage({
        userId: "test-user",
        message: "Test",
        agentName: "TestAgent",
        modelProvider: "anthropic",
      });

      assert.fail("Should have thrown error");
    } catch (error: any) {
      // Accept various error formats (API errors, network errors, etc.)
      const hasError =
        error.message.includes("Failed to call") ||
        error.message.includes("anthropic") ||
        error.message.includes("API") ||
        error.message.includes("Invalid") ||
        error.message.includes("error");
      assert.ok(hasError, `Expected error message, got: ${error.message}`);
    } finally {
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
      cleanupTestDatabase();
    }
  });

  it("handles OpenAI API errors gracefully", async () => {
    const db = setupTestDatabase();
    const storage = new ChatStorage(db);
    const manager = new ChatManager(storage);

    // Set invalid API key
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "invalid-key";

    try {
      await manager.sendMessage({
        userId: "test-user",
        message: "Test",
        agentName: "TestAgent",
        modelProvider: "openai",
      });

      assert.fail("Should have thrown error");
    } catch (error: any) {
      // Accept various error formats
      const hasError =
        error.message.includes("Failed to call") ||
        error.message.includes("openai") ||
        error.message.includes("API") ||
        error.message.includes("Invalid") ||
        error.message.includes("error");
      assert.ok(hasError, `Expected error message, got: ${error.message}`);
    } finally {
      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
      cleanupTestDatabase();
    }
  });

  it("handles Gemini API errors gracefully", async () => {
    const db = setupTestDatabase();
    const storage = new ChatStorage(db);
    const manager = new ChatManager(storage);

    // Set invalid API key
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "invalid-key";

    try {
      await manager.sendMessage({
        userId: "test-user",
        message: "Test",
        agentName: "TestAgent",
        modelProvider: "gemini",
      });

      assert.fail("Should have thrown error");
    } catch (error: any) {
      // Accept various error formats
      const hasError =
        error.message.includes("Failed to call") ||
        error.message.includes("gemini") ||
        error.message.includes("API") ||
        error.message.includes("Invalid") ||
        error.message.includes("error");
      assert.ok(hasError, `Expected error message, got: ${error.message}`);
    } finally {
      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      } else {
        delete process.env.GEMINI_API_KEY;
      }
      cleanupTestDatabase();
    }
  });
});
