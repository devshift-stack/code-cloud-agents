/**
 * Rate Limiter Tests
 * Tests for Redis-backed rate limiting with in-memory fallback
 */

import { describe, it, mock } from "node:test";
import assert from "node:assert";
import type { Request, Response, NextFunction } from "express";
import {
  createRateLimiter,
  loginRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
  apiRateLimiter,
  isRedisAvailable,
  getRateLimiterMode,
} from "../src/auth/rate-limiter.ts";

describe("Rate Limiter Module", () => {
  describe("createRateLimiter", () => {
    it("should create a rate limiter middleware function", () => {
      const limiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 60000,
        message: "Too many requests",
        keyPrefix: "test",
      });

      assert.strictEqual(typeof limiter, "function");
    });

    it("should allow requests under the limit", async () => {
      const limiter = createRateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        keyPrefix: "allow-test-" + Date.now(),
      });

      const mockReq = {
        headers: {
          "x-forwarded-for": "192.168.1." + Math.floor(Math.random() * 255),
        },
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

      assert.strictEqual(
        nextCalled,
        true,
        "next() should be called for allowed requests",
      );
    });

    it("should set rate limit headers", async () => {
      const limiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 60000,
        keyPrefix: "header-test-" + Date.now(),
      });

      const mockReq = {
        headers: {
          "x-forwarded-for": "192.168.2." + Math.floor(Math.random() * 255),
        },
        socket: { remoteAddress: "192.168.2.101" },
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

      assert.ok(
        "X-RateLimit-Limit" in headers,
        "Should set X-RateLimit-Limit header",
      );
      assert.ok(
        "X-RateLimit-Remaining" in headers,
        "Should set X-RateLimit-Remaining header",
      );
      assert.ok(
        "X-RateLimit-Reset" in headers,
        "Should set X-RateLimit-Reset header",
      );
    });

    it("should handle array x-forwarded-for header", async () => {
      const limiter = createRateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        keyPrefix: "array-ip-test-" + Date.now(),
      });

      const mockReq = {
        headers: { "x-forwarded-for": ["10.0.0.1", "10.0.0.2"] },
        socket: { remoteAddress: "10.0.0.3" },
      } as unknown as Request;

      const mockRes = {
        setHeader: mock.fn(),
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      } as unknown as Response;

      let nextCalled = false;
      await limiter(mockReq, mockRes, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true, "Should handle array IP");
    });

    it("should use socket.remoteAddress as fallback", async () => {
      const limiter = createRateLimiter({
        maxRequests: 10,
        windowMs: 60000,
        keyPrefix: "socket-ip-test-" + Date.now(),
      });

      const mockReq = {
        headers: {},
        socket: {
          remoteAddress: "172.16.0." + Math.floor(Math.random() * 255),
        },
      } as unknown as Request;

      const mockRes = {
        setHeader: mock.fn(),
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      } as unknown as Response;

      let nextCalled = false;
      await limiter(mockReq, mockRes, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true, "Should use socket IP");
    });
  });

  describe("Rate Limit Presets", () => {
    it("should export loginRateLimiter", () => {
      assert.strictEqual(typeof loginRateLimiter, "function");
    });

    it("should export passwordResetRateLimiter", () => {
      assert.strictEqual(typeof passwordResetRateLimiter, "function");
    });

    it("should export emailVerificationRateLimiter", () => {
      assert.strictEqual(typeof emailVerificationRateLimiter, "function");
    });

    it("should export apiRateLimiter", () => {
      assert.strictEqual(typeof apiRateLimiter, "function");
    });
  });

  describe("Utility Functions", () => {
    it("should export isRedisAvailable function", () => {
      assert.strictEqual(typeof isRedisAvailable, "function");
      const available = isRedisAvailable();
      assert.strictEqual(typeof available, "boolean");
    });

    it("should export getRateLimiterMode function", () => {
      assert.strictEqual(typeof getRateLimiterMode, "function");
      const mode = getRateLimiterMode();
      assert.ok(
        mode === "redis" || mode === "in-memory",
        "Mode should be 'redis' or 'in-memory'",
      );
    });
  });

  describe("Rate Limiting Behavior", () => {
    it("should block requests after limit is exceeded", async () => {
      const uniquePrefix = "block-test-" + Date.now() + "-" + Math.random();
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        message: "Rate limit exceeded",
        keyPrefix: uniquePrefix,
      });

      // Use unique IP for this test
      const testIp = "203.0.113." + Math.floor(Math.random() * 255);
      const mockReq = {
        headers: {},
        socket: { remoteAddress: testIp },
      } as unknown as Request;

      // First 2 requests should pass
      for (let i = 0; i < 2; i++) {
        let passed = false;
        const mockRes = {
          setHeader: mock.fn(),
          status: mock.fn(() => mockRes),
          json: mock.fn(),
        } as unknown as Response;

        await limiter(mockReq, mockRes, () => {
          passed = true;
        });
        assert.strictEqual(passed, true, `Request ${i + 1} should pass`);
      }

      // Third request should be blocked
      let statusCode = 0;
      let responseBody: any = null;
      const mockRes = {
        setHeader: mock.fn(),
        status: (code: number) => {
          statusCode = code;
          return {
            json: (body: any) => {
              responseBody = body;
            },
          };
        },
        json: mock.fn(),
      } as unknown as Response;

      let thirdPassed = false;
      await limiter(mockReq, mockRes, () => {
        thirdPassed = true;
      });

      assert.strictEqual(thirdPassed, false, "Third request should be blocked");
      assert.strictEqual(statusCode, 429, "Should return 429 status");
      assert.ok(responseBody?.error, "Should have error message");
      assert.ok(responseBody?.retryAfter > 0, "Should have retryAfter");
    });

    it("should track different IPs separately", async () => {
      const uniquePrefix = "separate-ip-test-" + Date.now();
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 60000,
        keyPrefix: uniquePrefix,
      });

      // First IP
      const mockReq1 = {
        headers: {},
        socket: { remoteAddress: "1.1.1." + Math.floor(Math.random() * 255) },
      } as unknown as Request;

      // Second IP
      const mockReq2 = {
        headers: {},
        socket: { remoteAddress: "2.2.2." + Math.floor(Math.random() * 255) },
      } as unknown as Request;

      const mockRes = {
        setHeader: mock.fn(),
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      } as unknown as Response;

      // Both IPs should be allowed (first request each)
      let ip1Passed = false;
      let ip2Passed = false;

      await limiter(mockReq1, mockRes, () => {
        ip1Passed = true;
      });

      await limiter(mockReq2, mockRes, () => {
        ip2Passed = true;
      });

      assert.strictEqual(ip1Passed, true, "IP1 should pass");
      assert.strictEqual(ip2Passed, true, "IP2 should pass");
    });
  });

  describe("Response Headers", () => {
    it("should set X-RateLimit-Limit to maxRequests", async () => {
      const maxReqs = 50;
      const limiter = createRateLimiter({
        maxRequests: maxReqs,
        windowMs: 60000,
        keyPrefix: "limit-header-test-" + Date.now(),
      });

      const mockReq = {
        headers: {},
        socket: { remoteAddress: "5.5.5." + Math.floor(Math.random() * 255) },
      } as unknown as Request;

      const headers: Record<string, any> = {};
      const mockRes = {
        setHeader: (name: string, value: any) => {
          headers[name] = value;
        },
        status: mock.fn(() => mockRes),
        json: mock.fn(),
      } as unknown as Response;

      await limiter(mockReq, mockRes, () => {});

      assert.strictEqual(headers["X-RateLimit-Limit"], maxReqs);
    });

    it("should set Retry-After header when rate limited", async () => {
      const uniquePrefix = "retry-after-test-" + Date.now();
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 60000,
        keyPrefix: uniquePrefix,
      });

      const testIp = "6.6.6." + Math.floor(Math.random() * 255);
      const mockReq = {
        headers: {},
        socket: { remoteAddress: testIp },
      } as unknown as Request;

      // Use up the limit
      const mockRes1 = {
        setHeader: mock.fn(),
        status: mock.fn(() => mockRes1),
        json: mock.fn(),
      } as unknown as Response;
      await limiter(mockReq, mockRes1, () => {});

      // Second request should be rate limited
      const headers: Record<string, any> = {};
      const mockRes2 = {
        setHeader: (name: string, value: any) => {
          headers[name] = value;
        },
        status: () => ({
          json: () => {},
        }),
        json: mock.fn(),
      } as unknown as Response;

      await limiter(mockReq, mockRes2, () => {});

      assert.ok(headers["Retry-After"] > 0, "Should set Retry-After header");
    });
  });
});
