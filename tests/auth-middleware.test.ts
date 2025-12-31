/**
 * Authentication & Authorization Middleware Tests
 *
 * Tests for admin access control and authentication
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import type { Response, NextFunction } from "express";
import {
  requireAdmin,
  requireAuth,
  requireCronAuth,
  optionalAuth,
  type AuthenticatedRequest,
} from "../src/auth/middleware.ts";

// Mock Response object
function createMockResponse() {
  let statusCode = 200;
  let jsonData: any = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      jsonData = data;
      return this;
    },
    getStatus() {
      return statusCode;
    },
    getJson() {
      return jsonData;
    },
  } as unknown as Response;

  return res as Response & { getStatus: () => number; getJson: () => any };
}

// Mock NextFunction
function createMockNext() {
  let called = false;
  const next = (() => {
    called = true;
  }) as NextFunction;

  (next as any).wasCalled = () => called;
  return next as NextFunction & { wasCalled: () => boolean };
}

// Mock Request
function createMockRequest(
  headers: Record<string, string> = {},
): AuthenticatedRequest {
  return {
    headers,
  } as AuthenticatedRequest;
}

describe("requireAdmin middleware", () => {
  it("blocks requests without x-user-id header", () => {
    const req = createMockRequest({});
    const res = createMockResponse();
    const next = createMockNext();

    requireAdmin(req, res, next);

    assert.strictEqual(res.getStatus(), 401);
    assert.strictEqual(res.getJson().code, "UNAUTHORIZED");
    assert.strictEqual(next.wasCalled(), false);
  });

  it("blocks requests with non-admin role", () => {
    const req = createMockRequest({
      "x-user-id": "user123",
      "x-user-role": "user",
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireAdmin(req, res, next);

    assert.strictEqual(res.getStatus(), 403);
    assert.strictEqual(res.getJson().code, "FORBIDDEN");
    assert.strictEqual(res.getJson().role, "user");
    assert.strictEqual(next.wasCalled(), false);
  });

  it("blocks demo users", () => {
    const req = createMockRequest({
      "x-user-id": "demo123",
      "x-user-role": "demo",
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireAdmin(req, res, next);

    assert.strictEqual(res.getStatus(), 403);
    assert.strictEqual(res.getJson().code, "FORBIDDEN");
    assert.strictEqual(next.wasCalled(), false);
  });

  it("allows admin users and sets request properties", () => {
    const req = createMockRequest({
      "x-user-id": "admin123",
      "x-user-role": "admin",
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireAdmin(req, res, next);

    assert.strictEqual(next.wasCalled(), true);
    assert.strictEqual(req.userId, "admin123");
    assert.strictEqual(req.userRole, "admin");
    assert.strictEqual(req.isAdmin, true);
  });
});

describe("requireAuth middleware", () => {
  it("blocks unauthenticated requests", () => {
    const req = createMockRequest({});
    const res = createMockResponse();
    const next = createMockNext();

    requireAuth(req, res, next);

    assert.strictEqual(res.getStatus(), 401);
    assert.strictEqual(res.getJson().code, "UNAUTHORIZED");
    assert.strictEqual(next.wasCalled(), false);
  });

  it("allows authenticated users", () => {
    const req = createMockRequest({
      "x-user-id": "user123",
      "x-user-role": "user",
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireAuth(req, res, next);

    assert.strictEqual(next.wasCalled(), true);
    assert.strictEqual(req.userId, "user123");
    assert.strictEqual(req.userRole, "user");
    assert.strictEqual(req.isAdmin, false);
  });

  it("allows demo users", () => {
    const req = createMockRequest({
      "x-user-id": "demo123",
      "x-user-role": "demo",
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireAuth(req, res, next);

    assert.strictEqual(next.wasCalled(), true);
    assert.strictEqual(req.userId, "demo123");
    assert.strictEqual(req.userRole, "demo");
    assert.strictEqual(req.isAdmin, false);
  });

  it("allows admin users and marks them as admin", () => {
    const req = createMockRequest({
      "x-user-id": "admin123",
      "x-user-role": "admin",
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireAuth(req, res, next);

    assert.strictEqual(next.wasCalled(), true);
    assert.strictEqual(req.userId, "admin123");
    assert.strictEqual(req.userRole, "admin");
    assert.strictEqual(req.isAdmin, true);
  });
});

describe("optionalAuth middleware", () => {
  it("allows requests without authentication", () => {
    const req = createMockRequest({});
    const res = createMockResponse();
    const next = createMockNext();

    optionalAuth(req, res, next);

    assert.strictEqual(next.wasCalled(), true);
    assert.strictEqual(req.userId, undefined);
  });

  it("adds user info when authenticated", () => {
    const req = createMockRequest({
      "x-user-id": "user123",
      "x-user-role": "user",
    });
    const res = createMockResponse();
    const next = createMockNext();

    optionalAuth(req, res, next);

    assert.strictEqual(next.wasCalled(), true);
    assert.strictEqual(req.userId, "user123");
    assert.strictEqual(req.userRole, "user");
  });
});

describe("requireCronAuth middleware", () => {
  it("blocks requests without API key", () => {
    const req = createMockRequest({});
    const res = createMockResponse();
    const next = createMockNext();

    requireCronAuth(req, res, next);

    assert.strictEqual(res.getStatus(), 401);
    assert.strictEqual(res.getJson().code, "UNAUTHORIZED");
    assert.strictEqual(next.wasCalled(), false);
  });

  it("blocks requests with invalid API key", () => {
    const req = createMockRequest({
      "x-api-key": "wrong-key",
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireCronAuth(req, res, next);

    assert.strictEqual(res.getStatus(), 403);
    assert.strictEqual(res.getJson().code, "FORBIDDEN");
    assert.strictEqual(next.wasCalled(), false);
  });

  it("allows requests with valid API key", () => {
    const req = createMockRequest({
      "x-api-key": "dev-cron-key-change-in-production",
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireCronAuth(req, res, next);

    assert.strictEqual(next.wasCalled(), true);
  });

  it("allows requests with environment-configured API key", () => {
    // Set environment variable
    const originalKey = process.env.CRON_API_KEY;
    process.env.CRON_API_KEY = "test-cron-key-123";

    const req = createMockRequest({
      "x-api-key": "test-cron-key-123",
    });
    const res = createMockResponse();
    const next = createMockNext();

    requireCronAuth(req, res, next);

    assert.strictEqual(next.wasCalled(), true);

    // Restore original
    process.env.CRON_API_KEY = originalKey;
  });
});
