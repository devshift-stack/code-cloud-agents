/**
 * JWT Authentication System
 * Handles token generation, validation, and revocation
 */

import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

// Token blacklist (in-memory for now, should be Redis in production)
const tokenBlacklist = new Set<string>();

// User token registry (tracks active tokens per user for revokeAllUserTokens)
const userTokens = new Map<string, Set<string>>();

/**
 * Register a token for a user (for tracking/revocation)
 */
function registerUserToken(userId: string, token: string): void {
  if (!userTokens.has(userId)) {
    userTokens.set(userId, new Set());
  }
  userTokens.get(userId)!.add(token);
}

/**
 * Unregister a token for a user
 */
export function unregisterUserToken(userId: string, token: string): void {
  const tokens = userTokens.get(userId);
  if (tokens) {
    tokens.delete(token);
    if (tokens.size === 0) {
      userTokens.delete(userId);
    }
  }
}

export interface TokenPayload {
  userId: string;
  role: "admin" | "user" | "demo";
  email?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  const secret = process.env.JWT_SECRET || "dev-secret-change-in-production";

  return jwt.sign(payload, secret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: "code-cloud-agents",
    audience: "cloud-agents-api",
  });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  const secret =
    process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production";

  // Add random jti (JWT ID) for token rotation
  const jti = randomBytes(16).toString("hex");

  return jwt.sign({ ...payload, jti }, secret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: "code-cloud-agents",
    audience: "cloud-agents-api",
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: TokenPayload): TokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Register tokens for user tracking (enables revokeAllUserTokens)
  registerUserToken(payload.userId, accessToken);
  registerUserToken(payload.userId, refreshToken);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const secret = process.env.JWT_SECRET || "dev-secret-change-in-production";

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }

    const decoded = jwt.verify(token, secret, {
      issuer: "code-cloud-agents",
      audience: "cloud-agents-api",
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    // Token invalid, expired, or malformed
    return null;
  }
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const secret =
      process.env.JWT_REFRESH_SECRET ||
      "dev-refresh-secret-change-in-production";

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }

    const decoded = jwt.verify(token, secret, {
      issuer: "code-cloud-agents",
      audience: "cloud-agents-api",
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    // Token invalid, expired, or malformed
    return null;
  }
}

/**
 * Revoke token (add to blacklist)
 */
export function revokeToken(token: string): void {
  tokenBlacklist.add(token);
}

/**
 * Revoke all tokens for a user (logout all sessions)
 * Adds all user's tokens to the blacklist and clears tracking
 */
export function revokeAllUserTokens(userId: string): number {
  const tokens = userTokens.get(userId);
  if (!tokens || tokens.size === 0) {
    return 0;
  }

  // Add all tokens to blacklist
  let count = 0;
  for (const token of tokens) {
    tokenBlacklist.add(token);
    count++;
  }

  // Clear user's token registry
  userTokens.delete(userId);

  console.log(`[JWT] Revoked ${count} tokens for user: ${userId}`);
  return count;
}

/**
 * Check if token is blacklisted
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Clear expired tokens from blacklist
 * Should be called periodically (e.g., via cron job)
 */
export function clearExpiredTokens(): void {
  // Note: This is a simplified implementation
  // In production with Redis, you'd set TTL on blacklisted tokens
  // For in-memory, we can't easily determine expiry, so this is a no-op
  // Consider implementing with token metadata if needed
}

/**
 * Get token expiry time
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    return decoded?.exp || null;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;

  const now = Math.floor(Date.now() / 1000);
  return now >= expiry;
}

/**
 * Refresh access token using refresh token
 */
export function refreshAccessToken(refreshToken: string): TokenPair | null {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return null;

  // Revoke old refresh token (token rotation)
  revokeToken(refreshToken);

  // Generate new token pair
  return generateTokenPair({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  });
}
