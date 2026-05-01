export type AuditViewport = "desktop" | "mobile";

export type QaAuditRequest = {
  url: string;
  viewport: AuditViewport;
  includeAi: boolean;
  notes?: string;
};

export type AuditDecision = "ready" | "review" | "blocked";

export type AuditRiskLevel = "low" | "medium" | "high";

export type AuditBacklogItem = {
  title: string;
  area: "accessibility" | "performance" | "seo" | "runtime" | "content" | "reliability";
  priority: "P0" | "P1" | "P2" | "P3";
  evidence: string;
};

export type AuditAssessment = {
  score: number;
  decision: AuditDecision;
  riskLevel: AuditRiskLevel;
  headline: string;
  blockers: string[];
  quickWins: string[];
  issueBacklog: AuditBacklogItem[];
};

export type PageIssue = {
  message: string;
  source?: string;
};

export type FailedRequest = {
  url: string;
  method: string;
  errorText: string;
};

export type AccessibilityNode = {
  target: string[];
  html: string;
  failureSummary?: string;
};

export type AccessibilityViolation = {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical" | "unknown";
  description: string;
  help: string;
  helpUrl: string;
  nodes: AccessibilityNode[];
  nodeCount: number;
};

export type AccessibilityReport = {
  violationCount: number;
  incompleteCount: number;
  passesCount: number;
  violations: AccessibilityViolation[];
};

export type LighthouseCategory = {
  id: string;
  title: string;
  score: number | null;
};

export type LighthouseFinding = {
  id: string;
  title: string;
  description: string;
  category: string;
  score: number | null;
  displayValue?: string;
};

export type LighthouseReport = {
  categories: LighthouseCategory[];
  findings: LighthouseFinding[];
  fetchTime?: string;
};

export type PageSnapshot = {
  title: string;
  description: string | null;
  finalUrl: string;
  status: number | null;
  h1: string[];
  consoleErrors: PageIssue[];
  pageErrors: PageIssue[];
  failedRequests: FailedRequest[];
};

export type AiSummary =
  | {
      status: "generated";
      model: string;
      content: string;
    }
  | {
      status: "skipped";
      reason: string;
    }
  | {
      status: "failed";
      model?: string;
      reason: string;
    };

export type QaAuditResult = {
  id: string;
  url: string;
  viewport: AuditViewport;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  page: PageSnapshot;
  accessibility: AccessibilityReport;
  lighthouse?: LighthouseReport;
  assessment: AuditAssessment;
  aiSummary?: AiSummary;
  warnings: string[];
};
