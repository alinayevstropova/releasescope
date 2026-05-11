# Contributing to ReleaseScope

Thanks for your interest in contributing. This document covers how to set up the project, run tests, and submit a pull request.

## Setup

```bash
git clone https://github.com/alinayevstropova/releasescope.git
cd releasescope
npm install
npm run playwright:install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The audit form and demo report should work without any environment variables.

To enable AI summaries, add `OPENAI_API_KEY` to `.env.local`.

## Development commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start the Next.js dev server |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run build` | Build for production |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run test:e2e:headed` | Run Playwright tests in a visible browser |
| `npm run qa:ci` | Run the full CI check (typecheck + lint + build + e2e) |

## Branch naming

| Prefix | Use for |
|--------|---------|
| `feat/` | New features or capabilities |
| `fix/` | Bug fixes |
| `docs/` | Documentation updates |
| `chore/` | Dependency updates, tooling, config |
| `test/` | Adding or improving tests |
| `refactor/` | Code changes that do not add features or fix bugs |

Example: `feat/lighthouse-mobile-viewport`, `fix/score-calculation-edge-case`.

## Pull request checklist

Before opening a PR:

- [ ] `npm run typecheck` passes with no errors
- [ ] `npm run lint` passes with no errors
- [ ] New behaviour has a unit test or an e2e test where practical
- [ ] The demo report still works (`npm run dev` → click Run Demo)
- [ ] Commit messages are clear and describe the *why*, not just the *what*

## Project structure

```
src/
  app/            Next.js App Router (pages and API routes)
  components/     React components (audit-console.tsx is the main UI)
  lib/
    qa/           Core audit engine (audit.ts, scoring-config.ts, types.ts)
    openai/       AI summary integration
  ai/prompts/     OpenAI prompt templates
bin/              CLI entry point
tests/            Playwright e2e tests
docs/             Product documentation
```

## Reporting bugs

Open a GitHub issue with:

1. What you did
2. What you expected to happen
3. What actually happened
4. Browser / OS / Node version if relevant

## Code style

- TypeScript strict mode is enabled — no `any` escapes without a comment explaining why
- Zod schemas are the source of truth for all API shapes — derive types from schemas, not the other way around
- No comments that describe *what* code does — only add a comment when the *why* is not obvious from reading it
