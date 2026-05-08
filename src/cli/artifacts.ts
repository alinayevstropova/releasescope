import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { QaAuditResult } from "../lib/qa/types";
import type { CliJsonReport } from "./reporters";

export type ArtifactManifest = {
  schemaVersion: "releasescope.artifacts.v1";
  generatedAt: string;
  auditId: string;
  files: Record<string, string>;
};

export async function writeTextFile(filePath: string, content: string) {
  await mkdir(dirname(resolve(filePath)), { recursive: true });
  await writeFile(filePath, content);
}

export async function writeAuditArtifacts(options: {
  artifactDir: string;
  result: QaAuditResult;
  jsonReport: CliJsonReport;
  markdownReport: string;
  prComment: string;
  generatedAt?: string;
}): Promise<ArtifactManifest> {
  const artifactDir = resolve(options.artifactDir);

  await Promise.all([
    mkdir(artifactDir, { recursive: true }),
    mkdir(join(artifactDir, "screenshots"), { recursive: true }),
    mkdir(join(artifactDir, "traces"), { recursive: true }),
    mkdir(join(artifactDir, "lighthouse"), { recursive: true }),
    mkdir(join(artifactDir, "axe"), { recursive: true }),
  ]);

  await Promise.all([
    writeFile(join(artifactDir, "audit.json"), JSON.stringify(options.jsonReport, null, 2)),
    writeFile(join(artifactDir, "report.md"), options.markdownReport),
    writeFile(join(artifactDir, "pr-comment.md"), options.prComment),
    writeFile(
      join(artifactDir, "lighthouse", "lighthouse-summary.json"),
      JSON.stringify(options.result.lighthouse ?? null, null, 2),
    ),
    writeFile(
      join(artifactDir, "axe", "axe-summary.json"),
      JSON.stringify(options.result.accessibility, null, 2),
    ),
  ]);

  await writeIfMissing(
    join(artifactDir, "screenshots", "README.md"),
    "Live audits save `page-full.png` in this directory. Demo audits only create this note.\n",
  );
  await writeIfMissing(
    join(artifactDir, "traces", "README.md"),
    "Live audits save `playwright-trace.zip` in this directory. Demo audits only create this note.\n",
  );

  const manifest: ArtifactManifest = {
    schemaVersion: "releasescope.artifacts.v1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    auditId: options.result.id,
    files: {
      auditJson: "audit.json",
      markdownReport: "report.md",
      prComment: "pr-comment.md",
      manifest: "artifacts-manifest.json",
      screenshot: "screenshots/page-full.png",
      playwrightTrace: "traces/playwright-trace.zip",
      lighthouseJson: "lighthouse/lighthouse-report.json",
      lighthouseSummary: "lighthouse/lighthouse-summary.json",
      axeJson: "axe/axe-report.json",
      axeSummary: "axe/axe-summary.json",
    },
  };

  await writeFile(join(artifactDir, "artifacts-manifest.json"), JSON.stringify(manifest, null, 2));

  return manifest;
}

async function writeIfMissing(filePath: string, content: string) {
  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, content);
  }
}
