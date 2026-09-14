# Desktop toolchain inventory

Recorded **2026-09-14**. Direct dependencies stay on the current stable line; this period does not treat “upgrade to React 19 / Vite 8” as a performance win. No production runtime dependencies were added.

## Direct dependencies

| Package | Locked / declared | Stable decision | Compatibility notes |
|---|---|---|---|
| react / react-dom | 19.3.0 | Keep | Already on the current React stable. |
| vite | 8.3.0 | Keep Rolldown/Oxc | Production bundler. |
| @vitejs/plugin-react | 6.1.1 | Keep | React Compiler is **not** enabled this period. |
| typescript | npm `@typescript/typescript6@^6.0.2` | Keep | ESLint / `typescript-eslint` parser and editor tooling. |
| typescript-7 | npm `typescript@^7.0.2` | Keep | `typecheck` / production `tsc -b` via `typescript-7`. |
| tailwindcss / @tailwindcss/vite | 4.3.3 | Keep | |
| @tauri-apps/api | 2.11.1 | Keep | JS API aligned to this query’s stable. |
| @tauri-apps/cli | 2.11.4 | Keep | |
| tauri (Rust) | 2.11.5 | Keep | `desktop/src-tauri/Cargo.lock`. |
| tokio | 1.53.1 | Keep | Optimize scheduling, do not bump for its own sake. |
| react-markdown / remark-gfm | 10.1.0 / 4.0.1 | Keep | Required Markdown/GFM. |
| lucide-react | removed | Replaced | Inline SVG set in `src/components/lucideIcons.tsx`; no extra production dependency. |

## TypeScript 6 vs 7

`package.json` keeps both on purpose:

- **TypeScript 7** (`typescript-7`) is the project compiler for `npm run typecheck` and `npm run build`.
- **TypeScript 6** (`typescript` → `@typescript/typescript6`) is the version `typescript-eslint` and related editor/parser tooling consume. `tsconfig.app.json` sets `ignoreDeprecations: "6.0"` for that split.

Do not delete the TypeScript 6 alias until ESLint and `typescript-eslint` are verified against TypeScript 7 as their parser. Duplicate install is a tooling constraint, not a runtime cost.

## Rust compiler

- **MSRV:** `rust-version = "1.89.0"` in `desktop/src-tauri/Cargo.toml`, enforced by `.github/workflows/desktop-check.yml` (`dtolnay/rust-toolchain@1.89.0`). Upgrades must not raise this floor to hide breakage.
- **Host default:** `rustc 1.97.0 (2d8144b78 2026-07-07)` on `stable-aarch64-apple-darwin`. Do not `rustup update stable` and do not raise MSRV for this period.
- **Named verification (2026-09-14):** `rustup toolchain install 1.98.1 --profile minimal` (did not change the default). `rustc +1.98.1` is `1.98.1 (48a229cea 2026-09-01)`; `rustc +1.89.0` is `1.89.0 (29483883e 2025-08-04)`. Isolated `CARGO_TARGET_DIR`s:
  - `cargo +1.98.1 check --locked && cargo +1.98.1 test --locked` → 17 passed
  - `cargo +1.89.0 check --locked && cargo +1.89.0 test --locked` → 17 passed
- Extra local dirs `src-tauri/target-198/` and `src-tauri/target-msrv/` are gitignored; they are not the CI artifact path.

## Audits (2026-09-14)

- `npm audit --omit=dev --audit-level=high` → 0 vulnerabilities
- `cargo audit` → exit 0; 7 allowed warnings (`proc-macro-error` unmaintained; several `unic-*` unmaintained; `glib` 0.18.5 unsound `RUSTSEC-2024-0429`). No failing advisories.

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
