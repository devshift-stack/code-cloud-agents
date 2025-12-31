/**
 * Module Status Tracking
 *
 * Visual status indicators for all system modules
 */

export type ModuleStatus =
  | "ready" // 🟢 Grün: Fertig + funktioniert + positive Tests
  | "ready-untested" // 🟢/🟡 Halb grün/gelb: Fertig ohne Tests
  | "buggy" // 🟡 Gelb: Fertig eigentlich, aber Bugs
  | "in-progress" // 🔴 Rot: Angefangen aber nicht fertig
  | "not-started"; // ⚫ Schwarz: Noch nicht angefangen

export interface Module {
  id: string;
  name: string;
  description: string;
  category:
    | "core"
    | "integrations"
    | "billing"
    | "auth"
    | "monitoring"
    | "ui"
    | "advanced";
  status: ModuleStatus;
  lastTested?: string;
  testsPassing?: number;
  testsTotal?: number;
  knownIssues?: string[];
  dependencies?: string[];
  priority: "high" | "medium" | "low";
}

export interface ModuleStatusReport {
  totalModules: number;
  byStatus: Record<ModuleStatus, number>;
  byCategory: Record<string, Module[]>;
  lastUpdated: string;
}

/**
 * Get status badge configuration
 */
export function getStatusBadge(status: ModuleStatus): {
  label: string;
  color: string;
  bgColor: string;
  gradient?: string;
} {
  switch (status) {
    case "ready":
      return {
        label: "Ready",
        color: "#FFFFFF",
        bgColor: "#10B981", // Green
      };

    case "ready-untested":
      return {
        label: "Ready (Untested)",
        color: "#000000",
        bgColor: "#10B981",
        gradient: "linear-gradient(135deg, #10B981 50%, #F59E0B 50%)", // Green/Yellow split
      };

    case "buggy":
      return {
        label: "Has Bugs",
        color: "#000000",
        bgColor: "#F59E0B", // Yellow
      };

    case "in-progress":
      return {
        label: "In Progress",
        color: "#FFFFFF",
        bgColor: "#EF4444", // Red
      };

    case "not-started":
      return {
        label: "Not Started",
        color: "#FFFFFF",
        bgColor: "#1F2937", // Dark gray/black
      };
  }
}

/**
 * Determine module status automatically based on tests and issues
 */
export function determineStatus(module: {
  testsPassing?: number;
  testsTotal?: number;
  knownIssues?: string[];
}): ModuleStatus {
  const { testsPassing, testsTotal, knownIssues } = module;

  // Not started: no tests, no issues reported
  if (testsPassing === undefined && testsTotal === undefined) {
    return knownIssues && knownIssues.length > 0
      ? "in-progress"
      : "not-started";
  }

  // Ready: all tests passing, no known issues
  if (
    testsPassing !== undefined &&
    testsTotal !== undefined &&
    testsPassing === testsTotal &&
    testsTotal > 0 &&
    (!knownIssues || knownIssues.length === 0)
  ) {
    return "ready";
  }

  // Ready but untested: no tests but no known issues
  if (
    testsPassing === undefined &&
    testsTotal === 0 &&
    (!knownIssues || knownIssues.length === 0)
  ) {
    return "ready-untested";
  }

  // Buggy: has known issues or failing tests
  if (
    (knownIssues && knownIssues.length > 0) ||
    (testsPassing !== undefined && testsPassing < testsTotal!)
  ) {
    return "buggy";
  }

  // In progress: partial implementation
  return "in-progress";
}
