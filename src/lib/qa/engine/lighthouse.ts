import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import type {
  AuditFindingCategory,
  AuditSeverity,
  AuditViewport,
  LighthouseCategory,
  LighthouseFinding,
  LighthouseReport,
} from "@/lib/qa/types";
import { VIEWPORTS } from "@/lib/qa/engine/viewport";

export type LighthouseAuditOptions = {
  artifactDir?: string;
};

export async function runLighthouseAudit(
  targetUrl: string,
  viewport: AuditViewport,
  options: LighthouseAuditOptions = {},
): Promise<LighthouseReport> {
  const [{ default: lighthouse }, chromeLauncher] = await Promise.all([
    import("lighthouse"),
    import("chrome-launcher"),
  ]);

  const chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const runnerResult = await lighthouse(
      targetUrl,
      {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        formFactor: viewport,
        screenEmulation:
          viewport === "desktop"
            ? {
                disabled: false,
                mobile: false,
                width: VIEWPORTS.desktop.width,
                height: VIEWPORTS.desktop.height,
                deviceScaleFactor: 1,
              }
            : undefined,
      },
      undefined,
    );

    if (!runnerResult) {
      throw new Error("Lighthouse returned no result.");
    }

    const lhr = runnerResult.lhr;

    if (options.artifactDir) {
      await writeLighthouseArtifact(options.artifactDir, lhr);
    }

    const categories: LighthouseCategory[] = Object.values(lhr.categories).map((category) => ({
      id: category.id,
      title: category.title,
      score: toPercent(category.score),
    }));

    const categoryByAuditId = new Map<string, AuditFindingCategory | string>();
    for (const category of Object.values(lhr.categories)) {
      for (const ref of category.auditRefs) {
        if (ref.weight > 0) {
          categoryByAuditId.set(ref.id, normalizeCategory(category.id, category.title));
        }
      }
    }

    const findings: LighthouseFinding[] = Object.values(lhr.audits)
      .filter((audit) => {
        if (audit.scoreDisplayMode === "notApplicable") {
          return false;
        }
        return typeof audit.score === "number" && audit.score < 0.9;
      })
      .map((audit) => {
        const score = toPercent(audit.score);
        const category = categoryByAuditId.get(audit.id) ?? "best-practices";
        return {
          id: audit.id,
          title: audit.title,
          description: audit.description,
          category,
          severity: severityFromScore(score),
          score,
          displayValue: audit.displayValue,
          evidence: [
            {
              summary: audit.displayValue
                ? `${audit.title}: ${audit.displayValue}`
                : `${audit.title} scored ${score ?? "unknown"}/100.`,
              rawToolOutput: JSON.stringify({
                id: audit.id,
                score,
                scoreDisplayMode: audit.scoreDisplayMode,
                displayValue: audit.displayValue,
              }),
              reproductionNotes: "Run Lighthouse against the same URL and inspect this audit id.",
            },
          ],
        };
      })
      .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
      .slice(0, 12);

    return {
      categories,
      findings,
      fetchTime: lhr.fetchTime,
    };
  } finally {
    await chrome.kill();
  }
}

function toPercent(score: number | null | undefined) {
  return typeof score === "number" ? Math.round(score * 100) : null;
}

function severityFromScore(score: number | null): AuditSeverity {
  if (score === null) {
    return "medium";
  }

  if (score < 50) {
    return "high";
  }

  if (score < 75) {
    return "medium";
  }

  return "low";
}

function normalizeCategory(id: string, title: string): AuditFindingCategory | string {
  if (id === "best-practices") {
    return "best-practices";
  }

  if (id === "performance" || id === "accessibility" || id === "seo") {
    return id;
  }

  return title;
}

async function writeLighthouseArtifact(artifactDir: string, lhr: unknown) {
  const lighthouseDir = join(artifactDir, "lighthouse");

  await mkdir(lighthouseDir, { recursive: true });
  await writeFile(join(lighthouseDir, "lighthouse-report.json"), JSON.stringify(lhr, null, 2));
}
