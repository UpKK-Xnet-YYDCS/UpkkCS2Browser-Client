# Desktop performance program report

Recorded **2026-09-14**. Git base `763e9132` plus the uncommitted desktop working tree. Host: `aarch64-apple-darwin`, default `rustc 1.97.0`. This report is the program deliverable for evidence collected on this machine. It does **not** mark the program complete.

Primary acceptance remains Windows (fixed device, WebView2, 1280×800, release build, 30× median/p95, WPR/WPA, 30 min / 8 h). That evidence is still missing.

## Status

| Gate | Evidence | Result |
|---|---|---|
| Architecture | `npm run check:architecture` | Pass: 369 production files, 0 ratchets. Locale cap 800; packed `locales/*.ts` are 1 line each, `keys.ts` 512. No new exemptions. |
| Contracts | `npm run check:contracts` | Pass: 24 IPC commands, 2 events, 21 API sites. |
| Frontend tests | `npm test` | Pass: **328** Node tests. |
| Production bundle | `npm run check:performance` (frontend embedded in the Mac ARM dmg) | Pass. Initial raw 615,862 B / gzip 168,420 B. All raw 1,088,182 B / gzip 303,470 B. Largest JS gzip 66,743 B. CSS gzip 15,921 B. |
| `scripts/desktop-check.sh` | 2026-09-14 local run | Pass, including `npm audit --omit=dev --audit-level=high` (0) and clippy `-D warnings`. |
| MSRV 1.89.0 | `cargo +1.89.0 check --locked && cargo +1.89.0 test --locked` | Pass, 17 Rust tests. `rust-version` still `"1.89.0"`. |
| Rust 1.98.1 | named toolchain, default unchanged | Pass, 17 Rust tests. Host default remains 1.97.0. |
| `cargo audit` | local | Exit 0; 7 allowed warnings (`proc-macro-error` / `unic-*` unmaintained; `glib` 0.18.5 `RUSTSEC-2024-0429`). |
| Local Mac ARM package | `CI=true APPLE_SIGNING_IDENTITY=- npm run tauri:build` | Pass. Ad-hoc signed, not notarized. DMG 5.0 MiB (`Upkk Server Browser_1.7.0_aarch64.dmg`). |
| Local Mac Intel package | `tauri build --target x86_64-apple-darwin` | Pass. Ad-hoc signed, not notarized. DMG 5.4 MiB (`Upkk Server Browser_1.7.0_x64.dmg`). Release binary 11 MiB. |
| Four-platform packages | `.github/workflows/desktop-build.yml` | Windows and Linux not built on this host. CI would package the remote tree, not this unpushed work. |
| Windows native 30× / 8 h | release + WebView2 + WPR/WPA | Missing. This host is macOS ARM. |
| −20% main-thread / p95 vs Windows baseline | same-device 30× | Not measured. Deterministic identity/cancel/cap tests are not a substitute. |

Business timing was treated as an invariant: sorting, filters, refresh, monitor rules, notification order, auto-join order, API/IPC/persistence keys and formats were not redesigned. Where those paths were touched, tests assert the previous order or payload.

## Toolchain (P1)

Keep React 19.3.0, Vite 8.3.0, Tailwind 4.3.3, Tauri 2.11.x, Tokio 1.53.1. TypeScript 7 compiles; TypeScript 6 remains the ESLint parser alias. React Compiler is off. `build.target: 'esnext'` is unchanged; OS/WebView floors are not raised. Details: [`toolchain-inventory.md`](./toolchain-inventory.md).

No production runtime dependency was added. `lucide-react` was replaced by `src/components/lucideIcons.tsx`.

## Bundle (P0)

| Metric | 2026-08-23 | 2026-09-14 | Budget |
|---|---:|---:|---|
| Initial raw | 592,810 B | 615,862 B | ≤655,360 B |
| Initial gzip | 153,847 B | 168,420 B | ≤174,080 B |
| All raw | 1,094,448 B | 1,088,182 B | ≤1,126,400 B |
| All gzip | 304,131 B | 303,470 B | ≤307,200 B |

`vendor.js` gzip is 64,008 B versus the August named-chunk snapshot (+5,165 B, React 19.3). That was a growth *warning*, not a budget failure. Chunk splits are not counted as total-size reduction. [`performance-baseline.json`](../performance-baseline.json) was refreshed after the passing 2026-09-14 production build so later warnings track the current logical names (`boot.js`, `joinUi.js`, merged `vendor.js`, and so on). Protocol: [`performance-baseline.md`](./performance-baseline.md).

Compatible re-exports: `src/api/index.ts` (no second client, no `@/store/log`), `src/store/log.ts` → `operationLog`, packed locale values + `locales/keys.ts`. Five languages still load synchronously and share the same key set (`src/i18n/translations.test.ts`).

## Hot paths (P2–P6)

### P2 list identity

`reconcileServerEntities` and `createStableLatencyProjector` keep object identity when data is unchanged. Fixtures: `src/services/performanceFixtures.ts` at 100 / 1,000 / 5,000. One latency change among N servers keeps the other N−1 entity refs. Identical page payloads keep the previous `servers` array (`appState.test.ts`). Reorder reuses entities; empty pages drop the previous array without changing totals incorrectly.

Latency snapshots live in `createLatencySnapshotStore`, not page-level React state. Home and Favorites project from the store; `listenForProjectionChange` skips snapshots that cannot change the visible filtered set, so a hidden-row RTT update does not rebuild the list. Hidden windows defer store notifications until `visibilitychange`.

### P3 HTTP

Request start snapshots URL + token generation + cache key. `setCacheIfCurrent` refuses stale writes after API URL or account token change. Shared GET (`clientInflight.ts`) keeps the transport alive until every consumer cancels. Cancel is not retried. Prefetch pages are computed as numbers (`collectPrefetchPageNumbers`); a new sequence aborts the previous controller; pages are still fetched one-by-one with the existing delay. `getAllFavorites` merges duplicate in-flight reads.

### P4 A2S

Process-wide `Semaphore` limit **6**. Permit is acquired before `spawn_blocking` and held in the blocking task. Batch uses a bounded worker set. `latency_ms` is UDP time; `queue_wait_ms` is optional wait-for-permit. Frontend scheduler: `cancelListener` / `cancelPending` / `release`; `mode: 'realtime'` skips TTL display cache. In-flight UDP is not aborted (Tokio `spawn_blocking` cannot). File/credential I/O stays on separate blocking work.

### P5 AI

`createAIChatStreamCoalescer` merges adjacent text, flushes on control events, uses rAF plus a timeout when the window is hidden. Token estimates are incremental and match full-string scans including split surrogates. History rows stay referentially stable. Persist signature ignores `thinkingOpen`.

### P6 background

Deadline countdown (`deadlineCountdown.ts`); hidden documents skip display ticks. Monitor match state is pruned by live rule ids, not LRU. Monitor file writes use `createLatestSerialWriter` (older snapshots cannot finish after a newer one; a failed write does not block the latest). Notification sound closes oscillators and `AudioContext`. Login window close uses `tauri::async_runtime::spawn` rather than an extra OS thread.

## Correctness tests vs plan table

| Area | Covered here | Gap |
|---|---|---|
| List empty / same refresh / single change / reorder / paging totals / latency filter reuse | Yes | Visual commit scope on a real page is inferred from identity tests, not React profiler. |
| HTTP URL/token switch, shared cancel, no cancel-retry, 500 retry, prefetch replace | Yes | Prefetch loop still lives in `serverList.ts` (Node tests cannot import `@/` barrels); page numbers + sequence abort are tested. |
| A2S parse / challenge / truncate / mixed batches / cap 6 | Rust unit tests | Live UDP timing is not in CI. |
| AI coalesce / reset / hidden timeout / incremental tokens | Yes | 2,000-chunk main-thread time is not measured. |
| Monitor channel order / cooldown prune / auto-join policy | Yes | Windows notification toast timing unverified. |
| Persist serial / failed write / restart format | Serial writer + existing persist tests | “New data read by an old client” is compatibility-by-unchanged-format, not a cross-version binary fixture. |
| Platform | macOS ARM + Intel local packages | Windows native, Linux package, WebDriver. |

## What this machine cannot close

1. **Windows native acceptance.** Same device, OS, WebView2, power mode, 1280×800, release build. Startup and interaction groups ≥30, median + p95. First boot after reboot separate. 30 min resource check and 8 h stability. WebView2 DevTools + WPR/WPA across render / host / GPU. Isolated profile; no credentials in traces.
2. **−20% runtime target.** That number is an acceptance goal against a Windows baseline, not a claim from Node tests.
3. **Remaining platform packages.** Windows and Linux installers still need the four-platform workflow on this tree. Local Mac ARM (5.0 MiB) and Mac Intel (5.4 MiB) DMGs exist under `desktop/src-tauri/target/` (ad-hoc signed, not notarized) and are not committed.

Until those exist, keep the program active. Rollback remains “revert the corresponding code and lockfile”; do not wipe user data.
