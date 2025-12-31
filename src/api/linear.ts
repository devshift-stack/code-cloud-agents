/**
 * Linear Integration REST API
 *
 * Provides REST endpoints for Linear integration:
 * - Teams (list)
 * - Issues (list, create)
 * - Projects (list, create)
 * - Workflow States (list)
 * - Labels (list)
 * - Users (list)
 */

import { Router } from "express";
import { z } from "zod";
import { createLinearClient } from "../integrations/linear/client.js";
import { LinearClient as LinearSDK } from "@linear/sdk";

// Request validation schemas
const CreateIssueSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  teamId: z.string().optional(),
  priority: z.number().int().min(0).max(4).optional(),
  stateId: z.string().optional(),
  assigneeId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  projectId: z.string().optional(),
});

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  teamIds: z.array(z.string()).min(1),
  leadId: z.string().optional(),
});

const UpdateIssueSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(4).optional(),
  stateId: z.string().optional(),
  assigneeId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

const CreateCommentSchema = z.object({
  issueId: z.string().min(1),
  body: z.string().min(1),
});

/**
 * Creates Linear REST API router
 * @returns Express Router with Linear endpoints
 */
export function createLinearRouter(): Router {
  const router = Router();

  // Initialize Linear client
  const linearClient = createLinearClient();
  const apiKey = process.env.LINEAR_API_KEY || "";
  let sdk: LinearSDK | null = null;

  if (apiKey) {
    sdk = new LinearSDK({ apiKey });
  }

  /**
   * GET /api/linear/status
   * Get Linear connection status
   */
  router.get("/status", async (_req, res) => {
    try {
      if (!linearClient.isEnabled()) {
        return res.status(200).json({
          connected: false,
          error:
            "Linear integration is disabled. Set LINEAR_ENABLED=true in .env",
        });
      }

      const status = await linearClient.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Linear status check failed:", error);
      res.status(500).json({
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/linear/teams
   * List all teams
   */
  router.get("/teams", async (_req, res) => {
    try {
      if (!linearClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "Linear integration is disabled",
        });
      }

      const result = await linearClient.listTeams();

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Failed to list teams:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/linear/issues
   * List issues (query params: teamId, state, limit)
   */
  router.get("/issues", async (req, res) => {
    try {
      if (!linearClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "Linear integration is disabled",
        });
      }

      if (!sdk) {
        return res.status(400).json({
          success: false,
          error: "Linear API key not configured",
        });
      }

      const teamId = req.query.teamId as string | undefined;
      const stateType = req.query.state as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      // Build filter
      const filter: Record<string, unknown> = {};
      if (teamId) {
        filter.team = { id: { eq: teamId } };
      }
      if (stateType) {
        filter.state = { type: { eq: stateType } };
      }

      const issuesResponse = await sdk.issues({
        filter,
        first: limit,
      });

      const issues = await Promise.all(
        issuesResponse.nodes.map(async (issue) => ({
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          url: issue.url,
          state: {
            id: (issue.state as any)?.id,
            name: (issue.state as any)?.name,
            type: (issue.state as any)?.type,
          },
          team: {
            id: (issue.team as any)?.id,
            name: (issue.team as any)?.name,
            key: (issue.team as any)?.key,
          },
          assignee: issue.assignee
            ? {
                id: (issue.assignee as any).id,
                name: (issue.assignee as any).name,
              }
            : null,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
        })),
      );

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
   * POST /api/linear/issues
   * Create a new issue
   */
  router.post("/issues", async (req, res) => {
    try {
      if (!linearClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "Linear integration is disabled",
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

      const result = await linearClient.createIssue({
        title: parsed.data.title,
        description: parsed.data.description,
        teamId: parsed.data.teamId,
        priority: parsed.data.priority,
        stateId: parsed.data.stateId,
        assigneeId: parsed.data.assigneeId,
        labelIds: parsed.data.labelIds,
        projectId: parsed.data.projectId,
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
   * GET /api/linear/projects
   * List projects (query params: teamId, limit)
   */
  router.get("/projects", async (req, res) => {
    try {
      if (!linearClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "Linear integration is disabled",
        });
      }

      if (!sdk) {
        return res.status(400).json({
          success: false,
          error: "Linear API key not configured",
        });
      }

      const teamId = req.query.teamId as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      // Build filter
      const filter: Record<string, unknown> = {};
      if (teamId) {
        filter.teams = { id: { eq: teamId } };
      }

      const projectsResponse = await sdk.projects({
        filter,
        first: limit,
      });

      const projects = await Promise.all(
        projectsResponse.nodes.map(async (project) => {
          const teams = await project.teams();
          const lead = await project.lead;

          return {
            id: project.id,
            name: project.name,
            description: project.description,
            url: project.url,
            state: project.state,
            progress: project.progress,
            lead: lead
              ? {
                  id: lead.id,
                  name: lead.name,
                }
              : null,
            teams: teams.nodes.map((team) => ({
              id: team.id,
              name: team.name,
              key: team.key,
            })),
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          };
        }),
      );

      res.json({
        success: true,
        projects,
      });
    } catch (error) {
      console.error("Failed to list projects:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/linear/projects
   * Create a new project
   */
  router.post("/projects", async (req, res) => {
    try {
      if (!linearClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "Linear integration is disabled",
        });
      }

      if (!sdk) {
        return res.status(400).json({
          success: false,
          error: "Linear API key not configured",
        });
      }

      const parsed = CreateProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const projectPayload = await sdk.createProject({
        name: parsed.data.name,
        description: parsed.data.description,
        teamIds: parsed.data.teamIds,
        leadId: parsed.data.leadId,
      });

      const project = await projectPayload.project;

      if (!project) {
        return res.status(500).json({
          success: false,
          error: "Failed to create project",
        });
      }

      res.status(201).json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          url: project.url,
        },
      });
    } catch (error) {
      console.error("Failed to create project:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/linear/states
   * List workflow states (query params: teamId required)
   */
  router.get("/states", async (req, res) => {
    try {
      if (!linearClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "Linear integration is disabled",
        });
      }

      const teamId = req.query.teamId as string;

      if (!teamId) {
        return res.status(400).json({
          success: false,
          error: "Query parameter 'teamId' is required",
        });
      }

      const result = await linearClient.listWorkflowStates(teamId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Failed to list workflow states:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/linear/labels
   * List labels (query params: teamId optional)
   */
  router.get("/labels", async (req, res) => {
    try {
      if (!linearClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "Linear integration is disabled",
        });
      }

      const teamId = req.query.teamId as string | undefined;

      const result = await linearClient.listLabels(teamId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Failed to list labels:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/linear/users
   * List users (query params: limit)
   */
  router.get("/users", async (req, res) => {
    try {
      if (!linearClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "Linear integration is disabled",
        });
      }

      if (!sdk) {
        return res.status(400).json({
          success: false,
          error: "Linear API key not configured",
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;

      const usersResponse = await sdk.users({
        first: limit,
      });

      const users = usersResponse.nodes.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        active: user.active,
        admin: user.admin,
      }));

      res.json({
        success: true,
        users,
      });
    } catch (error) {
      console.error("Failed to list users:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * PATCH /api/linear/issues/:issueId
   * Update an existing issue
   */
  router.patch("/issues/:issueId", async (req, res) => {
    try {
      if (!linearClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "Linear integration is disabled",
        });
      }

      if (!sdk) {
        return res.status(400).json({
          success: false,
          error: "Linear API key not configured",
        });
      }

      const { issueId } = req.params;

      const parsed = UpdateIssueSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          details: parsed.error.issues,
        });
      }

      const payload = await sdk.updateIssue(issueId, {
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        stateId: parsed.data.stateId,
        assigneeId: parsed.data.assigneeId,
        labelIds: parsed.data.labelIds,
      });

      const issue = await payload.issue;

      if (!issue) {
        return res.status(500).json({
          success: false,
          error: "Failed to update issue",
        });
      }

      res.json({
        success: true,
        issue: {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          url: issue.url,
          updatedAt: issue.updatedAt,
        },
      });
    } catch (error) {
      console.error("Failed to update issue:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/linear/comments
   * Add a comment to an issue
   */
  router.post("/comments", async (req, res) => {
    try {
      if (!linearClient.isEnabled()) {
        return res.status(403).json({
          success: false,
          error: "Linear integration is disabled",
        });
      }

      if (!sdk) {
        return res.status(400).json({
          success: false,
          error: "Linear API key not configured",
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

      const payload = await sdk.createComment({
        issueId: parsed.data.issueId,
        body: parsed.data.body,
      });

      const comment = await payload.comment;

      if (!comment) {
        return res.status(500).json({
          success: false,
          error: "Failed to create comment",
        });
      }

      res.status(201).json({
        success: true,
        comment: {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
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
