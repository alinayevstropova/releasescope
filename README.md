# ReleaseScope

ReleaseScope is an AI release-readiness platform for web teams. It opens a target URL with Playwright, checks accessibility with axe-core, scores page quality with Lighthouse, and turns the evidence into a release decision, QA score, and issue-ready backlog.

The long-term product direction is a scalable release command center for developers, QA engineers, support engineers, and small SaaS teams: CI checks, GitHub PR comments, public audit reports, AI repair briefs, release notes, and EU-focused accessibility/compliance packs.

## Live Demo

**[releasescope.vercel.app](https://releasescope.vercel.app)** — click **Run Demo** to see a full sample audit report without any external network calls.

> Live audits (real Playwright/Chromium runs) require a self-hosted Node.js environment. See [Getting Started](#getting-started) below.

---

## What I Built

I designed and built an end-to-end QA automation platform: a Next.js web app, a Node CLI, and a GitHub Actions pipeline that together answer one question — *can this release ship?*

The core engine opens a target URL in a headless Chromium browser, runs three parallel analysis layers (axe-core for accessibility, Lighthouse for performance/SEO/best-practices, and a custom content/security checker), then aggregates the evidence into a weighted QA score and a prioritised issue backlog. The score is transparent: every penalty has an ID, a label, and an evidence trail the developer can follow.

On top of the audit engine sits an OpenAI integration that generates plain-language issue descriptions, edge-case checklists, regression plans, support handoff notes, and release notes — all from the same structured audit result. The AI layer degrades gracefully: if the API key is missing or the model call fails, the audit still produces a full report with a deterministic fallback.

The product is designed to feel like a real QA command center: clear empty states, loading feedback, responsive report layouts, plain-language findings, and a custom Release Signal visual in the header.

## What I Learned

**Playwright in CI and serverless environments** — getting headless Chromium to run reliably across macOS, Linux CI runners, and Docker was the hardest operational problem. Each environment needs specific browser flags and the install step must happen before tests run. I wrote a wrapper that detects the environment, applies the right flags, and surfaces clean error messages when the browser is not available rather than crashing with an opaque stack trace.

**Lighthouse headless mode** — Lighthouse expects to run against a live server and launches its own Chrome instance separately from Playwright. I had to coordinate two browser processes (one for Playwright, one for Lighthouse), share the same page URL, sequence the runs so Lighthouse fires after Playwright finishes, and merge the results into a single typed report. Chrome-launcher configuration and port management were not intuitive.

**Designing a transparent scoring model** — early versions just returned a number. Users could not tell why a score changed. I redesigned the model so every deduction is an explicit ScoreContribution object: id, label, category, severity, penalty, detail, and an evidence array. The UI renders the full breakdown in a collapsible panel. This made the model debuggable and the product trustworthy.

**AI prompt engineering for structured output** — the OpenAI integration uses the Responses API with a strict JSON schema. Getting the model to reliably produce P0/P1/P2/P3 priorities, match issue titles to actual audit findings, and stay within a token budget required iterating on the prompt structure, adding few-shot examples, and writing a Zod parser that catches malformed responses before they reach the UI.

**TypeScript strictness as a design tool** — strict TypeScript with Zod schemas at the API boundary caught integration bugs before they reached the browser. The schema-first approach (define the shape in Zod, derive the TypeScript type) meant I could change the audit data model and let the compiler guide every downstream fix.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Client (Next.js App Router)                            │
│  AuditConsole component → POST /api/audits              │
└───────────────────┬─────────────────────────────────────┘
                    │ JSON request (url, viewport, demoMode…)
┌───────────────────▼─────────────────────────────────────┐
│  API Route  /api/audits/route.ts  (Node.js runtime)     │
│  Validates with Zod → calls runQaAudit()                │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────▼────────────┐
        │   QA Engine            │
        │   src/lib/qa/audit.ts  │
        │                        │
        │  ┌──────────────────┐  │
        │  │ Playwright       │  │  ← launches Chromium
        │  │ • page load      │  │
        │  │ • content checks │  │
        │  │ • axe-core a11y  │  │
        │  │ • security hdrs  │  │
        │  └──────────────────┘  │
        │  ┌──────────────────┐  │
        │  │ Lighthouse       │  │  ← separate Chrome instance
        │  │ • performance    │  │
        │  │ • best practices │  │
        │  │ • SEO / a11y     │  │
        │  └──────────────────┘  │
        │  ┌──────────────────┐  │
        │  │ Assessment       │  │
        │  │ • weighted score │  │
        │  │ • decision logic │  │
        │  │ • backlog build  │  │
        │  └──────────────────┘  │
        └───────────┬────────────┘
                    │ QaAuditResult (typed, Zod-validated)
        ┌───────────▼────────────┐
        │  AI Layer (optional)   │
        │  src/lib/openai/       │
        │  OpenAI Responses API  │
        │  • issue descriptions  │
        │  • regression plan     │
        │  • support handoff     │
        │  • release notes       │
        └───────────┬────────────┘
                    │ full report JSON
┌───────────────────▼─────────────────────────────────────┐
│  Client renders: decision chip, QA score breakdown,     │
│  backlog, Lighthouse findings, AI copilot panel         │
└─────────────────────────────────────────────────────────┘

CLI path:  bin/release-scope.mjs → src/cli/ → same QA Engine
CI path:   .github/workflows/    → npm run qa:ci → Playwright
```

---

## Product Docs

- [Product vision](docs/product-vision.md)
- [Architecture](docs/architecture.md)
- [AI QA copilot](docs/ai-copilot.md)
- [CLI](docs/cli.md)
- [GitHub Actions](docs/github-actions.md)

## Screenshots

![ReleaseScope empty dashboard](public/screenshots/dashboard-empty.png)

Empty state with the audit form, release map, and clear explanation of how evidence becomes a release decision.

![ReleaseScope audit report](public/screenshots/dashboard-report.png)

Generated audit report with release decision, QA score, issue-ready backlog, page-quality fixes, and AI handoff prompt.

## Getting Started

```bash
npm install
npm run playwright:install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Set `OPENAI_API_KEY` in `.env.local` to enable the AI summary panel. Without it, the audit still runs and marks the AI summary as skipped.

Set `ALLOW_PRIVATE_AUDIT_TARGETS=true` only in trusted local or staging environments when auditing `localhost` or private URLs.

## What It Does

- Produces a release decision: `ready`, `needs review`, or `blocked`
- Calculates a weighted QA score from runtime, accessibility, Lighthouse, and content signals
- Runs a deterministic demo report for portfolio reviews without relying on external network calls
- Builds an issue-ready backlog with priorities and evidence
- Translates technical Lighthouse checks into plain-language page-quality fixes
- Copies an AI-ready repair brief for coding agents, including evidence and verification commands
- Shows polished empty, loading, success, warning, and error states
- Supports desktop and mobile viewport audits
- Optionally generates an OpenAI QA summary when `OPENAI_API_KEY` is configured
- Runs from the command line and writes CI-ready JSON, Markdown reports, PR comments, screenshots, traces, Lighthouse JSON, and axe reports

## Why It Matters For Teams

ReleaseScope gives product and engineering teams a shared release signal before a change reaches users. Developers get reproducible evidence, QA gets prioritised checks, support gets handoff notes, and product owners get a clear answer: can this release ship now, or does it need review?

## Product Roadmap

- **ReleaseScope Cloud**: project dashboard, release history, team ownership, trend charts, and shareable audit reports
- **ReleaseScope CLI**: `node bin/release-scope.mjs audit https://example.com` for local and CI usage
- **ReleaseScope GitHub Action**: audit preview deployments and comment release risk on pull requests
- **ReleaseScope Browser Extension**: connect manual page inspection with the cloud dashboard
- **AI QA Copilot**: generate edge cases, regression plans, issue descriptions, support handoff notes, and release notes
- **EU Compliance Packs**: WCAG, GDPR/cookie checks, security headers, privacy-policy checks, and SaaS launch readiness

## Automation QA Coverage

Playwright covers the main user-facing paths:

- Product smoke check and axe-core accessibility scan
- Browser-native URL validation before the API is called
- Loading state while an audit is running
- Release decision, backlog, tooltips, and page-quality findings with mocked API data
- AI repair brief copy flow with clipboard verification
- Mobile regression check for the page-quality list
- Visible error state for API failures
- API validation for malformed requests and invalid JSON

CI runs `npm audit --omit=dev`, typecheck, lint, production build, and Playwright tests on desktop and mobile Chromium. Failed runs keep the Playwright HTML report, traces, screenshots, and videos as GitHub Actions artifacts.

## CLI and CI

```bash
node bin/release-scope.mjs audit https://example.com \
  --json \
  --output releasescope-artifacts/audit.json \
  --artifact-dir releasescope-artifacts \
  --fail-on review
```

See [CLI](docs/cli.md) and [GitHub Actions](docs/github-actions.md) for full usage.

## Stack

- Next.js App Router + TypeScript
- Playwright browser automation
- axe-core accessibility checks
- Lighthouse performance, accessibility, best practices, and SEO scoring
- OpenAI Responses API for QA summaries
- GitHub Actions CI/CD validation

## Scripts

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm run qa:ci
```
