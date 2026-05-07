import OpenAI from "openai";
import {
  buildFallbackCopilotReport,
  formatCopilotReportMarkdown,
  parseAiCopilotReport,
} from "@/lib/openai/copilot-report";
import {
  RELEASE_COPILOT_INSTRUCTIONS,
  buildReleaseCopilotPrompt,
} from "@/ai/prompts/release-copilot";
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
      fallbackReport: buildFallbackCopilotReport(result, notes),
    };
  }

  try {
    const response = await openai.responses.create({
      model,
      store: false,
      max_output_tokens: 1_800,
      instructions: RELEASE_COPILOT_INSTRUCTIONS,
      input: buildReleaseCopilotPrompt(result, notes),
    });

    const report = parseAiCopilotReport(response.output_text ?? "");

    return {
      status: "generated",
      model,
      content: formatCopilotReportMarkdown(report),
      report,
    };
  } catch (error) {
    return {
      status: "failed",
      model,
      reason: error instanceof Error ? error.message : "OpenAI summary failed.",
      fallbackReport: buildFallbackCopilotReport(result, notes),
    };
  }
}
