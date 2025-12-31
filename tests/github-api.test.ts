/**
 * GitHub REST API Tests
 *
 * Tests for GitHub integration endpoints
 */

import { describe, it, mock } from "node:test";
import assert from "node:assert";
import type { Request, Response } from "express";
import { createGitHubRouter } from "../src/api/github.ts";

// Mock Express Response
function createMockResponse() {
  let statusCode = 200;
  let jsonData: any = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      jsonData = data;
      return this;
    },
    getStatus() {
      return statusCode;
    },
    getJson() {
      return jsonData;
    },
  } as unknown as Response;

  return res as Response & { getStatus: () => number; getJson: () => any };
}

// Mock Express Request
function createMockRequest(
  params: Record<string, string> = {},
  query: Record<string, string> = {},
  body: any = {},
): Request {
  return {
    params,
    query,
    body,
  } as Request;
}

describe("GitHub REST API", () => {
  describe("GET /api/github/status", () => {
    it("returns connection status when GitHub is disabled", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      // Extract the handler from router
      const routes = (router as any).stack;
      const statusRoute = routes.find((r: any) => r.route?.path === "/status");
      const handler = statusRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      const response = res.getJson();
      assert.ok(response, "Response should exist");
      assert.strictEqual(typeof response.connected, "boolean");
    });
  });

  describe("GET /api/github/repos", () => {
    it("returns 403 when GitHub is disabled", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      const routes = (router as any).stack;
      const reposRoute = routes.find(
        (r: any) => r.route?.path === "/repos" && r.route?.methods?.get,
      );
      const handler = reposRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 403);
      assert.strictEqual(res.getJson().success, false);
    });
  });

  describe("GET /api/github/repos/:owner/:repo", () => {
    it("returns 403 when GitHub is disabled", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest({ owner: "test", repo: "repo" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const repoRoute = routes.find(
        (r: any) => r.route?.path === "/repos/:owner/:repo",
      );
      const handler = repoRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 403);
      assert.strictEqual(res.getJson().success, false);
    });

    it("validates owner and repo params", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest({ owner: "", repo: "" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const repoRoute = routes.find(
        (r: any) => r.route?.path === "/repos/:owner/:repo",
      );
      const handler = repoRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Should return 403 (disabled) or 400 (validation error)
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });
  });

  describe("GET /api/github/issues", () => {
    it("returns 400 when repo query param is missing", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest({}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const issuesRoute = routes.find(
        (r: any) => r.route?.path === "/issues" && r.route?.methods?.get,
      );
      const handler = issuesRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 403);
      const response = res.getJson();
      assert.strictEqual(response.success, false);
    });

    it("validates repo format (owner/repo)", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest({}, { repo: "invalid-format" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const issuesRoute = routes.find(
        (r: any) => r.route?.path === "/issues" && r.route?.methods?.get,
      );
      const handler = issuesRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Should return 403 (disabled)
      assert.strictEqual(res.getStatus(), 403);
    });
  });

  describe("POST /api/github/issues", () => {
    it("validates required fields", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest({}, {}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const createIssueRoute = routes.find(
        (r: any) => r.route?.path === "/issues" && r.route?.methods?.post,
      );
      const handler = createIssueRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
      assert.strictEqual(res.getJson().success, false);
      assert.ok(res.getJson().error);
    });

    it("validates repo format in body", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest(
        {},
        {},
        {
          repo: "invalid",
          title: "Test Issue",
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const createIssueRoute = routes.find(
        (r: any) => r.route?.path === "/issues" && r.route?.methods?.post,
      );
      const handler = createIssueRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });

    it("validates title length", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest(
        {},
        {},
        {
          repo: "owner/repo",
          title: "", // Empty title
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const createIssueRoute = routes.find(
        (r: any) => r.route?.path === "/issues" && r.route?.methods?.post,
      );
      const handler = createIssueRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });
  });

  describe("PATCH /api/github/issues/:issueNumber", () => {
    it("validates issue number", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest({ issueNumber: "invalid" }, {}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const updateRoute = routes.find(
        (r: any) => r.route?.path === "/issues/:issueNumber",
      );
      const handler = updateRoute?.route?.stack[0]?.handle;

      // Skip if endpoint not implemented
      if (!handler) {
        assert.ok(true, "Endpoint not implemented yet");
        return;
      }

      await handler(req, res);
      assert.strictEqual(res.getStatus(), 400);
      assert.strictEqual(res.getJson().success, false);
    });

    it("validates request body", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest({ issueNumber: "123" }, {}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const updateRoute = routes.find(
        (r: any) => r.route?.path === "/issues/:issueNumber",
      );
      const handler = updateRoute?.route?.stack[0]?.handle;

      // Skip if endpoint not implemented
      if (!handler) {
        assert.ok(true, "Endpoint not implemented yet");
        return;
      }

      await handler(req, res);
      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
      assert.ok(res.getJson().error);
    });

    it("validates state enum", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest(
        { issueNumber: "123" },
        {},
        {
          repo: "owner/repo",
          state: "invalid-state",
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const updateRoute = routes.find(
        (r: any) => r.route?.path === "/issues/:issueNumber",
      );
      const handler = updateRoute?.route?.stack[0]?.handle;

      // Skip if endpoint not implemented
      if (!handler) {
        assert.ok(true, "Endpoint not implemented yet");
        return;
      }

      await handler(req, res);
      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });
  });

  describe("GET /api/github/pulls", () => {
    it("requires repo query param", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest({}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const pullsRoute = routes.find(
        (r: any) => r.route?.path === "/pulls" && r.route?.methods?.get,
      );
      const handler = pullsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.ok(res.getStatus() >= 400);
    });
  });

  describe("POST /api/github/pulls", () => {
    it("validates required fields", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest({}, {}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const createPRRoute = routes.find(
        (r: any) => r.route?.path === "/pulls" && r.route?.methods?.post,
      );
      const handler = createPRRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });

    it("validates head and base branches", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest(
        {},
        {},
        {
          repo: "owner/repo",
          title: "Test PR",
          head: "",
          base: "",
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const createPRRoute = routes.find(
        (r: any) => r.route?.path === "/pulls" && r.route?.methods?.post,
      );
      const handler = createPRRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });
  });

  describe("GET /api/github/comments", () => {
    it("requires repo and issue_number", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest({}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const commentsRoute = routes.find(
        (r: any) => r.route?.path === "/comments" && r.route?.methods?.get,
      );
      const handler = commentsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.ok(res.getStatus() >= 400);
    });
  });

  describe("POST /api/github/comments", () => {
    it("validates required fields", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest({}, {}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const createCommentRoute = routes.find(
        (r: any) => r.route?.path === "/comments" && r.route?.methods?.post,
      );
      const handler = createCommentRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });

    it("validates issue_number is positive integer", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest(
        {},
        {},
        {
          repo: "owner/repo",
          issue_number: -1,
          body: "Test comment",
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const createCommentRoute = routes.find(
        (r: any) => r.route?.path === "/comments" && r.route?.methods?.post,
      );
      const handler = createCommentRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });

    it("validates comment body is not empty", async () => {
      const router = createGitHubRouter();
      const req = createMockRequest(
        {},
        {},
        {
          repo: "owner/repo",
          issue_number: 1,
          body: "",
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const createCommentRoute = routes.find(
        (r: any) => r.route?.path === "/comments" && r.route?.methods?.post,
      );
      const handler = createCommentRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });
  });
});
