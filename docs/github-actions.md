# ReleaseScope in GitHub Actions

ReleaseScope can run as a PR release gate against a preview or staging URL. The workflow should install browser dependencies, run the CLI, upload artifacts, and optionally post the generated `pr-comment.md` back to the pull request.

## Minimal PR Audit

```yaml
name: ReleaseScope Audit

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npx playwright install --with-deps chromium

      - name: Run ReleaseScope
        id: releasescope
        continue-on-error: true
        run: |
          node bin/release-scope.mjs audit "${{ vars.RELEASESCOPE_TARGET_URL }}" \
            --json \
            --output releasescope-artifacts/audit.json \
            --artifact-dir releasescope-artifacts \
            --fail-on review

      - name: Upload ReleaseScope artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: releasescope-audit-artifacts
          path: releasescope-artifacts/
          if-no-files-found: error
          retention-days: 14

      - name: Comment ReleaseScope risk
        if: always() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('node:fs');
            const body = fs.readFileSync('releasescope-artifacts/pr-comment.md', 'utf8');
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body,
            });

      - name: Enforce ReleaseScope gate
        if: steps.releasescope.outcome == 'failure'
        run: exit 1
```

The committed example workflow lives at `.github/workflows/release-scope-audit.example.yml`. It is manual-only by default so it does not start running on every PR until the target URL strategy is ready.

## Target URL Strategy

Use one of these approaches:

- Store a stable staging URL in `vars.RELEASESCOPE_TARGET_URL`.
- Pass a deployment preview URL from your hosting provider after the preview deployment step.
- Run the Next.js app inside the workflow and audit `http://127.0.0.1:3000` with `ALLOW_PRIVATE_AUDIT_TARGETS=true` for trusted CI only.

## PR Comment Template

The CLI writes `releasescope-artifacts/pr-comment.md` on every artifact run. The comment includes:

- Release decision and score
- Risk level
- Top backlog items
- Runtime, accessibility, and Lighthouse evidence
- Suggested merge gate
- Artifact inventory for reviewers

A static placeholder template is also available at `docs/templates/pr-comment.md`.

## Artifact Review

Upload the whole `releasescope-artifacts/` directory. Reviewers can inspect:

- `report.md` for the readable audit
- `audit.json` for CI parsing or dashboards
- `screenshots/page-full.png` for visual context
- `traces/playwright-trace.zip` in Playwright Trace Viewer
- `lighthouse/lighthouse-report.json` for raw Lighthouse evidence
- `axe/axe-report.json` for raw accessibility evidence

## AI Summary

The CLI includes the AI QA copilot by default. If the workflow does not set `OPENAI_API_KEY`, ReleaseScope still completes and writes a deterministic fallback report. Use `--no-ai` when the CI job should avoid any AI dependency.
