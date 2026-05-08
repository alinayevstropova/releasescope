import type { AuditDecision, QaAuditResult } from "../lib/qa/types";

export type CliJsonReport = {
  schemaVersion: "releasescope.audit.v1";
  generatedAt: string;
  summary: {
    auditId: string;
    url: string;
    viewport: QaAuditResult["viewport"];
    mode: QaAuditResult["mode"];
    decision: AuditDecision;
    riskLevel: QaAuditResult["assessment"]["riskLevel"];
    score: number;
    blockerCount: number;
    backlogCount: number;
    warningCount: number;
  };
  artifacts?: {
    directory: string;
    manifest: string;
    markdownReport: string;
    prComment: string;
  };
  result: QaAuditResult;
};

export function createJsonReport(
  result: QaAuditResult,
  options: { artifactDir?: string; generatedAt?: string } = {},
): CliJsonReport {
  return {
    schemaVersion: "releasescope.audit.v1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    summary: {
      auditId: result.id,
      url: result.url,
      viewport: result.viewport,
      mode: result.mode,
      decision: result.assessment.decision,
      riskLevel: result.assessment.riskLevel,
      score: result.assessment.score,
      blockerCount: result.assessment.blockers.length,
      backlogCount: result.assessment.issueBacklog.length,
      warningCount: result.warnings.length,
    },
    artifacts: options.artifactDir
      ? {
          directory: options.artifactDir,
          manifest: "artifacts-manifest.json",
          markdownReport: "report.md",
          prComment: "pr-comment.md",
        }
      : undefined,
    result,
  };
}

export function formatAuditMarkdown(
  result: QaAuditResult,
  options: { artifactDir?: string; generatedAt?: string } = {},
): string {
  const lines = [
    "# ReleaseScope Audit Report",
    "",
    `Generated: ${options.generatedAt ?? new Date().toISOString()}`,
    `Target: ${result.url}`,
    `Viewport: ${result.viewport}`,
    `Mode: ${result.mode ?? "live"}`,
    "",
    "## Release Decision",
    "",
    `Decision: **${result.assessment.decision.toUpperCase()}**`,
    `Risk level: **${result.assessment.riskLevel}**`,
    `Score: **${result.assessment.score}/100**`,
    "",
    result.assessment.headline,
    "",
  ];

  appendList(lines, "Blockers", result.assessment.blockers);
  appendList(lines, "Decision Reasons", result.assessment.decisionReasons ?? []);
  appendLighthouseScores(lines, result);
  appendRuntimeSignals(lines, result);
  appendBacklog(lines, result);
  appendList(lines, "Quick Wins", result.assessment.quickWins);
  appendAiSummary(lines, result);
  appendList(lines, "Warnings", result.warnings);

  if (options.artifactDir) {
    lines.push(
      "## Artifacts",
      "",
      `Artifact directory: \`${options.artifactDir}\``,
      "",
      "- `audit.json` - CI-friendly JSON report.",
      "- `report.md` - Markdown audit report.",
      "- `pr-comment.md` - PR-ready release risk summary.",
      "- `screenshots/page-full.png` - Full-page screenshot from live audits.",
      "- `traces/playwright-trace.zip` - Playwright trace from live audits.",
      "- `lighthouse/lighthouse-report.json` - Raw Lighthouse JSON from live audits.",
      "- `axe/axe-report.json` - Raw axe-core JSON from live audits.",
      "",
    );
  }

  return `${lines.join("\n").trim()}\n`;
}

export function formatPrComment(result: QaAuditResult): string {
  const topBacklog = result.assessment.issueBacklog.slice(0, 5);
  const lighthouseScores =
    result.lighthouse?.categories
      .map((category) => `${category.title}: ${category.score ?? "n/a"}`)
      .join(", ") ?? "Lighthouse did not complete.";

  const lines = [
    "## ReleaseScope Release Risk",
    "",
    `Decision: **${result.assessment.decision.toUpperCase()}**`,
    `Risk level: **${result.assessment.riskLevel}**`,
    `Score: **${result.assessment.score}/100**`,
    "",
    result.assessment.headline,
    "",
    "### Top Risks",
    "",
  ];

  if (topBacklog.length === 0) {
    lines.push("- No release risks were promoted into the backlog.", "");
  } else {
    topBacklog.forEach((item) => {
      lines.push(`- **${item.priority} ${item.title}**: ${item.evidence}`);
    });
    lines.push("");
  }

  lines.push(
    "### Evidence",
    "",
    `- Accessibility violations: ${result.accessibility.violationCount}`,
    `- Failed requests: ${result.page.failedRequests.length}`,
    `- Console errors: ${result.page.consoleErrors.length}`,
    `- Lighthouse: ${lighthouseScores}`,
    "",
    "### Suggested Gate",
    "",
    releaseGateCopy(result.assessment.decision),
    "",
    "CI artifacts should include `audit.json`, `report.md`, `pr-comment.md`, browser screenshots, Playwright traces, Lighthouse JSON, and axe JSON.",
    "",
  );

  return `${lines.join("\n").trim()}\n`;
}

function appendList(lines: string[], title: string, items: string[]) {
  lines.push(`## ${title}`, "");

  if (items.length === 0) {
    lines.push("- None.", "");
    return;
  }

  items.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
}

function appendLighthouseScores(lines: string[], result: QaAuditResult) {
  lines.push("## Lighthouse Scores", "");

  if (!result.lighthouse) {
    lines.push("- Lighthouse did not complete.", "");
    return;
  }

  lines.push("| Category | Score |", "| --- | ---: |");
  result.lighthouse.categories.forEach((category) => {
    lines.push(`| ${category.title} | ${category.score ?? "n/a"} |`);
  });
  lines.push("");

  if (result.lighthouse.findings.length > 0) {
    lines.push("Lowest Lighthouse Findings", "");
    result.lighthouse.findings.slice(0, 5).forEach((finding) => {
      const score = finding.score === null ? "n/a" : `${finding.score}/100`;
      lines.push(`- **${finding.title}** (${score}): ${finding.displayValue ?? finding.category}`);
    });
    lines.push("");
  }
}

function appendRuntimeSignals(lines: string[], result: QaAuditResult) {
  lines.push("## Runtime Signals", "");
  lines.push(`- HTTP status: ${result.page.status ?? "unknown"}`);
  lines.push(`- Final URL: ${result.page.finalUrl}`);
  lines.push(`- Console errors: ${result.page.consoleErrors.length}`);
  lines.push(`- Page errors: ${result.page.pageErrors.length}`);
  lines.push(`- Failed requests: ${result.page.failedRequests.length}`);
  lines.push(`- Accessibility violations: ${result.accessibility.violationCount}`);
  lines.push("");
}

function appendBacklog(lines: string[], result: QaAuditResult) {
  lines.push("## Issue Backlog", "");

  if (result.assessment.issueBacklog.length === 0) {
    lines.push("- No issues generated.", "");
    return;
  }

  result.assessment.issueBacklog.forEach((item) => {
    lines.push(`- **${item.priority} ${item.title}** (${item.area}): ${item.evidence}`);
  });
  lines.push("");
}

function appendAiSummary(lines: string[], result: QaAuditResult) {
  lines.push("## AI Copilot", "");

  if (!result.aiSummary) {
    lines.push("- Not requested.", "");
    return;
  }

  if (result.aiSummary.status === "generated") {
    lines.push(`- Generated with ${result.aiSummary.model}.`);
    lines.push(`- ${result.aiSummary.report.plainLanguageSummary}`);
    lines.push("");
    return;
  }

  lines.push(`- ${result.aiSummary.status}: ${result.aiSummary.reason}`);
  if (result.aiSummary.fallbackReport) {
    lines.push(`- ${result.aiSummary.fallbackReport.plainLanguageSummary}`);
  }
  lines.push("");
}

function releaseGateCopy(decision: AuditDecision) {
  if (decision === "ready") {
    return "Ready to merge after normal code review.";
  }

  if (decision === "review") {
    return "Hold for QA review or merge only with explicit owner sign-off.";
  }

  return "Do not merge until blockers are fixed and the audit is rerun.";
}
