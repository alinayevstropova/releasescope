# ReleaseScope CLI

ReleaseScope CLI runs the same audit engine used by the web app from a terminal or CI job. It is designed for preview deployments, staging URLs, and release gates that need machine-readable evidence plus a human-friendly report.

## Command Design

```bash
node bin/release-scope.mjs audit <url> [options]
```

The `audit` command opens the target URL with Playwright, captures runtime signals, runs axe-core and Lighthouse, calculates the ReleaseScope decision, and writes optional CI artifacts.

## Common Commands

Create a Markdown report in the terminal:

```bash
node bin/release-scope.mjs audit https://example.com
```

Write a CI JSON report and fail the job when the release needs review:

```bash
node bin/release-scope.mjs audit https://example.com \
  --json \
  --output releasescope-artifacts/audit.json \
  --artifact-dir releasescope-artifacts \
  --fail-on review
```

Create a Markdown file and keep the process exit code green:

```bash
node bin/release-scope.mjs audit https://example.com \
  --format markdown \
  --output releasescope-artifacts/report.md \
  --artifact-dir releasescope-artifacts \
  --fail-on never
```

Run a deterministic demo audit for docs, tests, or screenshots:

```bash
node bin/release-scope.mjs audit https://example.com --demo --no-ai
```

When using `npm run`, pass a second `--` before ReleaseScope options so npm does not parse them:

```bash
npm run cli -- audit https://example.com -- --json --artifact-dir releasescope-artifacts
```

## Options

| Option | Description |
| --- | --- |
| `--viewport <desktop\|mobile>` | Chooses the Playwright and Lighthouse viewport. Defaults to `desktop`. |
| `--format <markdown\|json>` | Selects stdout or file output format. Defaults to `markdown`. |
| `--json` | Shortcut for `--format json`. |
| `--markdown` | Shortcut for `--format markdown`. |
| `--output <path>` | Writes the selected output to a file instead of stdout. |
| `--artifact-dir <path>` | Writes CI artifacts into the given directory. |
| `--include-ai` | Adds the AI QA copilot summary. This is the default. |
| `--no-ai` | Skips the AI QA copilot summary. |
| `--notes <text>` | Sends extra release context to the AI QA copilot. |
| `--demo` | Uses deterministic fixture data instead of launching a browser. |
| `--fail-on <blocked\|review\|never>` | Controls the process exit code. Defaults to `blocked`. |

## JSON Output

JSON output uses a stable envelope for CI consumers:

```json
{
  "schemaVersion": "releasescope.audit.v1",
  "generatedAt": "2026-05-01T12:00:00.000Z",
  "summary": {
    "auditId": "audit_sample",
    "url": "https://example.com/",
    "decision": "review",
    "riskLevel": "medium",
    "score": 76
  },
  "result": {}
}
```

The full `result` object matches the web audit API response, including page signals, accessibility findings, Lighthouse scores, security checks, score explanations, warnings, and the optional AI summary.

## Markdown Output

Markdown output is intended for humans. It includes:

- Release decision, risk level, and score
- Blockers and decision reasons
- Lighthouse score table
- Runtime and accessibility signals
- Issue-ready backlog
- Quick wins
- AI copilot summary when enabled
- Artifact inventory when `--artifact-dir` is used

## Artifacts

`--artifact-dir releasescope-artifacts` writes:

- `audit.json` - CI-friendly JSON report
- `report.md` - Human-readable Markdown report
- `pr-comment.md` - Pull request comment body
- `artifacts-manifest.json` - Machine-readable artifact inventory
- `screenshots/page-full.png` - Full-page screenshot from live audits
- `traces/playwright-trace.zip` - Playwright trace from live audits
- `lighthouse/lighthouse-report.json` - Raw Lighthouse JSON from live audits
- `lighthouse/lighthouse-summary.json` - Normalized Lighthouse summary
- `axe/axe-report.json` - Raw axe-core JSON from live audits
- `axe/axe-summary.json` - Normalized axe summary

Demo mode does not launch a browser, so it writes summaries and README notes instead of raw screenshot, trace, Lighthouse, and axe artifacts.

## Exit Codes

| Policy | Behavior |
| --- | --- |
| `--fail-on blocked` | Exit `2` only when ReleaseScope returns `blocked`. |
| `--fail-on review` | Exit `2` when ReleaseScope returns `review` or `blocked`. |
| `--fail-on never` | Always exit `0` unless the CLI itself fails. |
