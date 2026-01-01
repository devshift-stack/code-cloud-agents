/**
 * Core Brain Client - Connects to central brain-core API
 *
 * Provides read + append-only write access to the central knowledge base.
 * No overwrites - only new entries are added.
 *
 * brain-core API uses headers for context:
 * - x-org-id: Organization ID
 * - x-user-id: User ID
 * - x-project-id: Project ID
 */

const CORE_BRAIN_ORIGIN =
  process.env.CORE_BRAIN_ORIGIN || "http://49.13.158.176:5001";
const DEFAULT_ORG_ID = "activi-dev";
const DEFAULT_PROJECT_ID = "cloud-agents";

export interface CoreBrainMemory {
  id: string;
  type: string;
  content: string;
  tags?: string[];
  createdAt: string;
}

export interface CoreBrainSearchResult {
  id: string;
  type: string;
  content: string;
  tags?: string[];
  createdAt?: string;
}

export interface CoreBrainStoreParams {
  userId: string;
  content: string;
  type?: string;
  tags?: string[];
}

export interface CoreBrainSearchParams {
  userId: string;
  query: string;
  limit?: number;
}

/**
 * Build headers for brain-core API
 * User is auto-created in brain-core if not exists (via user-sync middleware)
 */
function buildHeaders(userId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-org-id": DEFAULT_ORG_ID,
    "x-user-id": userId,
    "x-project-id": DEFAULT_PROJECT_ID,
  };
}

/**
 * Search the central brain for relevant memories
 */
export async function coreBrainSearch(
  params: CoreBrainSearchParams,
): Promise<CoreBrainSearchResult[]> {
  try {
    const response = await fetch(`${CORE_BRAIN_ORIGIN}/api/memory/search`, {
      method: "POST",
      headers: buildHeaders(params.userId),
      body: JSON.stringify({
        query: params.query,
        limit: params.limit || 5,
      }),
    });

    if (!response.ok) {
      console.error(`[core-brain] Search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("[core-brain] Search error:", error);
    return [];
  }
}

/**
 * Store new memory in central brain (append-only, no overwrites)
 */
export async function coreBrainStore(
  params: CoreBrainStoreParams,
): Promise<{ success: boolean; id?: string }> {
  try {
    const response = await fetch(`${CORE_BRAIN_ORIGIN}/api/memory/store`, {
      method: "POST",
      headers: buildHeaders(params.userId),
      body: JSON.stringify({
        type: params.type || "chat",
        content: params.content,
        tags: params.tags || [],
      }),
    });

    if (!response.ok) {
      console.error(`[core-brain] Store failed: ${response.status}`);
      return { success: false };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error("[core-brain] Store error:", error);
    return { success: false };
  }
}

/**
 * Get recent memories from central brain
 */
export async function coreBrainRecent(
  userId: string,
  limit: number = 10,
): Promise<CoreBrainMemory[]> {
  try {
    const response = await fetch(`${CORE_BRAIN_ORIGIN}/api/memory/recent`, {
      method: "POST",
      headers: buildHeaders(userId),
      body: JSON.stringify({ limit }),
    });

    if (!response.ok) {
      console.error(`[core-brain] Recent failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("[core-brain] Recent error:", error);
    return [];
  }
}

/**
 * Build context string from core brain results for prompt injection
 */
export function buildCoreBrainContext(
  results: CoreBrainSearchResult[],
): string {
  if (results.length === 0) return "";

  const lines = results.map((r, i) => `[${i + 1}] ${r.content}`);
  return `\n--- Central Knowledge Base ---\n${lines.join("\n")}\n---\n`;
}

/**
 * Health check for core brain connection
 */
export async function coreBrainHealthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${CORE_BRAIN_ORIGIN}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
