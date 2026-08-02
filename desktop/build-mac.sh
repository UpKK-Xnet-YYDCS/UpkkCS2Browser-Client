#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BUNDLE_TARGETS="${TAURI_BUNDLES:-app,dmg}"
SKIP_INSTALL="${SKIP_INSTALL:-0}"
SKIP_CHECKS="${SKIP_CHECKS:-0}"

for argument in "$@"; do
  case "$argument" in
    --skip-install) SKIP_INSTALL=1 ;;
    --skip-checks) SKIP_CHECKS=1 ;;
    --bundles=*) BUNDLE_TARGETS="${argument#--bundles=}" ;;
    *)
      printf 'Unknown option: %s\n' "$argument" >&2
      printf 'Usage: %s [--skip-install] [--skip-checks] [--bundles=app,dmg]\n' "$0" >&2
      exit 2
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  printf 'This script must run on macOS.\n' >&2
  exit 1
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf "Required command '%s' was not found.\n" "$1" >&2
    exit 1
  fi
}

run_step() {
  printf '> '
  printf '%q ' "$@"
  printf '\n'
  "$@"
}

require_command npm
require_command cargo
require_command rustc

printf '=== Upkk Server Browser macOS build ===\n'
printf 'Desktop directory: %s\n' "$SCRIPT_DIR"
printf 'Bundle: %s\n' "$BUNDLE_TARGETS"

if [[ "$SKIP_INSTALL" != "1" ]]; then
  run_step npm ci
fi

if [[ "$SKIP_CHECKS" != "1" ]]; then
  run_step npm run lint
  run_step npm run typecheck
  run_step npm test
fi

run_step npm exec -- tauri build --bundles "$BUNDLE_TARGETS"

BUNDLE_ROOT="$SCRIPT_DIR/src-tauri/target/release/bundle"
printf '\nmacOS desktop build completed.\n'
printf 'Artifacts: %s\n' "$BUNDLE_ROOT"
if [[ ",${BUNDLE_TARGETS}," == *,app,* && -d "$BUNDLE_ROOT/macos" ]]; then
  find "$BUNDLE_ROOT/macos" -maxdepth 1 -type d -name '*.app' -print
fi
if [[ ",${BUNDLE_TARGETS}," == *,dmg,* && -d "$BUNDLE_ROOT/dmg" ]]; then
  find "$BUNDLE_ROOT/dmg" -maxdepth 1 -type f -name '*.dmg' -print
fi
