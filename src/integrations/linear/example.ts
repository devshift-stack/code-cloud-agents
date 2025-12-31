/**
 * Linear Integration - Usage Examples
 */

import { createLinearClient } from "./client.js";

/**
 * Example 1: Check connection status
 */
export async function exampleCheckStatus() {
  const linear = createLinearClient();

  const status = await linear.getStatus();

  if (status.connected) {
    console.log(`✅ Connected to Linear`);
    console.log(`   User: ${status.user}`);
    console.log(`   Organization: ${status.organization}`);
  } else {
    console.error(`❌ Not connected: ${status.error}`);
  }
}

/**
 * Example 2: List all teams
 */
export async function exampleListTeams() {
  const linear = createLinearClient();

  const result = await linear.listTeams();

  if (result.success && result.teams) {
    console.log(`✅ Found ${result.teams.length} teams:`);
    result.teams.forEach((team) => {
      console.log(`   - ${team.name} (${team.key})`);
    });
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * Example 3: Create a simple issue
 */
export async function exampleCreateSimpleIssue() {
  const linear = createLinearClient();

  const result = await linear.createIssue({
    title: "Implement GitHub integration",
    description: "Add full GitHub API integration with Octokit",
    priority: 2, // High priority
  });

  if (result.success && result.issue) {
    console.log(`✅ Issue created: ${result.issue.identifier}`);
    console.log(`   Title: ${result.issue.title}`);
    console.log(`   URL: ${result.issue.url}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * Example 4: Create issue with full options
 */
export async function exampleCreateFullIssue() {
  const linear = createLinearClient();

  // First, get team and state IDs
  const teams = await linear.listTeams();
  if (!teams.success || !teams.teams || teams.teams.length === 0) {
    console.error("No teams found");
    return;
  }

  const teamId = teams.teams[0].id;

  // Get workflow states
  const states = await linear.listWorkflowStates(teamId);
  const todoState = states.states?.find((s) => s.type === "unstarted");

  // Get labels
  const labels = await linear.listLabels(teamId);
  const bugLabel = labels.labels?.find((l) =>
    l.name.toLowerCase().includes("bug"),
  );

  // Create issue
  const result = await linear.createIssue({
    teamId,
    title: "Fix login authentication bug",
    description: `## Problem
Login fails with OAuth provider.

## Steps to Reproduce
1. Go to /login
2. Click "Login with GitHub"
3. Error occurs

## Expected Behavior
Should redirect to GitHub OAuth

## Actual Behavior
Shows 500 error`,
    priority: 1, // Urgent
    stateId: todoState?.id,
    labelIds: bugLabel ? [bugLabel.id] : undefined,
  });

  if (result.success && result.issue) {
    console.log(`✅ Full issue created: ${result.issue.identifier}`);
    console.log(`   URL: ${result.issue.url}`);
  }
}

/**
 * Example 5: List workflow states for a team
 */
export async function exampleListWorkflowStates() {
  const linear = createLinearClient();

  // Get first team
  const teams = await linear.listTeams();
  if (!teams.success || !teams.teams || teams.teams.length === 0) {
    console.error("No teams found");
    return;
  }

  const teamId = teams.teams[0].id;

  const result = await linear.listWorkflowStates(teamId);

  if (result.success && result.states) {
    console.log(`✅ Workflow states for team:`);
    result.states.forEach((state) => {
      console.log(`   - ${state.name} (${state.type})`);
    });
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * Example 6: List all labels
 */
export async function exampleListLabels() {
  const linear = createLinearClient();

  const result = await linear.listLabels();

  if (result.success && result.labels) {
    console.log(`✅ Found ${result.labels.length} labels:`);
    result.labels.slice(0, 10).forEach((label) => {
      console.log(`   - ${label.name} (${label.color})`);
    });
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * Example 7: STOP Score Alert → Linear Issue
 */
export async function exampleStopScoreIssue() {
  const linear = createLinearClient();

  const stopScore = 75;
  const taskName = "Database Migration";

  const result = await linear.createIssue({
    title: `🚨 STOP Required: ${taskName}`,
    description: `## STOP Score Alert

**STOP Score:** ${stopScore}/100 (CRITICAL)

**Task:** ${taskName}

**Issues Found:**
- Missing rollback plan
- No test evidence provided
- Security review required

**Action Required:**
1. Create rollback procedure
2. Provide test results
3. Security team approval

**Detected by:** Engineering Lead Supervisor`,
    priority: 1, // Urgent
  });

  if (result.success && result.issue) {
    console.log(`✅ STOP alert issue created: ${result.issue.url}`);
  }
}

/**
 * Example 8: GitHub Issue → Linear Issue (Integration)
 */
export async function exampleGitHubToLinear() {
  const linear = createLinearClient();

  // Simulate GitHub issue data
  const githubIssue = {
    number: 42,
    title: "Feature: Add dark mode",
    body: "Users are requesting dark mode support",
    labels: ["enhancement", "ui"],
    url: "https://github.com/owner/repo/issues/42",
  };

  const result = await linear.createIssue({
    title: `[GitHub #${githubIssue.number}] ${githubIssue.title}`,
    description: `${githubIssue.body}

---
**Source:** ${githubIssue.url}
**Labels:** ${githubIssue.labels.join(", ")}`,
    priority: 3, // Medium
  });

  if (result.success && result.issue) {
    console.log(`✅ GitHub issue synced to Linear: ${result.issue.identifier}`);
  }
}

// Run examples (uncomment to test)
// exampleCheckStatus();
// exampleListTeams();
// exampleCreateSimpleIssue();
// exampleCreateFullIssue();
// exampleListWorkflowStates();
// exampleListLabels();
// exampleStopScoreIssue();
// exampleGitHubToLinear();
