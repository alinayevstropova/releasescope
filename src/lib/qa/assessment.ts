import type {
  AuditAssessment,
  AuditBacklogItem,
  AuditDecision,
  AuditRiskLevel,
  QaAuditResult,
} from "@/lib/qa/types";

type AssessableAudit = Omit<QaAuditResult, "assessment" | "aiSummary">;

export function assessAudit(result: AssessableAudit): AuditAssessment {
  const performance = getCategoryScore(result, "performance");
  const bestPractices = getCategoryScore(result, "best-practices");
  const seo = getCategoryScore(result, "seo");
  const criticalA11y = countViolations(result, "critical");
  const seriousA11y = countViolations(result, "serious");
  const moderateA11y = countViolations(result, "moderate");
  const minorA11y = countViolations(result, "minor");
  const runtimeSignalCount =
    result.page.consoleErrors.length + result.page.pageErrors.length + result.page.failedRequests.length;

  let score = 100;
  score -= statusPenalty(result.page.status);
  score -= Math.min(45, criticalA11y * 18 + seriousA11y * 12 + moderateA11y * 6 + minorA11y * 2);
  score -= scorePenalty(performance, [
    [50, 20],
    [75, 12],
    [90, 5],
  ]);
  score -= scorePenalty(bestPractices, [
    [80, 8],
    [90, 5],
  ]);
  score -= scorePenalty(seo, [
    [80, 8],
    [90, 4],
  ]);
  score -= Math.min(20, result.page.pageErrors.length * 10);
  score -= Math.min(16, result.page.consoleErrors.length * 4);
  score -= Math.min(15, result.page.failedRequests.length * 3);
  score -= result.page.h1.length === 0 ? 8 : 0;
  score -= result.page.h1.length > 1 ? 3 : 0;
  score -= result.page.description ? 0 : 4;
  score -= result.lighthouse ? 0 : 8;

  score = Math.max(0, Math.round(score));

  const blockers = buildBlockers(result, performance, criticalA11y);
  const decision = getDecision(score, blockers, {
    criticalA11y,
    seriousA11y,
    moderateA11y,
    runtimeSignalCount,
  });
  const riskLevel = getRiskLevel(score, decision);

  return {
    score,
    decision,
    riskLevel,
    headline: headlineForDecision(decision, score),
    blockers,
    quickWins: buildQuickWins(result, performance, seo),
    issueBacklog: buildIssueBacklog(result, performance, seo),
  };
}

function statusPenalty(status: number | null) {
  if (!status) {
    return 25;
  }

  if (status >= 500) {
    return 35;
  }

  if (status >= 400) {
    return 25;
  }

  if (status >= 300) {
    return 6;
  }

  return 0;
}

function scorePenalty(score: number | null, rules: Array<[number, number]>) {
  if (score === null) {
    return 6;
  }

  const rule = rules.find(([threshold]) => score < threshold);
  return rule?.[1] ?? 0;
}

function getCategoryScore(result: AssessableAudit, id: string) {
  return result.lighthouse?.categories.find((category) => category.id === id)?.score ?? null;
}

function countViolations(result: AssessableAudit, impact: string) {
  return result.accessibility.violations.filter((violation) => violation.impact === impact).length;
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
      priority: violation.impact === "critical" ? "P0" : violation.impact === "serious" ? "P1" : "P2",
      evidence: `${violation.nodeCount} affected element${violation.nodeCount === 1 ? "" : "s"}: ${violation.id}`,
    });
  }

  if (result.page.pageErrors.length > 0) {
    backlog.push({
      title: "Resolve uncaught browser errors",
      area: "runtime",
      priority: "P1",
      evidence: result.page.pageErrors[0]?.message ?? "Browser page error found.",
    });
  }

  if (result.page.failedRequests.length > 0) {
    backlog.push({
      title: "Investigate failed network requests",
      area: "reliability",
      priority: "P2",
      evidence: `${result.page.failedRequests.length} failed request${result.page.failedRequests.length === 1 ? "" : "s"} detected.`,
    });
  }

  if (performance !== null && performance < 90) {
    backlog.push({
      title: "Improve page speed score",
      area: "performance",
      priority: performance < 50 ? "P1" : "P2",
      evidence: `Current score: ${performance}/100.`,
    });
  }

  if (seo !== null && seo < 90) {
    backlog.push({
      title: "Improve search visibility score",
      area: "seo",
      priority: "P2",
      evidence: `Current score: ${seo}/100.`,
    });
  }

  if (!result.page.description) {
    backlog.push({
      title: "Add a meta description",
      area: "content",
      priority: "P3",
      evidence: "The audited page has no meta description.",
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
