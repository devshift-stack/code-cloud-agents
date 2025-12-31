/**
 * Linear Webhook Event Workers
 *
 * Processes queued Linear webhook events:
 * - linear_issue - Issue events (create, update, remove)
 * - linear_comment - Comment events (create, update)
 * - linear_project - Project events (create, update)
 */

import type { QueueAdapter, QueueJob } from "../queue.js";
import type { Database } from "../../db/database.js";

export interface LinearIssueJobData {
  action: string; // create, update, remove
  type: string; // Issue
  data: {
    id: string;
    title: string;
    state?: { name: string };
    team?: { name: string };
    assignee?: { name: string };
    url: string;
  };
  webhookId: string;
}

export interface LinearCommentJobData {
  action: string; // create, update
  type: string; // Comment
  data: {
    id: string;
    body: string;
    issue?: {
      id: string;
      title: string;
    };
    user?: { name: string };
    url: string;
  };
  webhookId: string;
}

export interface LinearProjectJobData {
  action: string; // create, update
  type: string; // Project
  data: {
    id: string;
    name: string;
    state: string;
    lead?: { name: string };
    url: string;
  };
  webhookId: string;
}

/**
 * Handles Linear issue events
 * Processes issue created, updated, deleted
 */
async function handleIssueEvent(job: QueueJob, db: Database): Promise<void> {
  const data = job.data as unknown as LinearIssueJobData;

  console.log(
    `📋 Processing Linear issue event: ${data.data.title} (${data.action})`,
  );

  // Log to audit trail
  db.createAuditEntry({
    agent: "linear_worker",
    action: "process_issue",
    decision: "APPROVED",
    final_status: "COMPLETE",
    risk_level: "LOW",
    stop_score: 0,
    verified_artefacts: JSON.stringify({
      action: data.action,
      issue_id: data.data.id,
      issue_title: data.data.title,
      state: data.data.state?.name,
      team: data.data.team?.name,
      assignee: data.data.assignee?.name,
      url: data.data.url,
    }),
    missing_invalid_parts: "",
    required_next_action: "none",
  });

  // Action-specific handling
  if (data.action === "create") {
    console.log(`   ✨ New issue created: ${data.data.title}`);
    // TODO: Send Slack notification, create GitHub issue, etc.
  } else if (data.action === "update") {
    console.log(`   📝 Issue updated: ${data.data.title}`);
    // TODO: Update linked GitHub issue, notify assignee, etc.
  } else if (data.action === "remove") {
    console.log(`   🗑️  Issue removed: ${data.data.title}`);
    // TODO: Archive related data, notify team, etc.
  }

  // TODO: Add your custom logic here:
  // - Send Slack notification
  // - Sync to GitHub issues
  // - Update project board
  // - Send email notifications
  // - Update analytics/metrics
}

/**
 * Handles Linear comment events
 * Processes comments created, updated
 */
async function handleCommentEvent(job: QueueJob, db: Database): Promise<void> {
  const data = job.data as unknown as LinearCommentJobData;

  console.log(`💬 Processing Linear comment event (${data.action})`);

  // Log to audit trail
  db.createAuditEntry({
    agent: "linear_worker",
    action: "process_comment",
    decision: "APPROVED",
    final_status: "COMPLETE",
    risk_level: "LOW",
    stop_score: 0,
    verified_artefacts: JSON.stringify({
      action: data.action,
      comment_id: data.data.id,
      issue_id: data.data.issue?.id,
      issue_title: data.data.issue?.title,
      commenter: data.data.user?.name,
      body_length: data.data.body.length,
      url: data.data.url,
    }),
    missing_invalid_parts: "",
    required_next_action: "none",
  });

  if (data.action === "create") {
    console.log(`   ✨ New comment on: ${data.data.issue?.title}`);
    // TODO: Send notifications, sync to GitHub, etc.
  } else if (data.action === "update") {
    console.log(`   📝 Comment updated on: ${data.data.issue?.title}`);
    // TODO: Update synced comment in GitHub, etc.
  }

  // TODO: Add your custom logic here:
  // - Send Slack notification for mentions
  // - Sync comment to GitHub
  // - Notify mentioned users
  // - Trigger bot commands
}

/**
 * Handles Linear project events
 * Processes projects created, updated
 */
async function handleProjectEvent(job: QueueJob, db: Database): Promise<void> {
  const data = job.data as unknown as LinearProjectJobData;

  console.log(
    `📁 Processing Linear project event: ${data.data.name} (${data.action})`,
  );

  // Log to audit trail
  db.createAuditEntry({
    agent: "linear_worker",
    action: "process_project",
    decision: "APPROVED",
    final_status: "COMPLETE",
    risk_level: "LOW",
    stop_score: 0,
    verified_artefacts: JSON.stringify({
      action: data.action,
      project_id: data.data.id,
      project_name: data.data.name,
      state: data.data.state,
      lead: data.data.lead?.name,
      url: data.data.url,
    }),
    missing_invalid_parts: "",
    required_next_action: "none",
  });

  if (data.action === "create") {
    console.log(`   ✨ New project created: ${data.data.name}`);
    // TODO: Send notifications, create GitHub project, etc.
  } else if (data.action === "update") {
    console.log(
      `   📝 Project updated: ${data.data.name} (${data.data.state})`,
    );
    // TODO: Update linked GitHub project, notify team, etc.
  }

  // TODO: Add your custom logic here:
  // - Send Slack notification
  // - Create/update GitHub project
  // - Update roadmap dashboard
  // - Notify project lead
  // - Update analytics/metrics
}

/**
 * Registers Linear webhook event workers with the queue
 */
export function registerLinearWorkers(queue: QueueAdapter, db: Database): void {
  console.log("✅ Registering Linear webhook workers...");

  // Register issue event handler
  queue.process("linear_issue", async (job: QueueJob) => {
    try {
      await handleIssueEvent(job, db);
    } catch (error) {
      console.error(`❌ Linear issue worker failed:`, error);
      throw error; // Re-throw to mark job as failed
    }
  });

  // Register comment event handler
  queue.process("linear_comment", async (job: QueueJob) => {
    try {
      await handleCommentEvent(job, db);
    } catch (error) {
      console.error(`❌ Linear comment worker failed:`, error);
      throw error;
    }
  });

  // Register project event handler
  queue.process("linear_project", async (job: QueueJob) => {
    try {
      await handleProjectEvent(job, db);
    } catch (error) {
      console.error(`❌ Linear project worker failed:`, error);
      throw error;
    }
  });

  console.log("✅ Linear webhook workers registered:");
  console.log("   - linear_issue");
  console.log("   - linear_comment");
  console.log("   - linear_project");
}
