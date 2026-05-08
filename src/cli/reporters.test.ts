import { describe, expect, test } from "vitest";
import { sampleAuditResult } from "@/lib/qa/fixtures/sample-report";
import { createJsonReport, formatAuditMarkdown, formatPrComment } from "./reporters";

describe("CLI reporters", () => {
  test("creates a stable CI JSON envelope", () => {
    const report = createJsonReport(sampleAuditResult, {
      artifactDir: "releasescope-artifacts",
      generatedAt: "2026-05-01T12:00:00.000Z",
    });

    expect(report.schemaVersion).toBe("releasescope.audit.v1");
    expect(report.summary).toMatchObject({
      auditId: "audit_sample",
      decision: "review",
      score: 76,
      backlogCount: 2,
    });
    expect(report.artifacts?.manifest).toBe("artifacts-manifest.json");
  });

  test("formats a Markdown audit report for humans", () => {
    const markdown = formatAuditMarkdown(sampleAuditResult, {
      artifactDir: "releasescope-artifacts",
      generatedAt: "2026-05-01T12:00:00.000Z",
    });

    expect(markdown).toContain("# ReleaseScope Audit Report");
    expect(markdown).toContain("Decision: **REVIEW**");
    expect(markdown).toContain("## Issue Backlog");
    expect(markdown).toContain("`axe/axe-report.json`");
  });

  test("formats a PR comment with release gate guidance", () => {
    const comment = formatPrComment(sampleAuditResult);

    expect(comment).toContain("## ReleaseScope Release Risk");
    expect(comment).toContain("Hold for QA review");
    expect(comment).toContain("Accessibility violations: 1");
  });
});
