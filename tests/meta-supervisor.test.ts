/**
 * Meta Supervisor Tests
 * Tests for task routing and system health monitoring
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  MetaSupervisor,
  createMetaSupervisor,
  type SystemHealth,
} from "../src/meta/metaSupervisor.js";

describe("MetaSupervisor", () => {
  let supervisor: MetaSupervisor;

  beforeEach(() => {
    supervisor = new MetaSupervisor();
  });

  describe("registerSystem()", () => {
    it("should register a new system with healthy defaults", () => {
      supervisor.registerSystem("test-system");
      const metrics = supervisor.getAggregatedMetrics();

      assert.ok("test-system" in metrics.systemHealth);
      assert.strictEqual(metrics.systemHealth["test-system"].status, "healthy");
      assert.strictEqual(
        metrics.systemHealth["test-system"].taskCompletionRate,
        1.0,
      );
      assert.strictEqual(metrics.systemHealth["test-system"].stopRate, 0);
    });

    it("should have default system registered on creation", () => {
      const metrics = supervisor.getAggregatedMetrics();

      assert.ok("code-cloud-agents" in metrics.systemHealth);
    });
  });

  describe("route()", () => {
    it("should route tasks to primary system", () => {
      const decision = supervisor.route("code-review");

      assert.strictEqual(decision.targetSystem, "code-cloud-agents");
      assert.ok(decision.reason.includes("code-review"));
    });

    it("should include constraints in decision", () => {
      const constraints = ["max-time:30m", "priority:high"];
      const decision = supervisor.route("deployment", constraints);

      assert.deepStrictEqual(decision.constraints, constraints);
    });

    it("should add monitoring notes for degraded systems", () => {
      supervisor.updateHealth("code-cloud-agents", { status: "degraded" });
      const decision = supervisor.route("task");

      assert.ok(decision.monitoringNotes.some((n) => n.includes("degraded")));
    });

    it("should add monitoring notes for high queue depth", () => {
      supervisor.updateHealth("code-cloud-agents", { queueDepth: 15 });
      const decision = supervisor.route("task");

      assert.ok(
        decision.monitoringNotes.some((n) => n.includes("queue depth")),
      );
    });

    it("should add monitoring notes for high stop rate", () => {
      supervisor.updateHealth("code-cloud-agents", { stopRate: 0.4 });
      const decision = supervisor.route("task");

      assert.ok(decision.monitoringNotes.some((n) => n.includes("stop rate")));
    });

    it("should return empty monitoring notes for healthy system", () => {
      const decision = supervisor.route("task");

      assert.strictEqual(decision.monitoringNotes.length, 0);
    });
  });

  describe("updateHealth()", () => {
    it("should update system health metrics", () => {
      supervisor.updateHealth("code-cloud-agents", {
        status: "degraded",
        taskCompletionRate: 0.85,
        stopRate: 0.15,
      });

      const metrics = supervisor.getAggregatedMetrics();
      const health = metrics.systemHealth["code-cloud-agents"];

      assert.strictEqual(health.status, "degraded");
      assert.strictEqual(health.taskCompletionRate, 0.85);
      assert.strictEqual(health.stopRate, 0.15);
    });

    it("should update lastUpdated timestamp", () => {
      const before = new Date().toISOString();

      supervisor.updateHealth("code-cloud-agents", { queueDepth: 5 });

      const metrics = supervisor.getAggregatedMetrics();
      const lastUpdated = metrics.systemHealth["code-cloud-agents"].lastUpdated;

      assert.ok(lastUpdated >= before);
    });

    it("should throw error for unregistered system", () => {
      assert.throws(() => {
        supervisor.updateHealth("nonexistent-system", { status: "healthy" });
      }, /not registered/);
    });

    it("should preserve existing values when partially updating", () => {
      supervisor.updateHealth("code-cloud-agents", {
        taskCompletionRate: 0.9,
        stopRate: 0.1,
      });

      supervisor.updateHealth("code-cloud-agents", { queueDepth: 10 });

      const metrics = supervisor.getAggregatedMetrics();
      const health = metrics.systemHealth["code-cloud-agents"];

      // Previous values should be preserved
      assert.strictEqual(health.taskCompletionRate, 0.9);
      assert.strictEqual(health.stopRate, 0.1);
      // New value should be set
      assert.strictEqual(health.queueDepth, 10);
    });
  });

  describe("getAggregatedMetrics()", () => {
    it("should return metrics for all registered systems", () => {
      supervisor.registerSystem("system-a");
      supervisor.registerSystem("system-b");

      const metrics = supervisor.getAggregatedMetrics();

      assert.ok("code-cloud-agents" in metrics.systemHealth);
      assert.ok("system-a" in metrics.systemHealth);
      assert.ok("system-b" in metrics.systemHealth);
    });

    it("should calculate average stop score", () => {
      supervisor.registerSystem("system-a");
      supervisor.updateHealth("code-cloud-agents", { avgStopScore: 30 });
      supervisor.updateHealth("system-a", { avgStopScore: 20 });

      const metrics = supervisor.getAggregatedMetrics();

      assert.strictEqual(metrics.avgStopScore, 25); // (30 + 20) / 2
    });

    it("should return 0 avg stop score when no scores", () => {
      const metrics = supervisor.getAggregatedMetrics();

      assert.strictEqual(metrics.avgStopScore, 0);
    });

    it("should include task counts", () => {
      const metrics = supervisor.getAggregatedMetrics();

      assert.strictEqual(typeof metrics.totalTasks, "number");
      assert.strictEqual(typeof metrics.completedTasks, "number");
      assert.strictEqual(typeof metrics.stoppedTasks, "number");
    });
  });

  describe("checkAlerts()", () => {
    it("should return empty array for healthy systems", () => {
      const alerts = supervisor.checkAlerts();

      assert.strictEqual(alerts.length, 0);
    });

    it("should alert on unhealthy system", () => {
      supervisor.updateHealth("code-cloud-agents", { status: "unhealthy" });
      const alerts = supervisor.checkAlerts();

      assert.ok(alerts.some((a) => a.includes("CRITICAL")));
      assert.ok(alerts.some((a) => a.includes("unhealthy")));
    });

    it("should alert on degraded system", () => {
      supervisor.updateHealth("code-cloud-agents", { status: "degraded" });
      const alerts = supervisor.checkAlerts();

      assert.ok(alerts.some((a) => a.includes("WARNING")));
      assert.ok(alerts.some((a) => a.includes("degraded")));
    });

    it("should alert on high stop rate (> 50%)", () => {
      supervisor.updateHealth("code-cloud-agents", { stopRate: 0.6 });
      const alerts = supervisor.checkAlerts();

      assert.ok(alerts.some((a) => a.includes("STOP RATE")));
    });

    it("should not alert on moderate stop rate (< 50%)", () => {
      supervisor.updateHealth("code-cloud-agents", { stopRate: 0.4 });
      const alerts = supervisor.checkAlerts();

      // Only route() checks for > 0.3, checkAlerts checks > 0.5
      assert.ok(!alerts.some((a) => a.includes("STOP RATE")));
    });

    it("should alert on queue overload (> 50)", () => {
      supervisor.updateHealth("code-cloud-agents", { queueDepth: 60 });
      const alerts = supervisor.checkAlerts();

      assert.ok(alerts.some((a) => a.includes("QUEUE OVERLOAD")));
    });

    it("should not alert on moderate queue (< 50)", () => {
      supervisor.updateHealth("code-cloud-agents", { queueDepth: 40 });
      const alerts = supervisor.checkAlerts();

      assert.ok(!alerts.some((a) => a.includes("QUEUE")));
    });

    it("should return multiple alerts for multiple issues", () => {
      supervisor.updateHealth("code-cloud-agents", {
        status: "unhealthy",
        stopRate: 0.7,
        queueDepth: 100,
      });
      const alerts = supervisor.checkAlerts();

      assert.ok(alerts.length >= 3);
    });

    it("should check all registered systems", () => {
      supervisor.registerSystem("system-a");
      supervisor.updateHealth("code-cloud-agents", { status: "healthy" });
      supervisor.updateHealth("system-a", { status: "unhealthy" });

      const alerts = supervisor.checkAlerts();

      assert.ok(alerts.some((a) => a.includes("system-a")));
    });
  });

  describe("createMetaSupervisor()", () => {
    it("should create a MetaSupervisor instance", () => {
      const sup = createMetaSupervisor();

      assert.ok(sup instanceof MetaSupervisor);
    });

    it("should have default system registered", () => {
      const sup = createMetaSupervisor();
      const metrics = sup.getAggregatedMetrics();

      assert.ok("code-cloud-agents" in metrics.systemHealth);
    });
  });
});
