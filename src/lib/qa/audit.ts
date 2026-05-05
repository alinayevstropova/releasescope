import { chromium } from "playwright";
import { assessAudit } from "@/lib/qa/assessment";
import { AuditTargetLoadError } from "@/lib/qa/errors";
import { buildDemoAudit } from "@/lib/qa/fixtures/demo-audit";
import { runAccessibilityAudit } from "@/lib/qa/engine/accessibility";
import { analyzeContentSnapshot } from "@/lib/qa/engine/content";
import { runLighthouseAudit } from "@/lib/qa/engine/lighthouse";
import { collectRuntimeSignals, capturePageSnapshot } from "@/lib/qa/engine/runtime";
import { analyzeSecurityBasics } from "@/lib/qa/engine/security";
import { getErrorMessage, sanitizeBrowserError } from "@/lib/qa/engine/text";
import { VIEWPORTS } from "@/lib/qa/engine/viewport";
import type {
  AccessibilityReport,
  LighthouseReport,
  PageSnapshot,
  QaAuditRequest,
  QaAuditResult,
  SecurityReport,
} from "@/lib/qa/types";
import { prepareAuditTargetUrl } from "@/lib/qa/url-guard";

export async function runQaAudit(input: QaAuditRequest): Promise<QaAuditResult> {
  if (input.demoMode) {
    return buildDemoAudit(input);
  }

  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const warnings: string[] = [];
  const targetUrl = await prepareAuditTargetUrl(input.url);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORTS[input.viewport],
    isMobile: input.viewport === "mobile",
  });
  const page = await context.newPage();
  const runtimeSignals = collectRuntimeSignals(page, warnings);

  let snapshot: PageSnapshot;
  let accessibility: AccessibilityReport;
  let security: SecurityReport;

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

    snapshot = await capturePageSnapshot(page, response, runtimeSignals);
    snapshot.contentChecks = analyzeContentSnapshot(snapshot);
    security = await analyzeSecurityBasics(response, snapshot.finalUrl);
    accessibility = await runAccessibilityAudit(page);
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
    mode: "live",
    startedAt,
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started,
    page: snapshot,
    accessibility,
    lighthouse,
    security,
    warnings,
  };

  return {
    ...result,
    assessment: assessAudit(result, { scoringWeights: input.scoringWeights }),
  };
}
