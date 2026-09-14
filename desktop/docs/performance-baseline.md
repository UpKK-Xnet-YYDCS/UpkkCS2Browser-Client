# Desktop performance baseline

Baseline date: 2026-08-23. Measurements use the same local Node 26 production-build environment.
Timing remains informational; deterministic render boundaries and bundle budgets are the merge gates.
Program evidence and remaining Windows/packaging gaps: [`performance-report.md`](./performance-report.md).

Primary runtime acceptance is Windows (fixed device, OS, WebView2, power mode, 1280×800 window). macOS and Linux remain compatibility targets. Release builds are used for timing; React Performance Tracks stay in development/profiling builds only.

## Measurement protocol

Windows reports use WebView2 DevTools plus WPR/WPA, covering the render process, host, GPU, and other child processes. Repeat startup and interaction groups at least 30 times and report median plus p95. First launch after reboot is recorded separately. Long-running checks cover 30 minutes (fast) and 8 hours (stability). Fixtures stay local; notification, webhook, and Steam join order is recorded by test doubles. Raw traces keep environment and git revision, never account data or credentials.

On the Windows acceptance machine:

```bash
cd desktop
npm run windows:acceptance
# record 30 samples per timed scene into desktop/.acceptance/windows-acceptance-results.json
npm run windows:acceptance -- --verify desktop/.acceptance/windows-acceptance-results.json
```

| Scene | Fixed fixture | Metrics |
|---|---|---|
| Startup | New test profile, existing config, signed-in session, auto-monitor on | Process start → first visible frame → home interactive → first data |
| List | Default and maximum legal page size; card/list; search, filter, paging | Interaction-to-paint, React commit, long tasks, allocations |
| Favorites and latency | 100 / 1,000 / 5,000 favorites; single and burst A2S updates (`src/services/performanceFixtures.ts`) | Projection time, render scope, IPC count, queue length |
| Network | Normal, slow, reordered, failed, API URL and account switch | Request count, cancel rate, cache hits, stale writes |
| AI | 15 turns; 200 / 2,000 chunks; long mixed Markdown | Main-thread time, render count, scroll work, token estimate cost |
| Background | Idle, monitor, auto-join, open/close detail and forum windows | CPU, RSS, JS heap, handles, listeners, queue depth |
| Build | Clean and incremental builds on the same toolchain | raw/gzip, module mix, build time, installer size |

Windows native timings, 8-hour stability, and installer size are still pending on the acceptance machine.

## High-frequency render scenarios

### AI streaming

- Fixture: 15 conversation turns and 200 SSE message chunks applied to the final assistant message.
- Before: every chunk executed all 30 visible message row bodies, including 29 unchanged historical rows.
- After: historical message references remain stable across all 200 updates and `AIMessageRow` uses React's
  default `memo` comparison. Only the active assistant row changes; Markdown configuration and the
  thinking-toggle callback are stable.
- Consecutive `message` / `thinking` SSE events now flush on one animation frame (with a timeout fallback when
  the window is hidden). Token estimates walk fragments incrementally and match full-string scans, including
  emoji split across UTF-16 surrogates. `thinkingOpen` does not rewrite session storage.
- Automated evidence: `src/services/aiChatPresentation.test.ts`, `src/services/aiChatStream.test.ts`,
  `src/utils/aiTokens.test.ts`, `src/services/aiChatSessions.test.ts`.

### Monitor countdown

- Fixture: 30 one-second countdown ticks while the monitor page is otherwise idle.
- Before: countdown lived in the full monitor runtime Context, so every tick invalidated `useMonitorPage` and
  the complete page subtree.
- After: countdown has a dedicated Context. Only the next-check statistic and floating-button badge subscribe
  to the 1 Hz value; monitor rules, matched servers, settings, and notification controls use the stable runtime
  Context.

### Server list latency projection

- Fixture: 100 servers with one latency snapshot changed.
- Before: the derived list rebuilt all 100 entity objects.
- After: the other 99 entity references stay stable, and latency-filter membership that cannot change is reused.
- Automated evidence: `src/services/latencyDisplay.test.ts`.

## Production bundle

Recorded **2026-09-14** from `npm run build` on this workspace (Vite 8.3.0 / Rolldown). Hard gates passed: initial raw ≤640 KiB / gzip ≤170 KiB; all raw ≤1100 KiB / gzip ≤300 KiB; single JS gzip ≤84 KiB; CSS gzip ≤20 KiB.

| Metric | 2026-08-23 | Current | Change |
|---|---:|---:|---:|
| Initial raw | 592,810 B | 615,862 B | +23,052 B |
| Initial gzip | 153,847 B | 168,420 B | +14,573 B |
| All assets raw | 1,094,448 B | 1,088,182 B | -6,266 B |
| All assets gzip | 304,131 B | 303,470 B | -661 B |
| Warm Vite build | 413 ms | ~730 ms | informational |
| macOS ARM DMG (local, ad-hoc) | — | 5.0 MiB | informational |

`vendor.js` gzip is 64,007 B. Versus the 2026-08-23 named-chunk snapshot that is about +5.2 KiB, attributed to React 19.3, not a hard-gate failure. `desktop/performance-baseline.json` was refreshed on 2026-09-14 after this passing production build so future growth warnings compare against the current chunk set (`boot.js`, `joinUi.js`, merged `vendor.js`, and so on). Splitting chunks is not counted as a total-size reduction; all-asset gzip is under 300 KiB.

`npm run check:performance` keeps the existing hard budgets and emits CI warnings when total gzip grows by
more than 1 KiB or an existing chunk grows by more than 5 KiB.

Windows native timings, 8-hour stability, and four-platform CI packages are still pending on the acceptance machine. A local ad-hoc macOS ARM DMG (5.0 MiB, not notarized) was produced on 2026-09-14. Host default `rustc` remains 1.97.0. Named-toolchain `cargo +1.89.0` (MSRV) and `cargo +1.98.1` check/test both passed locally; CI `dtolnay/rust-toolchain@1.89.0` remains the authoritative MSRV gate.
