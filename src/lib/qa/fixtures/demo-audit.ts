import { assessAudit } from "@/lib/qa/assessment";
import { analyzeContentSnapshot } from "@/lib/qa/engine/content";
import type { PageSnapshot, QaAuditRequest, QaAuditResult } from "@/lib/qa/types";

export function buildDemoAudit(input: QaAuditRequest): QaAuditResult {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const finishedAt = new Date(started + 740).toISOString();
  const page: PageSnapshot = {
    title: "ReleaseScope demo checkout",
    description: null,
    finalUrl: input.url,
    status: 200,
    h1: ["Checkout"],
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [
      {
        url: "https://assets.example.test/hero-video.mp4",
        method: "GET",
        errorText: "net::ERR_FAILED",
        severity: "medium" as const,
        evidence: [
          {
            summary: "Demo failed request for a non-critical media asset.",
            url: "https://assets.example.test/hero-video.mp4",
            rawToolOutput: "net::ERR_FAILED",
            reproductionNotes: "Use demo mode to review how failed requests affect release risk.",
          },
        ],
      },
    ],
  };
  page.contentChecks = analyzeContentSnapshot(page);

  const result: Omit<QaAuditResult, "assessment" | "aiSummary"> = {
    id: "demo-audit",
    url: input.url,
    viewport: input.viewport,
    mode: "demo",
    startedAt,
    finishedAt,
    durationMs: 740,
    page,
    accessibility: {
      violationCount: 2,
      incompleteCount: 0,
      passesCount: 48,
      violations: [
        {
          id: "button-name",
          impact: "moderate",
          severity: "medium",
          category: "accessibility",
          description: "Ensures buttons have discernible text",
          help: "Buttons must have discernible text",
          helpUrl: "https://dequeuniversity.com/rules/axe/4.11/button-name",
          nodeCount: 1,
          nodes: [
            {
              target: ["button.icon-only"],
              html: '<button class="icon-only"></button>',
              failureSummary: "Element does not have inner text or an accessible name.",
            },
          ],
          evidence: [
            {
              summary: "Icon-only checkout action has no accessible name.",
              selector: "button.icon-only",
              rawToolOutput: "Element does not have inner text or an accessible name.",
              reproductionNotes: "Run axe-core on the demo page and inspect the button-name rule.",
            },
          ],
        },
        {
          id: "color-contrast",
          impact: "minor",
          severity: "low",
          category: "accessibility",
          description: "Ensures foreground and background colors meet contrast ratio thresholds",
          help: "Elements must meet minimum color contrast ratio thresholds",
          helpUrl: "https://dequeuniversity.com/rules/axe/4.11/color-contrast",
          nodeCount: 2,
          nodes: [
            {
              target: [".promo-note"],
              html: '<p class="promo-note">Limited offer</p>',
            },
          ],
          evidence: [
            {
              summary: "Promotional helper text has insufficient contrast.",
              selector: ".promo-note",
              reproductionNotes: "Run axe-core on the demo page and inspect the color-contrast rule.",
            },
          ],
        },
      ],
    },
    lighthouse: {
      fetchTime: finishedAt,
      categories: [
        { id: "performance", title: "Performance", score: 84 },
        { id: "accessibility", title: "Accessibility", score: 88 },
        { id: "best-practices", title: "Best Practices", score: 92 },
        { id: "seo", title: "SEO", score: 92 },
      ],
      findings: [
        {
          id: "largest-contentful-paint",
          title: "Largest Contentful Paint element",
          description: "Reduce the time spent rendering the largest contentful paint element.",
          category: "performance",
          severity: "medium",
          score: 84,
          displayValue: "3.2 s",
          evidence: [
            {
              summary: "Largest Contentful Paint took 3.2 seconds in demo mode.",
              rawToolOutput: '{"id":"largest-contentful-paint","score":58,"displayValue":"3.2 s"}',
              reproductionNotes: "Run Lighthouse and inspect the largest-contentful-paint audit.",
            },
          ],
        },
      ],
    },
    security: {
      checks: [
        {
          id: "https",
          title: "Final URL uses HTTPS",
          status: input.url.startsWith("https://") ? "pass" : "fail",
          severity: input.url.startsWith("https://") ? "info" : "high",
          evidence: [
            {
              summary: input.url.startsWith("https://")
                ? "The final URL uses HTTPS."
                : "The final URL does not use HTTPS.",
              url: input.url,
            },
          ],
        },
        {
          id: "content-security-policy",
          title: "Content-Security-Policy header is present",
          status: "warning",
          severity: "medium",
          evidence: [
            {
              summary: "Demo response does not include a Content-Security-Policy header.",
            },
          ],
        },
      ],
      passedCount: input.url.startsWith("https://") ? 1 : 0,
      warningCount: 1,
      failedCount: input.url.startsWith("https://") ? 0 : 1,
    },
    warnings: ["Demo mode used synthetic audit evidence without external network calls."],
  };

  return {
    ...result,
    assessment: assessAudit(result, { scoringWeights: input.scoringWeights }),
  };
}
