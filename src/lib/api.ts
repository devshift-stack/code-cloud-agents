/**
 * Comprehensive API Client
 * All backend endpoints organized by category
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

/**
 * Get auth headers from localStorage
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// AUTH API
// ============================================================================
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{
      success: boolean;
      user: { id: string; email: string; role: string; displayName: string };
      tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: (refreshToken?: string) =>
    fetchApi<{ success: boolean }>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  refresh: (refreshToken: string) =>
    fetchApi<{
      success: boolean;
      tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    }>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  verify: () =>
    fetchApi<{
      success: boolean;
      valid: boolean;
      user: { userId: string; role: string; email: string };
    }>("/api/auth/verify"),

  me: () =>
    fetchApi<{
      success: boolean;
      user: {
        id: string;
        email: string;
        role: string;
        displayName: string;
        createdAt: string;
        lastLoginAt: string;
        isActive: boolean;
      };
    }>("/api/auth/me"),

  resetPassword: (userId: string, newPassword: string) =>
    fetchApi<{ success: boolean; message: string }>(
      "/api/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({ userId, newPassword }),
      },
    ),
};

// ============================================================================
// USERS API
// ============================================================================
export const usersApi = {
  list: (params?: {
    role?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) =>
    fetchApi<{ success: boolean; users: User[]; total: number }>(
      `/api/users${params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : ""}`,
    ),

  getById: (id: string) =>
    fetchApi<{ success: boolean; user: User }>(`/api/users/${id}`),

  create: (data: {
    email: string;
    password: string;
    role: string;
    displayName?: string;
  }) =>
    fetchApi<{ success: boolean; user: User }>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<{
      email: string;
      role: string;
      displayName: string;
      isActive: boolean;
    }>,
  ) =>
    fetchApi<{ success: boolean; user: User }>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/users/${id}`, { method: "DELETE" }),

  stats: () =>
    fetchApi<{
      total: number;
      active: number;
      admins: number;
      users: number;
      demos: number;
    }>("/api/users/stats"),
};

// ============================================================================
// AGENTS API
// ============================================================================
export const agentsApi = {
  list: () => fetchApi<{ agents: Agent[] }>("/api/agents"),

  getById: (id: string) => fetchApi<{ agent: Agent }>(`/api/agents/${id}`),

  start: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/agents/${id}/start`, {
      method: "POST",
    }),

  stop: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/agents/${id}/stop`, {
      method: "POST",
    }),

  restart: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/agents/${id}/restart`, {
      method: "POST",
    }),

  status: (id: string) =>
    fetchApi<{ status: string }>(`/api/agents/${id}/status`),

  logs: (id: string) => fetchApi<{ logs: string[] }>(`/api/agents/${id}/logs`),

  createTask: (id: string, task: { description: string; priority?: string }) =>
    fetchApi<{ success: boolean; taskId: string }>(`/api/agents/${id}/tasks`, {
      method: "POST",
      body: JSON.stringify(task),
    }),
};

// ============================================================================
// TASKS API
// ============================================================================
export const tasksApi = {
  list: (params?: { status?: string; limit?: number }) =>
    fetchApi<{ tasks: Task[] }>(
      `/api/tasks${params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : ""}`,
    ),

  getById: (id: string) => fetchApi<{ task: Task }>(`/api/tasks/${id}`),

  create: (data: {
    description: string;
    priority?: string;
    agentId?: string;
  }) =>
    fetchApi<{ success: boolean; task: Task }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  submit: (id: string, result: { output: string; status: string }) =>
    fetchApi<{ success: boolean }>(`/api/tasks/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(result),
    }),

  statusAll: () =>
    fetchApi<{ statuses: Record<string, string> }>(
      "/api/agent-tasks/status/all",
    ),

  workerStart: () =>
    fetchApi<{ success: boolean }>("/api/agent-tasks/worker/start", {
      method: "POST",
    }),

  workerStop: () =>
    fetchApi<{ success: boolean }>("/api/agent-tasks/worker/stop", {
      method: "POST",
    }),
};

// ============================================================================
// CHAT API
// ============================================================================
export const chatApi = {
  send: (message: string, agentName?: string) =>
    fetchApi<{ response: string; chatId: string }>("/api/chat/send", {
      method: "POST",
      body: JSON.stringify({ message, agentName }),
    }),

  agents: () => fetchApi<{ agents: ChatAgent[] }>("/api/chat/agents"),

  list: (userId: string) =>
    fetchApi<{ chats: Chat[] }>(`/api/chat/list/${userId}`),

  delete: (chatId: string) =>
    fetchApi<{ success: boolean }>(`/api/chat/${chatId}`, { method: "DELETE" }),

  updateTitle: (chatId: string, title: string) =>
    fetchApi<{ success: boolean }>(`/api/chat/${chatId}/title`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    }),

  threads: () => fetchApi<{ threads: ChatThread[] }>("/api/chat/threads"),

  createThread: (title: string) =>
    fetchApi<{ success: boolean; thread: ChatThread }>("/api/chat/threads", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
};

// ============================================================================
// AUDIT API
// ============================================================================
export const auditApi = {
  list: (params?: { limit?: number; kind?: string; severity?: string }) =>
    fetchApi<{ events: AuditEvent[] }>(
      `/api/audit${params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : ""}`,
    ),

  getById: (id: string) => fetchApi<{ event: AuditEvent }>(`/api/audit/${id}`),

  stopScoreStats: () =>
    fetchApi<{ stats: StopScoreStats }>("/api/audit/stats/stop-scores"),

  events: (params?: { limit?: number; kind?: string }) =>
    fetchApi<{ events: AuditEvent[] }>(
      `/api/audit/events${params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : ""}`,
    ),

  eventStats: () => fetchApi<{ stats: EventStats }>("/api/audit/events/stats"),

  cleanup: (olderThanDays: number) =>
    fetchApi<{ deleted: number }>("/api/audit/events/cleanup", {
      method: "POST",
      body: JSON.stringify({ olderThanDays }),
    }),
};

// ============================================================================
// OPS API
// ============================================================================
export const opsApi = {
  events: (params?: { limit?: number; kind?: string }) =>
    fetchApi<{ events: OpsEvent[] }>(
      `/api/ops/events${params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : ""}`,
    ),

  tasksHistory: (params?: { limit?: number; status?: string }) =>
    fetchApi<{ tasks: Task[] }>(
      `/api/ops/tasks/history${params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : ""}`,
    ),

  stats: () => fetchApi<OpsStats>("/api/ops/stats"),
};

// ============================================================================
// BRAIN API
// ============================================================================
export const brainApi = {
  ingestText: (data: { title: string; content: string; tags?: string[] }) =>
    fetchApi<{ success: boolean; docId: string }>("/api/brain/ingest/text", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  ingestUrl: (url: string) =>
    fetchApi<{ success: boolean; docId: string }>("/api/brain/ingest/url", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  search: (query: string, limit?: number) =>
    fetchApi<{ results: BrainSearchResult[] }>("/api/brain/search", {
      method: "POST",
      body: JSON.stringify({ query, limit }),
    }),

  docs: () => fetchApi<{ docs: BrainDoc[] }>("/api/brain/docs"),

  getDoc: (docId: string) =>
    fetchApi<{ doc: BrainDoc }>(`/api/brain/docs/${docId}`),

  updateDoc: (docId: string, data: Partial<BrainDoc>) =>
    fetchApi<{ success: boolean }>(`/api/brain/docs/${docId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteDoc: (docId: string) =>
    fetchApi<{ success: boolean }>(`/api/brain/docs/${docId}`, {
      method: "DELETE",
    }),

  similarDocs: (docId: string) =>
    fetchApi<{ docs: BrainDoc[] }>(`/api/brain/docs/${docId}/similar`),

  stats: () => fetchApi<BrainStats>("/api/brain/stats"),

  proxyHealth: () => fetchApi<{ status: string }>("/api/brain/proxy/health"),
};

// ============================================================================
// MEMORY API
// ============================================================================
export const memoryApi = {
  chats: (userId: string) =>
    fetchApi<{ chats: MemoryChat[] }>(`/api/memory/chats/${userId}`),

  createChat: (data: { userId: string; title: string }) =>
    fetchApi<{ success: boolean; chat: MemoryChat }>("/api/memory/chats", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  chatDetails: (chatId: string) =>
    fetchApi<{ chat: MemoryChat }>(`/api/memory/chats/${chatId}/details`),

  chatMessages: (chatId: string) =>
    fetchApi<{ messages: MemoryMessage[] }>(
      `/api/memory/chats/${chatId}/messages`,
    ),

  addMessage: (chatId: string, message: { role: string; content: string }) =>
    fetchApi<{ success: boolean }>(`/api/memory/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify(message),
    }),

  search: (query: string, userId: string) =>
    fetchApi<{ results: MemorySearchResult[] }>("/api/memory/search", {
      method: "POST",
      body: JSON.stringify({ query, userId }),
    }),

  semanticSearch: (query: string) =>
    fetchApi<{ results: MemorySearchResult[] }>("/api/memory/semantic/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  trending: (userId: string) =>
    fetchApi<{ topics: string[] }>(`/api/memory/trending/${userId}`),

  stats: (userId: string) =>
    fetchApi<MemoryStats>(`/api/memory/stats/${userId}`),

  exportChat: (chatId: string) =>
    fetchApi<{ export: string }>(`/api/memory/chats/${chatId}/export`),
};

// ============================================================================
// SETTINGS API
// ============================================================================
export const settingsApi = {
  getUser: (userId: string) =>
    fetchApi<{ settings: UserSettings }>(`/api/settings/user/${userId}`),

  updateUser: (userId: string, settings: Partial<UserSettings>) =>
    fetchApi<{ success: boolean }>(`/api/settings/user/${userId}`, {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  getSystem: () =>
    fetchApi<{ settings: SystemSettings }>("/api/settings/system"),

  updateSystem: (settings: Partial<SystemSettings>) =>
    fetchApi<{ success: boolean }>("/api/settings/system", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  getSystemKey: (key: string) =>
    fetchApi<{ value: unknown }>(`/api/settings/system/${key}`),

  history: (userId: string) =>
    fetchApi<{ history: SettingsHistory[] }>(
      `/api/settings/history/user/${userId}`,
    ),
};

// ============================================================================
// ENFORCEMENT API
// ============================================================================
export const enforcementApi = {
  blocked: () => fetchApi<{ tasks: BlockedTask[] }>("/api/enforcement/blocked"),

  getBlocked: (taskId: string) =>
    fetchApi<{ task: BlockedTask }>(`/api/enforcement/blocked/${taskId}`),

  approve: (taskId: string, reason?: string) =>
    fetchApi<{ success: boolean }>(`/api/enforcement/approve/${taskId}`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  reject: (taskId: string, reason: string) =>
    fetchApi<{ success: boolean }>(`/api/enforcement/reject/${taskId}`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// ============================================================================
// GITHUB INTEGRATION API
// ============================================================================
export const githubApi = {
  status: () =>
    fetchApi<{ connected: boolean; user?: string }>("/api/github/status"),

  repos: () => fetchApi<{ repos: GithubRepo[] }>("/api/github/repos"),

  getRepo: (owner: string, repo: string) =>
    fetchApi<{ repo: GithubRepo }>(`/api/github/repos/${owner}/${repo}`),

  issues: (params?: { state?: string; labels?: string }) =>
    fetchApi<{ issues: GithubIssue[] }>(
      `/api/github/issues${params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : ""}`,
    ),

  createIssue: (data: { title: string; body: string; repo: string }) =>
    fetchApi<{ success: boolean; issue: GithubIssue }>("/api/github/issues", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  pulls: () => fetchApi<{ pulls: GithubPR[] }>("/api/github/pulls"),

  createPull: (data: {
    title: string;
    body: string;
    head: string;
    base: string;
    repo: string;
  }) =>
    fetchApi<{ success: boolean; pull: GithubPR }>("/api/github/pulls", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  comments: (issueId: string) =>
    fetchApi<{ comments: GithubComment[] }>(
      `/api/github/comments?issueId=${issueId}`,
    ),

  addComment: (issueId: string, body: string) =>
    fetchApi<{ success: boolean }>("/api/github/comments", {
      method: "POST",
      body: JSON.stringify({ issueId, body }),
    }),
};

// ============================================================================
// LINEAR INTEGRATION API
// ============================================================================
export const linearApi = {
  status: () => fetchApi<{ connected: boolean }>("/api/linear/status"),

  teams: () => fetchApi<{ teams: LinearTeam[] }>("/api/linear/teams"),

  issues: (params?: { teamId?: string; state?: string }) =>
    fetchApi<{ issues: LinearIssue[] }>(
      `/api/linear/issues${params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : ""}`,
    ),

  createIssue: (data: { title: string; description: string; teamId: string }) =>
    fetchApi<{ success: boolean; issue: LinearIssue }>("/api/linear/issues", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateIssue: (issueId: string, data: Partial<LinearIssue>) =>
    fetchApi<{ success: boolean }>(`/api/linear/issues/${issueId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  projects: () =>
    fetchApi<{ projects: LinearProject[] }>("/api/linear/projects"),

  states: () => fetchApi<{ states: LinearState[] }>("/api/linear/states"),

  labels: () => fetchApi<{ labels: LinearLabel[] }>("/api/linear/labels"),

  users: () => fetchApi<{ users: LinearUser[] }>("/api/linear/users"),
};

// ============================================================================
// WEBHOOKS API
// ============================================================================
export const webhooksApi = {
  list: () => fetchApi<{ webhooks: Webhook[] }>("/api/webhooks"),

  getById: (id: string) =>
    fetchApi<{ webhook: Webhook }>(`/api/webhooks/${id}`),

  create: (data: { url: string; events: string[]; secret?: string }) =>
    fetchApi<{ success: boolean; webhook: Webhook }>("/api/webhooks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Webhook>) =>
    fetchApi<{ success: boolean }>(`/api/webhooks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/api/webhooks/${id}`, { method: "DELETE" }),

  deliveries: (id: string) =>
    fetchApi<{ deliveries: WebhookDelivery[] }>(
      `/api/webhooks/${id}/deliveries`,
    ),

  allDeliveries: () =>
    fetchApi<{ deliveries: WebhookDelivery[] }>("/api/webhooks/deliveries/all"),

  test: (id: string) =>
    fetchApi<{ success: boolean }>("/api/webhooks/test", {
      method: "POST",
      body: JSON.stringify({ webhookId: id }),
    }),
};

// ============================================================================
// MODULES API
// ============================================================================
export const modulesApi = {
  list: () => fetchApi<{ modules: Module[] }>("/api/modules"),

  getById: (id: string) => fetchApi<{ module: Module }>(`/api/modules/${id}`),

  byCategory: (category: string) =>
    fetchApi<{ modules: Module[] }>(`/api/modules/category/${category}`),

  byStatus: (status: string) =>
    fetchApi<{ modules: Module[] }>(`/api/modules/status/${status}`),

  report: () => fetchApi<{ report: ModuleReport }>("/api/modules/report"),

  categories: () =>
    fetchApi<{ categories: string[] }>("/api/modules/categories"),
};

// ============================================================================
// BILLING API
// ============================================================================
export const billingApi = {
  usage: (userId: string) =>
    fetchApi<{ usage: BillingUsage }>(`/api/billing/usage/${userId}`),

  costs: (params?: { from?: string; to?: string }) =>
    fetchApi<{ costs: BillingCost[] }>(
      `/api/billing/costs${params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : ""}`,
    ),

  pricing: () => fetchApi<{ pricing: PricingTier[] }>("/api/billing/pricing"),
};

// ============================================================================
// DEMO API
// ============================================================================
export const demoApi = {
  createInvite: (data: { email: string; expiresInDays?: number }) =>
    fetchApi<{ success: boolean; code: string }>("/api/demo/invites", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getInvite: (code: string) =>
    fetchApi<{ invite: DemoInvite }>(`/api/demo/invites/${code}`),

  redeem: (code: string, userData: { email: string; name: string }) =>
    fetchApi<{ success: boolean; user: User }>("/api/demo/redeem", {
      method: "POST",
      body: JSON.stringify({ code, ...userData }),
    }),

  getUser: (userId: string) =>
    fetchApi<{ user: User }>(`/api/demo/users/${userId}`),

  stats: () => fetchApi<{ stats: DemoStats }>("/api/demo/stats"),
};

// ============================================================================
// HEALTH API
// ============================================================================
export const healthApi = {
  check: () => fetchApi<{ status: string; time: string }>("/api/health"),

  ready: () => fetchApi<{ ready: boolean }>("/api/health/ready"),

  live: () => fetchApi<{ live: boolean }>("/api/health/live"),
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
export interface User {
  id: string;
  email: string;
  role: "admin" | "user" | "demo";
  displayName?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "stopped";
  language: string;
  lastRun: string;
  executionCount: number;
}

export interface Task {
  id: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  priority: string;
  agentId?: string;
  createdAt: string;
  completedAt?: string;
  output?: string;
}

export interface ChatAgent {
  name: string;
  description: string;
  model: string;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  ts: string;
  kind: string;
  agentId?: string;
  taskId?: string;
  userId?: string;
  severity: "info" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
}

export interface StopScoreStats {
  total: number;
  avgScore: number;
  distribution: Record<string, number>;
}

export interface EventStats {
  total: number;
  byKind: Record<string, number>;
  bySeverity: Record<string, number>;
}

export interface OpsEvent {
  id: string;
  kind: string;
  message: string;
  timestamp: string;
  severity: string;
}

export interface OpsStats {
  uptime: number;
  activeAgents: number;
  tasksToday: number;
  errorsToday: number;
}

export interface BrainDoc {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: string;
}

export interface BrainSearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
}

export interface BrainStats {
  totalDocs: number;
  totalChunks: number;
  totalEmbeddings: number;
}

export interface MemoryChat {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  messageCount: number;
}

export interface MemoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  score: number;
  chatId: string;
}

export interface MemoryStats {
  totalChats: number;
  totalMessages: number;
  avgMessagesPerChat: number;
}

export interface UserSettings {
  theme: "light" | "dark" | "system";
  notifications: boolean;
  language: string;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  maxAgents: number;
  defaultModel: string;
}

export interface SettingsHistory {
  id: string;
  key: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: string;
  changedBy: string;
}

export interface BlockedTask {
  id: string;
  taskId: string;
  reason: string;
  stopScore: number;
  createdAt: string;
}

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  stars: number;
}

export interface GithubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  createdAt: string;
}

export interface GithubPR {
  id: number;
  number: number;
  title: string;
  state: string;
  head: string;
  base: string;
}

export interface GithubComment {
  id: number;
  body: string;
  createdAt: string;
  user: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearIssue {
  id: string;
  title: string;
  description: string;
  state: string;
  priority: number;
}

export interface LinearProject {
  id: string;
  name: string;
  state: string;
}

export interface LinearState {
  id: string;
  name: string;
  color: string;
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: number;
  deliveredAt: string;
}

export interface Module {
  id: string;
  name: string;
  category: string;
  status: "active" | "inactive" | "error";
  version: string;
}

export interface ModuleReport {
  total: number;
  active: number;
  inactive: number;
  errors: number;
}

export interface BillingUsage {
  tokens: number;
  requests: number;
  cost: number;
}

export interface BillingCost {
  date: string;
  amount: number;
  breakdown: Record<string, number>;
}

export interface PricingTier {
  name: string;
  price: number;
  features: string[];
}

export interface DemoInvite {
  code: string;
  email: string;
  expiresAt: string;
  redeemed: boolean;
}

export interface DemoStats {
  totalInvites: number;
  redeemed: number;
  active: number;
}

export default {
  auth: authApi,
  users: usersApi,
  agents: agentsApi,
  tasks: tasksApi,
  chat: chatApi,
  audit: auditApi,
  ops: opsApi,
  brain: brainApi,
  memory: memoryApi,
  settings: settingsApi,
  enforcement: enforcementApi,
  github: githubApi,
  linear: linearApi,
  webhooks: webhooksApi,
  modules: modulesApi,
  billing: billingApi,
  demo: demoApi,
  health: healthApi,
};
