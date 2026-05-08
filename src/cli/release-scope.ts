import { pathToFileURL } from "node:url";
import { writeAuditArtifacts, writeTextFile } from "./artifacts";
import { CLI_USAGE, CliUsageError, parseCliArgs, type FailOnPolicy } from "./args";
import { createJsonReport, formatAuditMarkdown, formatPrComment } from "./reporters";
import { summarizeAuditWithAi } from "../lib/openai/summary";
import { runQaAudit } from "../lib/qa/audit";
import {
  AuditTargetLoadError,
  InvalidAuditTargetError,
  UnsafeAuditTargetError,
  getPublicErrorMessage,
} from "../lib/qa/errors";
import type { AuditDecision } from "../lib/qa/types";

export async function runReleaseScopeCli(argv = process.argv.slice(2)): Promise<number> {
  try {
    const command = parseCliArgs(argv);

    if (command.command === "help") {
      console.log(CLI_USAGE);
      return 0;
    }

    const result = await runQaAudit({
      url: command.url,
      viewport: command.viewport,
      includeAi: command.includeAi,
      notes: command.notes,
      demoMode: command.demoMode,
      artifactDir: command.artifactDir,
    });

    if (command.includeAi) {
      result.aiSummary = await summarizeAuditWithAi(result, command.notes);
    }

    const generatedAt = new Date().toISOString();
    const markdownReport = formatAuditMarkdown(result, {
      artifactDir: command.artifactDir,
      generatedAt,
    });
    const prComment = formatPrComment(result);
    const jsonReport = createJsonReport(result, {
      artifactDir: command.artifactDir,
      generatedAt,
    });
    const selectedOutput =
      command.format === "json" ? `${JSON.stringify(jsonReport, null, 2)}\n` : markdownReport;

    if (command.artifactDir) {
      await writeAuditArtifacts({
        artifactDir: command.artifactDir,
        result,
        jsonReport,
        markdownReport,
        prComment,
        generatedAt,
      });
      console.error(`ReleaseScope artifacts written to ${command.artifactDir}`);
    }

    if (command.outputPath) {
      await writeTextFile(command.outputPath, selectedOutput);
      console.error(`ReleaseScope ${command.format} report written to ${command.outputPath}`);
    } else {
      console.log(selectedOutput.trimEnd());
    }

    return exitCodeForDecision(result.assessment.decision, command.failOn);
  } catch (error) {
    return handleCliError(error);
  }
}

export function exitCodeForDecision(decision: AuditDecision, failOn: FailOnPolicy) {
  if (failOn === "never") {
    return 0;
  }

  if (failOn === "review") {
    return decision === "review" || decision === "blocked" ? 2 : 0;
  }

  return decision === "blocked" ? 2 : 0;
}

function handleCliError(error: unknown) {
  if (error instanceof CliUsageError) {
    console.error(`Error: ${error.message}\n\n${CLI_USAGE}`);
    return 1;
  }

  if (
    error instanceof InvalidAuditTargetError ||
    error instanceof UnsafeAuditTargetError ||
    error instanceof AuditTargetLoadError
  ) {
    console.error(`Audit failed: ${getPublicErrorMessage(error)}`);
    return 1;
  }

  console.error(`Audit failed: ${error instanceof Error ? error.message : String(error)}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runReleaseScopeCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
