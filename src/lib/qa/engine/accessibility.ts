import AxeBuilder from "@axe-core/playwright";
import type { Result as AxeResult } from "axe-core";
import type { Page } from "playwright";
import type { AccessibilityReport, AccessibilityViolation, AuditSeverity } from "@/lib/qa/types";
import { trimText } from "@/lib/qa/engine/text";

export async function runAccessibilityAudit(page: Page): Promise<AccessibilityReport> {
  const axeResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();

  return toAccessibilityReport(axeResults.violations, {
    incompleteCount: axeResults.incomplete.length,
    passesCount: axeResults.passes.length,
  });
}

export function toAccessibilityReport(
  violations: AxeResult[],
  counts: { incompleteCount: number; passesCount: number },
): AccessibilityReport {
  const mapped: AccessibilityViolation[] = violations.map((violation) => {
    const nodes = violation.nodes.slice(0, 4).map((node) => ({
      target: node.target.map(String),
      html: trimText(node.html, 420),
      failureSummary: node.failureSummary ? trimText(node.failureSummary, 420) : undefined,
    }));

    return {
      id: violation.id,
      impact: violation.impact ?? "unknown",
      severity: severityFromImpact(violation.impact ?? "unknown"),
      category: "accessibility",
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodeCount: violation.nodes.length,
      nodes,
      evidence: nodes.map((node) => ({
        summary: `${violation.help}: ${node.target.join(", ")}`,
        selector: node.target.join(", "),
        rawToolOutput: node.failureSummary ?? node.html,
        reproductionNotes: `Run axe-core and inspect the ${violation.id} rule on the target element.`,
      })),
    };
  });

  return {
    violationCount: mapped.length,
    incompleteCount: counts.incompleteCount,
    passesCount: counts.passesCount,
    violations: mapped.sort((a, b) => impactRank(b.impact) - impactRank(a.impact)),
  };
}

export function severityFromImpact(impact: AccessibilityViolation["impact"]): AuditSeverity {
  const severities: Record<AccessibilityViolation["impact"], AuditSeverity> = {
    critical: "critical",
    serious: "high",
    moderate: "medium",
    minor: "low",
    unknown: "info",
  };

  return severities[impact];
}

export function impactRank(impact: AccessibilityViolation["impact"]) {
  return {
    critical: 4,
    serious: 3,
    moderate: 2,
    minor: 1,
    unknown: 0,
  }[impact];
}
