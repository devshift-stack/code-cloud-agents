/**
 * User Database Module
 * Handles user persistence and management
 */

import type BetterSqlite3 from "better-sqlite3";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: "admin" | "user" | "demo";
  displayName?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  isActive: boolean;
  emailVerified?: boolean;
}

export interface UserCreateData {
  email: string;
  password: string;
  role: "admin" | "user" | "demo";
  displayName?: string;
}

export interface UserUpdateData {
  email?: string;
  role?: "admin" | "user" | "demo";
  displayName?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

const SALT_ROUNDS = 10;

/**
 * Initialize users table in database
 */
export function initUsersTable(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      display_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      last_login_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
  `);

  console.log("✅ Users table initialized");
}

/**
 * Create a new user
 */
export async function createUser(
  db: BetterSqlite3.Database,
  data: UserCreateData,
): Promise<User> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, role, display_name, created_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  stmt.run(
    id,
    data.email.toLowerCase(),
    passwordHash,
    data.role,
    data.displayName ?? null,
    createdAt,
  );

  return {
    id,
    email: data.email.toLowerCase(),
    passwordHash,
    role: data.role,
    displayName: data.displayName,
    createdAt,
    isActive: true,
  };
}

/**
 * Get user by ID
 */
export function getUserById(
  db: BetterSqlite3.Database,
  id: string,
): User | null {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  const row = stmt.get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    isActive: Boolean(row.is_active),
  };
}

/**
 * Get user by email
 */
export function getUserByEmail(
  db: BetterSqlite3.Database,
  email: string,
): User | null {
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  const row = stmt.get(email.toLowerCase()) as any;

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    isActive: Boolean(row.is_active),
  };
}

/**
 * List all users (excludes password hash)
 */
export function listUsers(
  db: BetterSqlite3.Database,
  options: {
    role?: "admin" | "user" | "demo";
    isActive?: boolean;
    limit?: number;
    offset?: number;
  } = {},
): Omit<User, "passwordHash">[] {
  let query = "SELECT * FROM users WHERE 1=1";
  const params: any[] = [];

  if (options.role) {
    query += " AND role = ?";
    params.push(options.role);
  }

  if (options.isActive !== undefined) {
    query += " AND is_active = ?";
    params.push(options.isActive ? 1 : 0);
  }

  query += " ORDER BY created_at DESC";

  if (options.limit) {
    query += " LIMIT ?";
    params.push(options.limit);
  }

  if (options.offset) {
    query += " OFFSET ?";
    params.push(options.offset);
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as any[];

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    isActive: Boolean(row.is_active),
  }));
}

/**
 * Update user
 */
export function updateUser(
  db: BetterSqlite3.Database,
  id: string,
  updates: UserUpdateData,
): User | null {
  const user = getUserById(db, id);
  if (!user) return null;

  const updatedAt = new Date().toISOString();
  const fields: string[] = ["updated_at = ?"];
  const params: any[] = [updatedAt];

  if (updates.email) {
    fields.push("email = ?");
    params.push(updates.email.toLowerCase());
  }

  if (updates.role) {
    fields.push("role = ?");
    params.push(updates.role);
  }

  if (updates.displayName !== undefined) {
    fields.push("display_name = ?");
    params.push(updates.displayName ?? null);
  }

  if (updates.isActive !== undefined) {
    fields.push("is_active = ?");
    params.push(updates.isActive ? 1 : 0);
  }

  params.push(id);

  const stmt = db.prepare(`
    UPDATE users SET ${fields.join(", ")}
    WHERE id = ?
  `);

  stmt.run(...params);

  return getUserById(db, id);
}

/**
 * Delete user
 */
export function deleteUser(db: BetterSqlite3.Database, id: string): boolean {
  const stmt = db.prepare("DELETE FROM users WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Change user password
 */
export async function changeUserPassword(
  db: BetterSqlite3.Database,
  id: string,
  newPassword: string,
): Promise<boolean> {
  const user = getUserById(db, id);
  if (!user) return false;

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const updatedAt = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(passwordHash, updatedAt, id);
  return result.changes > 0;
}

/**
 * Verify user password
 */
export async function verifyUserPassword(
  db: BetterSqlite3.Database,
  email: string,
  password: string,
): Promise<User | null> {
  const user = getUserByEmail(db, email);
  if (!user) return null;

  if (!user.isActive) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  // Update last login
  const updatedAt = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE users SET last_login_at = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(updatedAt, updatedAt, user.id);

  return user;
}

/**
 * Get user count by role
 */
export function getUserStats(db: BetterSqlite3.Database): {
  total: number;
  active: number;
  admins: number;
  users: number;
  demos: number;
} {
  const totalStmt = db.prepare("SELECT COUNT(*) as count FROM users");
  const activeStmt = db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE is_active = 1",
  );
  const adminsStmt = db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE role = 'admin'",
  );
  const usersStmt = db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE role = 'user'",
  );
  const demosStmt = db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE role = 'demo'",
  );

  return {
    total: (totalStmt.get() as { count: number }).count,
    active: (activeStmt.get() as { count: number }).count,
    admins: (adminsStmt.get() as { count: number }).count,
    users: (usersStmt.get() as { count: number }).count,
    demos: (demosStmt.get() as { count: number }).count,
  };
}

/**
 * Seed default admin user if users table is empty
 * Uses ENV variables:
 *   SEED_ADMIN_EMAIL (default: admin@cloudagents.io)
 *   SEED_ADMIN_PASSWORD (default: ChangeMe123!)
 *   SEED_ADMIN_NAME (default: Admin)
 */
export async function seedDefaultAdmin(
  db: BetterSqlite3.Database,
): Promise<void> {
  const stats = getUserStats(db);

  if (stats.total > 0) {
    console.log(
      "ℹ️ Users exist (" + stats.total + " users), admin seed skipped",
    );
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@cloudagents.io";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const displayName = process.env.SEED_ADMIN_NAME ?? "Admin";

  try {
    await createUser(db, {
      email,
      password,
      role: "admin",
      displayName,
    });

    console.log("✅ Default admin seeded:");
    console.log("   Email: " + email);
    console.log("   Role: admin");
    console.log("   ⚠️  WICHTIG: Passwort nach erstem Login ändern!");
  } catch (error) {
    console.error("❌ Failed to seed default admin:", error);
    throw error;
  }
}
