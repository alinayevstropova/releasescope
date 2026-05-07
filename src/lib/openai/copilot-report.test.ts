import { describe, expect, test } from "vitest";
import {
  buildFallbackCopilotReport,
  formatCopilotReportMarkdown,
  parseAiCopilotReport,
} from "@/lib/openai/copilot-report";
import { buildDemoAudit } from "@/lib/qa/fixtures/demo-audit";

describe("AI copilot report parsing", () => {
  test("parses a mocked JSON model response", () => {
    const report = parseAiCopilotReport([
      "```json",
      `{
  "plainLanguageSummary": "Release needs QA review because accessibility and performance risks remain.",
  "issueDescriptions": [
    {
      "title": "Fix unnamed checkout button",
      "priority": "P1",
      "expectedBehavior": "The checkout button has an accessible name.",
      "actualBehavior": "The audit found an icon-only button without a name.",
      "evidence": "button-name affected one element.",
      "suggestedFix": "Add visible text or an aria-label and rerun axe-core."
    }
  ],
  "edgeCases": ["Keyboard-only checkout flow"],
  "regressionChecklist": ["Rerun axe-core", "Run Playwright checkout smoke test"],
  "supportHandoffNote": "Support should know checkout accessibility is still under review.",
  "releaseNotes": {
    "knownRisks": ["Checkout button accessibility risk"],
    "safeToShip": ["No server error was detected"]
  }
}`,
      "```",
    ].join("\n"));

    expect(report.issueDescriptions[0]).toMatchObject({
      priority: "P1",
      title: "Fix unnamed checkout button",
    });
    expect(report.releaseNotes.knownRisks).toContain("Checkout button accessibility risk");
  });

  test("rejects malformed model output instead of silently trusting it", () => {
    expect(() => parseAiCopilotReport("The release is probably fine.")).toThrow();
  });

  test("builds a fallback copilot report from audit evidence", () => {
    const audit = buildDemoAudit({
      url: "https://demo.example",
      viewport: "desktop",
      includeAi: true,
      demoMode: true,
    });

    const report = buildFallbackCopilotReport(audit, "Focus on checkout confidence.");
    const markdown = formatCopilotReportMarkdown(report);

    expect(report.plainLanguageSummary).toContain("Focus on checkout confidence.");
    expect(report.issueDescriptions.length).toBeGreaterThan(0);
    expect(report.edgeCases).toContain("Run the audit on both desktop and mobile viewports.");
    expect(markdown).toContain("Regression checklist");
  });
});
