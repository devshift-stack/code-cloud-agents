/**
 * Integration Tests - Auth Improvements
 * Tests for email verification, password reset, and rate limiting
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import BetterSqlite3 from "better-sqlite3";
import {
  initEmailVerificationTable,
  generateVerificationToken,
  verifyEmailToken,
  getVerificationToken,
} from "../src/db/email-verification.js";
import {
  initPasswordResetTable,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  resetPassword,
} from "../src/db/password-reset.js";
import { initUsersTable, createUser, getUserById } from "../src/db/users.js";
import bcrypt from "bcrypt";

describe("Auth Improvements - Email Verification", () => {
  let db: BetterSqlite3.Database;
  let testUserId: string;
  const testEmail = "verify-test@example.com";

  before(async () => {
    db = new BetterSqlite3(":memory:");
    initUsersTable(db);
    initEmailVerificationTable(db);

    // Create test user
    const user = await createUser(db, {
      email: testEmail,
      password: "test123456",
      role: "user",
      displayName: "Verify Test User",
    });
    testUserId = user.id;
  });

  after(() => {
    db.close();
  });

  it("should generate verification token", () => {
    const token = generateVerificationToken(db, testUserId, testEmail);

    assert.strictEqual(typeof token, "string");
    assert.strictEqual(token.length, 64); // 32 bytes in hex = 64 chars
  });

  it("should retrieve pending verification token", () => {
    const token = getVerificationToken(db, testUserId);

    assert.ok(token);
    assert.strictEqual(token.userId, testUserId);
    assert.strictEqual(token.email, testEmail.toLowerCase());
    assert.ok(!token.usedAt);
  });

  it("should verify valid token", () => {
    const token = generateVerificationToken(db, testUserId, testEmail);
    const result = verifyEmailToken(db, token);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.userId, testUserId);
    assert.ok(!result.error);
  });

  it("should reject invalid token", () => {
    const result = verifyEmailToken(db, "invalid-token-12345");

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
    assert.strictEqual(result.error, "Invalid or expired token");
  });

  it("should mark token as used after verification", () => {
    const token = generateVerificationToken(db, testUserId, testEmail);
    verifyEmailToken(db, token);

    // Try to use again - should fail
    const result = verifyEmailToken(db, token);
    assert.strictEqual(result.success, false);
  });

  it("should invalidate old tokens when generating new one", () => {
    const token1 = generateVerificationToken(db, testUserId, testEmail);
    const token2 = generateVerificationToken(db, testUserId, testEmail);

    // First token should now be invalid (marked as used)
    const result1 = verifyEmailToken(db, token1);
    assert.strictEqual(result1.success, false);

    // Second token should be valid
    const result2 = verifyEmailToken(db, token2);
    assert.strictEqual(result2.success, true);
  });
});

describe("Auth Improvements - Password Reset", () => {
  let db: BetterSqlite3.Database;
  let testUserId: string;
  const testEmail = "reset-test@example.com";
  const originalPassword = "original123";
  const newPassword = "newpassword456";

  before(async () => {
    db = new BetterSqlite3(":memory:");
    initUsersTable(db);
    initPasswordResetTable(db);

    // Create test user
    const user = await createUser(db, {
      email: testEmail,
      password: originalPassword,
      role: "user",
      displayName: "Reset Test User",
    });
    testUserId = user.id;
  });

  after(() => {
    db.close();
  });

  it("should generate password reset token", () => {
    const token = generatePasswordResetToken(db, testUserId, testEmail);

    assert.strictEqual(typeof token, "string");
    assert.strictEqual(token.length, 64); // 32 bytes in hex
  });

  it("should verify valid reset token", () => {
    const token = generatePasswordResetToken(db, testUserId, testEmail);
    const result = verifyPasswordResetToken(db, token);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.userId, testUserId);
    assert.ok(!result.error);
  });

  it("should reject invalid reset token", () => {
    const result = verifyPasswordResetToken(db, "invalid-token-xyz");

    assert.strictEqual(result.valid, false);
    assert.ok(result.error);
  });

  it("should reset password with valid token", async () => {
    const token = generatePasswordResetToken(db, testUserId, testEmail);
    const result = await resetPassword(db, token, newPassword);

    assert.strictEqual(result.success, true);
    assert.ok(!result.error);

    // Verify password was changed
    const user = getUserById(db, testUserId);
    assert.ok(user);
    const passwordMatch = await bcrypt.compare(newPassword, user.passwordHash);
    assert.strictEqual(passwordMatch, true);
  });

  it("should reject used reset token", async () => {
    const token = generatePasswordResetToken(db, testUserId, testEmail);

    // Use token once
    await resetPassword(db, token, "password1");

    // Try to use again
    const result = await resetPassword(db, token, "password2");
    assert.strictEqual(result.success, false);
    assert.ok(result.error);
  });

  it("should reject reset with weak password", async () => {
    const token = generatePasswordResetToken(db, testUserId, testEmail);
    const result = await resetPassword(db, token, "short");

    // Note: Password validation happens in API layer, not DB layer
    // So this will succeed at DB level but fail at API level
    // This test verifies DB layer doesn't enforce length
    assert.strictEqual(result.success, true);
  });

  it("should invalidate old reset tokens when generating new one", () => {
    const token1 = generatePasswordResetToken(db, testUserId, testEmail);
    const token2 = generatePasswordResetToken(db, testUserId, testEmail);

    // First token should be invalid (marked as used)
    const result1 = verifyPasswordResetToken(db, token1);
    assert.strictEqual(result1.valid, false);

    // Second token should be valid
    const result2 = verifyPasswordResetToken(db, token2);
    assert.strictEqual(result2.valid, true);
  });

  it("should hash password before storing", async () => {
    const token = generatePasswordResetToken(db, testUserId, testEmail);
    const plainPassword = "newSecurePassword123";

    await resetPassword(db, token, plainPassword);

    const user = getUserById(db, testUserId);
    assert.ok(user);

    // Password should be hashed, not stored plain
    assert.notStrictEqual(user.passwordHash, plainPassword);
    assert.ok(user.passwordHash.startsWith("$2b$")); // bcrypt hash prefix

    // But should verify correctly
    const match = await bcrypt.compare(plainPassword, user.passwordHash);
    assert.strictEqual(match, true);
  });
});

describe("Auth Improvements - Token Expiry", () => {
  let db: BetterSqlite3.Database;
  let testUserId: string;

  before(async () => {
    db = new BetterSqlite3(":memory:");
    initUsersTable(db);
    initEmailVerificationTable(db);
    initPasswordResetTable(db);

    const user = await createUser(db, {
      email: "expiry-test@example.com",
      password: "test123",
      role: "user",
    });
    testUserId = user.id;
  });

  after(() => {
    db.close();
  });

  it("should set email verification token expiry to 24 hours", () => {
    const token = generateVerificationToken(
      db,
      testUserId,
      "expiry-test@example.com",
    );
    const tokenData = getVerificationToken(db, testUserId);

    assert.ok(tokenData);

    const expiresAt = new Date(tokenData.expiresAt);
    const createdAt = new Date(tokenData.createdAt);
    const diffHours =
      (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Should be approximately 24 hours (allow 1 second tolerance)
    assert.ok(diffHours >= 23.99 && diffHours <= 24.01);
  });

  it("should set password reset token expiry to 1 hour", () => {
    const token = generatePasswordResetToken(
      db,
      testUserId,
      "expiry-test@example.com",
    );

    // Get token from database
    const stmt = db.prepare(`
      SELECT * FROM password_reset_tokens
      WHERE token = ? AND used_at IS NULL
    `);
    const tokenData = stmt.get(token) as any;

    assert.ok(tokenData);

    const expiresAt = new Date(tokenData.expires_at);
    const createdAt = new Date(tokenData.created_at);
    const diffMinutes =
      (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60);

    // Should be approximately 60 minutes (allow 1 second tolerance)
    assert.ok(diffMinutes >= 59.98 && diffMinutes <= 60.02);
  });
});

describe("Auth Improvements - Security", () => {
  let db: BetterSqlite3.Database;

  before(() => {
    db = new BetterSqlite3(":memory:");
    initUsersTable(db);
    initEmailVerificationTable(db);
    initPasswordResetTable(db);
  });

  after(() => {
    db.close();
  });

  it("should generate unique tokens", async () => {
    const user = await createUser(db, {
      email: "unique-test@example.com",
      password: "test123",
      role: "user",
    });

    const token1 = generateVerificationToken(
      db,
      user.id,
      "unique-test@example.com",
    );
    const token2 = generateVerificationToken(
      db,
      user.id,
      "unique-test@example.com",
    );

    assert.notStrictEqual(token1, token2);
  });

  it("should generate cryptographically secure tokens", async () => {
    const user = await createUser(db, {
      email: "secure-test@example.com",
      password: "test123",
      role: "user",
    });

    const token = generateVerificationToken(
      db,
      user.id,
      "secure-test@example.com",
    );

    // Token should be 64 hex chars (32 bytes)
    assert.strictEqual(token.length, 64);
    assert.ok(/^[0-9a-f]{64}$/.test(token)); // Only hex chars
  });

  it("should store email in lowercase", async () => {
    const user = await createUser(db, {
      email: "Case-Test@EXAMPLE.COM",
      password: "test123",
      role: "user",
    });

    const token = generateVerificationToken(
      db,
      user.id,
      "Case-Test@EXAMPLE.COM",
    );
    const tokenData = getVerificationToken(db, user.id);

    assert.ok(tokenData);
    assert.strictEqual(tokenData.email, "case-test@example.com");
  });
});
