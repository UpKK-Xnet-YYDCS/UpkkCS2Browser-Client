# Desktop performance baseline

Baseline date: 2026-08-23. Measurements use the same local Node 26 production-build environment.
Timing remains informational; deterministic render boundaries and bundle budgets are the merge gates.

## High-frequency render scenarios

### AI streaming

- Fixture: 15 conversation turns and 200 SSE message chunks applied to the final assistant message.
- Before: every chunk executed all 30 visible message row bodies, including 29 unchanged historical rows.
- After: historical message references remain stable across all 200 updates and `AIMessageRow` uses React's
  default `memo` comparison. Only the active assistant row changes; Markdown configuration and the
  thinking-toggle callback are stable.
- Automated evidence: `src/services/aiChatPresentation.test.ts` asserts reference stability for the full fixture.

### Monitor countdown

- Fixture: 30 one-second countdown ticks while the monitor page is otherwise idle.
- Before: countdown lived in the full monitor runtime Context, so every tick invalidated `useMonitorPage` and
  the complete page subtree.
- After: countdown has a dedicated Context. Only the next-check statistic and floating-button badge subscribe
  to the 1 Hz value; monitor rules, matched servers, settings, and notification controls use the stable runtime
  Context.

## Production bundle

| Metric | Before | Current | Change |
|---|---:|---:|---:|
| Initial raw | 592,810 B | 588,147 B | -4,663 B |
| Initial gzip | 153,847 B | 151,906 B | -1,941 B |
| All assets raw | 1,094,448 B | 1,094,465 B | +17 B |
| All assets gzip | 304,131 B | 304,141 B | +10 B |
| Warm Vite build | 413 ms | 455–545 ms | informational |

`performance-baseline.json` records every emitted JavaScript/CSS asset by stable logical name.
`npm run check:performance` keeps the existing hard budgets and emits CI warnings when total gzip grows by
more than 1 KiB or an existing chunk grows by more than 5 KiB.
