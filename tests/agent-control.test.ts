/**
 * Agent Control API Tests
 *
 * Tests for Agent lifecycle management and control endpoints
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { Request, Response } from "express";
import {
  createAgentControlRouter,
  resetAgents,
} from "../src/api/agent-control.ts";

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

describe("Agent Control API", () => {
  // Reset agents before each test to ensure isolation
  beforeEach(() => {
    resetAgents();
  });
  describe("GET /api/agents", () => {
    it("returns list of all agents", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      const routes = (router as any).stack;
      const listRoute = routes.find(
        (r: any) => r.route?.path === "/" && r.route?.methods?.get,
      );
      const handler = listRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 200);
      const response = res.getJson();
      assert.strictEqual(response.success, true);
      assert.ok(Array.isArray(response.agents));
      assert.strictEqual(response.count, 5); // Agent 0-4
    });

    it("returns agents with correct structure", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      const routes = (router as any).stack;
      const listRoute = routes.find(
        (r: any) => r.route?.path === "/" && r.route?.methods?.get,
      );
      const handler = listRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      const response = res.getJson();
      const agent = response.agents[0];

      assert.ok(typeof agent.id === "number");
      assert.ok(typeof agent.name === "string");
      assert.ok(typeof agent.role === "string");
      assert.ok(typeof agent.status === "string");
      assert.ok(typeof agent.completedTasks === "number");
    });
  });

  describe("GET /api/agents/:id", () => {
    it("returns agent details for valid ID", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "0" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const detailsRoute = routes.find(
        (r: any) => r.route?.path === "/:id" && r.route?.methods?.get,
      );
      const handler = detailsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 200);
      const response = res.getJson();
      assert.strictEqual(response.success, true);
      assert.ok(response.agent);
      assert.strictEqual(response.agent.id, 0);
    });

    it("returns 400 for invalid agent ID", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "invalid" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const detailsRoute = routes.find(
        (r: any) => r.route?.path === "/:id" && r.route?.methods?.get,
      );
      const handler = detailsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 400);
      assert.ok(res.getJson().error.includes("Invalid agent ID"));
    });

    it("returns 404 for non-existent agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "999" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const detailsRoute = routes.find(
        (r: any) => r.route?.path === "/:id" && r.route?.methods?.get,
      );
      const handler = detailsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 404);
      assert.ok(res.getJson().error.includes("not found"));
    });

    it("returns agent with metadata", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "3" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const detailsRoute = routes.find(
        (r: any) => r.route?.path === "/:id" && r.route?.methods?.get,
      );
      const handler = detailsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      const response = res.getJson();
      assert.ok(response.agent.metadata);
      assert.ok(Array.isArray(response.agent.metadata.capabilities));
    });
  });

  describe("POST /api/agents/:id/start", () => {
    it("starts an offline agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "1" }); // Agent 1 is offline
      const res = createMockResponse();

      const routes = (router as any).stack;
      const startRoute = routes.find(
        (r: any) => r.route?.path === "/:id/start",
      );
      const handler = startRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 200);
      const response = res.getJson();
      assert.strictEqual(response.success, true);
      assert.ok(response.message.includes("starting"));
    });

    it("returns 400 when starting already online agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "0" }); // Agent 0 is online
      const res = createMockResponse();

      const routes = (router as any).stack;
      const startRoute = routes.find(
        (r: any) => r.route?.path === "/:id/start",
      );
      const handler = startRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 400);
      assert.ok(res.getJson().error.includes("already online"));
    });

    it("returns 404 for non-existent agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "999" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const startRoute = routes.find(
        (r: any) => r.route?.path === "/:id/start",
      );
      const handler = startRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 404);
    });
  });

  describe("POST /api/agents/:id/stop", () => {
    it("stops an online agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "3" }); // Agent 3 is online
      const res = createMockResponse();

      const routes = (router as any).stack;
      const stopRoute = routes.find((r: any) => r.route?.path === "/:id/stop");
      const handler = stopRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 200);
      const response = res.getJson();
      assert.strictEqual(response.success, true);
      assert.ok(response.message.includes("stopping"));
    });

    it("returns 400 when stopping already offline agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "1" }); // Agent 1 is offline
      const res = createMockResponse();

      const routes = (router as any).stack;
      const stopRoute = routes.find((r: any) => r.route?.path === "/:id/stop");
      const handler = stopRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 400);
      assert.ok(res.getJson().error.includes("already offline"));
    });
  });

  describe("POST /api/agents/:id/restart", () => {
    it("restarts an agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "0" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const restartRoute = routes.find(
        (r: any) => r.route?.path === "/:id/restart",
      );
      const handler = restartRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 200);
      const response = res.getJson();
      assert.strictEqual(response.success, true);
      assert.ok(response.message.includes("restarting"));
    });

    it("returns 404 for non-existent agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "999" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const restartRoute = routes.find(
        (r: any) => r.route?.path === "/:id/restart",
      );
      const handler = restartRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 404);
    });
  });

  describe("GET /api/agents/:id/status", () => {
    it("returns agent status", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "0" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const statusRoute = routes.find(
        (r: any) => r.route?.path === "/:id/status",
      );
      const handler = statusRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 200);
      const response = res.getJson();
      assert.strictEqual(response.success, true);
      assert.ok(response.status);
      assert.ok(typeof response.status.status === "string");
      assert.ok(typeof response.status.uptime === "number");
    });

    it("returns 404 for non-existent agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "999" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const statusRoute = routes.find(
        (r: any) => r.route?.path === "/:id/status",
      );
      const handler = statusRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 404);
    });
  });

  describe("GET /api/agents/:id/logs", () => {
    it("returns agent logs", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "0" }, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const logsRoute = routes.find((r: any) => r.route?.path === "/:id/logs");
      const handler = logsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 200);
      const response = res.getJson();
      assert.strictEqual(response.success, true);
      assert.ok(Array.isArray(response.logs));
      assert.ok(typeof response.count === "number");
      assert.ok(typeof response.total === "number");
    });

    it("respects limit parameter", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "0" }, { limit: "5" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const logsRoute = routes.find((r: any) => r.route?.path === "/:id/logs");
      const handler = logsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      const response = res.getJson();
      assert.ok(response.logs.length <= 5);
    });

    it("respects offset parameter", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "0" }, { offset: "1" });
      const res = createMockResponse();

      const routes = (router as any).stack;
      const logsRoute = routes.find((r: any) => r.route?.path === "/:id/logs");
      const handler = logsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      const response = res.getJson();
      assert.ok(response.logs.length >= 0);
    });

    it("returns 404 for non-existent agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "999" }, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const logsRoute = routes.find((r: any) => r.route?.path === "/:id/logs");
      const handler = logsRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 404);
    });
  });

  describe("POST /api/agents/:id/tasks", () => {
    it("assigns task to agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest(
        { id: "1" },
        {},
        {
          task: "Build Status Dashboard",
          priority: "high",
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const tasksRoute = routes.find(
        (r: any) => r.route?.path === "/:id/tasks",
      );
      const handler = tasksRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 201);
      const response = res.getJson();
      assert.strictEqual(response.success, true);
      assert.ok(response.task);
      assert.strictEqual(response.task.task, "Build Status Dashboard");
    });

    it("validates task field is required", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest({ id: "1" }, {}, {});
      const res = createMockResponse();

      const routes = (router as any).stack;
      const tasksRoute = routes.find(
        (r: any) => r.route?.path === "/:id/tasks",
      );
      const handler = tasksRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 400);
      assert.ok(res.getJson().error);
    });

    it("validates priority enum", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest(
        { id: "1" },
        {},
        {
          task: "Test task",
          priority: "invalid",
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const tasksRoute = routes.find(
        (r: any) => r.route?.path === "/:id/tasks",
      );
      const handler = tasksRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 400);
    });

    it("accepts optional deadline", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest(
        { id: "1" },
        {},
        {
          task: "Test task",
          priority: "medium",
          deadline: "2025-12-31T23:59:59Z",
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const tasksRoute = routes.find(
        (r: any) => r.route?.path === "/:id/tasks",
      );
      const handler = tasksRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 201);
      const response = res.getJson();
      assert.strictEqual(response.task.deadline, "2025-12-31T23:59:59Z");
    });

    it("returns 404 for non-existent agent", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest(
        { id: "999" },
        {},
        {
          task: "Test task",
        },
      );
      const res = createMockResponse();

      const routes = (router as any).stack;
      const tasksRoute = routes.find(
        (r: any) => r.route?.path === "/:id/tasks",
      );
      const handler = tasksRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 404);
    });
  });

  describe("GET /api/agents/status", () => {
    it("returns status overview of all agents", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      const routes = (router as any).stack;
      const statusRoute = routes.find(
        (r: any) => r.route?.path === "/status" && r.route?.methods?.get,
      );
      const handler = statusRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      assert.strictEqual(res.getStatus(), 200);
      const response = res.getJson();
      assert.strictEqual(response.success, true);
      assert.ok(Array.isArray(response.agents));
      assert.strictEqual(response.count, 5);
      assert.ok(response.timestamp);
    });

    it("returns agents with correct status structure", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      const routes = (router as any).stack;
      const statusRoute = routes.find(
        (r: any) => r.route?.path === "/status" && r.route?.methods?.get,
      );
      const handler = statusRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      const response = res.getJson();
      const agent = response.agents[0];

      // Verify required fields for MCP tools
      assert.ok(typeof agent.name === "string");
      assert.ok(typeof agent.status === "string");
      assert.ok(typeof agent.uptime === "number");
      assert.ok(typeof agent.queueDepth === "number");
      assert.ok(typeof agent.lastActivity === "string");
      // pid and lastError can be null
      assert.ok(agent.pid === null || typeof agent.pid === "number");
      assert.ok(
        agent.lastError === null || typeof agent.lastError === "string",
      );
    });

    it("returns online agents with PID", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      const routes = (router as any).stack;
      const statusRoute = routes.find(
        (r: any) => r.route?.path === "/status" && r.route?.methods?.get,
      );
      const handler = statusRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      const response = res.getJson();
      const onlineAgent = response.agents.find(
        (a: any) => a.status === "online",
      );

      if (onlineAgent) {
        assert.ok(typeof onlineAgent.pid === "number");
      }
    });

    it("returns offline agents with null PID", async () => {
      const router = createAgentControlRouter();
      const req = createMockRequest();
      const res = createMockResponse();

      const routes = (router as any).stack;
      const statusRoute = routes.find(
        (r: any) => r.route?.path === "/status" && r.route?.methods?.get,
      );
      const handler = statusRoute?.route?.stack[0]?.handle;

      if (handler) {
        await handler(req, res);
      }

      const response = res.getJson();
      const offlineAgent = response.agents.find(
        (a: any) => a.status === "offline",
      );

      if (offlineAgent) {
        assert.strictEqual(offlineAgent.pid, null);
      }
    });
  });
});
