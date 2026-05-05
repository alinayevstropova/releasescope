import type { AuditScoringWeights } from "@/lib/qa/types";

export const DEFAULT_SCORING_WEIGHTS: AuditScoringWeights = {
  statusUnavailable: 25,
  status4xx: 25,
  status5xx: 35,
  redirect: 6,
  criticalAccessibility: 18,
  seriousAccessibility: 12,
  moderateAccessibility: 6,
  minorAccessibility: 2,
  accessibilityMax: 45,
  performancePoor: 20,
  performanceNeedsWork: 12,
  performanceAlmostThere: 5,
  bestPracticesPoor: 8,
  bestPracticesNeedsWork: 5,
  seoPoor: 8,
  seoNeedsWork: 4,
  pageError: 10,
  pageErrorMax: 20,
  consoleError: 4,
  consoleErrorMax: 16,
  failedRequest: 3,
  failedRequestMax: 15,
  missingH1: 8,
  multipleH1: 3,
  missingMetaDescription: 4,
  lighthouseUnavailable: 8,
  securityWarning: 2,
  securityFail: 6,
  securityMax: 12,
};

export function resolveScoringWeights(overrides?: Partial<AuditScoringWeights>): AuditScoringWeights {
  return {
    ...DEFAULT_SCORING_WEIGHTS,
    ...overrides,
  };
}
