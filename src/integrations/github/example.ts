/**
 * GitHub Integration - Usage Examples
 */

import { createGitHubClient } from "./client.js";

/**
 * Example 1: Create an issue
 */
export async function exampleCreateIssue() {
  const github = createGitHubClient();

  const result = await github.createIssue(
    "dsactivi-2/Optimizecodecloudagents",
    {
      title: "Test Issue from Agent",
      body: "This is a test issue created by the GitHub integration.",
      labels: ["bug", "enhancement"],
      assignees: ["dsactivi"],
    },
  );

  if (result.success && result.issue) {
    console.log(`✅ Issue created: ${result.issue.htmlUrl}`);
    console.log(`   Issue #${result.issue.number}`);
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * Example 2: List repositories
 */
export async function exampleListRepos() {
  const github = createGitHubClient();

  const result = await github.listRepos();

  if (result.success && result.repos) {
    console.log(`✅ Found ${result.repos.length} repositories:`);
    result.repos.slice(0, 5).forEach((repo) => {
      console.log(
        `   - ${repo.fullName} ${repo.private ? "(private)" : "(public)"}`,
      );
    });
  } else {
    console.error(`❌ Failed: ${result.error}`);
  }
}

/**
 * Example 3: Check connection status
 */
export async function exampleCheckStatus() {
  const github = createGitHubClient();

  const result = await github.getStatus();

  if (result.connected && result.user) {
    console.log(`✅ Connected as: ${result.user}`);
  } else {
    console.error(`❌ Not connected: ${result.error}`);
  }
}

/**
 * Example 4: Use with custom config (not from ENV)
 */
export async function exampleCustomConfig() {
  const github = createGitHubClient({
    token: "ghp_your_token_here",
    org: "your-org",
  });

  const result = await github.getStatus();
  console.log(result);
}

// Run examples (uncomment to test)
// exampleCheckStatus();
// exampleListRepos();
// exampleCreateIssue();
// exampleCustomConfig();
