/**
 * Linear Integration Client (FULLY IMPLEMENTED)
 */

import { LinearClient as LinearSDK } from "@linear/sdk";

export interface LinearConfig {
  apiKey: string;
}

export interface LinearIssue {
  title: string;
  description?: string;
  teamId?: string;
  priority?: number; // 0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low
  stateId?: string; // Workflow state (e.g., "Todo", "In Progress")
  assigneeId?: string;
  labelIds?: string[];
  projectId?: string;
}

export interface LinearIssueResult {
  id: string;
  identifier: string; // e.g., "ENG-123"
  title: string;
  url: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string; // e.g., "ENG"
}

export interface LinearWorkflowState {
  id: string;
  name: string;
  type: string; // "triage", "backlog", "unstarted", "started", "completed", "canceled"
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

export interface LinearClient {
  isEnabled(): boolean;
  createIssue(
    issue: LinearIssue,
  ): Promise<{ success: boolean; issue?: LinearIssueResult; error?: string }>;
  listTeams(): Promise<{
    success: boolean;
    teams?: LinearTeam[];
    error?: string;
  }>;
  listWorkflowStates(teamId: string): Promise<{
    success: boolean;
    states?: LinearWorkflowState[];
    error?: string;
  }>;
  listLabels(
    teamId?: string,
  ): Promise<{ success: boolean; labels?: LinearLabel[]; error?: string }>;
  getStatus(): Promise<{
    connected: boolean;
    user?: string;
    organization?: string;
    error?: string;
  }>;
}

/**
 * Creates a Linear client instance with Linear SDK
 * @param config - Linear configuration (optional, reads from ENV if not provided)
 * @returns LinearClient instance
 */
export function createLinearClient(config?: LinearConfig): LinearClient {
  const enabled = process.env.LINEAR_ENABLED === "true";
  const apiKey = config?.apiKey || process.env.LINEAR_API_KEY || "";

  let client: LinearSDK | null = null;

  if (enabled && apiKey) {
    client = new LinearSDK({ apiKey });
  }

  return {
    /**
     * Check if Linear integration is enabled
     */
    isEnabled(): boolean {
      return enabled;
    },

    /**
     * Create an issue in Linear
     * @param issue - Issue details
     * @returns Promise with created issue details
     */
    async createIssue(issue: LinearIssue): Promise<{
      success: boolean;
      issue?: LinearIssueResult;
      error?: string;
    }> {
      if (!enabled) {
        return { success: false, error: "Linear integration disabled" };
      }

      if (!client) {
        return { success: false, error: "Linear API key not configured" };
      }

      try {
        // If no teamId provided, get first team
        let teamId = issue.teamId;
        if (!teamId) {
          const teams = await client.teams();
          const firstTeam = teams.nodes[0];
          if (!firstTeam) {
            return {
              success: false,
              error: "No teams found in Linear workspace",
            };
          }
          teamId = firstTeam.id;
        }

        const result = await client.createIssue({
          teamId,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          stateId: issue.stateId,
          assigneeId: issue.assigneeId,
          labelIds: issue.labelIds,
          projectId: issue.projectId,
        });

        const createdIssue = await result.issue;

        if (!createdIssue) {
          return {
            success: false,
            error: "Issue created but could not retrieve details",
          };
        }

        return {
          success: true,
          issue: {
            id: createdIssue.id,
            identifier: createdIssue.identifier,
            title: createdIssue.title,
            url: createdIssue.url,
          },
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Linear API error: ${errorMessage}` };
      }
    },

    /**
     * List all teams in the workspace
     * @returns Promise with teams list
     */
    async listTeams(): Promise<{
      success: boolean;
      teams?: LinearTeam[];
      error?: string;
    }> {
      if (!enabled) {
        return { success: false, error: "Linear integration disabled" };
      }

      if (!client) {
        return { success: false, error: "Linear API key not configured" };
      }

      try {
        const result = await client.teams();

        const teams = result.nodes.map((team) => ({
          id: team.id,
          name: team.name,
          key: team.key,
        }));

        return { success: true, teams };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Linear API error: ${errorMessage}` };
      }
    },

    /**
     * List workflow states for a team
     * @param teamId - Team ID
     * @returns Promise with workflow states
     */
    async listWorkflowStates(teamId: string): Promise<{
      success: boolean;
      states?: LinearWorkflowState[];
      error?: string;
    }> {
      if (!enabled) {
        return { success: false, error: "Linear integration disabled" };
      }

      if (!client) {
        return { success: false, error: "Linear API key not configured" };
      }

      try {
        const team = await client.team(teamId);
        const statesResult = await team.states();

        const states = statesResult.nodes.map((state) => ({
          id: state.id,
          name: state.name,
          type: state.type,
        }));

        return { success: true, states };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Linear API error: ${errorMessage}` };
      }
    },

    /**
     * List all labels (optionally filtered by team)
     * @param teamId - Optional team ID to filter labels
     * @returns Promise with labels list
     */
    async listLabels(
      teamId?: string,
    ): Promise<{ success: boolean; labels?: LinearLabel[]; error?: string }> {
      if (!enabled) {
        return { success: false, error: "Linear integration disabled" };
      }

      if (!client) {
        return { success: false, error: "Linear API key not configured" };
      }

      try {
        let labelsResult;

        if (teamId) {
          const team = await client.team(teamId);
          labelsResult = await team.labels();
        } else {
          labelsResult = await client.issueLabels();
        }

        const labels = labelsResult.nodes.map((label) => ({
          id: label.id,
          name: label.name,
          color: label.color,
        }));

        return { success: true, labels };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Linear API error: ${errorMessage}` };
      }
    },

    /**
     * Get connection status and user info
     * @returns Promise with connection status
     */
    async getStatus(): Promise<{
      connected: boolean;
      user?: string;
      organization?: string;
      error?: string;
    }> {
      if (!enabled) {
        return { connected: false, error: "Linear integration disabled" };
      }

      if (!client) {
        return { connected: false, error: "Linear API key not configured" };
      }

      try {
        const viewer = await client.viewer;
        const org = await client.organization;

        return {
          connected: true,
          user: viewer.name,
          organization: org.name,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { connected: false, error: `Linear API error: ${errorMessage}` };
      }
    },
  };
}
