import { describe, expect, test } from "vitest";
import { sampleAuditResult, sampleCopilotReport } from "@/lib/qa/fixtures/sample-report";
import { aiCopilotReportSchema, qaAuditResultSchema } from "@/lib/qa/schemas";

describe("sample report fixtures", () => {
  test("sample audit result stays schema-valid for demos and tests", () => {
    expect(() => qaAuditResultSchema.parse(sampleAuditResult)).not.toThrow();
  });

  test("sample copilot report stays schema-valid for demos and tests", () => {
    expect(() => aiCopilotReportSchema.parse(sampleCopilotReport)).not.toThrow();
  });
});
