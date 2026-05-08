import type { AuditViewport } from "../lib/qa/types";

export type OutputFormat = "json" | "markdown";

export type FailOnPolicy = "blocked" | "review" | "never";

export type AuditCliCommand = {
  command: "audit";
  url: string;
  viewport: AuditViewport;
  format: OutputFormat;
  outputPath?: string;
  artifactDir?: string;
  includeAi: boolean;
  demoMode: boolean;
  notes?: string;
  failOn: FailOnPolicy;
};

export type CliCommand = AuditCliCommand | { command: "help" };

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export const CLI_USAGE = `ReleaseScope CLI

Usage:
  releasescope audit <url> [options]

Options:
  --viewport <desktop|mobile>     Audit viewport. Defaults to desktop.
  --format <markdown|json>        Output format. Defaults to markdown.
  --json                          Shortcut for --format json.
  --markdown                      Shortcut for --format markdown.
  --output <path>                 Write the selected output format to a file.
  --artifact-dir <path>           Write audit artifacts for CI review.
  --include-ai                    Include the AI copilot summary. Default.
  --no-ai                         Skip the AI copilot summary.
  --notes <text>                  Extra release context for the AI copilot.
  --demo                          Use deterministic demo data instead of a live browser audit.
  --fail-on <blocked|review|never>  Exit non-zero on the selected risk level. Defaults to blocked.
  --help                          Show this help.

Examples:
  releasescope audit https://example.com --artifact-dir releasescope-artifacts
  releasescope audit https://example.com --json --output audit.json --fail-on review
`;

export function parseCliArgs(argv: string[]): CliCommand {
  if (argv[0] === "--") {
    return parseCliArgs(argv.slice(1));
  }

  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return { command: "help" };
  }

  const [command, ...rest] = argv;
  if (command !== "audit") {
    throw new CliUsageError(`Unknown command "${command}".`);
  }

  let url: string | undefined;
  let viewport: AuditViewport = "desktop";
  let format: OutputFormat = "markdown";
  let outputPath: string | undefined;
  let artifactDir: string | undefined;
  let includeAi = true;
  let demoMode = false;
  let notes: string | undefined;
  let failOn: FailOnPolicy = "blocked";

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (!arg.startsWith("-")) {
      if (url) {
        throw new CliUsageError(`Unexpected extra argument "${arg}".`);
      }

      url = arg;
      continue;
    }

    if (arg === "--json") {
      format = "json";
      continue;
    }

    if (arg === "--markdown") {
      format = "markdown";
      continue;
    }

    if (arg === "--include-ai") {
      includeAi = true;
      continue;
    }

    if (arg === "--no-ai") {
      includeAi = false;
      continue;
    }

    if (arg === "--demo") {
      demoMode = true;
      continue;
    }

    const option = readOption(arg, rest, index);
    index = option.nextIndex;

    switch (option.name) {
      case "--viewport":
        viewport = parseViewport(option.value);
        break;
      case "--format":
        format = parseFormat(option.value);
        break;
      case "--output":
        outputPath = option.value;
        break;
      case "--artifact-dir":
        artifactDir = option.value;
        break;
      case "--notes":
        notes = option.value;
        break;
      case "--fail-on":
        failOn = parseFailOn(option.value);
        break;
      default:
        throw new CliUsageError(`Unknown option "${option.name}".`);
    }
  }

  if (!url) {
    throw new CliUsageError("The audit command requires a URL.");
  }

  return {
    command: "audit",
    url,
    viewport,
    format,
    outputPath,
    artifactDir,
    includeAi,
    demoMode,
    notes,
    failOn,
  };
}

function readOption(
  arg: string,
  args: string[],
  index: number,
): { name: string; value: string; nextIndex: number } {
  const separatorIndex = arg.indexOf("=");
  if (separatorIndex > -1) {
    return {
      name: arg.slice(0, separatorIndex),
      value: arg.slice(separatorIndex + 1),
      nextIndex: index,
    };
  }

  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new CliUsageError(`Option "${arg}" requires a value.`);
  }

  return { name: arg, value, nextIndex: index + 1 };
}

function parseViewport(value: string): AuditViewport {
  if (value === "desktop" || value === "mobile") {
    return value;
  }

  throw new CliUsageError(`Unsupported viewport "${value}". Use desktop or mobile.`);
}

function parseFormat(value: string): OutputFormat {
  if (value === "json" || value === "markdown") {
    return value;
  }

  throw new CliUsageError(`Unsupported format "${value}". Use markdown or json.`);
}

function parseFailOn(value: string): FailOnPolicy {
  if (value === "blocked" || value === "review" || value === "never") {
    return value;
  }

  throw new CliUsageError(`Unsupported fail-on policy "${value}".`);
}
