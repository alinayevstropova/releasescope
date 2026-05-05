import { describe, expect, test } from "vitest";
import { assessAudit } from "@/lib/qa/assessment";
import { buildDemoAudit } from "@/lib/qa/fixtures/demo-audit";
import { qaAuditResultSchema } from "@/lib/qa/schemas";
import type { QaAuditResult } from "@/lib/qa/types";

type AssessableAudit = Omit<QaAuditResult, "assessment" | "aiSummary">;

describe("assessAudit", () => {
  test("marks a clean release as ready with no weighted penalties", () => {
    const assessment = assessAudit(cleanAudit());

    expect(assessment.decision).toBe("ready");
    expect(assessment.riskLevel).toBe("low");
    expect(assessment.score).toBe(100);
    expect(assessment.scoreExplanation?.contributions).toEqual([]);
    expect(assessment.decisionReasons).toContain("No release blockers were detected.");
  });

  test("blocks release when critical accessibility and runtime errors have evidence", () => {
    const audit = cleanAudit({
      page: {
        ...cleanAudit().page,
        pageErrors: [
          {
            message: "ReferenceError: checkout is not defined",
            severity: "high",
            evidence: [
              {
                summary: "Checkout page threw a ReferenceError.",
                rawToolOutput: "ReferenceError: checkout is not defined",
              },
            ],
          },
        ],
      },
      accessibility: {
        violationCount: 1,
        incompleteCount: 0,
        passesCount: 30,
        violations: [
          {
            id: "aria-valid-attr",
            impact: "critical",
            severity: "critical",
            category: "accessibility",
            description: "ARIA attributes must be valid",
            help: "ARIA attributes must conform to valid names",
            helpUrl: "https://dequeuniversity.com/rules/axe/4.11/aria-valid-attr",
            nodeCount: 1,
            nodes: [
              {
                target: ["#checkout"],
                html: '<button id="checkout" aria-bad="true">Pay</button>',
              },
            ],
            evidence: [
              {
                summary: "Invalid ARIA attribute on checkout button.",
                selector: "#checkout",
                rawToolOutput: 'aria-bad="true"',
              },
            ],
          },
        ],
      },
    });

    const assessment = assessAudit(audit);

    expect(assessment.decision).toBe("blocked");
    expect(assessment.blockers).toContain("1 critical accessibility violation found.");
    expect(assessment.issueBacklog[0]).toMatchObject({
      title: "Fix ARIA attributes must conform to valid names",
      priority: "P0",
      severity: "critical",
    });
    expect(assessment.issueBacklog[0]?.evidenceItems?.[0]).toMatchObject({
      selector: "#checkout",
    });
  });

  test("applies configurable scoring weights to release decision logic", () => {
    const audit = cleanAudit({
      lighthouse: {
        fetchTime: "2026-05-05T10:00:01.000Z",
        categories: [
          { id: "performance", title: "Performance", score: 72 },
          { id: "accessibility", title: "Accessibility", score: 100 },
          { id: "best-practices", title: "Best Practices", score: 100 },
          { id: "seo", title: "SEO", score: 100 },
        ],
        findings: [],
      },
    });

    const defaultAssessment = assessAudit(audit);
    const strictAssessment = assessAudit(audit, {
      scoringWeights: { performanceNeedsWork: 30 },
    });

    expect(defaultAssessment.score).toBe(88);
    expect(strictAssessment.score).toBe(70);
    expect(strictAssessment.scoreExplanation?.weights.performanceNeedsWork).toBe(30);
    expect(strictAssessment.scoreExplanation?.contributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "performance-score",
          penalty: 30,
        }),
      ]),
    );
  });

  test("builds a schema-valid demo audit without network access", () => {
    const result = buildDemoAudit({
      url: "https://demo.example",
      viewport: "desktop",
      includeAi: false,
      demoMode: true,
    });

    expect(result.mode).toBe("demo");
    expect(result.warnings).toContain("Demo mode used synthetic audit evidence without external network calls.");
    expect(result.assessment.decision).toBe("review");
    expect(() => qaAuditResultSchema.parse(result)).not.toThrow();
  });
});

function cleanAudit(overrides: Partial<AssessableAudit> = {}): AssessableAudit {
  const base: AssessableAudit = {
    id: "audit-clean",
    url: "https://example.com",
    viewport: "desktop",
    mode: "live",
    startedAt: "2026-05-05T10:00:00.000Z",
    finishedAt: "2026-05-05T10:00:01.000Z",
    durationMs: 1000,
    page: {
      title: "Example",
      description: "Example description",
      finalUrl: "https://example.com",
      status: 200,
      h1: ["Example"],
      contentChecks: [],
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
    },
    accessibility: {
      violationCount: 0,
      incompleteCount: 0,
      passesCount: 50,
      violations: [],
    },
    lighthouse: {
      fetchTime: "2026-05-05T10:00:01.000Z",
      categories: [
        { id: "performance", title: "Performance", score: 100 },
        { id: "accessibility", title: "Accessibility", score: 100 },
        { id: "best-practices", title: "Best Practices", score: 100 },
        { id: "seo", title: "SEO", score: 100 },
      ],
      findings: [],
    },
    security: {
      checks: [
        {
          id: "https",
          title: "Final URL uses HTTPS",
          status: "pass",
          severity: "info",
          evidence: [{ summary: "The final URL uses HTTPS." }],
        },
      ],
      passedCount: 1,
      warningCount: 0,
      failedCount: 0,
    },
    warnings: [],
  };

  return {
    ...base,
    ...overrides,
  };
}
