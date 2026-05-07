# AI QA Copilot

ReleaseScope's AI QA copilot turns audit evidence into a structured release handoff for developers, QA, support, and product.

The copilot does not decide release safety by itself. The core audit engine still produces the release decision, score, evidence, and backlog. The AI layer translates that evidence into plain-language operational artifacts.

## Output Contract

The copilot report contains:

- Plain-language release summary.
- Issue descriptions with expected behavior, actual behavior, evidence, and suggested fix.
- Edge cases based on the audited page and detected risk signals.
- Regression checklist for verification.
- Support handoff note.
- Release notes with known risks and safe-to-ship points.

The TypeScript contract is `AiCopilotReport` in `src/lib/qa/types.ts`. The Zod schema is `aiCopilotReportSchema` in `src/lib/qa/schemas.ts`.

## Prompt Templates

Prompt construction lives in `src/ai/prompts/release-copilot.ts`.

The prompt gives the model a compact audit payload and requires JSON output only. The instructions explicitly tell the model to use only audit evidence and avoid inventing facts.

## Parsing And Fallback

Parsing lives in `src/lib/openai/copilot-report.ts`.

The parser accepts raw JSON or JSON wrapped in a Markdown code fence, then validates the result with Zod. If OpenAI is unavailable, the response is malformed, or `OPENAI_API_KEY` is missing, ReleaseScope builds a deterministic fallback report from the audit evidence.

This means the UI can still show a useful AI-copilot-style handoff without requiring a live API key during local demos, tests, or portfolio walkthroughs.

## Testing

Vitest covers:

- Mocked model JSON parsing.
- Rejection of malformed model output.
- Fallback report generation from demo audit evidence.

Playwright covers:

- Rendering structured fallback sections in the UI.
