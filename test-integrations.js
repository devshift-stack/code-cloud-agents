/**
 * Integration Test Script
 * Tests all 3 integrations: GitHub, Slack, Linear
 */

import "dotenv/config";
import { createGitHubClient } from "./src/integrations/github/client.js";
import { createSlackClient } from "./src/integrations/slack/client.js";
import { createLinearClient } from "./src/integrations/linear/client.js";

console.log("🧪 Testing Integrations...\n");

// Test GitHub
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("📦 GITHUB");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const github = createGitHubClient();
const githubStatus = await github.getStatus();

if (githubStatus.connected) {
  console.log("✅ GitHub connected");
  console.log(`   User: ${githubStatus.user}`);

  // List repos
  const repos = await github.listRepos();
  if (repos.success && repos.repos) {
    console.log(`   Repos: ${repos.repos.length} found`);
    console.log(`   Sample: ${repos.repos.slice(0, 3).map(r => r.name).join(", ")}`);
  }
} else {
  console.log(`❌ GitHub failed: ${githubStatus.error}`);
}

console.log("");

// Test Slack
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("💬 SLACK");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const slack = createSlackClient();
const slackStatus = await slack.getStatus();

if (slackStatus.connected) {
  console.log("✅ Slack connected");
  console.log(`   Team: ${slackStatus.team}`);
  console.log(`   Bot: ${slackStatus.user}`);

  // List channels
  const channels = await slack.listChannels();
  if (channels.success && channels.channels) {
    console.log(`   Channels: ${channels.channels.length} found`);
    const memberChannels = channels.channels.filter(c => c.isMember);
    console.log(`   Member of: ${memberChannels.length} channels`);
  }
} else {
  console.log(`❌ Slack failed: ${slackStatus.error}`);
}

console.log("");

// Test Linear
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🎯 LINEAR");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
const linear = createLinearClient();
const linearStatus = await linear.getStatus();

if (linearStatus.connected) {
  console.log("✅ Linear connected");
  console.log(`   Organization: ${linearStatus.organization}`);
  console.log(`   User: ${linearStatus.user}`);

  // List teams
  const teams = await linear.listTeams();
  if (teams.success && teams.teams) {
    console.log(`   Teams: ${teams.teams.length} found`);
    console.log(`   Names: ${teams.teams.map(t => t.name).join(", ")}`);
  }
} else {
  console.log(`❌ Linear failed: ${linearStatus.error}`);
}

console.log("");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("✅ All tests completed!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
