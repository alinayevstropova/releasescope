import type { ConsoleMessage, Page, Response } from "playwright";
import type { FailedRequest, PageIssue, PageSnapshot } from "@/lib/qa/types";
import { trimText } from "@/lib/qa/engine/text";

const MAX_RUNTIME_SIGNALS = 30;

export type RuntimeSignals = {
  consoleErrors: PageIssue[];
  pageErrors: PageIssue[];
  failedRequests: FailedRequest[];
};

export function collectRuntimeSignals(page: Page, warnings: string[]): RuntimeSignals {
  const cappedWarnings = new Set<string>();
  const signals: RuntimeSignals = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  };

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    pushCappedSignal(
      signals.consoleErrors,
      toConsoleIssue(message),
      "Console errors",
      warnings,
      cappedWarnings,
    );
  });

  page.on("pageerror", (error) => {
    pushCappedSignal(
      signals.pageErrors,
      {
        message: trimText(error.message, 500),
        severity: "high",
        evidence: [
          {
            summary: "Browser page error was thrown while loading the target URL.",
            rawToolOutput: trimText(error.stack ?? error.message, 700),
            reproductionNotes: "Open the target URL in Chromium and check the browser console.",
          },
        ],
      },
      "Page errors",
      warnings,
      cappedWarnings,
    );
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "Unknown request failure";
    pushCappedSignal(
      signals.failedRequests,
      {
        url: request.url(),
        method: request.method(),
        errorText: failure,
        severity: "medium",
        evidence: [
          {
            summary: `${request.method()} request failed during page load.`,
            url: request.url(),
            rawToolOutput: failure,
            reproductionNotes: "Reload the audited page and inspect failed network requests.",
          },
        ],
      },
      "Failed requests",
      warnings,
      cappedWarnings,
    );
  });

  return signals;
}

export async function capturePageSnapshot(
  page: Page,
  response: Response | null,
  signals: RuntimeSignals,
): Promise<PageSnapshot> {
  const facts = await page.evaluate(() => ({
    title: document.title,
    description:
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? null,
    h1: Array.from(document.querySelectorAll("h1"))
      .map((node) => node.textContent?.trim() ?? "")
      .filter(Boolean),
  }));

  return {
    title: facts.title,
    description: facts.description,
    finalUrl: page.url(),
    status: response?.status() ?? null,
    h1: facts.h1,
    consoleErrors: signals.consoleErrors,
    pageErrors: signals.pageErrors,
    failedRequests: signals.failedRequests,
  };
}

function toConsoleIssue(message: ConsoleMessage): PageIssue {
  const source = message.location().url;
  return {
    message: trimText(message.text(), 500),
    source,
    severity: "medium",
    evidence: [
      {
        summary: "Console error was emitted while loading the target URL.",
        url: source || undefined,
        rawToolOutput: trimText(message.text(), 700),
        reproductionNotes: "Open the target URL in Chromium and inspect the Console panel.",
      },
    ],
  };
}

function pushCappedSignal<T>(
  collection: T[],
  item: T,
  label: string,
  warnings: string[],
  cappedWarnings: Set<string>,
) {
  if (collection.length < MAX_RUNTIME_SIGNALS) {
    collection.push(item);
    return;
  }

  const warning = `${label} capped at ${MAX_RUNTIME_SIGNALS} entries.`;
  if (!cappedWarnings.has(warning)) {
    cappedWarnings.add(warning);
    warnings.push(warning);
  }
}
