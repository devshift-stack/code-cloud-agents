/**
 * Module Registry - Central registry of all system modules
 */

import type { Module } from "./moduleStatus.ts";

export const MODULES: Module[] = [
  // Core Modules
  {
    id: "database",
    name: "Database (SQLite)",
    description: "SQLite database with WAL mode",
    category: "core",
    status: "ready",
    testsPassing: 0,
    testsTotal: 0,
    priority: "high",
  },
  {
    id: "queue",
    name: "Task Queue",
    description: "In-memory task queue",
    category: "core",
    status: "ready-untested",
    priority: "high",
  },
  {
    id: "enforcement-gate",
    name: "Enforcement Gate",
    description: "STOP Score enforcement system",
    category: "core",
    status: "ready",
    testsPassing: 14,
    testsTotal: 15,
    knownIssues: ["1 test has wrong assertion (expected HIGH, got MEDIUM)"],
    priority: "high",
  },
  {
    id: "supervisor",
    name: "Engineering Lead Supervisor",
    description: "Main supervisor agent",
    category: "core",
    status: "ready-untested",
    priority: "high",
  },

  // Integrations
  {
    id: "slack",
    name: "Slack Integration",
    description: "Send messages to Slack channels",
    category: "integrations",
    status: "ready-untested",
    dependencies: ["webhooks"],
    priority: "high",
  },
  {
    id: "github",
    name: "GitHub Integration",
    description: "Create issues, check PR status",
    category: "integrations",
    status: "ready-untested",
    dependencies: [],
    priority: "high",
  },
  {
    id: "linear",
    name: "Linear Integration",
    description: "Create and manage Linear issues",
    category: "integrations",
    status: "ready-untested",
    dependencies: [],
    priority: "high",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Integration",
    description: "Send WhatsApp messages",
    category: "integrations",
    status: "ready-untested",
    priority: "medium",
  },
  {
    id: "voice",
    name: "Voice Integration",
    description: "Text-to-speech and speech-to-text",
    category: "integrations",
    status: "ready-untested",
    priority: "medium",
  },
  {
    id: "google",
    name: "Google Integration",
    description: "Google Workspace integration",
    category: "integrations",
    status: "ready-untested",
    priority: "medium",
  },
  {
    id: "icloud",
    name: "iCloud Integration",
    description: "iCloud sync integration",
    category: "integrations",
    status: "ready-untested",
    priority: "low",
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Incoming and outgoing webhooks",
    category: "integrations",
    status: "ready-untested",
    priority: "high",
  },

  // Billing
  {
    id: "cost-tracking",
    name: "Cost Tracking",
    description: "Track API costs per model/user/repo/task",
    category: "billing",
    status: "ready-untested",
    priority: "high",
  },
  {
    id: "user-limits",
    name: "User Limits",
    description: "Monthly spending limits per user",
    category: "billing",
    status: "ready-untested",
    dependencies: ["cost-tracking"],
    priority: "high",
  },
  {
    id: "model-selector",
    name: "Model Selector",
    description: "Automatic model selection to minimize costs",
    category: "billing",
    status: "ready-untested",
    priority: "high",
  },

  // Authentication
  {
    id: "auth-email",
    name: "Email/Password Auth",
    description: "User authentication with email/password",
    category: "auth",
    status: "not-started",
    priority: "high",
  },
  {
    id: "auth-google",
    name: "Google Workspace Auth",
    description: "OAuth with Google Workspace",
    category: "auth",
    status: "not-started",
    priority: "high",
  },
  {
    id: "admin-access",
    name: "Admin Access",
    description: "Admin dashboard and controls",
    category: "auth",
    status: "not-started",
    priority: "high",
  },
  {
    id: "ghost-admin",
    name: "Ghost Admin Access",
    description: "Hidden admin access (versteckt)",
    category: "auth",
    status: "not-started",
    knownIssues: ["Needs stealth implementation"],
    priority: "high",
  },
  {
    id: "vpn-tunnel",
    name: "VPN Tunnel Config",
    description: "Einmalige Tunnel-Einrichtung für User",
    category: "auth",
    status: "not-started",
    priority: "high",
  },

  // UI
  {
    id: "dashboard",
    name: "Dashboard UI",
    description: "React dashboard with Vite",
    category: "ui",
    status: "ready-untested",
    knownIssues: ["Needs design improvements (Agent A5)"],
    priority: "medium",
  },
  {
    id: "design-system",
    name: "Design System",
    description: "Tailwind + shadcn/ui components",
    category: "ui",
    status: "in-progress",
    knownIssues: ["Needs modernization (Agent A5)"],
    priority: "medium",
  },

  // Advanced Features
  {
    id: "mcp-server",
    name: "MCP Server Integration",
    description: "Model Context Protocol server setup",
    category: "advanced",
    status: "not-started",
    priority: "medium",
  },
];

/**
 * Get module by ID
 */
export function getModule(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id);
}

/**
 * Get modules by category
 */
export function getModulesByCategory(category: string): Module[] {
  return MODULES.filter((m) => m.category === category);
}

/**
 * Get modules by status
 */
export function getModulesByStatus(status: Module["status"]): Module[] {
  return MODULES.filter((m) => m.status === status);
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
  return Array.from(new Set(MODULES.map((m) => m.category)));
}
