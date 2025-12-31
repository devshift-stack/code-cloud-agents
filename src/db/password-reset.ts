/**
 * Password Reset Module
 * Token-based password reset system
 */

import type BetterSqlite3 from "better-sqlite3";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";

const TOKEN_EXPIRY_HOURS = 1; // Password reset tokens expire after 1 hour
const SALT_ROUNDS = 10;

/**
 * Initialize password reset table
 */
export function initPasswordResetTable(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reset_user_id ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token);
  `);

  console.log("✅ Password reset table initialized");
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(
  db: BetterSqlite3.Database,
  userId: string,
  email: string,
): string {
  const token = randomBytes(32).toString("hex");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();

  // Invalidate old tokens
  const invalidateStmt = db.prepare(`
    UPDATE password_reset_tokens
    SET used_at = ?
    WHERE user_id = ? AND used_at IS NULL
  `);
  invalidateStmt.run(createdAt, userId);

  // Insert new token
  const stmt = db.prepare(`
    INSERT INTO password_reset_tokens (token, user_id, email, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(token, userId, email.toLowerCase(), createdAt, expiresAt);

  return token;
}

/**
 * Verify password reset token
 */
export function verifyPasswordResetToken(
  db: BetterSqlite3.Database,
  token: string,
): { valid: boolean; userId?: string; error?: string } {
  const stmt = db.prepare(`
    SELECT * FROM password_reset_tokens
    WHERE token = ? AND used_at IS NULL
  `);
  const row = stmt.get(token) as any;

  if (!row) {
    return { valid: false, error: "Invalid or expired token" };
  }

  // Check expiration
  const now = new Date();
  const expiresAt = new Date(row.expires_at);

  if (now > expiresAt) {
    return { valid: false, error: "Token expired" };
  }

  return { valid: true, userId: row.user_id };
}

/**
 * Reset password with token
 */
export async function resetPassword(
  db: BetterSqlite3.Database,
  token: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  // Verify token
  const verification = verifyPasswordResetToken(db, token);

  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const updatedAt = new Date().toISOString();

  // Update password
  const updateStmt = db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = ?
    WHERE id = ?
  `);
  updateStmt.run(passwordHash, updatedAt, verification.userId);

  // Mark token as used
  const markStmt = db.prepare(`
    UPDATE password_reset_tokens
    SET used_at = ?
    WHERE token = ?
  `);
  markStmt.run(updatedAt, token);

  return { success: true };
}
