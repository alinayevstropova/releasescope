import { NextResponse } from "next/server";
import { summarizeAuditWithAi } from "@/lib/openai/summary";
import { runQaAudit } from "@/lib/qa/audit";
import {
  AuditTargetLoadError,
  InvalidAuditTargetError,
  UnsafeAuditTargetError,
  getPublicErrorMessage,
} from "@/lib/qa/errors";
import { auditRequestSchema, qaAuditResultSchema } from "@/lib/qa/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = auditRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid audit request.", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Vercel serverless does not support Playwright/Chromium — force demo mode.
  const data = process.env.VERCEL ? { ...parsed.data, demoMode: true } : parsed.data;

  try {
    const result = await runQaAudit(data);

    if (data.includeAi) {
      result.aiSummary = await summarizeAuditWithAi(result, data.notes);
    }

    return NextResponse.json(qaAuditResultSchema.parse(result));
  } catch (error) {
    if (
      error instanceof InvalidAuditTargetError ||
      error instanceof UnsafeAuditTargetError ||
      error instanceof AuditTargetLoadError
    ) {
      return NextResponse.json(
        { error: getPublicErrorMessage(error) },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: "Audit failed. Check the target URL and server logs." },
      { status: 500 },
    );
  }
}
