/**
 * GitHub Integration REST API
 *
 * Provides REST endpoints for GitHub integration:
 * - Repositories (list, get)
 * - Issues (list, create)
 * - Pull Requests (list, create)
 * - Comments (list, create)
 */

import { Router } from "express";
import { z } from "zod";
import { createGitHubClient } from "../integrations/github/client.js";
import { Octokit } from "@octokit/rest";

// Request validation schemas
const CreateIssueSchema = z.object({
  repo: z.string().regex(/^[\w-]+\/[\w-]+$/, "Must be in format 'owner/repo'"),
  title: z.string().min(1).max(200),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
});

const CreatePullRequestSchema = z.object({
  repo: z.string().regex(/^[\w-]+\/[\w-]+$/, "Must be in format 'owner/repo'"),
  title: z.string().min(1).max(200),
  body: z.string().optional(),
  head: z.string().min(1),
  base: z.string().min(1),
});

const CreateCommentSchema = z.object({
  repo: z.string().regex(/^[\w-]+\/[\w-]+$/, "Must be in format 'owner/repo'"),
  issue_number: z.number().int().positive(),
  body: z.string().min(1),
});

/**
 * Creates GitHub REST API router
 * @returns Express Router with GitHub endpoints
 */
export function createGitHubRouter(): Router {
  const router = Router();

  // Initialize GitHub client
  const githubClient = createGitHubClient();
  const token = process.env.GITHUB_TOKEN || "";
  let octokit: Octokit | null = null;

  if (token) {
    octokit = new Octokit({ auth: token });
  }

  /**
   * GET /api/github/status
   * Get GitHub connection status
   */
  router.get("/status", async (_req, res) => {
    try {
      if (!githubClient.isEnabled()) {
        return res.status(200).json({
          connected: false,
          error:
            "GitHub integration is disabled. Set GITHUB_ENABLED=true in .env",
        });
      }

      const status = await githubClient.getStatus();
      res.json(status);
    } catch (error) {
      console.error("GitHub status check failed:", error);
      res.status(500).json({
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/github/repos
   * List repositories for authenticated user or org
   */
  router.get("/repos", async (_req, res) => {
    try {
      if (!githubClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "GitHub integration is disabled",
        });
      }

      const result = await githubClient.listRepos();

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Failed to list repos:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/github/repos/:owner/:repo
   * Get specific repository details
   */
  router.get("/repos/:owner/:repo", async (req, res) => {
    try {
      if (!githubClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "GitHub integration is disabled",
        });
      }

      if (!octokit) {
        return res.status(400).json({
          success: false,
          error: "GitHub token not configured",
        });
      }

      const { owner, repo } = req.params;

      const response = await octokit.rest.repos.get({
        owner,
        repo,
      });

      res.json({
        success: true,
        repo: {
          name: response.data.name,
          fullName: response.data.full_name,
          description: response.data.description,
          private: response.data.private,
          url: response.data.html_url,
          stars: response.data.stargazers_count,
          forks: response.data.forks_count,
          language: response.data.language,
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at,
        },
      });
    } catch (error) {
      console.error("Failed to get repo:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/github/issues
   * List issues (query params: repo, state, labels)
   */
  router.get("/issues", async (req, res) => {
    try {
      if (!githubClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "GitHub integration is disabled",
        });
      }

      if (!octokit) {
        return res.status(400).json({
          success: false,
          error: "GitHub token not configured",
        });
      }

      const repo = req.query.repo as string;
      if (!repo || !repo.includes("/")) {
        return res.status(400).json({
          success: false,
          error: "Query parameter 'repo' required in format 'owner/repo'",
        });
      }

      const [owner, repoName] = repo.split("/");
      const state = (req.query.state as "open" | "closed" | "all") || "open";
      const labels = req.query.labels as string | undefined;

      const response = await octokit.rest.issues.listForRepo({
        owner,
        repo: repoName,
        state,
        labels,
        per_page: 100,
      });

      const issues = response.data.map((issue) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        url: issue.html_url,
        labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name)),
        assignees: issue.assignees?.map((a) => a.login) || [],
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
      }));

      res.json({
        success: true,
        issues,
      });
    } catch (error) {
      console.error("Failed to list issues:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/github/issues
   * Create a new issue
   */
  router.post("/issues", async (req, res) => {
    try {
      if (!githubClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "GitHub integration is disabled",
        });
      }

      const parsed = CreateIssueSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const result = await githubClient.createIssue(parsed.data.repo, {
        title: parsed.data.title,
        body: parsed.data.body || "",
        labels: parsed.data.labels,
        assignees: parsed.data.assignees,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Failed to create issue:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/github/pulls
   * List pull requests (query params: repo, state)
   */
  router.get("/pulls", async (req, res) => {
    try {
      if (!githubClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "GitHub integration is disabled",
        });
      }

      if (!octokit) {
        return res.status(400).json({
          success: false,
          error: "GitHub token not configured",
        });
      }

      const repo = req.query.repo as string;
      if (!repo || !repo.includes("/")) {
        return res.status(400).json({
          success: false,
          error: "Query parameter 'repo' required in format 'owner/repo'",
        });
      }

      const [owner, repoName] = repo.split("/");
      const state = (req.query.state as "open" | "closed" | "all") || "open";

      const response = await octokit.rest.pulls.list({
        owner,
        repo: repoName,
        state,
        per_page: 100,
      });

      const pulls = response.data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        url: pr.html_url,
        head: pr.head.ref,
        base: pr.base.ref,
        user: pr.user?.login,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
      }));

      res.json({
        success: true,
        pulls,
      });
    } catch (error) {
      console.error("Failed to list pull requests:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/github/pulls
   * Create a new pull request
   */
  router.post("/pulls", async (req, res) => {
    try {
      if (!githubClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "GitHub integration is disabled",
        });
      }

      if (!octokit) {
        return res.status(400).json({
          success: false,
          error: "GitHub token not configured",
        });
      }

      const parsed = CreatePullRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const [owner, repoName] = parsed.data.repo.split("/");

      const response = await octokit.rest.pulls.create({
        owner,
        repo: repoName,
        title: parsed.data.title,
        body: parsed.data.body,
        head: parsed.data.head,
        base: parsed.data.base,
      });

      res.status(201).json({
        success: true,
        pull: {
          number: response.data.number,
          url: response.data.html_url,
          state: response.data.state,
        },
      });
    } catch (error) {
      console.error("Failed to create pull request:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/github/comments
   * List issue/PR comments (query params: repo, issue_number)
   */
  router.get("/comments", async (req, res) => {
    try {
      if (!githubClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "GitHub integration is disabled",
        });
      }

      if (!octokit) {
        return res.status(400).json({
          success: false,
          error: "GitHub token not configured",
        });
      }

      const repo = req.query.repo as string;
      const issueNumber = req.query.issue_number as string;

      if (!repo || !repo.includes("/")) {
        return res.status(400).json({
          success: false,
          error: "Query parameter 'repo' required in format 'owner/repo'",
        });
      }

      if (!issueNumber) {
        return res.status(400).json({
          success: false,
          error: "Query parameter 'issue_number' required",
        });
      }

      const [owner, repoName] = repo.split("/");

      const response = await octokit.rest.issues.listComments({
        owner,
        repo: repoName,
        issue_number: parseInt(issueNumber, 10),
        per_page: 100,
      });

      const comments = response.data.map((comment) => ({
        id: comment.id,
        body: comment.body,
        user: comment.user?.login,
        url: comment.html_url,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
      }));

      res.json({
        success: true,
        comments,
      });
    } catch (error) {
      console.error("Failed to list comments:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/github/comments
   * Create a new comment on issue/PR
   */
  router.post("/comments", async (req, res) => {
    try {
      if (!githubClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "GitHub integration is disabled",
        });
      }

      if (!octokit) {
        return res.status(400).json({
          success: false,
          error: "GitHub token not configured",
        });
      }

      const parsed = CreateCommentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const [owner, repoName] = parsed.data.repo.split("/");

      const response = await octokit.rest.issues.createComment({
        owner,
        repo: repoName,
        issue_number: parsed.data.issue_number,
        body: parsed.data.body,
      });

      res.status(201).json({
        success: true,
        comment: {
          id: response.data.id,
          url: response.data.html_url,
        },
      });
    } catch (error) {
      console.error("Failed to create comment:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
