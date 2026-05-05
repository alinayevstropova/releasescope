import type { Response } from "playwright";
import type { AuditEvidence, SecurityCheck, SecurityReport } from "@/lib/qa/types";

export async function analyzeSecurityBasics(
  response: Response | null,
  finalUrl: string,
): Promise<SecurityReport> {
  const headers = response ? await response.allHeaders().catch(() => response.headers()) : {};
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  const checks: SecurityCheck[] = [
    buildProtocolCheck(finalUrl),
    buildHeaderCheck(normalizedHeaders, {
      id: "strict-transport-security",
      title: "Strict-Transport-Security header is present",
      headerName: "strict-transport-security",
      missingSeverity: "medium",
    }),
    buildHeaderCheck(normalizedHeaders, {
      id: "content-security-policy",
      title: "Content-Security-Policy header is present",
      headerName: "content-security-policy",
      missingSeverity: "medium",
    }),
    buildHeaderCheck(normalizedHeaders, {
      id: "x-content-type-options",
      title: "X-Content-Type-Options header is present",
      headerName: "x-content-type-options",
      missingSeverity: "low",
    }),
    buildHeaderCheck(normalizedHeaders, {
      id: "x-frame-options",
      title: "Frame embedding protection header is present",
      headerName: "x-frame-options",
      missingSeverity: "low",
    }),
  ];

  return {
    checks,
    passedCount: checks.filter((check) => check.status === "pass").length,
    warningCount: checks.filter((check) => check.status === "warning").length,
    failedCount: checks.filter((check) => check.status === "fail").length,
  };
}

function buildProtocolCheck(finalUrl: string): SecurityCheck {
  const isHttps = finalUrl.startsWith("https://");
  return {
    id: "https",
    title: "Final URL uses HTTPS",
    status: isHttps ? "pass" : "fail",
    severity: isHttps ? "info" : "high",
    evidence: [
      {
        summary: isHttps ? "The final URL uses HTTPS." : "The final URL does not use HTTPS.",
        url: finalUrl,
        reproductionNotes: "Open the audited page and confirm the final resolved protocol.",
      },
    ],
  };
}

function buildHeaderCheck(
  headers: Record<string, string>,
  config: {
    id: string;
    title: string;
    headerName: string;
    missingSeverity: "low" | "medium";
  },
): SecurityCheck {
  const value = headers[config.headerName];
  const evidence: AuditEvidence = value
    ? {
        summary: `${config.headerName}: ${value}`,
        rawToolOutput: value,
      }
    : {
        summary: `${config.headerName} header was not found.`,
        reproductionNotes: "Inspect the response headers for the audited document request.",
      };

  return {
    id: config.id,
    title: config.title,
    status: value ? "pass" : "warning",
    severity: value ? "info" : config.missingSeverity,
    evidence: [evidence],
  };
}
