/**
 * Demo System Types
 */

export interface CreateInviteRequest {
  creditLimitUSD: number;
  maxMessages: number;
  maxDays: number;
  expiresAt?: string | null;
}

export interface RedeemInviteRequest {
  code: string;
  email: string;
  password: string;
}
