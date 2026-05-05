import { z } from "zod";

export const auditViewportSchema = z.enum(["desktop", "mobile"]);

export const auditSeveritySchema = z.enum(["info", "low", "medium", "high", "critical"]);

export const auditFindingCategorySchema = z.enum([
  "accessibility",
  "best-practices",
  "content",
  "performance",
  "reliability",
  "runtime",
  "security",
  "seo",
]);

export const auditEvidenceSchema = z.object({
  summary: z.string(),
  selector: z.string().optional(),
  url: z.string().optional(),
  screenshotRef: z.string().optional(),
  rawToolOutput: z.string().optional(),
  reproductionNotes: z.string().optional(),
});

export const auditScoringWeightsSchema = z.object({
  statusUnavailable: z.number().min(0),
  status4xx: z.number().min(0),
  status5xx: z.number().min(0),
  redirect: z.number().min(0),
  criticalAccessibility: z.number().min(0),
  seriousAccessibility: z.number().min(0),
  moderateAccessibility: z.number().min(0),
  minorAccessibility: z.number().min(0),
  accessibilityMax: z.number().min(0),
  performancePoor: z.number().min(0),
  performanceNeedsWork: z.number().min(0),
  performanceAlmostThere: z.number().min(0),
  bestPracticesPoor: z.number().min(0),
  bestPracticesNeedsWork: z.number().min(0),
  seoPoor: z.number().min(0),
  seoNeedsWork: z.number().min(0),
  pageError: z.number().min(0),
  pageErrorMax: z.number().min(0),
  consoleError: z.number().min(0),
  consoleErrorMax: z.number().min(0),
  failedRequest: z.number().min(0),
  failedRequestMax: z.number().min(0),
  missingH1: z.number().min(0),
  multipleH1: z.number().min(0),
  missingMetaDescription: z.number().min(0),
  lighthouseUnavailable: z.number().min(0),
  securityWarning: z.number().min(0),
  securityFail: z.number().min(0),
  securityMax: z.number().min(0),
});

export const auditRequestSchema = z.object({
  url: z.string().url(),
  viewport: auditViewportSchema.default("desktop"),
  includeAi: z.boolean().default(true),
  notes: z.string().max(2_000).optional(),
  demoMode: z.boolean().default(false),
  scoringWeights: auditScoringWeightsSchema.partial().optional(),
});

const auditBacklogItemSchema = z.object({
  title: z.string(),
  area: auditFindingCategorySchema,
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  severity: auditSeveritySchema.optional(),
  category: auditFindingCategorySchema.optional(),
  evidence: z.string(),
  evidenceItems: z.array(auditEvidenceSchema).optional(),
});

const scoreContributionSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: auditFindingCategorySchema,
  severity: auditSeveritySchema,
  penalty: z.number().min(0),
  detail: z.string(),
  evidence: z.array(auditEvidenceSchema).optional(),
});

const scoreExplanationSchema = z.object({
  startingScore: z.number(),
  finalScore: z.number(),
  totalPenalty: z.number().min(0),
  summary: z.string(),
  weights: auditScoringWeightsSchema,
  contributions: z.array(scoreContributionSchema),
});

const pageIssueSchema = z.object({
  message: z.string(),
  source: z.string().optional(),
  severity: auditSeveritySchema.optional(),
  evidence: z.array(auditEvidenceSchema).optional(),
});

const failedRequestSchema = z.object({
  url: z.string(),
  method: z.string(),
  errorText: z.string(),
  severity: auditSeveritySchema.optional(),
  evidence: z.array(auditEvidenceSchema).optional(),
});

const contentCheckSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["pass", "warning", "fail"]),
  severity: auditSeveritySchema,
  evidence: z.array(auditEvidenceSchema),
});

const accessibilityViolationSchema = z.object({
  id: z.string(),
  impact: z.enum(["minor", "moderate", "serious", "critical", "unknown"]),
  severity: auditSeveritySchema.optional(),
  category: z.literal("accessibility").optional(),
  description: z.string(),
  help: z.string(),
  helpUrl: z.string(),
  nodes: z.array(
    z.object({
      target: z.array(z.string()),
      html: z.string(),
      failureSummary: z.string().optional(),
    }),
  ),
  nodeCount: z.number(),
  evidence: z.array(auditEvidenceSchema).optional(),
});

const lighthouseFindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  severity: auditSeveritySchema.optional(),
  score: z.number().nullable(),
  displayValue: z.string().optional(),
  evidence: z.array(auditEvidenceSchema).optional(),
});

const securityCheckSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["pass", "warning", "fail"]),
  severity: auditSeveritySchema,
  evidence: z.array(auditEvidenceSchema),
});

export const qaAuditResultSchema = z.object({
  id: z.string(),
  url: z.string(),
  viewport: auditViewportSchema,
  mode: z.enum(["live", "demo"]).optional(),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number(),
  page: z.object({
    title: z.string(),
    description: z.string().nullable(),
    finalUrl: z.string(),
    status: z.number().nullable(),
    h1: z.array(z.string()),
    contentChecks: z.array(contentCheckSchema).optional(),
    consoleErrors: z.array(pageIssueSchema),
    pageErrors: z.array(pageIssueSchema),
    failedRequests: z.array(failedRequestSchema),
  }),
  accessibility: z.object({
    violationCount: z.number(),
    incompleteCount: z.number(),
    passesCount: z.number(),
    violations: z.array(accessibilityViolationSchema),
  }),
  lighthouse: z
    .object({
      categories: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          score: z.number().nullable(),
        }),
      ),
      findings: z.array(lighthouseFindingSchema),
      fetchTime: z.string().optional(),
    })
    .optional(),
  security: z
    .object({
      checks: z.array(securityCheckSchema),
      passedCount: z.number(),
      warningCount: z.number(),
      failedCount: z.number(),
    })
    .optional(),
  assessment: z.object({
    score: z.number(),
    decision: z.enum(["ready", "review", "blocked"]),
    riskLevel: z.enum(["low", "medium", "high"]),
    headline: z.string(),
    blockers: z.array(z.string()),
    quickWins: z.array(z.string()),
    issueBacklog: z.array(auditBacklogItemSchema),
    decisionReasons: z.array(z.string()).optional(),
    scoreExplanation: scoreExplanationSchema.optional(),
    scoringWeights: auditScoringWeightsSchema.optional(),
  }),
  aiSummary: z
    .union([
      z.object({
        status: z.literal("generated"),
        model: z.string(),
        content: z.string(),
      }),
      z.object({
        status: z.literal("skipped"),
        reason: z.string(),
      }),
      z.object({
        status: z.literal("failed"),
        model: z.string().optional(),
        reason: z.string(),
      }),
    ])
    .optional(),
  warnings: z.array(z.string()),
});
