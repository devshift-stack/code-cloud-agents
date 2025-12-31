# Settings Management API

Complete API documentation for managing user and system settings.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [User Settings](#user-settings)
- [System Settings](#system-settings)
- [Preferences](#preferences)
- [History & Audit Trail](#history--audit-trail)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Security](#security)

---

## Overview

The Settings Management API provides a dual-layer configuration system:

1. **User Settings** - Per-user preferences (theme, language, notifications)
2. **System Settings** - Global configuration (admin-only)

### Key Features

- **Default Values** - Automatic defaults for all settings
- **Deep Merge** - Partial updates preserve existing values
- **Audit Trail** - Complete history of all changes
- **Schema Validation** - Zod-based validation for all inputs
- **Admin Controls** - Separate admin-only system settings

---

## Architecture

### Database Schema

```sql
-- User settings table
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  settings TEXT NOT NULL DEFAULT '{}',  -- JSON
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- System settings table
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,  -- JSON
  description TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

-- Settings history (audit trail)
CREATE TABLE settings_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('user', 'system')),
  reference_id TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_by TEXT,
  changed_at TEXT NOT NULL
);
```

### Default Settings

**User Settings:**

```typescript
{
  theme: "auto",           // "light" | "dark" | "auto"
  language: "en",          // "en" | "de" | "bs"
  notifications: {
    email: true,
    push: true,
    inApp: true
  },
  preferences: {
    showAgentStatus: true,
    showSystemNotifications: true,
    autoSaveInterval: 30   // seconds (10-300)
  }
}
```

**System Settings:**

```typescript
{
  appName: "Code Cloud Agents",
  maintenanceMode: false,
  maxConcurrentAgents: 3,      // 1-10
  defaultAgentTimeout: 300,    // seconds (60-3600)
  enableWebhooks: true,
  enableWebSocket: true,
  logLevel: "info"             // "debug" | "info" | "warn" | "error"
}
```

---

## User Settings

### Get User Settings

Returns user settings with automatic defaults if not exists.

**Endpoint:** `GET /api/settings/user/:userId`

**Response:**

```json
{
  "success": true,
  "settings": {
    "theme": "auto",
    "language": "en",
    "notifications": { "email": true, "push": true, "inApp": true },
    "preferences": {
      "showAgentStatus": true,
      "showSystemNotifications": true,
      "autoSaveInterval": 30
    }
  },
  "metadata": {
    "createdAt": "2025-12-26T10:00:00.000Z",
    "updatedAt": "2025-12-26T10:00:00.000Z"
  }
}
```

### Update User Settings

Updates user settings with deep merge.

**Endpoint:** `PUT /api/settings/user/:userId`

**Request Body:**

```json
{
  "theme": "dark",
  "notifications": {
    "push": false
  }
}
```

**Response:**

```json
{
  "success": true,
  "settings": {
    "theme": "dark",
    "language": "en",
    "notifications": { "email": true, "push": false, "inApp": true },
    "preferences": {
      "showAgentStatus": true,
      "showSystemNotifications": true,
      "autoSaveInterval": 30
    }
  }
}
```

**Validation Rules:**

- `theme`: Must be "light", "dark", or "auto"
- `language`: Must be "en", "de", or "bs"
- `notifications`: email, push, inApp must be booleans
- `preferences.autoSaveInterval`: Must be 10-300 seconds

### Delete User Settings

Resets user to defaults by deleting their settings.

**Endpoint:** `DELETE /api/settings/user/:userId`

**Response:**

```json
{
  "success": true,
  "message": "Settings deleted successfully"
}
```

---

## Preferences

Preferences are a subset of user settings for quick access.

### Get Preferences

**Endpoint:** `GET /api/settings/preferences/:userId`

**Response:**

```json
{
  "success": true,
  "preferences": {
    "showAgentStatus": true,
    "showSystemNotifications": true,
    "autoSaveInterval": 30
  }
}
```

### Update Preferences

Partial update of preferences only.

**Endpoint:** `PATCH /api/settings/preferences/:userId`

**Request Body:**

```json
{
  "autoSaveInterval": 60
}
```

**Response:**

```json
{
  "success": true,
  "preferences": {
    "showAgentStatus": true,
    "showSystemNotifications": true,
    "autoSaveInterval": 60
  }
}
```

---

## System Settings

**Admin-only endpoints** for global configuration.

### Get All System Settings

**Endpoint:** `GET /api/settings/system`

**Response:**

```json
{
  "success": true,
  "settings": {
    "appName": "Code Cloud Agents",
    "maintenanceMode": false,
    "maxConcurrentAgents": 3,
    "defaultAgentTimeout": 300,
    "enableWebhooks": true,
    "enableWebSocket": true,
    "logLevel": "info"
  }
}
```

### Get Specific System Setting

**Endpoint:** `GET /api/settings/system/:key`

**Example:** `GET /api/settings/system/maxConcurrentAgents`

**Response:**

```json
{
  "success": true,
  "key": "maxConcurrentAgents",
  "value": 3,
  "description": "System setting: maxConcurrentAgents",
  "updatedBy": "admin",
  "updatedAt": "2025-12-26T10:00:00.000Z",
  "isDefault": false
}
```

If setting doesn't exist, returns default:

```json
{
  "success": true,
  "key": "maxConcurrentAgents",
  "value": 3,
  "isDefault": true
}
```

### Update System Settings

Partial update of system settings.

**Endpoint:** `PUT /api/settings/system`

**Request Body:**

```json
{
  "maintenanceMode": true,
  "logLevel": "debug",
  "_updatedBy": "admin@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "updatedSettings": {
    "maintenanceMode": true,
    "logLevel": "debug"
  },
  "updatedBy": "admin@example.com"
}
```

**Validation Rules:**

- `appName`: 1-100 characters
- `maxConcurrentAgents`: 1-10
- `defaultAgentTimeout`: 60-3600 seconds
- `logLevel`: "debug", "info", "warn", or "error"

---

## History & Audit Trail

Every settings change is logged for audit purposes.

### Get User Settings History

**Endpoint:** `GET /api/settings/history/user/:userId?limit=50`

**Response:**

```json
{
  "success": true,
  "history": [
    {
      "id": 123,
      "type": "user",
      "reference_id": "user123",
      "old_value": "{\"theme\":\"auto\"}",
      "new_value": "{\"theme\":\"dark\"}",
      "changed_by": "user123",
      "changed_at": "2025-12-26T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get System Settings History

**Endpoint:** `GET /api/settings/history/system/:key?limit=50`

**Example:** `GET /api/settings/history/system/maintenanceMode?limit=10`

**Response:**

```json
{
  "success": true,
  "history": [
    {
      "id": 456,
      "type": "system",
      "reference_id": "maintenanceMode",
      "old_value": "false",
      "new_value": "true",
      "changed_by": "admin@example.com",
      "changed_at": "2025-12-26T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

## API Reference

### User Settings

| Method | Endpoint                     | Description          | Auth |
| ------ | ---------------------------- | -------------------- | ---- |
| GET    | `/api/settings/user/:userId` | Get user settings    | User |
| PUT    | `/api/settings/user/:userId` | Update user settings | User |
| DELETE | `/api/settings/user/:userId` | Delete user settings | User |

### Preferences

| Method | Endpoint                            | Description        | Auth |
| ------ | ----------------------------------- | ------------------ | ---- |
| GET    | `/api/settings/preferences/:userId` | Get preferences    | User |
| PATCH  | `/api/settings/preferences/:userId` | Update preferences | User |

### System Settings

| Method | Endpoint                    | Description             | Auth  |
| ------ | --------------------------- | ----------------------- | ----- |
| GET    | `/api/settings/system`      | Get all system settings | Admin |
| GET    | `/api/settings/system/:key` | Get specific setting    | Admin |
| PUT    | `/api/settings/system`      | Update system settings  | Admin |

### History

| Method | Endpoint                             | Description        | Auth  |
| ------ | ------------------------------------ | ------------------ | ----- |
| GET    | `/api/settings/history/user/:userId` | Get user history   | User  |
| GET    | `/api/settings/history/system/:key`  | Get system history | Admin |

---

## Examples

### JavaScript/TypeScript (Fetch API)

```typescript
// Get user settings
const getUserSettings = async (userId: string) => {
  const response = await fetch(`/api/settings/user/${userId}`);
  const data = await response.json();
  return data.settings;
};

// Update theme to dark mode
const updateTheme = async (
  userId: string,
  theme: "light" | "dark" | "auto",
) => {
  const response = await fetch(`/api/settings/user/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  });
  return response.json();
};

// Update preferences (partial)
const updateAutoSave = async (userId: string, interval: number) => {
  const response = await fetch(`/api/settings/preferences/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autoSaveInterval: interval }),
  });
  return response.json();
};

// Get system settings (Admin)
const getSystemSettings = async () => {
  const response = await fetch("/api/settings/system");
  const data = await response.json();
  return data.settings;
};

// Enable maintenance mode (Admin)
const enableMaintenance = async (adminEmail: string) => {
  const response = await fetch("/api/settings/system", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      maintenanceMode: true,
      _updatedBy: adminEmail,
    }),
  });
  return response.json();
};
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface UserSettings {
  theme: "light" | "dark" | "auto";
  language: "en" | "de" | "bs";
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  preferences: {
    showAgentStatus: boolean;
    showSystemNotifications: boolean;
    autoSaveInterval: number;
  };
}

export function useUserSettings(userId: string) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/settings/user/${userId}`)
      .then(res => res.json())
      .then(data => {
        setSettings(data.settings);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    const response = await fetch(`/api/settings/user/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    const data = await response.json();
    setSettings(data.settings);
  };

  return { settings, loading, error, updateSettings };
}

// Usage in component
function SettingsPage({ userId }: { userId: string }) {
  const { settings, loading, updateSettings } = useUserSettings(userId);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Settings</h1>
      <select
        value={settings?.theme}
        onChange={(e) => updateSettings({ theme: e.target.value as any })}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="auto">Auto</option>
      </select>
    </div>
  );
}
```

### cURL Examples

```bash
# Get user settings
curl http://localhost:3000/api/settings/user/user123

# Update user settings (change theme to dark)
curl -X PUT http://localhost:3000/api/settings/user/user123 \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark"}'

# Update preferences (auto-save interval)
curl -X PATCH http://localhost:3000/api/settings/preferences/user123 \
  -H "Content-Type: application/json" \
  -d '{"autoSaveInterval":60}'

# Get system settings (Admin)
curl http://localhost:3000/api/settings/system

# Enable maintenance mode (Admin)
curl -X PUT http://localhost:3000/api/settings/system \
  -H "Content-Type: application/json" \
  -d '{"maintenanceMode":true,"_updatedBy":"admin@example.com"}'

# Get user settings history
curl http://localhost:3000/api/settings/history/user/user123?limit=10

# Get system setting history
curl http://localhost:3000/api/settings/history/system/maintenanceMode?limit=10
```

---

## Security

### Authentication & Authorization

**TODO:** Currently no authentication implemented. Add before production:

```typescript
// Example middleware
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Apply to routes
router.get("/user/:userId", requireAuth, (req, res) => {
  /* ... */
});
router.get("/system", requireAdmin, (req, res) => {
  /* ... */
});
```

### Best Practices

1. **User Settings Access** - Users should only access their own settings
2. **System Settings** - Restrict to admin role only
3. **Input Validation** - All inputs validated with Zod schemas
4. **Audit Trail** - Every change is logged with timestamp and user
5. **Default Values** - Ensure safe defaults for all settings
6. **Deep Merge** - Partial updates preserve existing values

### Validation

All inputs are validated using Zod schemas:

- Theme: Must be one of "light", "dark", "auto"
- Language: Must be one of "en", "de", "bs"
- Auto-save interval: 10-300 seconds
- Max concurrent agents: 1-10
- Agent timeout: 60-3600 seconds
- Log level: One of "debug", "info", "warn", "error"

Invalid inputs return HTTP 400 with validation details:

```json
{
  "success": false,
  "error": "Invalid settings format",
  "details": [
    {
      "code": "invalid_enum_value",
      "path": ["theme"],
      "message": "Invalid enum value. Expected 'light' | 'dark' | 'auto', received 'blue'"
    }
  ]
}
```

---

## Implementation Notes

### Deep Merge Behavior

User settings updates use deep merge to preserve nested values:

```typescript
// Current settings
{
  notifications: { email: true, push: true, inApp: true }
}

// Update request
{
  notifications: { push: false }
}

// Result (email and inApp preserved)
{
  notifications: { email: true, push: false, inApp: true }
}
```

### Default Creation

If user settings don't exist, they are automatically created with defaults on first GET request.

### History Logging

All changes are logged with:

- Old value (null for creation)
- New value
- Changed by (user ID or admin email)
- Timestamp (ISO 8601)

### Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

HTTP status codes:

- 200: Success
- 201: Created
- 400: Bad request (validation error)
- 401: Unauthorized
- 403: Forbidden (admin-only)
- 404: Not found
- 500: Internal server error

---

## Related Documentation

- [Agent Control API](./AGENT_CONTROL.md)
- [WebSocket Real-time](./WEBSOCKET.md)
- [Database Schema](../src/db/settings.ts)
