"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Copy,
  ExternalLink,
  Gauge,
  LoaderCircle,
  Monitor,
  Play,
  Rocket,
  ShieldCheck,
  Smartphone,
  Target,
  Terminal,
  XCircle,
} from "lucide-react";
import type {
  AccessibilityViolation,
  AuditBacklogItem,
  AuditDecision,
  AuditViewport,
  LighthouseFinding,
  QaAuditResult,
} from "@/lib/qa/types";

const DEFAULT_TARGET_URL = "https://example.com";
const MAX_VISIBLE_LIGHTHOUSE_FINDINGS = 6;

const severityStyles = {
  critical: "border-red-200 bg-red-50 text-red-950",
  serious: "border-orange-200 bg-orange-50 text-orange-950",
  moderate: "border-amber-200 bg-amber-50 text-amber-950",
  minor: "border-emerald-200 bg-emerald-50 text-emerald-950",
  unknown: "border-neutral-200 bg-neutral-50 text-neutral-800",
};

const decisionStyles: Record<
  AuditDecision,
  {
    label: string;
    tone: string;
    chip: string;
    line: string;
    icon: React.ReactNode;
  }
> = {
  ready: {
    label: "Ready",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-950",
    chip: "bg-emerald-100 text-emerald-950",
    line: "from-emerald-500 via-cyan-400 to-lime-300",
    icon: <Rocket className="h-5 w-5" aria-hidden="true" />,
  },
  review: {
    label: "Needs review",
    tone: "border-amber-200 bg-amber-50 text-amber-950",
    chip: "bg-amber-100 text-amber-950",
    line: "from-amber-500 via-orange-300 to-cyan-300",
    icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
  },
  blocked: {
    label: "Blocked",
    tone: "border-red-200 bg-red-50 text-red-950",
    chip: "bg-red-100 text-red-950",
    line: "from-red-500 via-orange-400 to-amber-300",
    icon: <XCircle className="h-5 w-5" aria-hidden="true" />,
  },
};

export function AuditConsole() {
  const [url, setUrl] = useState(DEFAULT_TARGET_URL);
  const [viewport, setViewport] = useState<AuditViewport>("desktop");
  const [includeAi, setIncludeAi] = useState(false);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<QaAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function runAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, viewport, includeAi, notes: notes || undefined }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Audit failed.");
      }

      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audit failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#edf2f0] text-neutral-950">
      <section className="relative overflow-hidden bg-[#07130f] text-white">
        <div className="qa-grid-bg absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-5 pb-12 pt-7 lg:grid-cols-[1fr_420px] lg:px-8">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-300">Release readiness workspace</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal sm:text-6xl">ReleaseScope</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50/80 sm:text-base">
              QA evidence before your users find the bugs. Turn any URL into a release
              decision, risk score, and issue-ready backlog.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm text-emerald-50/85">
              <CapabilityPill icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />} label="Accessibility scan" />
              <CapabilityPill icon={<Gauge className="h-4 w-4" aria-hidden="true" />} label="Page speed" />
              <CapabilityPill icon={<Bot className="h-4 w-4" aria-hidden="true" />} label="AI summary" />
            </div>
          </div>
          <SignatureSignal />
        </div>
      </section>

      <section className="relative mx-auto -mt-7 w-full max-w-7xl px-5 lg:px-8">
        <form
          aria-busy={isRunning}
          className="qa-card qa-fade-up grid gap-4 border-white/70 bg-white/90 p-4 shadow-[0_24px_70px_rgba(15,31,27,0.16)] backdrop-blur lg:grid-cols-[1fr_auto_auto] lg:items-end"
          onSubmit={runAudit}
        >
          <div className="grid min-w-0 gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium text-neutral-700" htmlFor="target-url">
                Target URL
              </label>
            <span className="flex flex-wrap gap-2">
                <QuickTargetButton
                  label="This app"
                  onClick={() => setUrl(`${window.location.origin}/`)}
                  title="Audit the current app URL"
                />
                <QuickTargetButton
                  label="Example"
                  onClick={() => setUrl(DEFAULT_TARGET_URL)}
                  title="Use https://example.com as a sample target"
                />
              </span>
            </div>
            <input
              id="target-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="h-12 min-w-0 rounded-md border border-neutral-300 bg-white px-4 text-base outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              placeholder="https://example.com"
              type="url"
              required
            />
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-neutral-700">Viewport</legend>
            <div className="grid h-12 grid-cols-2 rounded-md border border-neutral-300 bg-neutral-100 p-1">
              <ViewportButton
                active={viewport === "desktop"}
                icon={<Monitor className="h-4 w-4" aria-hidden="true" />}
                label="Desktop"
                onClick={() => setViewport("desktop")}
                title="Audit with a 1440px desktop viewport"
              />
              <ViewportButton
                active={viewport === "mobile"}
                icon={<Smartphone className="h-4 w-4" aria-hidden="true" />}
                label="Mobile"
                onClick={() => setViewport("mobile")}
                title="Audit with a mobile viewport"
              />
            </div>
          </fieldset>

          <button
            className="qa-hover-lift inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#0f1f1b] px-5 text-sm font-semibold text-white transition hover:bg-[#19352e] disabled:cursor-not-allowed disabled:bg-neutral-400"
            disabled={isRunning}
            title="Run browser checks, accessibility checks, page-quality scoring, and optional AI summary"
            type="submit"
          >
            {isRunning ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {isRunning ? "Running audit" : "Run audit"}
          </button>

          <label className="flex items-center gap-3 rounded-md bg-[#f6faf8] px-4 py-3 lg:col-span-3">
            <input
              checked={includeAi}
              onChange={(event) => setIncludeAi(event.target.checked)}
              className="h-4 w-4 accent-emerald-700"
              type="checkbox"
            />
            <span
              className="text-sm font-medium text-neutral-800"
              title="Requires OPENAI_API_KEY in the environment"
            >
              Generate OpenAI QA summary
            </span>
          </label>

          <label className="grid gap-2 lg:col-span-3">
            <span className="text-sm font-medium text-neutral-700">Context notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              placeholder="Release scope, known risky flows, target persona, or acceptance criteria"
            />
          </label>
        </form>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-8">
        {error ? (
          <div
            className="mb-5 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-950"
            role="alert"
          >
            <XCircle className="mt-0.5 h-5 w-5" aria-hidden="true" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : null}

        {isRunning ? <LoadingReport /> : result ? <AuditResultView notes={notes} result={result} /> : <EmptyState />}
      </section>
      <AppFooter />
    </main>
  );
}

function AppFooter() {
  return (
    <footer className="relative mt-8 overflow-hidden bg-[#07130f] text-emerald-50">
      <div className="qa-grid-bg absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 md:grid-cols-[1fr_auto] md:items-end lg:px-8">
        <div>
          <p className="text-sm font-semibold text-emerald-300">ReleaseScope</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/75">
            Made by ReleaseScope Studio for teams that want clear QA evidence, release risk, and
            action-ready fixes before users find the bugs.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-emerald-50/75">
            <span className="rounded-sm bg-white/10 px-3 py-2">Playwright</span>
            <span className="rounded-sm bg-white/10 px-3 py-2">axe-core</span>
            <span className="rounded-sm bg-white/10 px-3 py-2">Lighthouse</span>
            <span className="rounded-sm bg-white/10 px-3 py-2">OpenAI API</span>
          </div>
        </div>
        <div className="grid gap-3 text-sm text-emerald-50/75 md:justify-items-end">
          <span className="h-1.5 w-32 rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-amber-300" />
          <span>&copy; {new Date().getFullYear()} ReleaseScope</span>
          <span className="text-xs">Release readiness, made visible.</span>
        </div>
      </div>
    </footer>
  );
}

function CapabilityPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 backdrop-blur">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function SignatureSignal() {
  return (
    <div
      className="qa-signature qa-hover-lift hidden min-h-[320px] overflow-hidden rounded-md border border-white/10 bg-white/[0.07] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur md:block"
      title="Sample release map generated by ReleaseScope"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Release map</p>
          <p className="mt-1 text-xs leading-5 text-emerald-50/70">How evidence becomes a decision</p>
        </div>
        <span className="rounded-sm bg-white/10 px-2 py-1 text-xs font-medium text-cyan-100">
          Sample
        </span>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-md bg-white/[0.08] p-4">
        <div className="absolute inset-x-6 top-1/2 h-16 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-2xl" aria-hidden="true" />
        <svg
          aria-label="Sample release map: QA confidence 76 out of 100, evidence strong, risk needs review, action backlog ready"
          className="relative h-44 w-full"
          role="img"
          viewBox="0 0 260 210"
        >
          <defs>
            <linearGradient id="release-map-evidence" x1="64" x2="210" y1="30" y2="100">
              <stop stopColor="#34d399" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id="release-map-risk" x1="206" x2="130" y1="104" y2="182">
              <stop stopColor="#22d3ee" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
            <linearGradient id="release-map-action" x1="130" x2="54" y1="182" y2="104">
              <stop stopColor="#fbbf24" />
              <stop offset="1" stopColor="#34d399" />
            </linearGradient>
          </defs>
          <circle cx="130" cy="104" fill="none" r="76" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <circle cx="130" cy="104" fill="none" r="52" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <path
            className="qa-radar-path"
            d="M130 28 C172 30 205 62 206 104"
            fill="none"
            stroke="url(#release-map-evidence)"
            strokeLinecap="round"
            strokeWidth="12"
          />
          <path
            className="qa-radar-path qa-radar-path-delayed"
            d="M206 104 C206 146 172 180 130 180"
            fill="none"
            stroke="url(#release-map-risk)"
            strokeLinecap="round"
            strokeWidth="12"
          />
          <path
            className="qa-radar-path qa-radar-path-slow"
            d="M130 180 C88 178 54 146 54 104 C54 62 88 30 130 28"
            fill="none"
            stroke="url(#release-map-action)"
            strokeLinecap="round"
            strokeWidth="12"
          />
          <line stroke="rgba(255,255,255,0.14)" strokeWidth="1" x1="130" x2="206" y1="104" y2="104" />
          <line stroke="rgba(255,255,255,0.14)" strokeWidth="1" x1="130" x2="130" y1="104" y2="180" />
          <line stroke="rgba(255,255,255,0.14)" strokeWidth="1" x1="130" x2="54" y1="104" y2="104" />
          <circle cx="130" cy="104" fill="#07130f" r="42" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <text fill="#eafff7" fontSize="25" fontWeight="700" textAnchor="middle" x="130" y="100">
            76
          </text>
          <text fill="rgba(234,255,247,0.62)" fontSize="12" fontWeight="500" textAnchor="middle" x="130" y="120">
            QA score
          </text>
          <circle className="qa-radar-node" cx="206" cy="104" fill="#22d3ee" r="5" />
          <circle className="qa-radar-node qa-radar-node-delayed" cx="130" cy="180" fill="#fbbf24" r="5" />
          <circle className="qa-radar-node qa-radar-node-slow" cx="54" cy="104" fill="#34d399" r="5" />
        </svg>
        <div className="relative -mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="rounded-sm bg-emerald-300/15 px-2 py-1 font-medium text-emerald-100">
            Evidence strong
          </span>
          <span className="rounded-sm bg-amber-300/15 px-2 py-1 font-semibold text-amber-100">
            Needs review
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-emerald-50/80">
        <SignalFact
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          label="Evidence"
          value="3 scans"
        />
        <SignalFact
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          label="Risk"
          value="3 fixes"
        />
        <SignalFact
          icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
          label="Action"
          value="Backlog"
        />
      </div>
    </div>
  );
}

function SignalFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-w-0 gap-2 rounded-sm bg-white/[0.08] px-3 py-3">
      <span className="text-cyan-100">{icon}</span>
      <span className="font-medium text-emerald-50">{label}</span>
      <span className="truncate text-emerald-50/65">{value}</span>
    </div>
  );
}

function QuickTargetButton({
  label,
  onClick,
  title,
}: {
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className="rounded-sm bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-emerald-50 hover:text-emerald-900"
      onClick={onClick}
      title={title}
      type="button"
    >
      {label}
    </button>
  );
}

function ViewportButton({
  active,
  icon,
  label,
  onClick,
  title,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition ${
        active ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-700 hover:text-neutral-950"
      }`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function LoadingReport() {
  return (
    <div className="grid gap-5">
      <div className="qa-card overflow-hidden border-emerald-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,31,27,0.08)]">
        <div className="qa-loading-rail mb-5" aria-hidden="true" />
        <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-700">Live audit running</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Building the release signal</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              The browser is collecting errors, accessibility issues, page speed, and content signals.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SkeletonTile label="Accessibility" />
            <SkeletonTile label="Performance" />
            <SkeletonTile label="Backlog" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {["Decision", "QA score", "Accessibility", "Browser errors"].map((label) => (
          <div className="qa-card p-5" key={label}>
            <div className="qa-skeleton h-4 w-24" />
            <div className="qa-skeleton mt-6 h-9 w-32" />
            <div className="qa-skeleton mt-3 h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonTile({ label }: { label: string }) {
  return (
    <div className="rounded-md bg-[#f6faf8] p-4">
      <div className="qa-skeleton h-3 w-20" />
      <div className="qa-skeleton mt-5 h-8 w-16" />
      <p className="mt-4 text-xs font-medium text-neutral-700">{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="qa-card qa-fade-up overflow-hidden bg-white p-5">
      <div className="grid min-h-[360px] gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div className="flex max-w-md flex-col gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[#0f1f1b] text-emerald-200">
            <Target className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">
              From URL to release decision
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Paste a page, choose the viewport, and get a QA report that explains what blocks
              release, what can wait, and what should become an issue.
            </p>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-neutral-700">
            <span className="rounded-sm bg-[#f3f7f5] px-3 py-2">Evidence</span>
            <span className="rounded-sm bg-[#f3f7f5] px-3 py-2">Risk</span>
            <span className="rounded-sm bg-[#f3f7f5] px-3 py-2">Backlog</span>
          </div>
        </div>
        <div className="grid gap-3">
          <EmptyStep
            number="01"
            title="Inspect the real page"
            detail="Playwright opens Chromium, captures console errors, page errors, failed requests, headings, and metadata."
          />
          <EmptyStep
            number="02"
            title="Find release risks"
            detail="Automated checks look for accessibility issues, page speed problems, SEO gaps, and reliability risks."
          />
          <EmptyStep
            number="03"
            title="Turn evidence into work"
            detail="ReleaseScope returns a release decision, QA score, blockers, quick wins, and issue-ready backlog items."
          />
        </div>
      </div>
    </div>
  );
}

function EmptyStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  return (
    <div className="qa-hover-lift grid grid-cols-[auto_1fr] gap-3 rounded-md bg-[#f7faf8] p-4">
      <span className="font-mono text-xs text-emerald-700">{number}</span>
      <div>
        <p className="font-medium text-neutral-950">{title}</p>
        <p className="mt-1 text-sm leading-5 text-neutral-700">{detail}</p>
      </div>
    </div>
  );
}

function AuditResultView({ notes, result }: { notes: string; result: QaAuditResult }) {
  const severeAccessibilityCount = useMemo(
    () =>
      result.accessibility.violations.filter(
        (violation) => violation.impact === "critical" || violation.impact === "serious",
      ).length,
    [result.accessibility.violations],
  );
  const runtimeSignalCount =
    result.page.consoleErrors.length + result.page.pageErrors.length + result.page.failedRequests.length;

  return (
    <div className="qa-fade-up grid gap-5">
      <ResultHeader result={result} />
      <StickyMetricsBar
        result={result}
        runtimeSignalCount={runtimeSignalCount}
        severeAccessibilityCount={severeAccessibilityCount}
      />
      <DecisionPanel result={result} />
      <CopyForAiPanel notes={notes} result={result} />

      {result.aiSummary ? <AiSummaryPanel summary={result.aiSummary} /> : null}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <BacklogPanel items={result.assessment.issueBacklog} />
        <QualityGatePanel result={result} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="qa-card min-w-0 overflow-hidden bg-white">
          <PanelHeader title="Accessibility findings" />
          <div className="divide-y divide-neutral-200">
            {result.accessibility.violations.length ? (
              result.accessibility.violations.map((violation) => (
                <AccessibilityFinding key={violation.id} violation={violation} />
              ))
            ) : (
              <CleanPanel label="No accessibility issues found" />
            )}
          </div>
        </section>

        <LighthousePanel result={result} />
      </div>
    </div>
  );
}

function StickyMetricsBar({
  result,
  runtimeSignalCount,
  severeAccessibilityCount,
}: {
  result: QaAuditResult;
  runtimeSignalCount: number;
  severeAccessibilityCount: number;
}) {
  return (
    <section
      aria-label="Sticky release summary"
      className="sticky top-3 z-20 rounded-md border border-white/70 bg-white/90 p-2 shadow-[0_14px_45px_rgba(15,31,27,0.14)] backdrop-blur"
      data-testid="sticky-metrics"
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StickyMetric
          icon={<Rocket className="h-4 w-4" aria-hidden="true" />}
          label="Release decision"
          value={decisionStyles[result.assessment.decision].label}
          detail={`${result.assessment.riskLevel} risk`}
          hint="Final release recommendation from weighted QA signals"
        />
        <StickyMetric
          icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
          label="QA score"
          value={`${result.assessment.score}/100`}
          detail="weighted confidence"
          hint="Higher is better; score combines HTTP, accessibility, page speed, runtime, and content checks"
        />
        <StickyMetric
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          label="Accessibility issues"
          value={String(result.accessibility.violationCount)}
          detail={`${severeAccessibilityCount} critical/serious`}
          hint="Accessibility issues found during automated WCAG checks"
        />
        <StickyMetric
          icon={<Terminal className="h-4 w-4" aria-hidden="true" />}
          label="Browser errors"
          value={String(runtimeSignalCount)}
          detail="console, page, request"
          hint="Console errors, uncaught page errors, and failed network requests"
        />
      </div>
    </section>
  );
}

function StickyMetric({
  icon,
  label,
  value,
  detail,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  hint: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-neutral-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-neutral-700">
        {icon}
        <span className="inline-flex min-w-0 items-center gap-1 text-[0.68rem] font-medium uppercase leading-4">
          <span className="truncate">{label}</span>
          <InfoTip label={hint} />
        </span>
      </div>
      <div className="mt-1 flex min-w-0 items-baseline gap-2">
        <p className="truncate text-xl font-semibold tracking-normal">{value}</p>
        <p className="truncate text-xs text-neutral-700">{detail}</p>
      </div>
    </div>
  );
}

function ResultHeader({ result }: { result: QaAuditResult }) {
  return (
    <div className="qa-card qa-hover-lift flex min-w-0 flex-col gap-3 bg-white p-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 break-words text-2xl font-semibold tracking-normal">
            {result.page.title || "Untitled page"}
          </h2>
          <a
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-900 hover:text-emerald-950"
            href={result.page.finalUrl}
            rel="noreferrer"
            target="_blank"
            title="Open the audited page in a new tab"
          >
            Open
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
        <p className="mt-1 max-w-3xl break-all text-sm text-neutral-700">{result.page.finalUrl}</p>
      </div>
      <div className="shrink-0 font-mono text-sm text-neutral-700">
        {(result.durationMs / 1000).toFixed(1)}s - {result.viewport}
      </div>
    </div>
  );
}

function DecisionPanel({ result }: { result: QaAuditResult }) {
  const styles = decisionStyles[result.assessment.decision];

  return (
    <section className={`qa-card relative overflow-hidden border p-5 ${styles.tone}`}>
      <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${styles.line}`} aria-hidden="true" />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-sm px-3 py-1 text-sm font-semibold ${styles.chip}`}>
              {styles.icon}
              {styles.label}
            </span>
            <span className="font-mono text-sm">{result.assessment.score}/100</span>
          </div>
          <h2 className="mt-4 max-w-3xl break-words text-2xl font-semibold tracking-normal">
            {result.assessment.headline}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 opacity-80">
            Score combines page response, accessibility severity, page-quality checks, browser stability,
            and basic content structure.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DecisionList title="Blockers" items={result.assessment.blockers} emptyLabel="No release blockers" />
          <DecisionList title="Quick wins" items={result.assessment.quickWins} emptyLabel="No quick wins queued" />
        </div>
      </div>
    </section>
  );
}

function DecisionList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 grid gap-2">
        {items.length ? (
          items.map((item) => (
            <p className="break-words rounded-sm bg-white/60 px-3 py-2 text-sm leading-5" key={item}>
              {item}
            </p>
          ))
        ) : (
          <p className="rounded-sm bg-white/60 px-3 py-2 text-sm leading-5">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

function CopyForAiPanel({ notes, result }: { notes: string; result: QaAuditResult }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const prompt = useMemo(() => buildAiFixPrompt(result, notes), [notes, result]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section className="qa-card relative overflow-hidden border-cyan-200 bg-[#f7fbfa] p-5 shadow-[0_18px_45px_rgba(15,31,27,0.06)]">
      <div className="absolute right-5 top-5 h-20 w-20 rounded-full bg-cyan-200/25 blur-2xl" aria-hidden="true" />
      <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#0f1f1b] text-cyan-100">
            <Bot className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900">AI handoff</p>
            <h3 className="mt-1 text-xl font-semibold tracking-normal">
              Copy a repair brief for your coding agent
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-700">
              Includes release risk, priority fixes, evidence, and verification commands.
            </p>
          </div>
        </div>

        <button
          className="qa-hover-lift inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0f1f1b] px-4 text-sm font-semibold text-white transition hover:bg-[#19352e]"
          onClick={copyPrompt}
          type="button"
        >
          {copyState === "copied" ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copyState === "copied" ? "Copied" : "Copy for AI"}
        </button>
      </div>

      <div className="relative mt-5 grid gap-2 text-sm md:grid-cols-3">
        <AiBriefFact label="Focus" value={`${result.assessment.issueBacklog.length} prioritized fixes`} />
        <AiBriefFact label="Evidence" value={`${result.accessibility.violationCount} accessibility issues`} />
        <AiBriefFact label="Checks" value="typecheck, lint, build, e2e" />
      </div>

      <p className="sr-only" aria-live="polite">
        {copyState === "copied"
          ? "AI repair brief copied."
          : copyState === "error"
            ? "AI repair brief could not be copied."
            : ""}
      </p>
      {copyState === "error" ? (
        <p className="relative mt-3 text-sm font-medium text-red-700">
          Clipboard access was blocked by the browser.
        </p>
      ) : null}
    </section>
  );
}

function AiBriefFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2">
      <p className="text-xs font-medium uppercase text-neutral-700">{label}</p>
      <p className="mt-1 truncate font-medium text-neutral-900">{value}</p>
    </div>
  );
}

function InfoTip({ label }: { label: string }) {
  const tooltipId = useId();

  return (
    <button
      aria-describedby={tooltipId}
      aria-label={`About ${label}`}
      className="group relative inline-flex cursor-help items-center rounded-sm border-0 bg-transparent p-0 text-neutral-700 outline-none transition hover:text-emerald-900 focus-visible:ring-2 focus-visible:ring-emerald-200"
      type="button"
    >
      <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
      <span
        id={tooltipId}
        className="pointer-events-none invisible absolute right-0 top-5 z-30 w-56 rounded-md bg-[#0f1f1b] px-3 py-2 text-left text-xs font-normal normal-case leading-5 text-emerald-50 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100"
        role="tooltip"
      >
        {label}
      </span>
    </button>
  );
}

function BacklogPanel({ items }: { items: AuditBacklogItem[] }) {
  return (
    <section className="qa-card min-w-0 overflow-hidden bg-white">
      <PanelHeader title="Issue-ready backlog" />
      <div className="divide-y divide-neutral-200">
        {items.length ? (
          items.map((item) => <BacklogRow item={item} key={`${item.priority}-${item.title}`} />)
        ) : (
          <CleanPanel label="No priority issues generated" />
        )}
      </div>
    </section>
  );
}

function BacklogRow({ item }: { item: AuditBacklogItem }) {
  const priorityTone = {
    P0: "bg-red-100 text-red-950",
    P1: "bg-orange-100 text-orange-950",
    P2: "bg-amber-100 text-amber-950",
    P3: "bg-neutral-100 text-neutral-800",
  }[item.priority];

  return (
    <div className="grid gap-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-neutral-700" aria-hidden="true" />
          <div className="min-w-0">
            <p className="break-words font-medium text-neutral-950">{item.title}</p>
            <p className="mt-1 break-words text-sm leading-5 text-neutral-700">{item.evidence}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-sm px-2 py-1 font-mono text-xs ${priorityTone}`}>{item.priority}</span>
          <span className="rounded-sm bg-neutral-100 px-2 py-1 text-xs text-neutral-800">{item.area}</span>
        </div>
      </div>
    </div>
  );
}

function QualityGatePanel({ result }: { result: QaAuditResult }) {
  return (
    <section className="qa-card min-w-0 overflow-hidden bg-white">
      <PanelHeader title="Quality checks" />
      <div className="grid gap-5 p-4 lg:grid-cols-2">
        <div className="grid gap-3">
          {result.lighthouse?.categories.map((category) => (
            <GateRow
              key={category.id}
              label={category.title}
              score={category.score}
              value={formatScore(category.score)}
            />
          )) ?? <CleanPanel label="Page-quality scores were unavailable" />}
        </div>

        <div className="grid gap-3">
          <Fact label="Page response" value={result.page.status?.toString() ?? "Unknown"} />
          <Fact label="Main headings" value={String(result.page.h1.length)} />
          <Fact label="Meta description" value={result.page.description ? "Present" : "Missing"} />
          <Fact label="Console errors" value={String(result.page.consoleErrors.length)} />
          <Fact label="Page errors" value={String(result.page.pageErrors.length)} />
          <Fact label="Failed requests" value={String(result.page.failedRequests.length)} />
          {result.warnings.length ? (
            <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              {result.warnings.join(" ")}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function GateRow({
  label,
  score,
  value,
}: {
  label: string;
  score: number | null;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-neutral-700">{label}</span>
        <ScorePill score={score} />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100" title={`${label}: ${value}`}>
        <div
          aria-label={`${label} ${value}`}
          className={`h-full transition-[width] duration-700 ease-out ${scoreBarTone(score)}`}
          role="img"
          style={{ width: `${Math.max(0, Math.min(score ?? 0, 100))}%` }}
        />
      </div>
    </div>
  );
}

function LighthousePanel({ result }: { result: QaAuditResult }) {
  const uniqueFindings = uniqueFriendlyFindings(result.lighthouse?.findings ?? []);
  const findings = uniqueFindings.slice(0, MAX_VISIBLE_LIGHTHOUSE_FINDINGS);
  const total = uniqueFindings.length;

  return (
    <section className="qa-card min-w-0 overflow-hidden bg-white">
      <PanelHeader
        detail="Plain-language page-quality checks, ordered by release impact."
        title={
          total > MAX_VISIBLE_LIGHTHOUSE_FINDINGS
            ? `Page-quality fixes (${MAX_VISIBLE_LIGHTHOUSE_FINDINGS} of ${total})`
            : "Page-quality fixes"
        }
      />
      <div
        className="divide-y divide-neutral-200"
        data-testid="page-quality-list"
      >
        {findings.length ? (
          findings.map((finding) => (
            <div className="grid min-w-0 gap-2 p-4" key={finding.id}>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words font-medium text-neutral-950">
                  {friendlyLighthouseTitle(finding)}
                </p>
                <FindingImpactPill finding={finding} />
              </div>
              <p className="break-words text-sm leading-6 text-neutral-700">
                {friendlyLighthouseDescription(finding)}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-700">
                <span className="rounded-sm bg-neutral-100 px-2 py-1">
                  {friendlyFindingArea(finding)}
                </span>
                {finding.displayValue ? (
                  <span className="rounded-sm bg-neutral-100 px-2 py-1">
                    Evidence: {finding.displayValue}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <CleanPanel label={result.lighthouse ? "No page-quality risks found" : "Page-quality scan unavailable"} />
        )}
      </div>
    </section>
  );
}

function AiSummaryPanel({ summary }: { summary: QaAuditResult["aiSummary"] }) {
  if (!summary) {
    return null;
  }

  if (summary.status !== "generated") {
    return (
      <section className="qa-card border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-5 w-5" aria-hidden="true" />
          <div>
            <p className="font-semibold">OpenAI summary {summary.status}</p>
            <p className="mt-1 text-sm">{summary.reason}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="qa-card border-emerald-200 bg-emerald-50 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-emerald-900">
          <Bot className="h-5 w-5" aria-hidden="true" />
          <h3 className="text-lg font-semibold">OpenAI QA summary</h3>
        </div>
        <span className="rounded-sm bg-white px-2 py-1 font-mono text-xs text-emerald-900">
          {summary.model}
        </span>
      </div>
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-emerald-950">
        {summary.content}
      </pre>
    </section>
  );
}

function AccessibilityFinding({ violation }: { violation: AccessibilityViolation }) {
  return (
    <div className="grid gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-sm border px-2 py-1 text-xs font-semibold ${severityStyles[violation.impact]}`}
            >
              {violation.impact}
            </span>
            <a
              className="inline-flex min-w-0 items-center gap-1 break-words font-medium text-neutral-950 hover:text-emerald-800"
              href={violation.helpUrl}
              rel="noreferrer"
              target="_blank"
            >
              {violation.help}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-neutral-700">{violation.description}</p>
        </div>
        <span className="rounded-sm bg-neutral-100 px-2 py-1 text-xs text-neutral-800">
          {violation.nodeCount} affected {violation.nodeCount === 1 ? "element" : "elements"}
        </span>
      </div>
      {violation.nodes[0] ? (
        <code className="block overflow-x-auto rounded-md bg-neutral-950 p-3 text-xs text-neutral-100">
          {violation.nodes[0].target.join(", ")}
        </code>
      ) : null}
    </div>
  );
}

function PanelHeader({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
      <div className="min-w-0">
        <h3 className="font-semibold">{title}</h3>
        {detail ? <p className="mt-1 text-sm leading-5 text-neutral-700">{detail}</p> : null}
      </div>
      <span className="h-1.5 w-10 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-300" />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-neutral-700">{label}</span>
      <span className="break-words text-right font-medium text-neutral-950">{value}</span>
    </div>
  );
}

function CleanPanel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-emerald-700">
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      {label}
    </div>
  );
}

function ScorePill({ score }: { score: number | null }) {
  return (
    <span
      className={`shrink-0 rounded-sm px-2 py-1 font-mono text-xs ${scorePillTone(score)}`}
      title={score === null ? "No score available" : `${score} out of 100`}
    >
      {formatScore(score)}
    </span>
  );
}

function scorePillTone(score: number | null) {
  if (score === null) {
    return "bg-neutral-100 text-neutral-800";
  }

  if (score >= 90) {
    return "bg-emerald-100 text-emerald-950";
  }

  if (score >= 50) {
    return "bg-amber-100 text-amber-950";
  }

  return "bg-red-100 text-red-950";
}

function scoreBarTone(score: number | null) {
  if (score === null) {
    return "bg-neutral-300";
  }

  if (score >= 90) {
    return "bg-emerald-600";
  }

  if (score >= 50) {
    return "bg-amber-500";
  }

  return "bg-red-600";
}

function formatScore(score: number | null | undefined) {
  return typeof score === "number" ? `${score}%` : "N/A";
}

function FindingImpactPill({ finding }: { finding: LighthouseFinding }) {
  const impact = findingImpact(finding);

  return (
    <span
      className={`shrink-0 rounded-sm px-2 py-1 text-xs font-semibold ${impact.tone}`}
      title={impact.title}
    >
      {impact.label}
    </span>
  );
}

function findingImpact(finding: LighthouseFinding) {
  const id = finding.id.toLowerCase();

  if (id.includes("source-map")) {
    return {
      label: "Developer note",
      title: "Helpful for debugging production issues; usually not a user-facing release blocker.",
      tone: "bg-neutral-100 text-neutral-800",
    };
  }

  if (finding.score === null) {
    return {
      label: "Review",
      title: "The page-quality scan could not assign a clear score, so this needs manual review.",
      tone: "bg-neutral-100 text-neutral-800",
    };
  }

  if (finding.score < 50) {
    return {
      label: "High impact",
      title: "Likely to affect user experience or release confidence.",
      tone: "bg-red-100 text-red-950",
    };
  }

  if (finding.score < 90) {
    return {
      label: "Improve",
      title: "Worth improving before or shortly after release.",
      tone: "bg-amber-100 text-amber-950",
    };
  }

  return {
    label: "Monitor",
    title: "Low-risk item to keep an eye on.",
    tone: "bg-emerald-100 text-emerald-950",
  };
}

function friendlyLighthouseTitle(finding: LighthouseFinding) {
  const id = finding.id.toLowerCase();

  if (id.includes("largest-contentful-paint")) {
    return "Make the main content appear faster";
  }

  if (id.includes("source-map")) {
    return "Add source maps for easier debugging";
  }

  if (id.includes("unminified-javascript")) {
    return "Minify JavaScript files";
  }

  if (id.includes("unused-javascript")) {
    return "Remove JavaScript that is not needed right away";
  }

  if (id.includes("legacy-javascript")) {
    return "Stop shipping legacy JavaScript to modern browsers";
  }

  if (id.includes("network-dependency-tree")) {
    return "Shorten critical request chains";
  }

  if (id.includes("bf-cache")) {
    return "Allow faster Back and Forward navigation";
  }

  if (id.includes("render-blocking")) {
    return "Reduce files that block the first render";
  }

  return finding.title;
}

function friendlyLighthouseDescription(finding: LighthouseFinding) {
  const id = finding.id.toLowerCase();

  if (id.includes("largest-contentful-paint")) {
    return "The most important visible content appears late. Optimize the hero image, server response, fonts, or render-blocking code that delays it.";
  }

  if (id.includes("source-map")) {
    return "This is mostly for developers. Source maps make production JavaScript errors easier to trace back to the original code.";
  }

  if (id.includes("unminified-javascript")) {
    return "Some scripts are larger than they need to be. Smaller JavaScript loads and parses faster for users.";
  }

  if (id.includes("unused-javascript")) {
    return "The page downloads JavaScript that is not needed immediately. Split or defer it so the first screen becomes faster.";
  }

  if (id.includes("legacy-javascript")) {
    return "Modern browsers can use smaller JavaScript bundles. Adjust the build target so users do not download older polyfills or transforms unless they are needed.";
  }

  if (id.includes("network-dependency-tree")) {
    return "Important files wait on too many other files. Reduce chained requests or defer noncritical resources so the page starts faster.";
  }

  if (id.includes("bf-cache")) {
    return "The page cannot be restored instantly when users press Back or Forward. Fixing the blocker makes return navigation feel faster.";
  }

  return cleanLighthouseDescription(finding.description);
}

function friendlyFindingArea(finding: LighthouseFinding) {
  const id = finding.id.toLowerCase();

  if (id.includes("source-map")) {
    return "Developer diagnostics";
  }

  if (
    id.includes("paint") ||
    id.includes("javascript") ||
    id.includes("render-blocking") ||
    id.includes("cache")
  ) {
    return "Speed";
  }

  if (finding.category !== "General") {
    return finding.category;
  }

  return "Page quality";
}

function cleanLighthouseDescription(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\bLearn (more|how)[^.]*\./gi, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueFriendlyFindings(findings: LighthouseFinding[]) {
  const seen = new Set<string>();

  return findings.filter((finding) => {
    const key = friendlyLighthouseTitle(finding).toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildAiFixPrompt(result: QaAuditResult, notes: string) {
  const backlog = formatMarkdownList(
    result.assessment.issueBacklog.map(
      (item) => `${item.priority} ${item.title} (${item.area}) - Evidence: ${item.evidence}`,
    ),
    "No generated backlog items.",
  );
  const accessibility = formatMarkdownList(
    result.accessibility.violations.slice(0, 6).map((violation) => {
      const target = violation.nodes[0]?.target.join(", ") ?? "target not captured";
      return `${violation.impact.toUpperCase()} ${violation.help} - ${violation.nodeCount} affected element${
        violation.nodeCount === 1 ? "" : "s"
      }; target: ${target}`;
    }),
    "No automated accessibility issues were found.",
  );
  const pageQuality = formatMarkdownList(
    uniqueFriendlyFindings(result.lighthouse?.findings ?? []).slice(0, MAX_VISIBLE_LIGHTHOUSE_FINDINGS).map((finding) => {
      const evidence = finding.displayValue ? ` Evidence: ${finding.displayValue}.` : "";
      return `${findingImpact(finding).label}: ${friendlyLighthouseTitle(finding)} - ${friendlyLighthouseDescription(
        finding,
      )}${evidence}`;
    }),
    result.lighthouse ? "No page-quality risks were found." : "Page-quality scan was unavailable.",
  );
  const browserSignals = formatMarkdownList(
    [
      ...result.page.consoleErrors.map((issue) => `Console error: ${issue.message}`),
      ...result.page.pageErrors.map((issue) => `Page error: ${issue.message}`),
      ...result.page.failedRequests.map(
        (request) => `Failed request: ${request.method} ${request.url} - ${request.errorText}`,
      ),
    ].slice(0, 8),
    "No console errors, page errors, or failed requests were captured.",
  );
  const blockers = formatMarkdownList(result.assessment.blockers, "No release blockers were generated.");
  const quickWins = formatMarkdownList(result.assessment.quickWins, "No quick wins were generated.");

  return [
    "You are a senior product engineer and QA automation engineer. Fix this web project using the audit evidence below.",
    "",
    "Rules:",
    "- Fix root causes instead of hiding findings.",
    "- Keep the existing design language and accessibility quality.",
    "- Prefer small, reviewable changes and add/update tests for risky behavior.",
    "- After changes, run: npm run typecheck, npm run lint, npm run build, npm run test:e2e.",
    "",
    "Audit summary:",
    `- Target URL: ${result.page.finalUrl}`,
    `- Page title: ${result.page.title || "Untitled page"}`,
    `- Release decision: ${decisionStyles[result.assessment.decision].label}`,
    `- QA score: ${result.assessment.score}/100`,
    `- Risk level: ${result.assessment.riskLevel}`,
    `- Viewport: ${result.viewport}`,
    `- Context notes: ${notes.trim() || "None provided."}`,
    "",
    "Blockers:",
    blockers,
    "",
    "Quick wins:",
    quickWins,
    "",
    "Priority backlog:",
    backlog,
    "",
    "Accessibility evidence:",
    accessibility,
    "",
    "Page-quality evidence:",
    pageQuality,
    "",
    "Browser/runtime evidence:",
    browserSignals,
    "",
    "Acceptance criteria:",
    "- The release decision and QA score improve or the remaining risk is clearly justified.",
    "- All P0/P1 backlog items are fixed or converted into explicit follow-up issues.",
    "- No new serious accessibility issues are introduced.",
    "- No new mobile overflow, nested-scroll, or tooltip/focus regressions are introduced.",
  ].join("\n");
}

function formatMarkdownList(items: string[], emptyLabel: string) {
  if (items.length === 0) {
    return `- ${emptyLabel}`;
  }

  return items.map((item) => `- ${item}`).join("\n");
}
