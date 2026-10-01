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

Recorded **2026-10-01** from `npm run build` on this workspace (Node 26.8.2, Vite 8.3.1 / Rolldown). Hard gates remain unchanged: initial raw ≤640 KiB / gzip ≤170 KiB; all raw ≤1100 KiB / gzip ≤300 KiB; single JS gzip ≤84 KiB; CSS gzip ≤20 KiB.

| Metric | Before this fix (2026-10-01) | Current | Change |
|---|---:|---:|---:|
| Initial raw | 625,592 B | 589,855 B | -35,737 B |
| Initial gzip | 171,122 B | 158,365 B | -12,757 B |
| All assets raw | 1,099,195 B | 1,098,537 B | -658 B |
| All assets gzip | 306,082 B | 304,294 B | -1,788 B |

Recursive manual groups had pulled React, startup API services and join dialogs into `addServer.js` (18,844 B gzip), so the old logical name no longer described its contents. Explicit group priorities now reserve React for `vendor.js` (67,387 B gzip), Tauri for `tauri.js`, and statically reachable application modules for `shell.js` (74,223 B gzip). The remaining server action dialogs share the lazy `serverActions.js` (7,147 B gzip). History sections retain their lazy boundary. `cloudToken.ts` uses the already statically reachable secure-storage module directly, avoiding an ineffective dynamic import. No runtime dependency was added.

Before refreshing the chunk snapshot, the new all-asset gzip total was only 824 B above the 2026-09-14 baseline (303,470 B), within the existing 1 KiB growth limit. The snapshot was refreshed on 2026-10-01 to represent the verified new module ownership and logical names; the absolute budgets and numeric growth limits were not increased.

`npm run check:performance` now fails when initial or total gzip grows by more than 1 KiB, or an individual chunk grows by more than 5 KiB. Unknown or removed logical assets, duplicate logical names, malformed thresholds and inconsistent baseline totals also fail. Content hashes are ignored when matching assets. `npm run build` already invokes this check, so `scripts/desktop-check.sh` and the Desktop Check workflow enforce it without a second build.

For an intentional, reviewed change to the chunk layout or bundle size:

```bash
cd desktop
npm exec vite build
node scripts/check-performance.mjs --print-baseline > performance-baseline.next.json
# Review the measurements, module ownership and diff, then replace the snapshot.
mv performance-baseline.next.json performance-baseline.json
npm run check:performance
```

Printing the snapshot preserves the configured growth limits, checks all absolute budgets and does not edit the existing baseline. Use a separate output file because the checker reads the current baseline. Baseline changes must accompany the reason and before/after measurements; do not refresh it just to hide a regression. CLI fixture tests in `scripts/check-performance.test.mjs` cover threshold boundaries, offsetting chunk changes, asset renames and all six absolute budgets, including snapshot generation.

Windows native timings, 8-hour stability, and four-platform CI packages are still pending on the acceptance machine. A local ad-hoc macOS ARM DMG (5.0 MiB, not notarized) was produced on 2026-09-14. Host default `rustc` remains 1.97.0. Named-toolchain `cargo +1.89.0` (the former MSRV) and `cargo +1.98.1` check/test both passed locally; Tauri 2.12 raises the current project floor to Rust 1.90, enforced by `.github/workflows/desktop-check.yml`.
