import { aiCopilotReportSchema } from "@/lib/qa/schemas";
import type { AiCopilotReport, AuditBacklogItem, QaAuditResult } from "@/lib/qa/types";

export function parseAiCopilotReport(raw: string): AiCopilotReport {
  const payload = JSON.parse(extractJsonPayload(raw));
  return aiCopilotReportSchema.parse(payload);
}

export function buildFallbackCopilotReport(result: QaAuditResult, notes?: string): AiCopilotReport {
  const backlog = result.assessment.issueBacklog.slice(0, 5);
  const knownRisks = [
    ...result.assessment.blockers,
    ...result.assessment.quickWins.map((win) => `Quick win still open: ${win}`),
  ].slice(0, 6);

  return {
    plainLanguageSummary: [
      `${result.assessment.headline} ReleaseScope scored this audit ${result.assessment.score}/100 with ${result.assessment.riskLevel} risk.`,
      result.assessment.decisionReasons?.[0] ?? "Review the issue backlog and score drivers before release.",
      notes ? `Context notes: ${notes}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    issueDescriptions: backlog.map(toIssueDescription),
    edgeCases: buildFallbackEdgeCases(result),
    regressionChecklist: buildFallbackRegressionChecklist(result),
    supportHandoffNote: buildSupportHandoffNote(result),
    releaseNotes: {
      knownRisks: knownRisks.length ? knownRisks : ["No major known risks were generated from the audit."],
      safeToShip: buildSafeToShipNotes(result),
    },
  };
}

export function formatCopilotReportMarkdown(report: AiCopilotReport) {
  return [
    "Plain-language release summary",
    report.plainLanguageSummary,
    "",
    "Issue descriptions",
    formatIssueDescriptions(report.issueDescriptions),
    "",
    "Edge cases",
    formatList(report.edgeCases),
    "",
    "Regression checklist",
    formatList(report.regressionChecklist),
    "",
    "Support handoff note",
    report.supportHandoffNote,
    "",
    "Release notes: known risks",
    formatList(report.releaseNotes.knownRisks),
    "",
    "Release notes: safe to ship",
    formatList(report.releaseNotes.safeToShip),
  ].join("\n");
}

function extractJsonPayload(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function toIssueDescription(item: AuditBacklogItem) {
  return {
    title: item.title,
    priority: item.priority,
    expectedBehavior: expectedBehaviorFor(item),
    actualBehavior: item.evidence,
    evidence: item.evidenceItems?.[0]?.summary ?? item.evidence,
    suggestedFix: suggestedFixFor(item),
  };
}

function expectedBehaviorFor(item: AuditBacklogItem) {
  const byArea: Record<AuditBacklogItem["area"], string> = {
    accessibility: "Users should be able to complete the flow with assistive technology and accessible controls.",
    "best-practices": "The page should follow browser and platform best practices.",
    content: "The page should communicate its purpose clearly with correct document metadata and headings.",
    performance: "The page should load quickly enough for release confidence.",
    reliability: "Required assets and requests should complete successfully.",
    runtime: "The page should run without uncaught browser errors.",
    security: "The release should meet basic security header and protocol expectations.",
    seo: "The page should expose enough metadata for search and sharing quality.",
  };

  return byArea[item.area];
}

function suggestedFixFor(item: AuditBacklogItem) {
  const byArea: Record<AuditBacklogItem["area"], string> = {
    accessibility: "Fix the affected elements, rerun axe-core, and verify keyboard and screen-reader behavior.",
    "best-practices": "Review the failing browser best-practice signal and patch the underlying implementation.",
    content: "Update headings or metadata, then rerun the audit to confirm the content signal clears.",
    performance: "Start with the highest-impact Lighthouse finding and compare before/after scores.",
    reliability: "Inspect the failed request or status path, fix the source, and rerun the release audit.",
    runtime: "Reproduce the browser error locally, add a regression check, and rerun the audit.",
    security: "Add or tune the missing security control and verify response headers.",
    seo: "Fix metadata or discoverability issues and rerun Lighthouse SEO checks.",
  };

  return byArea[item.area];
}

function buildFallbackEdgeCases(result: QaAuditResult) {
  const cases = [
    "Run the audit on both desktop and mobile viewports.",
    "Repeat the audit after clearing cache to catch first-load regressions.",
  ];

  if (result.page.failedRequests.length > 0) {
    cases.push("Throttle or block non-critical assets and confirm the page still gives users a usable fallback.");
  }

  if (result.accessibility.violations.length > 0) {
    cases.push("Navigate the main flow with keyboard only and confirm focus order remains clear.");
  }

  if (!result.page.description || result.page.h1.length !== 1) {
    cases.push("Share or preview the page and confirm metadata and heading hierarchy describe the release target.");
  }

  return cases.slice(0, 6);
}

function buildFallbackRegressionChecklist(result: QaAuditResult) {
  const checks = [
    "Run `npm run typecheck`.",
    "Run `npm run lint`.",
    "Run `npm run build`.",
    "Run `npm run test:e2e`.",
  ];

  if (result.assessment.issueBacklog.length > 0) {
    checks.push("Confirm all P0/P1 backlog items are fixed or converted into tracked follow-up issues.");
  }

  if (result.accessibility.violations.length > 0) {
    checks.push("Rerun axe-core checks and confirm no critical or serious accessibility issues remain.");
  }

  return checks;
}

function buildSupportHandoffNote(result: QaAuditResult) {
  if (result.assessment.decision === "ready") {
    return "No release blockers were detected. Support should monitor normal post-release channels for unexpected user reports.";
  }

  return `Release is ${result.assessment.decision}. Support should know the top risk: ${
    result.assessment.blockers[0] ?? result.assessment.issueBacklog[0]?.title ?? "review the release backlog"
  }.`;
}

function buildSafeToShipNotes(result: QaAuditResult) {
  if (result.assessment.decision === "blocked") {
    return ["Do not treat this release as safe to ship until blockers are resolved or explicitly accepted."];
  }

  const notes = ["The audited page returned a usable response."];
  if ((result.security?.failedCount ?? 0) === 0) {
    notes.push("No failing basic security checks were detected.");
  }
  if (!result.page.pageErrors.length) {
    notes.push("No uncaught browser page errors were detected.");
  }

  return notes;
}

function formatIssueDescriptions(items: AiCopilotReport["issueDescriptions"]) {
  if (!items.length) {
    return "- No issue descriptions were generated.";
  }

  return items
    .map(
      (item) =>
        [
          `- ${item.priority} ${item.title}`,
          `  Expected: ${item.expectedBehavior}`,
          `  Actual: ${item.actualBehavior}`,
          `  Evidence: ${item.evidence}`,
          `  Suggested fix: ${item.suggestedFix}`,
        ].join("\n"),
    )
    .join("\n");
}

function formatList(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None.";
}
