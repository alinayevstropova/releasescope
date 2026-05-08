## ReleaseScope Release Risk

Decision: **{{decision}}**
Risk level: **{{riskLevel}}**
Score: **{{score}}/100**

{{headline}}

### Top Risks

{{topRisks}}

### Evidence

- Accessibility violations: {{accessibilityViolationCount}}
- Failed requests: {{failedRequestCount}}
- Console errors: {{consoleErrorCount}}
- Lighthouse: {{lighthouseScores}}

### Suggested Gate

{{releaseGate}}

CI artifacts should include `audit.json`, `report.md`, `pr-comment.md`, browser screenshots, Playwright traces, Lighthouse JSON, and axe JSON.
