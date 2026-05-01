import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import type { Result as AxeResult } from "axe-core";
import { assessAudit } from "@/lib/qa/assessment";
import { AuditTargetLoadError } from "@/lib/qa/errors";
import type {
  AccessibilityReport,
  AccessibilityViolation,
  AuditViewport,
  FailedRequest,
  LighthouseCategory,
  LighthouseFinding,
  LighthouseReport,
  PageIssue,
  PageSnapshot,
  QaAuditRequest,
  QaAuditResult,
} from "@/lib/qa/types";
import { prepareAuditTargetUrl } from "@/lib/qa/url-guard";

const VIEWPORTS: Record<AuditViewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 960 },
  mobile: { width: 390, height: 844 },
};

const MAX_RUNTIME_SIGNALS = 30;

export async function runQaAudit(input: QaAuditRequest): Promise<QaAuditResult> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const warnings: string[] = [];
  const cappedWarnings = new Set<string>();
  const targetUrl = await prepareAuditTargetUrl(input.url);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORTS[input.viewport],
    isMobile: input.viewport === "mobile",
  });
  const page = await context.newPage();

  const consoleErrors: PageIssue[] = [];
  const pageErrors: PageIssue[] = [];
  const failedRequests: FailedRequest[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      pushCappedSignal(
        consoleErrors,
        {
          message: trimText(message.text(), 500),
          source: message.location().url,
        },
        "Console errors",
        warnings,
        cappedWarnings,
      );
    }
  });

  page.on("pageerror", (error) => {
    pushCappedSignal(
      pageErrors,
      { message: trimText(error.message, 500) },
      "Page errors",
      warnings,
      cappedWarnings,
    );
  });

  page.on("requestfailed", (request) => {
    pushCappedSignal(
      failedRequests,
      {
        url: request.url(),
        method: request.method(),
        errorText: request.failure()?.errorText ?? "Unknown request failure",
      },
      "Failed requests",
      warnings,
      cappedWarnings,
    );
  });

  let snapshot: PageSnapshot;
  let accessibility: AccessibilityReport;

  try {
    const response = await page
      .goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      })
      .catch((error) => {
        throw new AuditTargetLoadError(
          `Target page could not be loaded: ${sanitizeBrowserError(error)}`,
        );
      });

    await page
      .waitForLoadState("networkidle", { timeout: 8_000 })
      .catch(() => warnings.push("Network activity did not settle before the audit continued."));

    const facts = await page.evaluate(() => ({
      title: document.title,
      description:
        document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? null,
      h1: Array.from(document.querySelectorAll("h1"))
        .map((node) => node.textContent?.trim() ?? "")
        .filter(Boolean),
    }));

    snapshot = {
      title: facts.title,
      description: facts.description,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      h1: facts.h1,
      consoleErrors,
      pageErrors,
      failedRequests,
    };

    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();

    accessibility = toAccessibilityReport(axeResults.violations, {
      incompleteCount: axeResults.incomplete.length,
      passesCount: axeResults.passes.length,
    });
  } finally {
    await browser.close();
  }

  let lighthouse: LighthouseReport | undefined;
  try {
    lighthouse = await runLighthouseAudit(targetUrl, input.viewport);
  } catch (error) {
    warnings.push(`Lighthouse audit failed: ${getErrorMessage(error)}`);
  }

  const finished = Date.now();
  const result: Omit<QaAuditResult, "assessment" | "aiSummary"> = {
    id: crypto.randomUUID(),
    url: targetUrl,
    viewport: input.viewport,
    startedAt,
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started,
    page: snapshot,
    accessibility,
    lighthouse,
    warnings,
  };

  return {
    ...result,
    assessment: assessAudit(result),
  };
}

function toAccessibilityReport(
  violations: AxeResult[],
  counts: { incompleteCount: number; passesCount: number },
): AccessibilityReport {
  const mapped: AccessibilityViolation[] = violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? "unknown",
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodeCount: violation.nodes.length,
    nodes: violation.nodes.slice(0, 4).map((node) => ({
      target: node.target.map(String),
      html: trimText(node.html, 420),
      failureSummary: node.failureSummary ? trimText(node.failureSummary, 420) : undefined,
    })),
  }));

  return {
    violationCount: mapped.length,
    incompleteCount: counts.incompleteCount,
    passesCount: counts.passesCount,
    violations: mapped.sort((a, b) => impactRank(b.impact) - impactRank(a.impact)),
  };
}

async function runLighthouseAudit(
  targetUrl: string,
  viewport: AuditViewport,
): Promise<LighthouseReport> {
  const [{ default: lighthouse }, chromeLauncher] = await Promise.all([
    import("lighthouse"),
    import("chrome-launcher"),
  ]);

  const chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const runnerResult = await lighthouse(
      targetUrl,
      {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        formFactor: viewport,
        screenEmulation:
          viewport === "desktop"
            ? {
                disabled: false,
                mobile: false,
                width: VIEWPORTS.desktop.width,
                height: VIEWPORTS.desktop.height,
                deviceScaleFactor: 1,
              }
            : undefined,
      },
      undefined,
    );

    if (!runnerResult) {
      throw new Error("Lighthouse returned no result.");
    }

    const lhr = runnerResult.lhr;
    const categories: LighthouseCategory[] = Object.values(lhr.categories).map((category) => ({
      id: category.id,
      title: category.title,
      score: toPercent(category.score),
    }));

    const categoryByAuditId = new Map<string, string>();
    for (const category of Object.values(lhr.categories)) {
      for (const ref of category.auditRefs) {
        if (ref.weight > 0) {
          categoryByAuditId.set(ref.id, category.title);
        }
      }
    }

    const findings: LighthouseFinding[] = Object.values(lhr.audits)
      .filter((audit) => {
        if (audit.scoreDisplayMode === "notApplicable") {
          return false;
        }
        return typeof audit.score === "number" && audit.score < 0.9;
      })
      .map((audit) => ({
        id: audit.id,
        title: audit.title,
        description: audit.description,
        category: categoryByAuditId.get(audit.id) ?? "General",
        score: toPercent(audit.score),
        displayValue: audit.displayValue,
      }))
      .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
      .slice(0, 12);

    return {
      categories,
      findings,
      fetchTime: lhr.fetchTime,
    };
  } finally {
    await chrome.kill();
  }
}

function toPercent(score: number | null | undefined) {
  return typeof score === "number" ? Math.round(score * 100) : null;
}

function impactRank(impact: AccessibilityViolation["impact"]) {
  return {
    critical: 4,
    serious: 3,
    moderate: 2,
    minor: 1,
    unknown: 0,
  }[impact];
}

function trimText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function sanitizeBrowserError(error: unknown) {
  const message = getErrorMessage(error);
  return trimText(message.split("\n")[0] ?? message, 240);
}

function pushCappedSignal<T>(
  collection: T[],
  item: T,
  label: string,
  warnings: string[],
  cappedWarnings: Set<string>,
) {
  if (collection.length < MAX_RUNTIME_SIGNALS) {
    collection.push(item);
    return;
  }

  const warning = `${label} capped at ${MAX_RUNTIME_SIGNALS} entries.`;
  if (!cappedWarnings.has(warning)) {
    cappedWarnings.add(warning);
    warnings.push(warning);
  }
}
