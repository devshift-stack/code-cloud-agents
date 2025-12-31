/**
 * GitHub Webhook Event Workers
 *
 * Processes queued GitHub webhook events:
 * - github_push - Code push events
 * - github_pull_request - PR events (opened, merged, closed, etc.)
 * - github_issues - Issue events (opened, closed, labeled, etc.)
 * - github_issue_comment - Comment events
 */

import type { QueueAdapter, QueueJob } from "../queue.js";
import type { Database } from "../../db/database.js";

export interface GitHubPushJobData {
  repository: string;
  ref: string;
  commits: Array<{
    id: string;
    message: string;
    author: { name: string; email: string };
    url: string;
  }>;
  sender: string;
}

export interface GitHubPullRequestJobData {
  repository: string;
  action: string;
  pullRequest: {
    number: number;
    title: string;
    state: string;
    html_url: string;
    user: { login: string };
  };
  sender: string;
}

export interface GitHubIssuesJobData {
  repository: string;
  action: string;
  issue: {
    number: number;
    title: string;
    state: string;
    html_url: string;
    user: { login: string };
  };
  sender: string;
}

export interface GitHubIssueCommentJobData {
  repository: string;
  action: string;
  issue: {
    number: number;
    title: string;
  };
  comment: {
    id: number;
    body: string;
    html_url: string;
    user: { login: string };
  };
  sender: string;
}

/**
 * Handles GitHub push events
 * Logs commit information and could trigger CI/CD, notifications, etc.
 */
async function handlePushEvent(job: QueueJob, db: Database): Promise<void> {
  const data = job.data as unknown as GitHubPushJobData;

  console.log(
    `📦 Processing GitHub push event: ${data.repository} (${data.ref})`,
  );
  console.log(`   Commits: ${data.commits.length}`);

  // Log to audit trail
  db.createAuditEntry({
    agent: "github_worker",
    action: "process_push",
    decision: "APPROVED",
    final_status: "COMPLETE",
    risk_level: "LOW",
    stop_score: 0,
    verified_artefacts: JSON.stringify({
      repository: data.repository,
      ref: data.ref,
      commitCount: data.commits.length,
      sender: data.sender,
      commits: data.commits.map((c) => ({
        id: c.id.substring(0, 7),
        message: c.message.split("\n")[0],
        author: c.author.name,
      })),
    }),
    missing_invalid_parts: "",
    required_next_action: "none",
  });

  // TODO: Add your custom logic here:
  // - Send Slack notification
  // - Trigger CI/CD pipeline
  // - Update dashboard metrics
  // - Notify relevant team members
}

/**
 * Handles GitHub pull request events
 * Processes PR opened, closed, merged, review requested, etc.
 */
async function handlePullRequestEvent(
  job: QueueJob,
  db: Database,
): Promise<void> {
  const data = job.data as unknown as GitHubPullRequestJobData;

  console.log(
    `🔀 Processing GitHub PR event: ${data.repository} #${data.pullRequest.number} (${data.action})`,
  );

  // Log to audit trail
  db.createAuditEntry({
    agent: "github_worker",
    action: "process_pull_request",
    decision: "APPROVED",
    final_status: "COMPLETE",
    risk_level: "LOW",
    stop_score: 0,
    verified_artefacts: JSON.stringify({
      repository: data.repository,
      action: data.action,
      pr_number: data.pullRequest.number,
      pr_title: data.pullRequest.title,
      pr_state: data.pullRequest.state,
      sender: data.sender,
      url: data.pullRequest.html_url,
    }),
    missing_invalid_parts: "",
    required_next_action: "none",
  });

  // TODO: Add your custom logic here:
  // - Send Slack notification for PR opened/merged
  // - Request code review
  // - Run automated tests
  // - Update project board
  // - Check for merge conflicts
}

/**
 * Handles GitHub issues events
 * Processes issue opened, closed, labeled, assigned, etc.
 */
async function handleIssuesEvent(job: QueueJob, db: Database): Promise<void> {
  const data = job.data as unknown as GitHubIssuesJobData;

  console.log(
    `🐛 Processing GitHub issue event: ${data.repository} #${data.issue.number} (${data.action})`,
  );

  // Log to audit trail
  db.createAuditEntry({
    agent: "github_worker",
    action: "process_issues",
    decision: "APPROVED",
    final_status: "COMPLETE",
    risk_level: "LOW",
    stop_score: 0,
    verified_artefacts: JSON.stringify({
      repository: data.repository,
      action: data.action,
      issue_number: data.issue.number,
      issue_title: data.issue.title,
      issue_state: data.issue.state,
      sender: data.sender,
      url: data.issue.html_url,
    }),
    missing_invalid_parts: "",
    required_next_action: "none",
  });

  // TODO: Add your custom logic here:
  // - Send Slack notification
  // - Auto-assign based on labels
  // - Create Linear issue for tracking
  // - Update project board
  // - Send email notifications
}

/**
 * Handles GitHub issue comment events
 * Processes comments created, edited, deleted
 */
async function handleIssueCommentEvent(
  job: QueueJob,
  db: Database,
): Promise<void> {
  const data = job.data as unknown as GitHubIssueCommentJobData;

  console.log(
    `💬 Processing GitHub comment event: ${data.repository} #${data.issue.number} (${data.action})`,
  );

  // Log to audit trail
  db.createAuditEntry({
    agent: "github_worker",
    action: "process_issue_comment",
    decision: "APPROVED",
    final_status: "COMPLETE",
    risk_level: "LOW",
    stop_score: 0,
    verified_artefacts: JSON.stringify({
      repository: data.repository,
      action: data.action,
      issue_number: data.issue.number,
      comment_id: data.comment.id,
      commenter: data.comment.user.login,
      sender: data.sender,
      url: data.comment.html_url,
      body_length: data.comment.body.length,
    }),
    missing_invalid_parts: "",
    required_next_action: "none",
  });

  // TODO: Add your custom logic here:
  // - Send Slack notification for mentions
  // - Trigger bot commands (e.g., /review, /deploy)
  // - Update issue based on comment
  // - Sync comment to Linear
}

/**
 * Registers GitHub webhook event workers with the queue
 */
export function registerGitHubWorkers(queue: QueueAdapter, db: Database): void {
  console.log("✅ Registering GitHub webhook workers...");

  // Register push event handler
  queue.process("github_push", async (job: QueueJob) => {
    try {
      await handlePushEvent(job, db);
    } catch (error) {
      console.error(`❌ GitHub push worker failed:`, error);
      throw error; // Re-throw to mark job as failed
    }
  });

  // Register pull request event handler
  queue.process("github_pull_request", async (job: QueueJob) => {
    try {
      await handlePullRequestEvent(job, db);
    } catch (error) {
      console.error(`❌ GitHub pull_request worker failed:`, error);
      throw error;
    }
  });

  // Register issues event handler
  queue.process("github_issues", async (job: QueueJob) => {
    try {
      await handleIssuesEvent(job, db);
    } catch (error) {
      console.error(`❌ GitHub issues worker failed:`, error);
      throw error;
    }
  });

  // Register issue comment event handler
  queue.process("github_issue_comment", async (job: QueueJob) => {
    try {
      await handleIssueCommentEvent(job, db);
    } catch (error) {
      console.error(`❌ GitHub issue_comment worker failed:`, error);
      throw error;
    }
  });

  console.log("✅ GitHub webhook workers registered:");
  console.log("   - github_push");
  console.log("   - github_pull_request");
  console.log("   - github_issues");
  console.log("   - github_issue_comment");
}
