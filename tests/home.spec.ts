import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { QaAuditResult } from "@/lib/qa/types";

test("home page loads with clear product copy and no serious accessibility violations", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "ReleaseScope" })).toBeVisible();
  await expect(page.getByText("From URL to release decision")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run audit" })).toBeVisible();

  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await expect(page.getByText("Release map")).toBeVisible();
    await expect(page.getByText("Evidence strong")).toBeVisible();
  }

  const results = await new AxeBuilder({ page }).analyze();
  const seriousViolations = results.violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact ?? ""),
  );

  expect(seriousViolations).toEqual([]);
});

test("keeps invalid target URLs in the browser validation path", async ({ page }) => {
  let apiRequests = 0;
  await page.route("**/api/audits", async (route) => {
    apiRequests += 1;
    await route.fulfill({ status: 500, json: { error: "Should not be called." } });
  });

  await page.goto("/");
  await page.getByLabel("Target URL").fill("not-a-url");
  await page.getByRole("button", { name: "Run audit" }).click();

  await expect(page.getByLabel("Target URL")).toBeFocused();
  await expect.poll(() => apiRequests).toBe(0);
});

test("shows a useful loading state while the audit is running", async ({ page }) => {
  await page.route("**/api/audits", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({
      contentType: "application/json",
      json: mockAuditResult,
    });
  });

  await page.goto("/");
  await page.getByLabel("Target URL").fill("https://example.com");
  await page.getByRole("button", { name: "Run audit" }).click();

  await expect(page.getByText("Live audit running")).toBeVisible();
  await expect(page.getByRole("button", { name: "Running audit" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Needs QA review before release (76/100)." })).toBeVisible();
});

test("renders release decision, backlog, and plain-language page-quality findings", async ({ page }) => {
  await page.addInitScript(() => {
    const store = window as Window & { __copiedText?: string };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          store.__copiedText = text;
        },
      },
    });
  });

  await page.route("**/api/audits", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: mockAuditResult,
    });
  });

  await page.goto("/");
  await page.getByLabel("Target URL").fill("https://example.com");
  await page.getByRole("button", { name: "Run audit" }).click();

  await expect(page.getByRole("heading", { name: "Needs QA review before release (76/100)." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Issue-ready backlog" })).toBeVisible();
  await expect(page.getByText("Improve page speed score")).toBeVisible();
  await expect(page.getByText("Fix Buttons must have discernible text")).toBeVisible();
  await expect(page.getByText("Page-quality fixes")).toBeVisible();
  await expect(page.getByText("Make the main content appear faster")).toBeVisible();
  await expect(page.getByText("High impact").first()).toBeVisible();
  await expect(page.getByText("0%", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("sticky-metrics")).toContainText("QA score");
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect.poll(() => page.getByTestId("sticky-metrics").evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  await expect.poll(() => page.getByTestId("sticky-metrics").evaluate((element) => element.getBoundingClientRect().top)).toBeLessThanOrEqual(56);

  await page.getByLabel(/About Higher is better/).focus();
  await expect(page.getByRole("tooltip", { name: /Higher is better/ })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Copy a repair brief for your coding agent" })).toBeVisible();
  await page.getByRole("button", { name: "Copy for AI" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();

  const copiedText = await page.evaluate(() => (window as Window & { __copiedText?: string }).__copiedText);
  expect(copiedText).toContain("You are a senior product engineer and QA automation engineer.");
  expect(copiedText).toContain("Improve page speed score");
  expect(copiedText).toContain("Buttons must have discernible text");
});

test("page-quality fixes use the page scroll instead of a nested scroll box", async ({ page }) => {
  await page.route("**/api/audits", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: mockAuditResult,
    });
  });

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  await page.getByLabel("Target URL").fill("https://example.com");
  await page.getByRole("button", { name: "Run audit" }).click();
  await expect(page.getByText("Page-quality fixes")).toBeVisible();

  await expect(page.getByTestId("page-quality-list")).toBeVisible();
  await expect
    .poll(async () =>
      page.getByTestId("page-quality-list").evaluate((element) => ({
        clientHeight: element.clientHeight,
        overflowY: window.getComputedStyle(element).overflowY,
        scrollHeight: element.scrollHeight,
      })),
    )
    .toEqual(expect.objectContaining({ overflowY: "visible" }));
});

test("surfaces audit API failures as a visible error state", async ({ page }) => {
  await page.route("**/api/audits", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 500,
      json: { error: "Audit failed. Check the target URL and server logs." },
    });
  });

  await page.goto("/");
  await page.getByLabel("Target URL").fill("https://example.com");
  await page.getByRole("button", { name: "Run audit" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Audit failed" })).toContainText(
    "Audit failed. Check the target URL and server logs.",
  );
});

test("audit api validates malformed requests", async ({ request }) => {
  const response = await request.post("/api/audits", {
    data: {
      url: "not-a-url",
      viewport: "desktop",
      includeAi: false,
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual(
    expect.objectContaining({
      error: "Invalid audit request.",
    }),
  );
});

test("audit api rejects invalid JSON bodies", async ({ request }) => {
  const response = await request.post("/api/audits", {
    data: Buffer.from("{"),
    headers: {
      "Content-Type": "application/json",
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual(
    expect.objectContaining({
      error: "Request body must be valid JSON.",
    }),
  );
});

const mockAuditResult: QaAuditResult = {
  id: "audit_mock",
  url: "https://example.com/",
  viewport: "desktop",
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
