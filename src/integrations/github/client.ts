/**
 * GitHub Integration Client (FULLY IMPLEMENTED)
 */

import { Octokit } from "@octokit/rest";

export interface GitHubConfig {
  token: string;
  org?: string;
}

export interface GitHubIssue {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
}

export interface GitHubIssueResult {
  number: number;
  url: string;
  htmlUrl: string;
}

export interface GitHubClient {
  isEnabled(): boolean;
  createIssue(
    repo: string,
    issue: GitHubIssue,
  ): Promise<{ success: boolean; issue?: GitHubIssueResult; error?: string }>;
  listRepos(): Promise<{
    success: boolean;
    repos?: Array<{ name: string; fullName: string; private: boolean }>;
    error?: string;
  }>;
  getStatus(): Promise<{ connected: boolean; user?: string; error?: string }>;
}

/**
 * Creates a GitHub client instance with Octokit
 * @param config - GitHub configuration (optional, reads from ENV if not provided)
 * @returns GitHubClient instance
 */
export function createGitHubClient(config?: GitHubConfig): GitHubClient {
  const enabled = process.env.GITHUB_ENABLED === "true";
  const token = config?.token || process.env.GITHUB_TOKEN || "";
  const org = config?.org || process.env.GITHUB_ORG;

  let octokit: Octokit | null = null;

  if (enabled && token) {
    octokit = new Octokit({ auth: token });
  }

  return {
    /**
     * Check if GitHub integration is enabled
     */
    isEnabled(): boolean {
      return enabled;
    },

    /**
     * Create an issue in a GitHub repository
     * @param repo - Repository in format "owner/repo"
     * @param issue - Issue details
     * @returns Promise with created issue details
     */
    async createIssue(
      repo: string,
      issue: GitHubIssue,
    ): Promise<{
      success: boolean;
      issue?: GitHubIssueResult;
      error?: string;
    }> {
      if (!enabled) {
        return { success: false, error: "GitHub integration disabled" };
      }

      if (!octokit) {
        return { success: false, error: "GitHub token not configured" };
      }

      try {
        const [owner, repoName] = repo.split("/");
        if (!owner || !repoName) {
          return {
            success: false,
            error: "Invalid repo format. Use 'owner/repo'",
          };
        }

        const response = await octokit.rest.issues.create({
          owner,
          repo: repoName,
          title: issue.title,
          body: issue.body,
          labels: issue.labels,
          assignees: issue.assignees,
        });

        return {
          success: true,
          issue: {
            number: response.data.number,
            url: response.data.url,
            htmlUrl: response.data.html_url,
          },
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `GitHub API error: ${errorMessage}` };
      }
    },

    /**
     * List repositories for authenticated user or org
     * @returns Promise with repository list
     */
    async listRepos(): Promise<{
      success: boolean;
      repos?: Array<{ name: string; fullName: string; private: boolean }>;
      error?: string;
    }> {
      if (!enabled) {
        return { success: false, error: "GitHub integration disabled" };
      }

      if (!octokit) {
        return { success: false, error: "GitHub token not configured" };
      }

      try {
        let response;

        if (org) {
          response = await octokit.rest.repos.listForOrg({
            org,
            per_page: 100,
          });
        } else {
          response = await octokit.rest.repos.listForAuthenticatedUser({
            per_page: 100,
          });
        }

        const repos = response.data.map((repo) => ({
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
        }));

        return { success: true, repos };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `GitHub API error: ${errorMessage}` };
      }
    },

    /**
     * Get connection status and authenticated user info
     * @returns Promise with connection status
     */
    async getStatus(): Promise<{
      connected: boolean;
      user?: string;
      error?: string;
    }> {
      if (!enabled) {
        return { connected: false, error: "GitHub integration disabled" };
      }

      if (!octokit) {
        return { connected: false, error: "GitHub token not configured" };
      }

      try {
        const response = await octokit.rest.users.getAuthenticated();
        return {
          connected: true,
          user: response.data.login,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return { connected: false, error: `GitHub API error: ${errorMessage}` };
      }
    },
  };
}
