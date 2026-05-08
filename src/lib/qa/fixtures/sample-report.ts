import type { AiCopilotReport, QaAuditResult } from "@/lib/qa/types";

export const sampleAuditResult: QaAuditResult = {
  id: "audit_sample",
  url: "https://example.com/",
  viewport: "desktop",
  mode: "live",
  startedAt: "2026-05-01T12:00:00.000Z",
  finishedAt: "2026-05-01T12:00:07.000Z",
  durationMs: 7000,
  page: {
    title: "Example Product",
    description: null,
    finalUrl: "https://example.com/",
    status: 200,
    h1: ["Example Product"],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  },
  accessibility: {
    violationCount: 1,
    incompleteCount: 0,
    passesCount: 42,
    violations: [
      {
        id: "button-name",
        impact: "serious",
        description: "Ensures buttons have discernible text",
        help: "Buttons must have discernible text",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.11/button-name",
        nodeCount: 1,
        nodes: [
          {
            target: ["button.icon-only"],
            html: '<button class="icon-only"></button>',
          },
        ],
      },
    ],
  },
  lighthouse: {
    fetchTime: "2026-05-01T12:00:07.000Z",
    categories: [
      { id: "performance", title: "Performance", score: 72 },
      { id: "accessibility", title: "Accessibility", score: 91 },
      { id: "best-practices", title: "Best Practices", score: 100 },
      { id: "seo", title: "SEO", score: 84 },
    ],
    findings: [
      {
        id: "largest-contentful-paint",
        title: "Largest Contentful Paint element",
        description: "Reduce the time spent rendering the largest contentful paint element.",
        category: "Performance",
        score: 0,
        displayValue: "3.2 s",
      },
      {
        id: "unminified-javascript",
        title: "Minify JavaScript",
        description: "Minifying JavaScript files can reduce payload sizes and script parse time.",
        category: "Performance",
        score: 0,
        displayValue: "Est savings of 182 KiB",
      },
    ],
  },
  assessment: {
    score: 76,
    decision: "review",
    riskLevel: "medium",
    headline: "Needs QA review before release (76/100).",
    blockers: [],
    quickWins: [
      "Add a meta description for clearer search and sharing snippets.",
      "Review the lowest page speed findings first.",
    ],
    issueBacklog: [
      {
        title: "Fix Buttons must have discernible text",
        area: "accessibility",
        priority: "P1",
        evidence: "1 affected element: button-name",
      },
      {
        title: "Improve page speed score",
        area: "performance",
        priority: "P2",
        evidence: "Current score: 72/100.",
      },
    ],
  },
  warnings: [],
};

export const sampleCopilotReport: AiCopilotReport = {
  plainLanguageSummary: "Release needs QA review because accessibility and page-quality risks remain.",
  issueDescriptions: [
    {
      title: "Fix unnamed button",
      priority: "P1",
      expectedBehavior: "The button has a visible or programmatic accessible name.",
      actualBehavior: "The audit found a button without discernible text.",
      evidence: "button-name affected one element.",
      suggestedFix: "Add visible text or aria-label and rerun axe-core.",
    },
  ],
  edgeCases: ["Keyboard-only audit of the primary flow."],
  regressionChecklist: ["Run typecheck, lint, build, and Playwright tests."],
  supportHandoffNote: "Support should know accessibility fixes are still under review.",
  releaseNotes: {
    knownRisks: ["An accessibility issue remains open."],
    safeToShip: ["No server error was detected."],
  },
};
