/**
 * JWT Authentication Tests
 * Tests for token generation, validation, and auth endpoints
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken,
  isTokenBlacklisted,
  isTokenExpired,
  refreshAccessToken,
  type TokenPayload,
} from "../src/auth/jwt.js";

describe("JWT Token Generation", () => {
  const mockPayload: TokenPayload = {
    userId: "test-user-123",
    role: "user",
    email: "test@example.com",
  };

  it("should generate access token", () => {
    const token = generateAccessToken(mockPayload);
    assert.ok(token);
    assert.strictEqual(typeof token, "string");
    assert.strictEqual(token.split(".").length, 3); // JWT has 3 parts
  });

  it("should generate refresh token", () => {
    const token = generateRefreshToken(mockPayload);
    assert.ok(token);
    assert.strictEqual(typeof token, "string");
    assert.strictEqual(token.split(".").length, 3);
  });

  it("should generate token pair", () => {
    const tokens = generateTokenPair(mockPayload);
    assert.ok(tokens.accessToken);
    assert.ok(tokens.refreshToken);
    assert.strictEqual(tokens.expiresIn, 15 * 60); // 15 minutes
  });

  it("should generate different tokens each time", async () => {
    const token1 = generateAccessToken(mockPayload);
    // Wait 1 second to ensure different iat timestamp
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const token2 = generateAccessToken(mockPayload);
    assert.notStrictEqual(token1, token2); // Different iat timestamps
  });
});

describe("JWT Token Validation", () => {
  const mockPayload: TokenPayload = {
    userId: "test-user-123",
    role: "admin",
    email: "admin@example.com",
  };

  it("should verify valid access token", () => {
    const token = generateAccessToken(mockPayload);
    const decoded = verifyAccessToken(token);

    assert.ok(decoded);
    assert.strictEqual(decoded?.userId, mockPayload.userId);
    assert.strictEqual(decoded?.role, mockPayload.role);
    assert.strictEqual(decoded?.email, mockPayload.email);
  });

  it("should verify valid refresh token", () => {
    const token = generateRefreshToken(mockPayload);
    const decoded = verifyRefreshToken(token);

    assert.ok(decoded);
    assert.strictEqual(decoded?.userId, mockPayload.userId);
    assert.strictEqual(decoded?.role, mockPayload.role);
  });

  it("should reject invalid token", () => {
    const invalidToken = "invalid.token.here";
    const decoded = verifyAccessToken(invalidToken);

    assert.strictEqual(decoded, null);
  });

  it("should reject malformed token", () => {
    const malformedToken = "notavalidjwttoken";
    const decoded = verifyAccessToken(malformedToken);

    assert.strictEqual(decoded, null);
  });

  it("should reject empty token", () => {
    const decoded = verifyAccessToken("");

    assert.strictEqual(decoded, null);
  });
});

describe("JWT Token Revocation", () => {
  it("should blacklist token", () => {
    // Use unique userId to avoid collision with other tests
    const uniquePayload: TokenPayload = {
      userId: "blacklist-test-" + Date.now(),
      role: "user",
    };
    const token = generateAccessToken(uniquePayload);

    assert.strictEqual(isTokenBlacklisted(token), false);

    revokeToken(token);

    assert.strictEqual(isTokenBlacklisted(token), true);
  });

  it("should not verify blacklisted token", () => {
    // Use unique userId to avoid collision with other tests
    const uniquePayload: TokenPayload = {
      userId: "revoke-test-" + Date.now(),
      role: "user",
    };
    const token = generateAccessToken(uniquePayload);

    // Token valid before blacklist
    assert.ok(verifyAccessToken(token));

    // Blacklist token
    revokeToken(token);

    // Token invalid after blacklist
    assert.strictEqual(verifyAccessToken(token), null);
  });

  it("should blacklist multiple tokens", () => {
    const timestamp = Date.now();
    const token1 = generateAccessToken({
      userId: "multi-1-" + timestamp,
      role: "user",
    });
    const token2 = generateAccessToken({
      userId: "multi-2-" + timestamp,
      role: "user",
    });

    revokeToken(token1);
    revokeToken(token2);

    assert.strictEqual(isTokenBlacklisted(token1), true);
    assert.strictEqual(isTokenBlacklisted(token2), true);
  });
});

describe("JWT Token Expiration", () => {
  const mockPayload: TokenPayload = {
    userId: "test-user-123",
    role: "user",
  };

  it("should detect non-expired token", () => {
    const token = generateAccessToken(mockPayload);

    assert.strictEqual(isTokenExpired(token), false);
  });

  it("should handle invalid token in expiration check", () => {
    const invalidToken = "invalid.token";

    assert.strictEqual(isTokenExpired(invalidToken), true);
  });

  // Note: Testing expired tokens is difficult without mocking time
  // In production, you'd use a library like timekeeper or jest.useFakeTimers
});

describe("JWT Token Refresh", () => {
  it("should refresh access token with valid refresh token", async () => {
    const uniquePayload: TokenPayload = {
      userId: "refresh-test-" + Date.now(),
      role: "user",
      email: "test@example.com",
    };
    const oldTokens = generateTokenPair(uniquePayload);

    // Wait to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const newTokens = refreshAccessToken(oldTokens.refreshToken);

    assert.ok(newTokens);
    assert.ok(newTokens?.accessToken);
    assert.ok(newTokens?.refreshToken);
    assert.notStrictEqual(newTokens?.accessToken, oldTokens.accessToken);
    assert.notStrictEqual(newTokens?.refreshToken, oldTokens.refreshToken);
  });

  it("should revoke old refresh token after rotation", () => {
    const uniquePayload: TokenPayload = {
      userId: "rotation-test-" + Date.now(),
      role: "user",
      email: "test@example.com",
    };
    const oldTokens = generateTokenPair(uniquePayload);
    const newTokens = refreshAccessToken(oldTokens.refreshToken);

    assert.ok(newTokens);

    // Old refresh token should be blacklisted
    assert.strictEqual(isTokenBlacklisted(oldTokens.refreshToken), true);

    // Cannot refresh with old token again
    const failedRefresh = refreshAccessToken(oldTokens.refreshToken);
    assert.strictEqual(failedRefresh, null);
  });

  it("should not refresh with invalid token", () => {
    const newTokens = refreshAccessToken("invalid.token");

    assert.strictEqual(newTokens, null);
  });

  it("should not refresh with access token", () => {
    const uniquePayload: TokenPayload = {
      userId: "access-token-test-" + Date.now(),
      role: "user",
    };
    const accessToken = generateAccessToken(uniquePayload);
    const newTokens = refreshAccessToken(accessToken);

    // Access tokens use different secret, so verification fails
    assert.strictEqual(newTokens, null);
  });
});

describe("JWT Middleware Compatibility", () => {
  it("should generate tokens with correct payload structure", () => {
    const payload: TokenPayload = {
      userId: "test-123",
      role: "admin",
      email: "admin@example.com",
    };

    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);

    assert.ok(decoded);
    assert.strictEqual(decoded?.userId, payload.userId);
    assert.strictEqual(decoded?.role, payload.role);
    assert.strictEqual(decoded?.email, payload.email);
  });

  it("should support optional email field", () => {
    const payloadWithoutEmail: TokenPayload = {
      userId: "test-123",
      role: "user",
    };

    const token = generateAccessToken(payloadWithoutEmail);
    const decoded = verifyAccessToken(token);

    assert.strictEqual(decoded?.userId, "test-123");
    assert.strictEqual(decoded?.role, "user");
    assert.strictEqual(decoded?.email, undefined);
  });

  it("should preserve role as admin", () => {
    const adminPayload: TokenPayload = {
      userId: "admin-123",
      role: "admin",
    };

    const token = generateAccessToken(adminPayload);
    const decoded = verifyAccessToken(token);

    assert.strictEqual(decoded?.role, "admin");
  });

  it("should preserve role as user", () => {
    const userPayload: TokenPayload = {
      userId: "user-123",
      role: "user",
    };

    const token = generateAccessToken(userPayload);
    const decoded = verifyAccessToken(token);

    assert.strictEqual(decoded?.role, "user");
  });
});

// Note: Auth endpoint tests would go in a separate integration test file
// that starts the actual Express server and tests the HTTP endpoints
// These unit tests focus on the JWT logic itself
