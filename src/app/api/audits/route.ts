import { NextResponse } from "next/server";
import { z } from "zod";
import { summarizeAuditWithAi } from "@/lib/openai/summary";
import { runQaAudit } from "@/lib/qa/audit";
import {
  AuditTargetLoadError,
  InvalidAuditTargetError,
  UnsafeAuditTargetError,
  getPublicErrorMessage,
} from "@/lib/qa/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const auditRequestSchema = z.object({
  url: z.string().url(),
  viewport: z.enum(["desktop", "mobile"]).default("desktop"),
  includeAi: z.boolean().default(true),
  notes: z.string().max(2_000).optional(),
});

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

  try {
    const result = await runQaAudit(parsed.data);

    if (parsed.data.includeAi) {
      result.aiSummary = await summarizeAuditWithAi(result, parsed.data.notes);
    }

    return NextResponse.json(result);
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
