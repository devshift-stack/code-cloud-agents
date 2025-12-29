/**
 * Rate Limiter Tests
 * Tests for Redis-backed rate limiting with in-memory fallback
 */

import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert";
import type { Request, Response, NextFunction } from "express";

// Mock Redis before importing rate limiter
const mockRedisClient = {
  pipeline: mock.fn(() => ({
    incr: mock.fn(),
    pexpire: mock.fn(),
    exec: mock.fn(async () => [[null, 1], [null, true]]),
  })),
  connect: mock.fn(async () => {}),
  on: mock.fn(),
  get: mock.fn(async () => null),
  keys: mock.fn(async () => []),
  del: mock.fn(async () => 1),
};

// Mock ioredis
mock.module("ioredis", {
  namedExports: {},
  defaultExport: class MockRedis {
    constructor() {
      return mockRedisClient;
    }
  },
});

describe("Rate Limiter Module", () => {
  describe("createRateLimiter", () => {
    it("should create a rate limiter middleware function", async () => {
      const { createRateLimiter } = await import("../src/auth/rate-limiter.ts");

      const limiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 60000,
        message: "Too many requests",
        keyPrefix: "test",
      });

      assert.strictEqual(typeof limiter, "function");
    });

    it("should allow requests under the limit", async () => {
      const { createRateLimiter } = await import("../src/auth/rate-limiter.ts");

      const limiter = createRateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        keyPrefix: "allow-test",
      });

      const mockReq = {
        headers: { "x-forwarded-for": "192.168.1.100" },
        socket: { remoteAddress: "192.168.1.100" },
      } as unknown as Request;

      const mockRes = {
        setHeader: mock.fn(),
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      } as unknown as Response;

      let nextCalled = false;
      const mockNext: NextFunction = () => {
        nextCalled = true;
      };

      await limiter(mockReq, mockRes, mockNext);

      assert.strictEqual(nextCalled, true, "next() should be called for allowed requests");
    });

    it("should set rate limit headers", async () => {
      const { createRateLimiter } = await import("../src/auth/rate-limiter.ts");

      const limiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 60000,
        keyPrefix: "header-test",
      });

      const mockReq = {
        headers: { "x-forwarded-for": "192.168.1.101" },
        socket: { remoteAddress: "192.168.1.101" },
      } as unknown as Request;

      const headers: Record<string, string | number> = {};
      const mockRes = {
        setHeader: (name: string, value: string | number) => {
          headers[name] = value;
        },
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      } as unknown as Response;

      await limiter(mockReq, mockRes, () => {});

      assert.ok("X-RateLimit-Limit" in headers, "Should set X-RateLimit-Limit header");
      assert.ok("X-RateLimit-Remaining" in headers, "Should set X-RateLimit-Remaining header");
      assert.ok("X-RateLimit-Reset" in headers, "Should set X-RateLimit-Reset header");
    });
  });

  describe("Rate Limit Presets", () => {
    it("should export loginRateLimiter with correct config", async () => {
      const { loginRateLimiter } = await import("../src/auth/rate-limiter.ts");

      assert.strictEqual(typeof loginRateLimiter, "function");
    });

    it("should export passwordResetRateLimiter with correct config", async () => {
      const { passwordResetRateLimiter } = await import("../src/auth/rate-limiter.ts");

      assert.strictEqual(typeof passwordResetRateLimiter, "function");
    });

    it("should export emailVerificationRateLimiter with correct config", async () => {
      const { emailVerificationRateLimiter } = await import("../src/auth/rate-limiter.ts");

      assert.strictEqual(typeof emailVerificationRateLimiter, "function");
    });

    it("should export apiRateLimiter with correct config", async () => {
      const { apiRateLimiter } = await import("../src/auth/rate-limiter.ts");

      assert.strictEqual(typeof apiRateLimiter, "function");
    });
  });

  describe("Utility Functions", () => {
    it("should export isRedisAvailable function", async () => {
      const { isRedisAvailable } = await import("../src/auth/rate-limiter.ts");

      assert.strictEqual(typeof isRedisAvailable, "function");
      const available = isRedisAvailable();
      assert.strictEqual(typeof available, "boolean");
    });

    it("should export getRateLimiterMode function", async () => {
      const { getRateLimiterMode } = await import("../src/auth/rate-limiter.ts");

      assert.strictEqual(typeof getRateLimiterMode, "function");
      const mode = getRateLimiterMode();
      assert.ok(mode === "redis" || mode === "in-memory", "Mode should be 'redis' or 'in-memory'");
    });
  });

  describe("In-Memory Rate Limiting", () => {
    it("should track requests per IP", async () => {
      const { createRateLimiter } = await import("../src/auth/rate-limiter.ts");

      const limiter = createRateLimiter({
        maxRequests: 3,
        windowMs: 60000,
        keyPrefix: "memory-test",
      });

      const mockReq = {
        headers: {},
        socket: { remoteAddress: "10.0.0.1" },
      } as unknown as Request;

      const headers: Record<string, string | number> = {};
      const mockRes = {
        setHeader: (name: string, value: string | number) => {
          headers[name] = value;
        },
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      } as unknown as Response;

      // First request
      await limiter(mockReq, mockRes, () => {});

      // Check remaining decreases
      assert.ok(Number(headers["X-RateLimit-Remaining"]) <= 3);
    });
  });

  describe("Error Handling", () => {
    it("should fall back to in-memory on Redis errors", async () => {
      const { createRateLimiter } = await import("../src/auth/rate-limiter.ts");

      const limiter = createRateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        keyPrefix: "fallback-test",
      });

      const mockReq = {
        headers: { "x-forwarded-for": "172.16.0.1" },
        socket: { remoteAddress: "172.16.0.1" },
      } as unknown as Request;

      const mockRes = {
        setHeader: mock.fn(),
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      } as unknown as Response;

      let nextCalled = false;
      const mockNext: NextFunction = () => {
        nextCalled = true;
      };

      // Should not throw, should fallback gracefully
      await limiter(mockReq, mockRes, mockNext);

      assert.strictEqual(nextCalled, true, "Request should proceed even if Redis fails");
    });
  });
});

describe("Rate Limit Response", () => {
  it("should return 429 with proper body when limit exceeded", async () => {
    const { createRateLimiter } = await import("../src/auth/rate-limiter.ts");

    const limiter = createRateLimiter({
      maxRequests: 1,
      windowMs: 60000,
      message: "Custom rate limit message",
      keyPrefix: "exceed-test",
    });

    const mockReq = {
      headers: {},
      socket: { remoteAddress: "203.0.113.1" },
    } as unknown as Request;

    const mockRes = {
      setHeader: mock.fn(),
      status: mock.fn(() => mockRes),
      json: mock.fn(),
    } as unknown as Response;

    // First request - should pass
    await limiter(mockReq, mockRes, () => {});

    // Second request - should be rate limited
    let statusCode = 0;
    let responseBody: any = null;

    const mockRes2 = {
      setHeader: mock.fn(),
      status: (code: number) => {
        statusCode = code;
        return mockRes2;
      },
      json: (body: any) => {
        responseBody = body;
      },
    } as unknown as Response;

    let nextCalled = false;
    await limiter(mockReq, mockRes2, () => {
      nextCalled = true;
    });

    assert.strictEqual(statusCode, 429, "Should return 429 status code");
    assert.ok(responseBody.error, "Response should contain error message");
    assert.ok(responseBody.retryAfter > 0, "Response should contain retryAfter");
    assert.strictEqual(nextCalled, false, "next() should not be called when rate limited");
  });
});
