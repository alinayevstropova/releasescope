export type AuditViewport = "desktop" | "mobile";

export type AuditRunMode = "live" | "demo";

export type QaAuditRequest = {
  url: string;
  viewport: AuditViewport;
  includeAi: boolean;
  notes?: string;
  demoMode?: boolean;
  artifactDir?: string;
  scoringWeights?: Partial<AuditScoringWeights>;
};

export type AuditDecision = "ready" | "review" | "blocked";

export type AuditRiskLevel = "low" | "medium" | "high";

export type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";

export type AuditFindingCategory =
  | "accessibility"
  | "best-practices"
  | "content"
  | "performance"
  | "reliability"
  | "runtime"
  | "security"
  | "seo";

export type AuditEvidence = {
  summary: string;
  selector?: string;
  url?: string;
  screenshotRef?: string;
  rawToolOutput?: string;
  reproductionNotes?: string;
};

export type AuditBacklogItem = {
  title: string;
  area: AuditFindingCategory;
  priority: "P0" | "P1" | "P2" | "P3";
  severity?: AuditSeverity;
  category?: AuditFindingCategory;
  evidence: string;
  evidenceItems?: AuditEvidence[];
};

export type AuditScoringWeights = {
  statusUnavailable: number;
  status4xx: number;
  status5xx: number;
  redirect: number;
  criticalAccessibility: number;
  seriousAccessibility: number;
  moderateAccessibility: number;
  minorAccessibility: number;
  accessibilityMax: number;
  performancePoor: number;
  performanceNeedsWork: number;
  performanceAlmostThere: number;
  bestPracticesPoor: number;
  bestPracticesNeedsWork: number;
  seoPoor: number;
  seoNeedsWork: number;
  pageError: number;
  pageErrorMax: number;
  consoleError: number;
  consoleErrorMax: number;
  failedRequest: number;
  failedRequestMax: number;
  missingH1: number;
  multipleH1: number;
  missingMetaDescription: number;
  lighthouseUnavailable: number;
  securityWarning: number;
  securityFail: number;
  securityMax: number;
};

export type ScoreContribution = {
  id: string;
  label: string;
  category: AuditFindingCategory;
  severity: AuditSeverity;
  penalty: number;
  detail: string;
  evidence?: AuditEvidence[];
};

export type ScoreExplanation = {
  startingScore: number;
  finalScore: number;
  totalPenalty: number;
  summary: string;
  weights: AuditScoringWeights;
  contributions: ScoreContribution[];
};

export type AuditAssessment = {
  score: number;
  decision: AuditDecision;
  riskLevel: AuditRiskLevel;
  headline: string;
  blockers: string[];
  quickWins: string[];
  issueBacklog: AuditBacklogItem[];
  decisionReasons?: string[];
  scoreExplanation?: ScoreExplanation;
  scoringWeights?: AuditScoringWeights;
};

export type PageIssue = {
  message: string;
  source?: string;
  severity?: AuditSeverity;
  evidence?: AuditEvidence[];
};

export type FailedRequest = {
  url: string;
  method: string;
  errorText: string;
  severity?: AuditSeverity;
  evidence?: AuditEvidence[];
};

export type AccessibilityNode = {
  target: string[];
  html: string;
  failureSummary?: string;
};

export type AccessibilityViolation = {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical" | "unknown";
  severity?: AuditSeverity;
  category?: "accessibility";
  description: string;
  help: string;
  helpUrl: string;
  nodes: AccessibilityNode[];
  nodeCount: number;
  evidence?: AuditEvidence[];
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
  category: AuditFindingCategory | string;
  severity?: AuditSeverity;
  score: number | null;
  displayValue?: string;
  evidence?: AuditEvidence[];
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
  contentChecks?: ContentCheck[];
  consoleErrors: PageIssue[];
  pageErrors: PageIssue[];
  failedRequests: FailedRequest[];
};

export type ContentCheck = {
  id: string;
  title: string;
  status: "pass" | "warning" | "fail";
  severity: AuditSeverity;
  evidence: AuditEvidence[];
};

export type SecurityCheck = {
  id: string;
  title: string;
  status: "pass" | "warning" | "fail";
  severity: AuditSeverity;
  evidence: AuditEvidence[];
};

export type SecurityReport = {
  checks: SecurityCheck[];
  passedCount: number;
  warningCount: number;
  failedCount: number;
};

export type AiIssueDescription = {
  title: string;
  priority: AuditBacklogItem["priority"];
  expectedBehavior: string;
  actualBehavior: string;
  evidence: string;
  suggestedFix: string;
};

export type AiReleaseNotes = {
  knownRisks: string[];
  safeToShip: string[];
};

export type AiCopilotReport = {
  plainLanguageSummary: string;
  issueDescriptions: AiIssueDescription[];
  edgeCases: string[];
  regressionChecklist: string[];
  supportHandoffNote: string;
  releaseNotes: AiReleaseNotes;
};

export type AiSummary =
  | {
      status: "generated";
      model: string;
      content: string;
      report: AiCopilotReport;
    }
  | {
      status: "skipped";
      reason: string;
      fallbackReport?: AiCopilotReport;
    }
  | {
      status: "failed";
      model?: string;
      reason: string;
      fallbackReport?: AiCopilotReport;
    };

export type QaAuditResult = {
  id: string;
  url: string;
  viewport: AuditViewport;
  mode?: AuditRunMode;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  page: PageSnapshot;
  accessibility: AccessibilityReport;
  lighthouse?: LighthouseReport;
  security?: SecurityReport;
  assessment: AuditAssessment;
  aiSummary?: AiSummary;
  warnings: string[];
};
