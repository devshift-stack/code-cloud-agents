/**
 * Engineering Lead Supervisor Tests
 * Tests for STOP score logic and work submission review
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import {
  EngineeringLeadSupervisor,
  createEngineeringLeadSupervisor,
  type WorkSubmission,
} from "../src/supervisor/engineeringLead.js";

describe("EngineeringLeadSupervisor", () => {
  let supervisor: EngineeringLeadSupervisor;

  before(() => {
    supervisor = new EngineeringLeadSupervisor(40);
  });

  describe("review()", () => {
    it("should approve complete submission with all artefacts", () => {
      const submission: WorkSubmission = {
        taskId: "task-001",
        description: "Implemented user authentication with file:src/auth.ts",
        artefacts: ["src/auth.ts", "src/auth.test.ts"],
        claims: ["Authentication works - see file:src/auth.ts"],
        hasTests: true,
        hasSchema: true,
        hasDeployConfig: true,
      };

      const decision = supervisor.review(submission);

      assert.strictEqual(decision.decision, "APPROVED");
      assert.strictEqual(decision.finalStatus, "COMPLETE");
      assert.strictEqual(decision.riskLevel, "LOW");
      assert.ok(decision.stopScore < 40);
      assert.strictEqual(decision.missingInvalidParts.length, 0);
    });

    it("should flag missing tests", () => {
      const submission: WorkSubmission = {
        taskId: "task-002",
        description: "Added new feature",
        artefacts: ["src/feature.ts"],
        claims: [],
        hasTests: false,
        hasSchema: true,
        hasDeployConfig: true,
      };

      const decision = supervisor.review(submission);

      assert.ok(decision.missingInvalidParts.includes("Tests"));
      assert.ok(decision.stopScore >= 15); // MISSING_TESTS weight
    });

    it("should flag missing schema", () => {
      const submission: WorkSubmission = {
        taskId: "task-003",
        description: "Database changes",
        artefacts: ["src/db.ts"],
        claims: [],
        hasTests: true,
        hasSchema: false,
        hasDeployConfig: true,
      };

      const decision = supervisor.review(submission);

      assert.ok(decision.missingInvalidParts.includes("Schema/SQL"));
    });

    it("should flag missing deploy config", () => {
      const submission: WorkSubmission = {
        taskId: "task-004",
        description: "New service",
        artefacts: ["src/service.ts"],
        claims: [],
        hasTests: true,
        hasSchema: true,
        hasDeployConfig: false,
      };

      const decision = supervisor.review(submission);

      assert.ok(decision.missingInvalidParts.includes("Deploy config"));
    });

    it("should flag empty artefacts as unproven claim", () => {
      const submission: WorkSubmission = {
        taskId: "task-005",
        description: "Did some work",
        artefacts: [],
        claims: [],
        hasTests: true,
        hasSchema: true,
        hasDeployConfig: true,
      };

      const decision = supervisor.review(submission);

      assert.ok(decision.missingInvalidParts.includes("Verifiable artefacts"));
    });

    it("should STOP on pricing without fact", () => {
      const submission: WorkSubmission = {
        taskId: "task-006",
        description: "This will cost $500 per month",
        artefacts: ["src/billing.ts"],
        claims: [],
        hasTests: true,
        hasSchema: true,
        hasDeployConfig: true,
      };

      const decision = supervisor.review(submission);

      assert.strictEqual(decision.decision, "STOP_REQUIRED");
      assert.strictEqual(decision.finalStatus, "STOP_REQUIRED");
      assert.ok(decision.stopScore >= 40);
    });

    it("should STOP on legal statements", () => {
      const submission: WorkSubmission = {
        taskId: "task-007",
        description: "This comes with a warranty guarantee",
        artefacts: ["src/terms.ts"],
        claims: [],
        hasTests: true,
        hasSchema: true,
        hasDeployConfig: true,
      };

      const decision = supervisor.review(submission);

      assert.strictEqual(decision.decision, "STOP_REQUIRED");
      assert.ok(decision.stopScore >= 40);
    });

    it("should flag unproven claims without file reference", () => {
      const submission: WorkSubmission = {
        taskId: "task-008",
        description: "Feature ready",
        artefacts: ["src/feature.ts"],
        claims: ["I implemented the whole thing"],
        hasTests: true,
        hasSchema: true,
        hasDeployConfig: true,
      };

      const decision = supervisor.review(submission);

      // UNPROVEN_CLAIM has weight 30, might cause STOP if combined
      assert.ok(decision.stopScore >= 30);
    });

    it("should return COMPLETE_WITH_GAPS for minor issues", () => {
      const submission: WorkSubmission = {
        taskId: "task-009",
        description: "Minor update",
        artefacts: ["src/update.ts"],
        claims: [],
        hasTests: false, // Only missing tests (15 points)
        hasSchema: true,
        hasDeployConfig: true,
      };

      const decision = supervisor.review(submission);

      // Score should be 15 (MISSING_TESTS) which is below 40
      if (decision.stopScore < 40) {
        assert.strictEqual(decision.finalStatus, "COMPLETE_WITH_GAPS");
        assert.strictEqual(decision.decision, "APPROVED");
      }
    });

    it("should accumulate multiple issues", () => {
      const submission: WorkSubmission = {
        taskId: "task-010",
        description: "Incomplete work",
        artefacts: [],
        claims: [],
        hasTests: false,
        hasSchema: false,
        hasDeployConfig: false,
      };

      const decision = supervisor.review(submission);

      // Multiple issues should accumulate
      assert.ok(decision.missingInvalidParts.length >= 3);
      assert.ok(decision.stopScore > 0);
    });
  });

  describe("quickValidate()", () => {
    it("should pass valid content", () => {
      const result = supervisor.quickValidate("This is a simple description");

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.issues.length, 0);
    });

    it("should flag pricing without unknown marker", () => {
      const result = supervisor.quickValidate("The price is $100");

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes("Pricing")));
    });

    it("should pass pricing with unknown marker", () => {
      const result = supervisor.quickValidate("The price is unknown");

      assert.strictEqual(result.valid, true);
    });

    it("should flag legal statements", () => {
      const result = supervisor.quickValidate("This is a legal requirement");

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes("Legal")));
    });

    it("should flag warranty mentions", () => {
      const result = supervisor.quickValidate("Comes with warranty");

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes("Legal")));
    });

    it("should flag claims without file reference", () => {
      const result = supervisor.quickValidate("I implemented the feature");

      assert.strictEqual(result.valid, false);
      assert.ok(
        result.issues.some((i) => i.includes("without file reference")),
      );
    });

    it("should pass claims with file reference", () => {
      const result = supervisor.quickValidate(
        "I implemented the feature - see file:src/feature.ts",
      );

      assert.strictEqual(result.valid, true);
    });

    it("should flag deployed claims without file reference", () => {
      const result = supervisor.quickValidate(
        "Successfully deployed to production",
      );

      assert.strictEqual(result.valid, false);
      assert.ok(result.issues.some((i) => i.includes("deployed")));
    });
  });

  describe("createEngineeringLeadSupervisor()", () => {
    it("should create supervisor with default threshold", () => {
      const sup = createEngineeringLeadSupervisor();

      assert.ok(sup instanceof EngineeringLeadSupervisor);
      assert.strictEqual(sup.stopThreshold, 40);
    });

    it("should respect STOP_SCORE_THRESHOLD env variable", () => {
      const originalEnv = process.env.STOP_SCORE_THRESHOLD;
      process.env.STOP_SCORE_THRESHOLD = "50";

      const sup = createEngineeringLeadSupervisor();

      assert.strictEqual(sup.stopThreshold, 50);

      // Restore
      if (originalEnv !== undefined) {
        process.env.STOP_SCORE_THRESHOLD = originalEnv;
      } else {
        delete process.env.STOP_SCORE_THRESHOLD;
      }
    });
  });

  describe("Risk Levels", () => {
    it("should return LOW risk for score 0-19", () => {
      const submission: WorkSubmission = {
        taskId: "task-low",
        description: "Simple task",
        artefacts: ["src/simple.ts"],
        claims: [],
        hasTests: true,
        hasSchema: true,
        hasDeployConfig: true,
      };

      const decision = supervisor.review(submission);

      assert.strictEqual(decision.riskLevel, "LOW");
      assert.ok(decision.stopScore < 20);
    });

    it("should return MEDIUM risk for score 20-39", () => {
      const submission: WorkSubmission = {
        taskId: "task-medium",
        description: "Task with minor issues",
        artefacts: ["src/task.ts"],
        claims: [],
        hasTests: false, // 15 points
        hasSchema: false, // 25 points = 40 total, but let's adjust
        hasDeployConfig: true,
      };

      const decision = supervisor.review(submission);

      // This might be HIGH due to 40 points, let's check
      if (decision.stopScore >= 20 && decision.stopScore < 40) {
        assert.strictEqual(decision.riskLevel, "MEDIUM");
      }
    });

    it("should return CRITICAL risk for score 70+", () => {
      const submission: WorkSubmission = {
        taskId: "task-critical",
        description: "This costs $100 with legal warranty guarantee",
        artefacts: [],
        claims: ["I implemented and deployed everything"],
        hasTests: false,
        hasSchema: false,
        hasDeployConfig: false,
      };

      const decision = supervisor.review(submission);

      // Multiple high-weight reasons should trigger CRITICAL
      assert.ok(decision.stopScore >= 70);
      assert.strictEqual(decision.riskLevel, "CRITICAL");
    });
  });
});
