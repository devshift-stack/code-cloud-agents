/**
 * Demo Invite Manager
 *
 * Manages demo user invitations and redemptions
 */

import type { Database } from "../db/database.ts";
import type { CreateInviteRequest, RedeemInviteRequest } from "./types.ts";

export interface DemoInvite {
  code: string;
  creditLimitUSD: number;
  maxMessages: number;
  maxDays: number;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  redeemedBy: string | null;
  redeemedAt: string | null;
  status: "active" | "redeemed" | "expired";
}

export interface DemoUser {
  id: string;
  email: string;
  inviteCode: string;
  credits: {
    limitUSD: number;
    usedUSD: number;
    remainingUSD: number;
    percentageUsed: number;
  };
  messages: {
    limit: number;
    used: number;
    remaining: number;
    percentageUsed: number;
  };
  validity: {
    startDate: string;
    endDate: string;
    daysRemaining: number;
    percentageUsed: number;
  };
  status: "active" | "expired" | "suspended";
}

export class DemoInviteManager {
  constructor(private db: Database) {}

  /**
   * Create a new demo invite
   */
  createInvite(adminUserId: string, request: CreateInviteRequest): DemoInvite {
    const code = this.generateInviteCode();
    const createdAt = new Date().toISOString();
    const expiresAt = request.expiresAt || null;

    const rawDb = this.db.getRawDb();

    rawDb
      .prepare(
        `
      INSERT INTO demo_invites (code, credit_limit_usd, max_messages, max_days, created_by, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        code,
        request.creditLimitUSD,
        request.maxMessages,
        request.maxDays,
        adminUserId,
        createdAt,
        expiresAt,
      );

    return {
      code,
      creditLimitUSD: request.creditLimitUSD,
      maxMessages: request.maxMessages,
      maxDays: request.maxDays,
      createdBy: adminUserId,
      createdAt,
      expiresAt,
      redeemedBy: null,
      redeemedAt: null,
      status: "active",
    };
  }

  /**
   * Get invite by code
   */
  getInvite(code: string): DemoInvite | null {
    const rawDb = this.db.getRawDb();

    const row = rawDb
      .prepare(
        `
      SELECT * FROM demo_invites WHERE code = ?
    `,
      )
      .get(code) as any;

    if (!row) return null;

    return {
      code: row.code,
      creditLimitUSD: row.credit_limit_usd,
      maxMessages: row.max_messages,
      maxDays: row.max_days,
      createdBy: row.created_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      redeemedBy: row.redeemed_by,
      redeemedAt: row.redeemed_at,
      status: this.getInviteStatus(row),
    };
  }

  /**
   * Redeem an invite
   */
  redeemInvite(request: RedeemInviteRequest, passwordHash: string): DemoUser {
    const invite = this.getInvite(request.code);

    if (!invite) {
      throw new Error("Invalid invite code");
    }

    if (invite.status !== "active") {
      throw new Error(`Invite is ${invite.status}`);
    }

    const userId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const startDate = new Date().toISOString();
    const endDate = new Date(
      Date.now() + invite.maxDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const redeemedAt = new Date().toISOString();

    const rawDb = this.db.getRawDb();

    // Create demo user
    rawDb
      .prepare(
        `
      INSERT INTO demo_users (
        id, email, password_hash, invite_code,
        credit_limit_usd, credit_used_usd,
        message_limit, message_count,
        start_date, end_date,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        userId,
        request.email,
        passwordHash,
        request.code,
        invite.creditLimitUSD,
        0,
        invite.maxMessages,
        0,
        startDate,
        endDate,
        "active",
      );

    // Mark invite as redeemed
    rawDb
      .prepare(
        `
      UPDATE demo_invites
      SET redeemed_by = ?, redeemed_at = ?
      WHERE code = ?
    `,
      )
      .run(userId, redeemedAt, request.code);

    return this.getUser(userId)!;
  }

  /**
   * Get demo user by ID
   */
  getUser(userId: string): DemoUser | null {
    const rawDb = this.db.getRawDb();

    const row = rawDb
      .prepare(
        `
      SELECT * FROM demo_users WHERE id = ?
    `,
      )
      .get(userId) as any;

    if (!row) return null;

    const now = Date.now();
    const endTime = new Date(row.end_date).getTime();
    const startTime = new Date(row.start_date).getTime();
    const totalDuration = endTime - startTime;
    const elapsed = now - startTime;
    const daysRemaining = Math.max(
      0,
      Math.ceil((endTime - now) / (24 * 60 * 60 * 1000)),
    );

    const creditLimit = row.credit_limit_usd;
    const creditUsed = row.credit_used_usd;
    const creditRemaining = Math.max(0, creditLimit - creditUsed);
    const creditPercentage =
      creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;

    const messageLimit = row.message_limit;
    const messageUsed = row.message_count;
    const messageRemaining = Math.max(0, messageLimit - messageUsed);
    const messagePercentage =
      messageLimit > 0 ? (messageUsed / messageLimit) * 100 : 0;

    const timePercentage =
      totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

    return {
      id: row.id,
      email: row.email,
      inviteCode: row.invite_code,
      credits: {
        limitUSD: creditLimit,
        usedUSD: creditUsed,
        remainingUSD: creditRemaining,
        percentageUsed: Math.min(100, creditPercentage),
      },
      messages: {
        limit: messageLimit,
        used: messageUsed,
        remaining: messageRemaining,
        percentageUsed: Math.min(100, messagePercentage),
      },
      validity: {
        startDate: row.start_date,
        endDate: row.end_date,
        daysRemaining,
        percentageUsed: Math.min(100, timePercentage),
      },
      status: row.status,
    };
  }

  /**
   * List all invites
   */
  listInvites(): DemoInvite[] {
    const rawDb = this.db.getRawDb();

    const rows = rawDb
      .prepare(
        `
      SELECT * FROM demo_invites ORDER BY created_at DESC
    `,
      )
      .all() as any[];

    return rows.map((row) => ({
      code: row.code,
      creditLimitUSD: row.credit_limit_usd,
      maxMessages: row.max_messages,
      maxDays: row.max_days,
      createdBy: row.created_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      redeemedBy: row.redeemed_by,
      redeemedAt: row.redeemed_at,
      status: this.getInviteStatus(row),
    }));
  }

  /**
   * List all demo users
   */
  listUsers(): DemoUser[] {
    const rawDb = this.db.getRawDb();

    const rows = rawDb
      .prepare(
        `
      SELECT * FROM demo_users ORDER BY start_date DESC
    `,
      )
      .all() as any[];

    return rows.map((row) => this.getUser(row.id)!).filter(Boolean);
  }

  /**
   * Generate a random invite code
   */
  private generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude ambiguous characters
    let code = "";
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
      if ((i + 1) % 4 === 0 && i < 11) code += "-";
    }
    return code;
  }

  /**
   * Determine invite status
   */
  private getInviteStatus(row: any): "active" | "redeemed" | "expired" {
    if (row.redeemed_by) return "redeemed";
    if (row.expires_at && new Date(row.expires_at) < new Date())
      return "expired";
    return "active";
  }

  /**
   * Get demo statistics
   */
  getStats(): {
    totalInvites: number;
    activeInvites: number;
    redeemedInvites: number;
    expiredInvites: number;
    totalUsers: number;
    activeUsers: number;
  } {
    try {
      const invites = this.listInvites();
      const users = this.listUsers();

      const activeInvites = invites.filter((i) => i.status === "active").length;
      const redeemedInvites = invites.filter(
        (i) => i.status === "redeemed",
      ).length;
      const expiredInvites = invites.filter(
        (i) => i.status === "expired",
      ).length;
      const activeUsers = users.filter((u) => u.status === "active").length;

      return {
        totalInvites: invites.length,
        activeInvites,
        redeemedInvites,
        expiredInvites,
        totalUsers: users.length,
        activeUsers,
      };
    } catch {
      return {
        totalInvites: 0,
        activeInvites: 0,
        redeemedInvites: 0,
        expiredInvites: 0,
        totalUsers: 0,
        activeUsers: 0,
      };
    }
  }

  /**
   * Alias for getInvite (used by demo.ts)
   */
  getInviteByCode(code: string): DemoInvite | null {
    return this.getInvite(code);
  }

  /**
   * Alias for getUser (used by demo.ts)
   */
  getDemoUser(userId: string): DemoUser | null {
    return this.getUser(userId);
  }

  /**
   * Deactivate an invite
   */
  deactivateInvite(inviteCode: string): void {
    const rawDb = this.db.getRawDb();
    rawDb
      .prepare(
        `
      UPDATE demo_invites
      SET expires_at = datetime('now')
      WHERE code = ?
    `,
      )
      .run(inviteCode);
  }

  /**
   * Deactivate a demo user
   */
  deactivateDemoUser(userId: string): void {
    const rawDb = this.db.getRawDb();
    rawDb
      .prepare(
        `
      UPDATE demo_users
      SET status = 'suspended'
      WHERE id = ?
    `,
      )
      .run(userId);
  }

  /**
   * Expire old demo users (returns count)
   */
  expireOldDemoUsers(): number {
    const rawDb = this.db.getRawDb();
    const result = rawDb
      .prepare(
        `
      UPDATE demo_users
      SET status = 'expired'
      WHERE status = 'active' AND end_date < datetime('now')
    `,
      )
      .run();
    return result.changes;
  }

  /**
   * Initialize demo tables if they don't exist
   */
  initTables(): void {
    const rawDb = this.db.getRawDb();

    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS demo_invites (
        code TEXT PRIMARY KEY,
        credit_limit_usd REAL NOT NULL,
        max_messages INTEGER NOT NULL,
        max_days INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        redeemed_by TEXT,
        redeemed_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS demo_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        invite_code TEXT NOT NULL,
        credit_limit_usd REAL NOT NULL,
        credit_used_usd REAL DEFAULT 0,
        message_limit INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT DEFAULT 'active'
      );
    `);
  }
}
