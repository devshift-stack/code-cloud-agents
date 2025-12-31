/**
 * Webhook Security - Signature generation and verification
 */

import { createHmac } from "crypto";

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function signPayload(payload: unknown, secret: string): string {
  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const hmac = createHmac("sha256", secret);
  hmac.update(payloadString);
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = signPayload(payload, secret);
  return signature === expectedSignature;
}

/**
 * Generate a secure random webhook secret
 */
export function generateSecret(length = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let secret = "";

  // Use Node.js crypto in Node environment, Web Crypto API in browser
  const crypto = globalThis.crypto;

  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  for (let i = 0; i < length; i++) {
    secret += chars[bytes[i] % chars.length];
  }

  return secret;
}
