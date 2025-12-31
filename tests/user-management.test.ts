/**
 * User Management Tests
 * Tests for user CRUD operations, password changes, and RBAC
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import BetterSqlite3 from "better-sqlite3";
import {
  initUsersTable,
  createUser,
  getUserById,
  getUserByEmail,
  listUsers,
  updateUser,
  deleteUser,
  changeUserPassword,
  verifyUserPassword,
  getUserStats,
  type UserCreateData,
  type UserUpdateData,
} from "../src/db/users.js";

// Create test database
function createTestDb() {
  const db = new BetterSqlite3(":memory:");
  initUsersTable(db);
  return db;
}

describe("User Database Operations", () => {
  it("should create users table", () => {
    const db = createTestDb();

    // Check table exists
    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master WHERE type='table' AND name='users'
    `,
      )
      .all();

    assert.strictEqual(tables.length, 1);
    db.close();
  });
});

describe("User Creation", () => {
  it("should create a new user", async () => {
    const db = createTestDb();

    const userData: UserCreateData = {
      email: "test@example.com",
      password: "password123",
      role: "user",
      displayName: "Test User",
    };

    const user = await createUser(db, userData);

    assert.ok(user.id);
    assert.strictEqual(user.email, "test@example.com");
    assert.strictEqual(user.role, "user");
    assert.strictEqual(user.displayName, "Test User");
    assert.ok(user.passwordHash);
    assert.ok(user.createdAt);
    assert.strictEqual(user.isActive, true);

    db.close();
  });

  it("should hash password", async () => {
    const db = createTestDb();

    const userData: UserCreateData = {
      email: "test@example.com",
      password: "password123",
      role: "user",
    };

    const user = await createUser(db, userData);

    assert.notStrictEqual(user.passwordHash, "password123");
    assert.ok(user.passwordHash.startsWith("$2b$"));

    db.close();
  });

  it("should lowercase email", async () => {
    const db = createTestDb();

    const userData: UserCreateData = {
      email: "Test@EXAMPLE.COM",
      password: "password123",
      role: "user",
    };

    const user = await createUser(db, userData);

    assert.strictEqual(user.email, "test@example.com");

    db.close();
  });

  it("should create users with different roles", async () => {
    const db = createTestDb();

    const admin = await createUser(db, {
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });

    const regularUser = await createUser(db, {
      email: "user@example.com",
      password: "password123",
      role: "user",
    });

    const demoUser = await createUser(db, {
      email: "demo@example.com",
      password: "password123",
      role: "demo",
    });

    assert.strictEqual(admin.role, "admin");
    assert.strictEqual(regularUser.role, "user");
    assert.strictEqual(demoUser.role, "demo");

    db.close();
  });
});

describe("User Retrieval", () => {
  it("should get user by ID", async () => {
    const db = createTestDb();

    const created = await createUser(db, {
      email: "test@example.com",
      password: "password123",
      role: "user",
    });

    const user = getUserById(db, created.id);

    assert.ok(user);
    assert.strictEqual(user!.id, created.id);
    assert.strictEqual(user!.email, "test@example.com");

    db.close();
  });

  it("should return null for non-existent user ID", () => {
    const db = createTestDb();

    const user = getUserById(db, "non-existent-id");

    assert.strictEqual(user, null);

    db.close();
  });

  it("should get user by email", async () => {
    const db = createTestDb();

    await createUser(db, {
      email: "test@example.com",
      password: "password123",
      role: "user",
    });

    const user = getUserByEmail(db, "test@example.com");

    assert.ok(user);
    assert.strictEqual(user!.email, "test@example.com");

    db.close();
  });

  it("should get user by email case-insensitive", async () => {
    const db = createTestDb();

    await createUser(db, {
      email: "Test@Example.COM",
      password: "password123",
      role: "user",
    });

    const user = getUserByEmail(db, "test@example.com");

    assert.ok(user);
    assert.strictEqual(user!.email, "test@example.com");

    db.close();
  });
});

describe("User Listing", () => {
  it("should list all users", async () => {
    const db = createTestDb();

    await createUser(db, {
      email: "user1@example.com",
      password: "password123",
      role: "user",
    });

    await createUser(db, {
      email: "user2@example.com",
      password: "password123",
      role: "user",
    });

    const users = listUsers(db);

    assert.strictEqual(users.length, 2);
    assert.ok(!("passwordHash" in users[0])); // Password hash should be excluded

    db.close();
  });

  it("should filter users by role", async () => {
    const db = createTestDb();

    await createUser(db, {
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });

    await createUser(db, {
      email: "user@example.com",
      password: "password123",
      role: "user",
    });

    const admins = listUsers(db, { role: "admin" });
    const regularUsers = listUsers(db, { role: "user" });

    assert.strictEqual(admins.length, 1);
    assert.strictEqual(admins[0].role, "admin");
    assert.strictEqual(regularUsers.length, 1);
    assert.strictEqual(regularUsers[0].role, "user");

    db.close();
  });

  it("should filter users by active status", async () => {
    const db = createTestDb();

    const user1 = await createUser(db, {
      email: "user1@example.com",
      password: "password123",
      role: "user",
    });

    await createUser(db, {
      email: "user2@example.com",
      password: "password123",
      role: "user",
    });

    // Deactivate user1
    updateUser(db, user1.id, { isActive: false });

    const activeUsers = listUsers(db, { isActive: true });
    const inactiveUsers = listUsers(db, { isActive: false });

    assert.strictEqual(activeUsers.length, 1);
    assert.strictEqual(inactiveUsers.length, 1);

    db.close();
  });

  it("should support pagination", async () => {
    const db = createTestDb();

    // Create 5 users
    for (let i = 1; i <= 5; i++) {
      await createUser(db, {
        email: `user${i}@example.com`,
        password: "password123",
        role: "user",
      });
    }

    const page1 = listUsers(db, { limit: 2, offset: 0 });
    const page2 = listUsers(db, { limit: 2, offset: 2 });

    assert.strictEqual(page1.length, 2);
    assert.strictEqual(page2.length, 2);
    assert.notStrictEqual(page1[0].id, page2[0].id);

    db.close();
  });
});

describe("User Update", () => {
  it("should update user email", async () => {
    const db = createTestDb();

    const user = await createUser(db, {
      email: "old@example.com",
      password: "password123",
      role: "user",
    });

    const updated = updateUser(db, user.id, {
      email: "new@example.com",
    });

    assert.ok(updated);
    assert.strictEqual(updated!.email, "new@example.com");
    assert.ok(updated!.updatedAt);

    db.close();
  });

  it("should update user role", async () => {
    const db = createTestDb();

    const user = await createUser(db, {
      email: "user@example.com",
      password: "password123",
      role: "user",
    });

    const updated = updateUser(db, user.id, {
      role: "admin",
    });

    assert.strictEqual(updated!.role, "admin");

    db.close();
  });

  it("should update user display name", async () => {
    const db = createTestDb();

    const user = await createUser(db, {
      email: "user@example.com",
      password: "password123",
      role: "user",
    });

    const updated = updateUser(db, user.id, {
      displayName: "New Name",
    });

    assert.strictEqual(updated!.displayName, "New Name");

    db.close();
  });

  it("should deactivate user", async () => {
    const db = createTestDb();

    const user = await createUser(db, {
      email: "user@example.com",
      password: "password123",
      role: "user",
    });

    const updated = updateUser(db, user.id, {
      isActive: false,
    });

    assert.strictEqual(updated!.isActive, false);

    db.close();
  });

  it("should return null for non-existent user", () => {
    const db = createTestDb();

    const updated = updateUser(db, "non-existent-id", {
      displayName: "Test",
    });

    assert.strictEqual(updated, null);

    db.close();
  });
});

describe("User Deletion", () => {
  it("should delete user", async () => {
    const db = createTestDb();

    const user = await createUser(db, {
      email: "user@example.com",
      password: "password123",
      role: "user",
    });

    const deleted = deleteUser(db, user.id);

    assert.strictEqual(deleted, true);

    const found = getUserById(db, user.id);
    assert.strictEqual(found, null);

    db.close();
  });

  it("should return false for non-existent user", () => {
    const db = createTestDb();

    const deleted = deleteUser(db, "non-existent-id");

    assert.strictEqual(deleted, false);

    db.close();
  });
});

describe("Password Management", () => {
  it("should change user password", async () => {
    const db = createTestDb();

    const user = await createUser(db, {
      email: "user@example.com",
      password: "oldpassword",
      role: "user",
    });

    const changed = await changeUserPassword(db, user.id, "newpassword");

    assert.strictEqual(changed, true);

    // Verify old password doesn't work
    const verified1 = await verifyUserPassword(
      db,
      "user@example.com",
      "oldpassword",
    );
    assert.strictEqual(verified1, null);

    // Verify new password works
    const verified2 = await verifyUserPassword(
      db,
      "user@example.com",
      "newpassword",
    );
    assert.ok(verified2);

    db.close();
  });

  it("should verify correct password", async () => {
    const db = createTestDb();

    await createUser(db, {
      email: "user@example.com",
      password: "correctpassword",
      role: "user",
    });

    const verified = await verifyUserPassword(
      db,
      "user@example.com",
      "correctpassword",
    );

    assert.ok(verified);
    assert.strictEqual(verified!.email, "user@example.com");

    db.close();
  });

  it("should reject incorrect password", async () => {
    const db = createTestDb();

    await createUser(db, {
      email: "user@example.com",
      password: "correctpassword",
      role: "user",
    });

    const verified = await verifyUserPassword(
      db,
      "user@example.com",
      "wrongpassword",
    );

    assert.strictEqual(verified, null);

    db.close();
  });

  it("should update last login on successful password verification", async () => {
    const db = createTestDb();

    const user = await createUser(db, {
      email: "user@example.com",
      password: "password123",
      role: "user",
    });

    assert.strictEqual(user.lastLoginAt, undefined);

    await verifyUserPassword(db, "user@example.com", "password123");

    const updated = getUserById(db, user.id);
    assert.ok(updated!.lastLoginAt);

    db.close();
  });

  it("should not verify inactive user", async () => {
    const db = createTestDb();

    const user = await createUser(db, {
      email: "user@example.com",
      password: "password123",
      role: "user",
    });

    // Deactivate user
    updateUser(db, user.id, { isActive: false });

    const verified = await verifyUserPassword(
      db,
      "user@example.com",
      "password123",
    );

    assert.strictEqual(verified, null);

    db.close();
  });
});

describe("User Statistics", () => {
  it("should get user stats", async () => {
    const db = createTestDb();

    await createUser(db, {
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });

    const user = await createUser(db, {
      email: "user@example.com",
      password: "password123",
      role: "user",
    });

    await createUser(db, {
      email: "demo@example.com",
      password: "password123",
      role: "demo",
    });

    // Deactivate one user
    updateUser(db, user.id, { isActive: false });

    const stats = getUserStats(db);

    assert.strictEqual(stats.total, 3);
    assert.strictEqual(stats.active, 2);
    assert.strictEqual(stats.admins, 1);
    assert.strictEqual(stats.users, 1);
    assert.strictEqual(stats.demos, 1);

    db.close();
  });

  it("should return zero stats for empty database", () => {
    const db = createTestDb();

    const stats = getUserStats(db);

    assert.strictEqual(stats.total, 0);
    assert.strictEqual(stats.active, 0);
    assert.strictEqual(stats.admins, 0);
    assert.strictEqual(stats.users, 0);
    assert.strictEqual(stats.demos, 0);

    db.close();
  });
});

// Note: API endpoint tests would go in a separate integration test file
// These unit tests focus on the database operations
