# ReleaseScope Product Vision

ReleaseScope is an AI-assisted release-readiness platform for web teams that need a clear answer before shipping: whether a release is ready, what is risky, what evidence exists, and what should happen next.

The product starts as a focused web audit console and grows toward a release command center for developers, QA engineers, support engineers, and small SaaS teams. It combines browser automation, accessibility checks, Lighthouse scoring, practical AI summaries, and issue-ready evidence into one workflow.

## Product Goal

ReleaseScope should help teams move from scattered pre-release checks to a repeatable quality gate. A user should be able to audit a URL, understand the release decision, copy a repair brief, and share evidence with the people responsible for fixing or approving the release.

The long-term goal is not just to show scores. The goal is to turn release risk into a clear operating system for small product teams:

- What can ship now?
- What needs review?
- What is blocked?
- Which findings have the strongest evidence?
- What should QA, developers, and support do next?

## Target Users

ReleaseScope is designed for people who participate in release quality but do not always share the same tools or vocabulary.

- Front-end developers who need fast feedback on page quality, accessibility, and regressions before opening or merging a pull request.
- QA engineers who need evidence-rich findings, reproduction notes, regression checklists, and a repeatable audit process.
- Support engineers who need plain-language release notes, known risks, and customer-facing handoff notes.
- Product owners and small SaaS teams that need a practical release confidence signal without building a large internal QA platform.
- Irish and EU teams that care about accessibility, privacy signals, documentation quality, and launch readiness.

## Core Product Scope

The current product scope centers on one reliable workflow: inspect a web page, generate a release decision, and explain the next actions.

ReleaseScope should provide:

- URL auditing with Playwright-driven browser checks.
- Accessibility checks using axe-core and WCAG-oriented messaging.
- Lighthouse-backed page quality scoring.
- Runtime and content checks that surface broken or risky user experiences.
- A weighted release decision: `ready`, `needs review`, or `blocked`.
- Plain-language findings with evidence, priority, and suggested fixes.
- AI-assisted summaries and repair briefs when an API key is configured.
- A responsive dashboard that works as a portfolio-quality product surface.

## Future Product Direction

ReleaseScope should grow in small, visible increments. Each addition should make the product more useful as a real engineering tool and stronger as a portfolio signal.

Near-term direction:

- Split the audit engine into typed modules for runtime, accessibility, Lighthouse, content, and security basics.
- Add stable finding models, severity levels, evidence objects, and score explanations.
- Add fixtures and tests for release decision logic.
- Improve documentation with architecture, roadmap, setup, screenshots, and case-study sections.

Mid-term direction:

- Add a CLI for local and CI use, starting with `releasescope audit <url>`.
- Add JSON and Markdown report output for automation.
- Add GitHub Action examples and PR comment templates.
- Add artifacts such as screenshots, traces, Lighthouse JSON, and axe reports.

Long-term direction:

- Add a cloud dashboard for projects, releases, audit history, findings, trends, and ownership.
- Add EU-focused release packs for accessibility, cookie banners, privacy links, security headers, and GDPR launch-readiness signals.
- Add AI-generated release notes, support handoff notes, regression checklists, and edge-case suggestions.
- Explore a browser extension companion that can send inspected findings into ReleaseScope.

## Non-Goals

ReleaseScope should stay focused on release readiness. It should avoid becoming a vague website grader or a generic AI dashboard.

The product is not intended to:

- Replace human QA judgment or accessibility audits.
- Guarantee legal compliance for GDPR, WCAG, or security requirements.
- Crawl entire products without a clear release target.
- Store sensitive customer data by default.
- Depend on AI for the core release decision.
- Hide raw evidence behind only a summary score.

## Product Principles

ReleaseScope should feel practical, credible, and evidence-first.

- Evidence before opinion: every important finding should explain what was observed and why it matters.
- Plain language without dumbing down: non-specialists should understand the risk, while engineers still get enough detail to act.
- Small shippable increments: each roadmap task should leave the project runnable and easier to extend.
- Automation-friendly by design: reports should be useful in CI, PRs, docs, and local workflows.
- Accessibility and EU readiness as product strengths, not late-stage polish.

## Success Signals

The product is moving in the right direction when a reviewer can quickly see that ReleaseScope is not a static demo. The repository should show a disciplined product trajectory: typed models, tests, CI, documentation, roadmap issues, clear UX states, and a believable path from local audit console to release-readiness platform.

For users, success means they can answer "Can we ship?" with a decision, supporting evidence, and a next-action list.
