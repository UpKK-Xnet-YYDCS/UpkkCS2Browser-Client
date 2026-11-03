# Desktop toolchain inventory

Updated **2026-10-24**. Tauri 2.12 raises the Rust MSRV to 1.90 and drops official Windows 7 support. No production runtime dependencies were added by this update.

## Direct dependencies

| Package | Locked / declared | Stable decision | Compatibility notes |
|---|---|---|---|
| react / react-dom | 19.3.1 | Upgrade | Current React stable patch. |
| vite | 8.3.5 | Upgrade | Rolldown 1.2.15 / Oxc types 0.155.0 production bundler. |
| @vitejs/plugin-react | 6.1.2 | Keep | React Compiler is **not** enabled this period. |
| typescript | npm `@typescript/typescript6@^6.0.2` | Keep | ESLint / `typescript-eslint` parser and editor tooling. |
| typescript-7 | npm `typescript@^7.0.2` | Keep | `typecheck` / production `tsc -b` via `typescript-7`. |
| typescript-eslint | 8.72.0 | Upgrade | Parser compiler API peer range remains `>=4.8.4 <6.1.0`. |
| tailwindcss / @tailwindcss/vite | 4.3.3 | Keep | |
| @tauri-apps/api | 2.12.4 | Upgrade | Kept on the same minor line as the Rust Tauri crate. |
| @tauri-apps/cli | 2.12.4 | Upgrade | Matches the Tauri 2.12 release line. |
| tauri (Rust) | 2.12.5 | Upgrade | `desktop/src-tauri/Cargo.lock`; requires Rust 1.90; tauri-build/codegen/macros 2.7.4. |
| Tauri plugins | dialog 2.8.3; HTTP 2.8.3; notification 2.7.0; process 2.4.0; shell 2.5.0 | Upgrade | npm and Rust crates use matching major/minor lines. |
| tokio | 1.54.1 | Upgrade | Latest stable; existing bounded scheduling is preserved. |
| react-markdown / remark-gfm | 10.1.0 / 4.0.1 | Keep | Required Markdown/GFM. |
| lucide-react | removed | Replaced | Inline SVG set in `src/components/lucideIcons.tsx`; no extra production dependency. |

## Tauri npm / crate alignment

`tauri build` and `tauri dev` refuse to run when a `@tauri-apps/*` npm package and its Rust crate are on different major/minor releases (`--ignore-version-mismatches` is not used). `npm run check:contracts` enforces the same rule against `package-lock.json` and `Cargo.lock`.

As of **2026-10-24**, the Tauri API npm package is locked to 2.12.4, the Rust crate to 2.12.5, and the CLI to 2.12.4. All share the 2.12 release line. The HTTP and dialog plugins are aligned at 2.8.3 in npm and Cargo; notification and shell are aligned at 2.7.0 and 2.5.0. Tauri 2.12 officially drops Windows 7 and requires Rust 1.90; `npm run check:contracts` and the Rust 1.90 CI job guard the package alignment and compiler floor.

## TypeScript 6 vs 7

`package.json` keeps both on purpose:

- **TypeScript 7** (`typescript-7`) is the project compiler for `npm run typecheck` and `npm run build`.
- **TypeScript 6** (`typescript` → `@typescript/typescript6`) is the version `typescript-eslint` and related editor/parser tooling consume. `tsconfig.app.json` sets `ignoreDeprecations: "6.0"` for that split.

Do not delete the TypeScript 6 alias until ESLint and `typescript-eslint` are verified against TypeScript 7 as their parser. Duplicate install is a tooling constraint, not a runtime cost.

## Rust compiler

- **MSRV:** `rust-version = "1.90.0"` in `desktop/src-tauri/Cargo.toml`, enforced by `.github/workflows/desktop-check.yml` (`dtolnay/rust-toolchain@1.90.0`). Tauri 2.12 requires this floor.
- **Host default:** `rustc 1.99.1 (58cf8f9c3 2026-10-13)` on `stable-aarch64-apple-darwin`.
- **Current verification (2026-10-24):** default Rust 1.99.1 and installed Rust 1.90 both passed `cargo check --locked` and all 28 Rust tests. Rust 1.90 used `CARGO_TARGET_DIR=target/msrv-1.90`; the default toolchain also passed format checking and Clippy with `-D warnings`. No toolchain installation was needed. The complete desktop baseline stops at the existing bundle growth gate: both before and after this dependency update, all-assets gzip is 306,683 B, 1,249 B above the snapshot (limit 1,024 B). All 464 frontend tests, lint, type checks, contracts and architecture checks passed; the independent Rust checks were run after that failure. See [`DEPENDENCY_SECURITY.md`](../../DEPENDENCY_SECURITY.md).
- **Named verification (2026-09-14):** `rustup toolchain install 1.98.1 --profile minimal` (did not change the default). `rustc +1.98.1` is `1.98.1 (48a229cea 2026-09-01)`; `rustc +1.89.0` is `1.89.0 (29483883e 2025-08-04)`. Isolated `CARGO_TARGET_DIR`s:
  - `cargo +1.98.1 check --locked && cargo +1.98.1 test --locked` → 17 passed
  - `cargo +1.89.0 check --locked && cargo +1.89.0 test --locked` → 17 passed before the Tauri 2.12 upgrade; current CI floor is 1.90.
- Extra local dirs `src-tauri/target-198/` and `src-tauri/target-msrv/` are gitignored; they are not the CI artifact path.

## Audits (2026-10-24)

- `npm audit` and `npm audit --omit=dev --audit-level=high` → 0 vulnerabilities
- `cargo audit` → exit 0; 0 vulnerabilities and 5 warnings: `proc-macro-error` unmaintained, `glib` 0.18.5 unsound (`RUSTSEC-2024-0429`), and `zvariant`, `zbus_names`, `zvariant_derive` unmaintained (`RUSTSEC-2026-0370` / `0371` / `0372`). These remain in upstream Tauri / GTK / notification dependency chains; see [`DEPENDENCY_SECURITY.md`](../../DEPENDENCY_SECURITY.md).

## `build.target: 'esnext'`

`desktop/vite.config.ts` sets `build.target: 'esnext'`. Vite then emits modern syntax with only the minimum transform required by that target. That is **not** a guarantee that every system WebView implements every `esnext` feature.

This period does **not** raise the minimum OS / WebView:

- Windows: current WebView2 (primary acceptance)
- macOS: WKWebView on supported Intel/ARM
- Linux: WebKitGTK used by the existing Tauri linux bundle

If a WebView gap appears, fix it with a targeted emit/polyfill change rather than dropping OS versions.

## React Compiler

React Compiler is stable, but it is **not** turned on here. The React 6.x Vite plugin’s explicit compiler option is the only supported future trial path. Any later trial must compare runtime gain against build cost in a separate change.

## Reproducibility

- Frontend lockfile: `desktop/package-lock.json` (npm).
- Rust lockfile: `desktop/src-tauri/Cargo.lock`.
- Version stamp: `desktop/version.txt` / `sync-version.sh --check`.

Three-platform packaging, MSRV CI, and Windows native timing remain delivery gates for the overall performance program; this inventory does not mark those as done. See [`performance-report.md`](./performance-report.md).
