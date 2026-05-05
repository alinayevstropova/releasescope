import { resolveScoringWeights } from "@/lib/qa/scoring-config";
import type {
  AuditAssessment,
  AuditBacklogItem,
  AuditDecision,
  AuditEvidence,
  AuditFindingCategory,
  AuditRiskLevel,
  AuditScoringWeights,
  AuditSeverity,
  QaAuditResult,
  ScoreContribution,
} from "@/lib/qa/types";

type AssessableAudit = Omit<QaAuditResult, "assessment" | "aiSummary">;

export function assessAudit(
  result: AssessableAudit,
  options?: { scoringWeights?: Partial<AuditScoringWeights> },
): AuditAssessment {
  const weights = resolveScoringWeights(options?.scoringWeights);
  const contributions: ScoreContribution[] = [];
  const performance = getCategoryScore(result, "performance");
  const bestPractices = getCategoryScore(result, "best-practices");
  const seo = getCategoryScore(result, "seo");
  const criticalA11y = countViolations(result, "critical");
  const seriousA11y = countViolations(result, "serious");
  const moderateA11y = countViolations(result, "moderate");
  const minorA11y = countViolations(result, "minor");
  const runtimeSignalCount =
    result.page.consoleErrors.length + result.page.pageErrors.length + result.page.failedRequests.length;

  addStatusContribution(contributions, result, weights);

  const accessibilityPenalty = Math.min(
    weights.accessibilityMax,
    criticalA11y * weights.criticalAccessibility +
      seriousA11y * weights.seriousAccessibility +
      moderateA11y * weights.moderateAccessibility +
      minorA11y * weights.minorAccessibility,
  );
  addContribution(contributions, {
    id: "accessibility-violations",
    label: "Accessibility violations",
    category: "accessibility",
    severity: criticalA11y > 0 ? "critical" : seriousA11y > 0 ? "high" : moderateA11y > 0 ? "medium" : "low",
    penalty: accessibilityPenalty,
    detail: `${criticalA11y} critical, ${seriousA11y} serious, ${moderateA11y} moderate, ${minorA11y} minor accessibility violations.`,
    evidence: result.accessibility.violations.flatMap((violation) => violation.evidence ?? []).slice(0, 6),
  });

  addContribution(contributions, categoryScoreContribution("performance", "Performance score", performance, [
    [50, weights.performancePoor, "high"],
    [75, weights.performanceNeedsWork, "medium"],
    [90, weights.performanceAlmostThere, "low"],
  ]));
  addContribution(contributions, categoryScoreContribution("best-practices", "Best practices score", bestPractices, [
    [80, weights.bestPracticesPoor, "medium"],
    [90, weights.bestPracticesNeedsWork, "low"],
  ]));
  addContribution(contributions, categoryScoreContribution("seo", "SEO score", seo, [
    [80, weights.seoPoor, "medium"],
    [90, weights.seoNeedsWork, "low"],
  ]));

  addContribution(contributions, cappedCountContribution({
    id: "page-errors",
    label: "Uncaught page errors",
    category: "runtime",
    severity: "high",
    count: result.page.pageErrors.length,
    perItemPenalty: weights.pageError,
    maxPenalty: weights.pageErrorMax,
    detail: `${result.page.pageErrors.length} browser page error${result.page.pageErrors.length === 1 ? "" : "s"} detected.`,
    evidence: result.page.pageErrors.flatMap((issue) => issue.evidence ?? []).slice(0, 4),
  }));
  addContribution(contributions, cappedCountContribution({
    id: "console-errors",
    label: "Console errors",
    category: "runtime",
    severity: "medium",
    count: result.page.consoleErrors.length,
    perItemPenalty: weights.consoleError,
    maxPenalty: weights.consoleErrorMax,
    detail: `${result.page.consoleErrors.length} console error${result.page.consoleErrors.length === 1 ? "" : "s"} detected.`,
    evidence: result.page.consoleErrors.flatMap((issue) => issue.evidence ?? []).slice(0, 4),
  }));
  addContribution(contributions, cappedCountContribution({
    id: "failed-requests",
    label: "Failed network requests",
    category: "reliability",
    severity: "medium",
    count: result.page.failedRequests.length,
    perItemPenalty: weights.failedRequest,
    maxPenalty: weights.failedRequestMax,
    detail: `${result.page.failedRequests.length} failed network request${result.page.failedRequests.length === 1 ? "" : "s"} detected.`,
    evidence: result.page.failedRequests.flatMap((request) => request.evidence ?? []).slice(0, 4),
  }));

  addContribution(contributions, {
    id: "missing-h1",
    label: "Missing primary H1",
    category: "content",
    severity: "medium",
    penalty: result.page.h1.length === 0 ? weights.missingH1 : 0,
    detail: "The page should have one visible H1 that matches the page purpose.",
    evidence: getContentEvidence(result, "primary-heading"),
  });
  addContribution(contributions, {
    id: "multiple-h1",
    label: "Multiple primary H1 headings",
    category: "content",
    severity: "low",
    penalty: result.page.h1.length > 1 ? weights.multipleH1 : 0,
    detail: "The page should avoid multiple page-level H1 headings.",
    evidence: getContentEvidence(result, "primary-heading"),
  });
  addContribution(contributions, {
    id: "missing-meta-description",
    label: "Missing meta description",
    category: "content",
    severity: "low",
    penalty: result.page.description ? 0 : weights.missingMetaDescription,
    detail: "A meta description helps search and sharing snippets explain the page.",
    evidence: getContentEvidence(result, "meta-description"),
  });

  addContribution(contributions, {
    id: "lighthouse-unavailable",
    label: "Lighthouse unavailable",
    category: "reliability",
    severity: "medium",
    penalty: result.lighthouse ? 0 : weights.lighthouseUnavailable,
    detail: "Page-quality scoring is less reliable when Lighthouse cannot run.",
  });

  const securityPenalty = Math.min(
    weights.securityMax,
    (result.security?.warningCount ?? 0) * weights.securityWarning +
      (result.security?.failedCount ?? 0) * weights.securityFail,
  );
  addContribution(contributions, {
    id: "security-basics",
    label: "Security basics",
    category: "security",
    severity: (result.security?.failedCount ?? 0) > 0 ? "high" : (result.security?.warningCount ?? 0) > 0 ? "medium" : "info",
    penalty: securityPenalty,
    detail: `${result.security?.failedCount ?? 0} failed and ${result.security?.warningCount ?? 0} warning security checks.`,
    evidence: result.security?.checks
      .filter((check) => check.status !== "pass")
      .flatMap((check) => check.evidence)
      .slice(0, 6),
  });

  const score = Math.max(0, Math.round(100 - contributions.reduce((total, item) => total + item.penalty, 0)));
  const blockers = buildBlockers(result, performance, criticalA11y);
  const decision = getDecision(score, blockers, {
    criticalA11y,
    seriousA11y,
    moderateA11y,
    runtimeSignalCount,
  });
  const riskLevel = getRiskLevel(score, decision);
  const decisionReasons = buildDecisionReasons(decision, score, blockers, contributions);
  const totalPenalty = contributions.reduce((total, item) => total + item.penalty, 0);

  return {
    score,
    decision,
    riskLevel,
    headline: headlineForDecision(decision, score),
    blockers,
    quickWins: buildQuickWins(result, performance, seo),
    issueBacklog: buildIssueBacklog(result, performance, seo),
    decisionReasons,
    scoreExplanation: {
      startingScore: 100,
      finalScore: score,
      totalPenalty,
      summary: buildScoreSummary(score, contributions),
      weights,
      contributions,
    },
    scoringWeights: weights,
  };
}

function addStatusContribution(
  contributions: ScoreContribution[],
  result: AssessableAudit,
  weights: AuditScoringWeights,
) {
  const status = result.page.status;
  if (!status) {
    addContribution(contributions, {
      id: "http-status",
      label: "HTTP status unavailable",
      category: "reliability",
      severity: "high",
      penalty: weights.statusUnavailable,
      detail: "The target page did not return an HTTP status.",
      evidence: [{ summary: "No HTTP response status was captured.", url: result.page.finalUrl }],
    });
    return;
  }

  if (status >= 500) {
    addContribution(contributions, {
      id: "http-status",
      label: "Server error status",
      category: "reliability",
      severity: "critical",
      penalty: weights.status5xx,
      detail: `The target page returned HTTP ${status}.`,
      evidence: [{ summary: `HTTP ${status} response.`, url: result.page.finalUrl }],
    });
    return;
  }

  if (status >= 400) {
    addContribution(contributions, {
      id: "http-status",
      label: "Client error status",
      category: "reliability",
      severity: "high",
      penalty: weights.status4xx,
      detail: `The target page returned HTTP ${status}.`,
      evidence: [{ summary: `HTTP ${status} response.`, url: result.page.finalUrl }],
    });
    return;
  }

  if (status >= 300) {
    addContribution(contributions, {
      id: "http-status",
      label: "Redirect response",
      category: "reliability",
      severity: "low",
      penalty: weights.redirect,
      detail: `The target page returned HTTP ${status}.`,
      evidence: [{ summary: `HTTP ${status} response.`, url: result.page.finalUrl }],
    });
  }
}

function categoryScoreContribution(
  category: AuditFindingCategory,
  label: string,
  score: number | null,
  rules: Array<[number, number, AuditSeverity]>,
): ScoreContribution {
  if (score === null) {
    return {
      id: `${category}-score`,
      label,
      category,
      severity: "medium",
      penalty: 6,
      detail: `${label} was unavailable.`,
    };
  }

  const rule = rules.find(([threshold]) => score < threshold);
  return {
    id: `${category}-score`,
    label,
    category,
    severity: rule?.[2] ?? "info",
    penalty: rule?.[1] ?? 0,
    detail: `${label}: ${score}/100.`,
    evidence: [{ summary: `${label}: ${score}/100.` }],
  };
}

function cappedCountContribution(config: {
  id: string;
  label: string;
  category: AuditFindingCategory;
  severity: AuditSeverity;
  count: number;
  perItemPenalty: number;
  maxPenalty: number;
  detail: string;
  evidence?: AuditEvidence[];
}): ScoreContribution {
  return {
    id: config.id,
    label: config.label,
    category: config.category,
    severity: config.severity,
    penalty: Math.min(config.maxPenalty, config.count * config.perItemPenalty),
    detail: config.detail,
    evidence: config.evidence,
  };
}

function addContribution(contributions: ScoreContribution[], contribution: ScoreContribution) {
  if (contribution.penalty > 0) {
    contributions.push(contribution);
  }
}

function getCategoryScore(result: AssessableAudit, id: string) {
  return result.lighthouse?.categories.find((category) => category.id === id)?.score ?? null;
}

function countViolations(result: AssessableAudit, impact: string) {
  return result.accessibility.violations.filter((violation) => violation.impact === impact).length;
}

function getContentEvidence(result: AssessableAudit, id: string) {
  return result.page.contentChecks?.find((check) => check.id === id)?.evidence;
}

function buildBlockers(result: AssessableAudit, performance: number | null, criticalA11y: number) {
  const blockers: string[] = [];

  if (!result.page.status || result.page.status >= 500) {
    blockers.push("Target page did not return a healthy HTTP response.");
  }

  if (criticalA11y > 0) {
    blockers.push(`${criticalA11y} critical accessibility violation${criticalA11y === 1 ? "" : "s"} found.`);
  }

  if (result.page.pageErrors.length > 0) {
    blockers.push(`${result.page.pageErrors.length} uncaught browser error${result.page.pageErrors.length === 1 ? "" : "s"} found.`);
  }

  if (performance !== null && performance < 50) {
    blockers.push("Page speed score is below 50.");
  }

  if ((result.security?.failedCount ?? 0) > 0) {
    blockers.push(`${result.security?.failedCount} basic security check${result.security?.failedCount === 1 ? "" : "s"} failed.`);
  }

  return blockers;
}

function getDecision(
  score: number,
  blockers: string[],
  signals: {
    criticalA11y: number;
    seriousA11y: number;
    moderateA11y: number;
    runtimeSignalCount: number;
  },
): AuditDecision {
  if (blockers.length > 0 || score < 60 || signals.criticalA11y > 0) {
    return "blocked";
  }

  if (
    score < 85 ||
    signals.seriousA11y > 0 ||
    signals.moderateA11y > 0 ||
    signals.runtimeSignalCount > 0
  ) {
    return "review";
  }

  return "ready";
}

function getRiskLevel(score: number, decision: AuditDecision): AuditRiskLevel {
  if (decision === "blocked" || score < 60) {
    return "high";
  }

  if (decision === "review" || score < 85) {
    return "medium";
  }

  return "low";
}

function headlineForDecision(decision: AuditDecision, score: number) {
  if (decision === "blocked") {
    return `Blocked for release review (${score}/100).`;
  }

  if (decision === "review") {
    return `Needs QA review before release (${score}/100).`;
  }

  return `Ready for release confidence check (${score}/100).`;
}

function buildDecisionReasons(
  decision: AuditDecision,
  score: number,
  blockers: string[],
  contributions: ScoreContribution[],
) {
  if (decision === "ready") {
    return ["No release blockers were detected.", `The weighted score is ${score}/100.`];
  }

  if (blockers.length > 0) {
    return blockers;
  }

  return contributions
    .sort((a, b) => b.penalty - a.penalty)
    .slice(0, 3)
    .map((contribution) => `${contribution.label}: ${contribution.detail}`);
}

function buildScoreSummary(score: number, contributions: ScoreContribution[]) {
  if (contributions.length === 0) {
    return `No weighted penalties were applied. Final score: ${score}/100.`;
  }

  const top = contributions
    .sort((a, b) => b.penalty - a.penalty)
    .slice(0, 3)
    .map((contribution) => `${contribution.label} (-${contribution.penalty})`)
    .join(", ");

  return `Final score: ${score}/100. Largest score drivers: ${top}.`;
}

function buildQuickWins(result: AssessableAudit, performance: number | null, seo: number | null) {
  const wins: string[] = [];

  if (!result.page.description) {
    wins.push("Add a meta description for clearer search and sharing snippets.");
  }

  if (result.page.h1.length === 0) {
    wins.push("Add one visible H1 that matches the page purpose.");
  }

  if (result.page.h1.length > 1) {
    wins.push("Reduce the page to one primary H1 and move secondary headings to H2/H3.");
  }

  if (performance !== null && performance < 90) {
    wins.push("Review the lowest page speed findings first.");
  }

  if (seo !== null && seo < 90) {
    wins.push("Fix the highest-impact search visibility checks.");
  }

  if (result.accessibility.violations.length > 0) {
    wins.push("Start with critical and serious accessibility issues before visual polish.");
  }

  if ((result.security?.warningCount ?? 0) > 0) {
    wins.push("Review missing security headers before external launch.");
  }

  return wins.slice(0, 5);
}

function buildIssueBacklog(
  result: AssessableAudit,
  performance: number | null,
  seo: number | null,
): AuditBacklogItem[] {
  const backlog: AuditBacklogItem[] = [];

  for (const violation of result.accessibility.violations.slice(0, 4)) {
    backlog.push({
      title: `Fix ${violation.help}`,
      area: "accessibility",
      category: "accessibility",
      severity: violation.severity,
      priority: violation.impact === "critical" ? "P0" : violation.impact === "serious" ? "P1" : "P2",
      evidence: `${violation.nodeCount} affected element${violation.nodeCount === 1 ? "" : "s"}: ${violation.id}`,
      evidenceItems: violation.evidence,
    });
  }

  if (result.page.pageErrors.length > 0) {
    backlog.push({
      title: "Resolve uncaught browser errors",
      area: "runtime",
      category: "runtime",
      severity: "high",
      priority: "P1",
      evidence: result.page.pageErrors[0]?.message ?? "Browser page error found.",
      evidenceItems: result.page.pageErrors.flatMap((issue) => issue.evidence ?? []).slice(0, 4),
    });
  }

  if (result.page.failedRequests.length > 0) {
    backlog.push({
      title: "Investigate failed network requests",
      area: "reliability",
      category: "reliability",
      severity: "medium",
      priority: "P2",
      evidence: `${result.page.failedRequests.length} failed request${result.page.failedRequests.length === 1 ? "" : "s"} detected.`,
      evidenceItems: result.page.failedRequests.flatMap((request) => request.evidence ?? []).slice(0, 4),
    });
  }

  if (performance !== null && performance < 90) {
    backlog.push({
      title: "Improve page speed score",
      area: "performance",
      category: "performance",
      severity: performance < 50 ? "high" : "medium",
      priority: performance < 50 ? "P1" : "P2",
      evidence: `Current score: ${performance}/100.`,
      evidenceItems: [{ summary: `Performance score is ${performance}/100.` }],
    });
  }

  if (seo !== null && seo < 90) {
    backlog.push({
      title: "Improve search visibility score",
      area: "seo",
      category: "seo",
      severity: "medium",
      priority: "P2",
      evidence: `Current score: ${seo}/100.`,
      evidenceItems: [{ summary: `SEO score is ${seo}/100.` }],
    });
  }

  if (!result.page.description) {
    backlog.push({
      title: "Add a meta description",
      area: "content",
      category: "content",
      severity: "low",
      priority: "P3",
      evidence: "The audited page has no meta description.",
      evidenceItems: getContentEvidence(result, "meta-description"),
    });
  }

  for (const check of result.security?.checks.filter((item) => item.status !== "pass") ?? []) {
    backlog.push({
      title: check.title,
      area: "security",
      category: "security",
      severity: check.severity,
      priority: check.status === "fail" ? "P1" : "P3",
      evidence: check.evidence[0]?.summary ?? "Security check needs review.",
      evidenceItems: check.evidence,
    });
  }

  return backlog.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 8);
}

function priorityRank(priority: AuditBacklogItem["priority"]) {
  return {
    P0: 0,
    P1: 1,
    P2: 2,
    P3: 3,
  }[priority];
}
