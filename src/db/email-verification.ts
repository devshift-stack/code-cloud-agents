/**
 * Email Verification Module
 * Handles email verification tokens and validation
 */

import type BetterSqlite3 from "better-sqlite3";
import { randomBytes } from "crypto";

export interface EmailVerificationToken {
  token: string;
  userId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

const TOKEN_EXPIRY_HOURS = 24;

/**
 * Initialize email verification table
 */
export function initEmailVerificationTable(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_verification_user_id ON email_verification_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_email ON email_verification_tokens(email);
    CREATE INDEX IF NOT EXISTS idx_verification_token ON email_verification_tokens(token);
  `);

  console.log("✅ Email verification table initialized");
}

/**
 * Generate verification token
 */
export function generateVerificationToken(
  db: BetterSqlite3.Database,
  userId: string,
  email: string,
): string {
  // Generate secure random token
  const token = randomBytes(32).toString("hex");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();

  // Invalidate old tokens for this user
  const invalidateStmt = db.prepare(`
    UPDATE email_verification_tokens
    SET used_at = ?
    WHERE user_id = ? AND used_at IS NULL
  `);
  invalidateStmt.run(createdAt, userId);

  // Insert new token
  const stmt = db.prepare(`
    INSERT INTO email_verification_tokens (token, user_id, email, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(token, userId, email.toLowerCase(), createdAt, expiresAt);

  return token;
}

/**
 * Verify email with token
 */
export function verifyEmailToken(
  db: BetterSqlite3.Database,
  token: string,
): { success: boolean; userId?: string; error?: string } {
  const stmt = db.prepare(`
    SELECT * FROM email_verification_tokens
    WHERE token = ? AND used_at IS NULL
  `);
  const row = stmt.get(token) as any;

  if (!row) {
    return { success: false, error: "Invalid or expired token" };
  }

  // Check expiration
  const now = new Date();
  const expiresAt = new Date(row.expires_at);

  if (now > expiresAt) {
    return { success: false, error: "Token expired" };
  }

  // Mark token as used
  const usedAt = new Date().toISOString();
  const updateStmt = db.prepare(`
    UPDATE email_verification_tokens
    SET used_at = ?
    WHERE token = ?
  `);
  updateStmt.run(usedAt, token);

  return { success: true, userId: row.user_id };
}

/**
 * Get verification token for user
 */
export function getVerificationToken(
  db: BetterSqlite3.Database,
  userId: string,
): EmailVerificationToken | null {
  const stmt = db.prepare(`
    SELECT * FROM email_verification_tokens
    WHERE user_id = ? AND used_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const row = stmt.get(userId) as any;

  if (!row) return null;

  return {
    token: row.token,
    userId: row.user_id,
    email: row.email,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
  };
}

/**
 * Check if user has verified email
 */
export function isEmailVerified(
  db: BetterSqlite3.Database,
  userId: string,
): boolean {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM email_verification_tokens
    WHERE user_id = ? AND used_at IS NOT NULL
  `);
  const result = stmt.get(userId) as { count: number };

  return result.count > 0;
}

/**
 * Resend verification email (generate new token)
 */
export function resendVerificationToken(
  db: BetterSqlite3.Database,
  userId: string,
  email: string,
): string {
  return generateVerificationToken(db, userId, email);
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export function cleanExpiredTokens(db: BetterSqlite3.Database): number {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    DELETE FROM email_verification_tokens
    WHERE expires_at < ? AND used_at IS NULL
  `);
  const result = stmt.run(now);

  return result.changes;
}
