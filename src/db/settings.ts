/**
 * Settings Database Schema
 *
 * Manages user-specific and system-wide settings
 */

import type Database from "better-sqlite3";

export interface UserSettings {
  userId: string;
  settings: string; // JSON string
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  key: string;
  value: string; // JSON string
  description?: string;
  updatedBy?: string;
  updatedAt: string;
}

/**
 * Initialize settings tables
 */
export function initSettingsTables(db: Database.Database): void {
  // User settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      settings TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // System settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_by TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  // Settings history table (audit trail)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('user', 'system')),
      reference_id TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT NOT NULL,
      changed_by TEXT,
      changed_at TEXT NOT NULL
    )
  `);

  console.log("✅ Settings tables initialized");
}

/**
 * Settings Database Operations
 */
export class SettingsDB {
  constructor(private db: Database.Database) {}

  // User Settings Operations

  getUserSettings(userId: string): UserSettings | null {
    const stmt = this.db.prepare(
      "SELECT * FROM user_settings WHERE user_id = ?",
    );
    return stmt.get(userId) as UserSettings | null;
  }

  createUserSettings(userId: string, settings: object): UserSettings {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO user_settings (user_id, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(userId, JSON.stringify(settings), now, now);

    // Log to history
    this.logHistory("user", userId, null, settings, userId);

    return {
      userId,
      settings: JSON.stringify(settings),
      createdAt: now,
      updatedAt: now,
    };
  }

  updateUserSettings(
    userId: string,
    settings: object,
    updatedBy?: string,
  ): boolean {
    // Get old settings for history
    const oldSettings = this.getUserSettings(userId);

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE user_settings
      SET settings = ?, updated_at = ?
      WHERE user_id = ?
    `);

    const result = stmt.run(JSON.stringify(settings), now, userId);

    if (result.changes > 0) {
      // Log to history
      this.logHistory(
        "user",
        userId,
        oldSettings ? JSON.parse(oldSettings.settings) : null,
        settings,
        updatedBy || userId,
      );
    }

    return result.changes > 0;
  }

  deleteUserSettings(userId: string): boolean {
    const stmt = this.db.prepare("DELETE FROM user_settings WHERE user_id = ?");
    const result = stmt.run(userId);
    return result.changes > 0;
  }

  // System Settings Operations

  getSystemSetting(key: string): SystemSettings | null {
    const stmt = this.db.prepare("SELECT * FROM system_settings WHERE key = ?");
    return stmt.get(key) as SystemSettings | null;
  }

  getAllSystemSettings(): SystemSettings[] {
    const stmt = this.db.prepare("SELECT * FROM system_settings ORDER BY key");
    return stmt.all() as SystemSettings[];
  }

  setSystemSetting(
    key: string,
    value: unknown,
    description?: string,
    updatedBy?: string,
  ): SystemSettings {
    // Get old value for history
    const oldSetting = this.getSystemSetting(key);

    const now = new Date().toISOString();

    if (oldSetting) {
      // Update existing
      const stmt = this.db.prepare(`
        UPDATE system_settings
        SET value = ?, description = ?, updated_by = ?, updated_at = ?
        WHERE key = ?
      `);
      stmt.run(JSON.stringify(value), description, updatedBy, now, key);
    } else {
      // Insert new
      const stmt = this.db.prepare(`
        INSERT INTO system_settings (key, value, description, updated_by, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(key, JSON.stringify(value), description, updatedBy, now);
    }

    // Log to history
    this.logHistory(
      "system",
      key,
      oldSetting ? JSON.parse(oldSetting.value) : null,
      value,
      updatedBy,
    );

    return {
      key,
      value: JSON.stringify(value),
      description,
      updatedBy,
      updatedAt: now,
    };
  }

  deleteSystemSetting(key: string): boolean {
    const stmt = this.db.prepare("DELETE FROM system_settings WHERE key = ?");
    const result = stmt.run(key);
    return result.changes > 0;
  }

  // History Operations

  private logHistory(
    type: "user" | "system",
    referenceId: string,
    oldValue: unknown,
    newValue: unknown,
    changedBy?: string,
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO settings_history (type, reference_id, old_value, new_value, changed_by, changed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      type,
      referenceId,
      oldValue ? JSON.stringify(oldValue) : null,
      JSON.stringify(newValue),
      changedBy,
      new Date().toISOString(),
    );
  }

  getHistory(
    type: "user" | "system",
    referenceId: string,
    limit: number = 50,
  ): unknown[] {
    const stmt = this.db.prepare(`
      SELECT * FROM settings_history
      WHERE type = ? AND reference_id = ?
      ORDER BY changed_at DESC
      LIMIT ?
    `);

    return stmt.all(type, referenceId, limit);
  }
}
