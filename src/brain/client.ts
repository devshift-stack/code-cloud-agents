/**
 * BrainClient - HTTP Client for Brain Server
 *
 * Calls the centralized Brain Server at 49.13.158.176:5001
 * instead of using local database operations.
 */

const BRAIN_SERVER_URL =
  process.env.BRAIN_SERVER_URL || "http://49.13.158.176:5001";

export interface MemoryEntry {
  id: string;
  type: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface StoreOptions {
  userId?: string;
  projectId?: string;
  type: string;
  content: string;
  tags?: string[];
}

export interface SearchOptions {
  userId?: string;
  projectId?: string;
  query: string;
  limit?: number;
}

export class BrainClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(options?: {
    baseUrl?: string;
    userId?: string;
    projectId?: string;
  }) {
    this.baseUrl = options?.baseUrl || BRAIN_SERVER_URL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
    if (options?.userId) {
      this.defaultHeaders["x-user-id"] = options.userId;
    }
    if (options?.projectId) {
      this.defaultHeaders["x-project-id"] = options.projectId;
    }
  }

  async health(): Promise<{
    status: string;
    service: string;
    version: string;
  }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`Brain health check failed: ${res.status}`);
    return res.json();
  }

  async storeMemory(options: StoreOptions): Promise<{ id: string }> {
    const headers = { ...this.defaultHeaders };
    if (options.userId) headers["x-user-id"] = options.userId;
    if (options.projectId) headers["x-project-id"] = options.projectId;

    const res = await fetch(`${this.baseUrl}/api/memory/store`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: options.type,
        content: options.content,
        tags: options.tags || [],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to store memory");
    }
    return res.json();
  }

  async searchMemory(
    options: SearchOptions,
  ): Promise<{ results: MemoryEntry[] }> {
    const headers = { ...this.defaultHeaders };
    if (options.userId) headers["x-user-id"] = options.userId;
    if (options.projectId) headers["x-project-id"] = options.projectId;

    const res = await fetch(`${this.baseUrl}/api/memory/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: options.query,
        limit: options.limit || 10,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to search memory");
    }
    return res.json();
  }

  async recentMemory(options?: {
    userId?: string;
    projectId?: string;
    limit?: number;
  }): Promise<{ results: MemoryEntry[] }> {
    const headers = { ...this.defaultHeaders };
    if (options?.userId) headers["x-user-id"] = options.userId;
    if (options?.projectId) headers["x-project-id"] = options.projectId;

    const limit = options?.limit || 10;
    const res = await fetch(
      `${this.baseUrl}/api/memory/recent?limit=${limit}`,
      {
        headers,
      },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to get recent memory");
    }
    return res.json();
  }

  async listProjects(): Promise<{
    projects: Array<{ id: string; name: string }>;
  }> {
    const res = await fetch(`${this.baseUrl}/api/projects`, {
      headers: this.defaultHeaders,
    });
    if (!res.ok) throw new Error("Failed to list projects");
    return res.json();
  }

  async logAudit(options: {
    userId?: string;
    action: string;
    details?: Record<string, any>;
  }): Promise<{ id: string }> {
    const headers = { ...this.defaultHeaders };
    if (options.userId) headers["x-user-id"] = options.userId;

    const res = await fetch(`${this.baseUrl}/api/audit/log`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: options.action,
        details: options.details || {},
      }),
    });

    if (!res.ok) throw new Error("Failed to log audit event");
    return res.json();
  }
}

// Singleton instance
let brainClient: BrainClient | null = null;

export function getBrainClient(options?: {
  userId?: string;
  projectId?: string;
}): BrainClient {
  if (!brainClient) {
    brainClient = new BrainClient(options);
  }
  return brainClient;
}

export default BrainClient;
