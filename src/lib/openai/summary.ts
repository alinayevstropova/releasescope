import OpenAI from "openai";
import type { AiSummary, QaAuditResult } from "@/lib/qa/types";

let client: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return client;
}

export async function summarizeAuditWithAi(
  result: QaAuditResult,
  notes?: string,
): Promise<AiSummary> {
  const openai = getOpenAIClient();
  const model = process.env.OPENAI_MODEL ?? "gpt-5";

  if (!openai) {
    return {
      status: "skipped",
      reason: "OPENAI_API_KEY is not configured.",
    };
  }

  try {
    const response = await openai.responses.create({
      model,
      store: false,
      max_output_tokens: 900,
      instructions:
        "You are an expert QA lead. Turn audit data into a concise QA report. Prioritize customer impact, reproducibility, and fix order. Avoid inventing facts that are not in the data.",
      input: buildPrompt(result, notes),
    });

    return {
      status: "generated",
      model,
      content: response.output_text?.trim() || "The model returned an empty summary.",
    };
  } catch (error) {
    return {
      status: "failed",
      model,
      reason: error instanceof Error ? error.message : "OpenAI summary failed.",
    };
  }
}

function buildPrompt(result: QaAuditResult, notes?: string) {
  const compact = {
    url: result.url,
    finalUrl: result.page.finalUrl,
    viewport: result.viewport,
    status: result.page.status,
    title: result.page.title,
    h1: result.page.h1,
    assessment: result.assessment,
    consoleErrorCount: result.page.consoleErrors.length,
    pageErrorCount: result.page.pageErrors.length,
    failedRequestCount: result.page.failedRequests.length,
    accessibility: {
      violationCount: result.accessibility.violationCount,
      topViolations: result.accessibility.violations.slice(0, 8).map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodeCount: violation.nodeCount,
      })),
    },
    lighthouse: {
      categories: result.lighthouse?.categories,
      topFindings: result.lighthouse?.findings.slice(0, 8),
    },
    warnings: result.warnings,
    notes,
  };

  return `Create a QA report with these sections:
1. Executive summary
2. Highest priority defects
3. Accessibility risks
4. Performance/SEO risks
5. Suggested GitHub issues

Audit data:
${JSON.stringify(compact, null, 2)}`;
}
