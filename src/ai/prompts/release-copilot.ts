import type { QaAuditResult } from "@/lib/qa/types";

export const RELEASE_COPILOT_INSTRUCTIONS = [
  "You are an expert QA lead and release manager.",
  "Turn the audit data into a practical release copilot report for developers, QA, support, and product.",
  "Use only evidence present in the audit data. Do not invent facts, screenshots, tools, users, or failures.",
  "Return valid JSON only. Do not wrap the JSON in Markdown.",
  "Keep each field concise, specific, and action-oriented.",
].join(" ");

export function buildReleaseCopilotPrompt(result: QaAuditResult, notes?: string) {
  const compact = {
    url: result.url,
    finalUrl: result.page.finalUrl,
    viewport: result.viewport,
    mode: result.mode,
    page: {
      status: result.page.status,
      title: result.page.title,
      description: result.page.description,
      h1: result.page.h1,
      consoleErrors: result.page.consoleErrors.slice(0, 6),
      pageErrors: result.page.pageErrors.slice(0, 6),
      failedRequests: result.page.failedRequests.slice(0, 6),
    },
    assessment: {
      score: result.assessment.score,
      decision: result.assessment.decision,
      riskLevel: result.assessment.riskLevel,
      blockers: result.assessment.blockers,
      quickWins: result.assessment.quickWins,
      decisionReasons: result.assessment.decisionReasons,
      scoreDrivers: result.assessment.scoreExplanation?.contributions.slice(0, 8),
      issueBacklog: result.assessment.issueBacklog.slice(0, 8),
    },
    accessibility: {
      violationCount: result.accessibility.violationCount,
      topViolations: result.accessibility.violations.slice(0, 8).map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        severity: violation.severity,
        help: violation.help,
        nodeCount: violation.nodeCount,
        evidence: violation.evidence?.slice(0, 2),
      })),
    },
    lighthouse: {
      categories: result.lighthouse?.categories,
      topFindings: result.lighthouse?.findings.slice(0, 8),
    },
    security: result.security,
    warnings: result.warnings,
    notes,
  };

  return [
    "Create a JSON object with this exact shape:",
    JSON.stringify(
      {
        plainLanguageSummary: "Short release summary in plain language.",
        issueDescriptions: [
          {
            title: "Issue title",
            priority: "P1",
            expectedBehavior: "What should happen",
            actualBehavior: "What the audit observed",
            evidence: "Evidence from the audit",
            suggestedFix: "First fix direction",
          },
        ],
        edgeCases: ["Edge case to test"],
        regressionChecklist: ["Regression check"],
        supportHandoffNote: "Short support note",
        releaseNotes: {
          knownRisks: ["Known risk"],
          safeToShip: ["What is safe to ship"],
        },
      },
      null,
      2,
    ),
    "Audit data:",
    JSON.stringify(compact, null, 2),
  ].join("\n\n");
}
