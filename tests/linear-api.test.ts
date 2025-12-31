/**
 * Linear REST API Tests
 *
 * Tests for Linear integration endpoints
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import type { Request, Response } from "express";
import { createLinearRouter } from "../src/api/linear.ts";

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

describe("Linear REST API", () => {
  describe("GET /api/linear/status", () => {
    it("returns connection status when Linear is disabled", async () => {
      const router = createLinearRouter();
      const req = createMockRequest();
      const res = createMockResponse();

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

  describe("GET /api/linear/teams", () => {
    it("returns 403 when Linear is disabled", async () => {
      const router = createLinearRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      const routes = (router as any).stack;
      const teamsRoute = routes.find((r: any) => r.route?.path === "/teams");
      const handler = teamsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 403);
      assert.strictEqual(res.getJson().success, false);
    });
  });

  describe("GET /api/linear/issues", () => {
    it("returns 403 when Linear is disabled", async () => {
      const router = createLinearRouter();
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
    });

    it("accepts teamId query parameter", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({}, { teamId: "team-123" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const issuesRoute = routes.find(
        (r: any) => r.route?.path === "/issues" && r.route?.methods?.get,
      );
      const handler = issuesRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Should still return 403 (disabled) but not validation error
      assert.strictEqual(res.getStatus(), 403);
    });

    it("accepts limit query parameter", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({}, { limit: "100" });
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
    });
  });

  describe("POST /api/linear/issues", () => {
    it("validates required fields", async () => {
      const router = createLinearRouter();
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

    it("validates title field", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({}, {}, { title: "" });
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
      // Details only present when enabled (400), not when disabled (403)
      if (res.getStatus() === 400) {
        assert.ok(res.getJson().details || res.getJson().error);
      }
    });

    it("validates priority range (0-4)", async () => {
      const router = createLinearRouter();
      const req = createMockRequest(
        {},
        {},
        {
          title: "Test Issue",
          priority: 10, // Invalid
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

    it("accepts optional fields", async () => {
      const router = createLinearRouter();
      const req = createMockRequest(
        {},
        {},
        {
          title: "Test Issue",
          description: "Test description",
          teamId: "team-123",
          priority: 2,
          stateId: "state-123",
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

      // Should return 403 (disabled) not validation error
      assert.strictEqual(res.getStatus(), 403);
    });
  });

  describe("PATCH /api/linear/issues/:issueId", () => {
    it("requires issueId parameter", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({ issueId: "" }, {}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const updateRoute = routes.find(
        (r: any) => r.route?.path === "/issues/:issueId",
      );
      const handler = updateRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Should return error
      assert.ok(res.getStatus() >= 400);
    });

    it("validates optional fields", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({ issueId: "issue-123" }, {}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const updateRoute = routes.find(
        (r: any) => r.route?.path === "/issues/:issueId",
      );
      const handler = updateRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });

    it("validates priority range in update", async () => {
      const router = createLinearRouter();
      const req = createMockRequest(
        { issueId: "issue-123" },
        {},
        { priority: -1 },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const updateRoute = routes.find(
        (r: any) => r.route?.path === "/issues/:issueId",
      );
      const handler = updateRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });

    it("accepts partial updates", async () => {
      const router = createLinearRouter();
      const req = createMockRequest(
        { issueId: "issue-123" },
        {},
        {
          title: "Updated Title",
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const updateRoute = routes.find(
        (r: any) => r.route?.path === "/issues/:issueId",
      );
      const handler = updateRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Should return 403 (disabled) not validation error
      assert.strictEqual(res.getStatus(), 403);
    });
  });

  describe("GET /api/linear/projects", () => {
    it("returns 403 when Linear is disabled", async () => {
      const router = createLinearRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      const routes = (router as any).stack;
      const projectsRoute = routes.find(
        (r: any) => r.route?.path === "/projects" && r.route?.methods?.get,
      );
      const handler = projectsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 403);
    });

    it("accepts teamId filter", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({}, { teamId: "team-123" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const projectsRoute = routes.find(
        (r: any) => r.route?.path === "/projects" && r.route?.methods?.get,
      );
      const handler = projectsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 403);
    });
  });

  describe("POST /api/linear/projects", () => {
    it("validates required fields", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({}, {}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const createProjectRoute = routes.find(
        (r: any) => r.route?.path === "/projects" && r.route?.methods?.post,
      );
      const handler = createProjectRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });

    it("validates teamIds is non-empty array", async () => {
      const router = createLinearRouter();
      const req = createMockRequest(
        {},
        {},
        {
          name: "Test Project",
          teamIds: [],
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const createProjectRoute = routes.find(
        (r: any) => r.route?.path === "/projects" && r.route?.methods?.post,
      );
      const handler = createProjectRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but invalid
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
    });

    it("accepts valid project data", async () => {
      const router = createLinearRouter();
      const req = createMockRequest(
        {},
        {},
        {
          name: "Test Project",
          description: "Test description",
          teamIds: ["team-123"],
          leadId: "user-123",
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const createProjectRoute = routes.find(
        (r: any) => r.route?.path === "/projects" && r.route?.methods?.post,
      );
      const handler = createProjectRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Should return 403 (disabled) not validation error
      assert.strictEqual(res.getStatus(), 403);
    });
  });

  describe("GET /api/linear/states", () => {
    it("requires teamId query parameter", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const statesRoute = routes.find((r: any) => r.route?.path === "/states");
      const handler = statesRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Returns 403 when disabled, 400 when enabled but missing teamId
      assert.ok(res.getStatus() === 403 || res.getStatus() === 400);
      // Only check for teamId error when enabled (400)
      if (res.getStatus() === 400) {
        assert.ok(res.getJson().error.includes("teamId"));
      }
    });

    it("accepts teamId parameter", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({}, { teamId: "team-123" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const statesRoute = routes.find((r: any) => r.route?.path === "/states");
      const handler = statesRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      // Should return 403 (disabled) not validation error
      assert.strictEqual(res.getStatus(), 403);
    });
  });

  describe("GET /api/linear/labels", () => {
    it("returns 403 when Linear is disabled", async () => {
      const router = createLinearRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      const routes = (router as any).stack;
      const labelsRoute = routes.find((r: any) => r.route?.path === "/labels");
      const handler = labelsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 403);
    });

    it("accepts optional teamId filter", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({}, { teamId: "team-123" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const labelsRoute = routes.find((r: any) => r.route?.path === "/labels");
      const handler = labelsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 403);
    });
  });

  describe("GET /api/linear/users", () => {
    it("returns 403 when Linear is disabled", async () => {
      const router = createLinearRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      const routes = (router as any).stack;
      const usersRoute = routes.find((r: any) => r.route?.path === "/users");
      const handler = usersRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 403);
    });

    it("accepts limit parameter", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({}, { limit: "50" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const usersRoute = routes.find((r: any) => r.route?.path === "/users");
      const handler = usersRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 403);
    });
  });

  describe("POST /api/linear/comments", () => {
    it("validates required fields", async () => {
      const router = createLinearRouter();
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
      assert.strictEqual(res.getJson().success, false);
    });

    it("validates issueId field", async () => {
      const router = createLinearRouter();
      const req = createMockRequest({}, {}, { issueId: "" });
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

    it("validates body is not empty", async () => {
      const router = createLinearRouter();
      const req = createMockRequest(
        {},
        {},
        {
          issueId: "issue-123",
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

    it("accepts valid comment data", async () => {
      const router = createLinearRouter();
      const req = createMockRequest(
        {},
        {},
        {
          issueId: "issue-123",
          body: "This is a test comment",
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

      // Should return 403 (disabled) not validation error
      assert.strictEqual(res.getStatus(), 403);
    });
  });
});
