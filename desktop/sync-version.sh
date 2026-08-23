#!/bin/bash
# sync-version.sh - Synchronize version from version.txt to all config files
# Usage: ./sync-version.sh [--check] [version]
#   If version argument is provided, it updates version.txt and all config files
#   If no argument, reads from version.txt and syncs to config files
#
# 版本同步脚本 - 从 version.txt 同步版本号到所有配置文件
# 用法: ./sync-version.sh [版本号]
#   如果提供版本号参数，会更新 version.txt 和所有配置文件
#   如果没有参数，从 version.txt 读取并同步到配置文件

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

VERSION_FILE="$SCRIPT_DIR/version.txt"
PACKAGE_JSON="$SCRIPT_DIR/package.json"
TAURI_CONF="$SCRIPT_DIR/src-tauri/tauri.conf.json"
CARGO_TOML="$SCRIPT_DIR/src-tauri/Cargo.toml"

MODE="sync"
if [[ "${1:-}" == "--check" ]]; then
  MODE="check"
  shift
fi

# If version argument is provided, update version.txt first
if [ -n "${1:-}" ]; then
  VERSION="$1"
  # Strip leading 'v' if present (e.g., v1.7.0 -> 1.7.0)
  VERSION="${VERSION#v}"
  if [[ "$MODE" == "check" ]]; then
    echo "Error: --check does not accept a version argument" >&2
    exit 2
  fi
  echo "$VERSION" > "$VERSION_FILE"
  echo "Updated version.txt to $VERSION"
else
  if [ ! -f "$VERSION_FILE" ]; then
    echo "Error: $VERSION_FILE not found"
    exit 1
  fi
  VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')
fi

if [ -z "$VERSION" ]; then
  echo "Error: version is empty"
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$ ]]; then
  echo "Error: version is not valid semver: $VERSION" >&2
  exit 1
fi

read_json_version() {
  node -p "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')).version" "$1"
}

read_cargo_version() {
  awk -F'"' '/^version = "/ { print $2; exit }' "$1"
}

if [[ "$MODE" == "check" ]]; then
  package_version="$(read_json_version "$PACKAGE_JSON")"
  tauri_version="$(read_json_version "$TAURI_CONF")"
  cargo_version="$(read_cargo_version "$CARGO_TOML")"
  mismatches=()
  [[ "$package_version" == "$VERSION" ]] || mismatches+=("package.json=$package_version")
  [[ "$tauri_version" == "$VERSION" ]] || mismatches+=("tauri.conf.json=$tauri_version")
  [[ "$cargo_version" == "$VERSION" ]] || mismatches+=("Cargo.toml=$cargo_version")
  if (( ${#mismatches[@]} > 0 )); then
    echo "Error: version.txt=$VERSION differs from ${mismatches[*]}" >&2
    exit 1
  fi
  echo "Version check passed: $VERSION"
  exit 0
fi

echo "Syncing version $VERSION to all config files..."

# Update package.json
if [ -f "$PACKAGE_JSON" ]; then
  sed -i.bak 's/"version": "[^"]*"/"version": "'"$VERSION"'"/' "$PACKAGE_JSON"
  rm -f "$PACKAGE_JSON.bak"
  echo "  ✓ package.json -> $VERSION"
fi

# Update tauri.conf.json
if [ -f "$TAURI_CONF" ]; then
  sed -i.bak 's/"version": "[^"]*"/"version": "'"$VERSION"'"/' "$TAURI_CONF"
  rm -f "$TAURI_CONF.bak"
  echo "  ✓ tauri.conf.json -> $VERSION"
fi

# Update Cargo.toml (only the package version, not dependency versions)
if [ -f "$CARGO_TOML" ]; then
  sed -i.bak '0,/^version = ".*"/s/^version = ".*"/version = "'"$VERSION"'"/' "$CARGO_TOML"
  rm -f "$CARGO_TOML.bak"
  echo "  ✓ Cargo.toml -> $VERSION"
fi

echo "Version sync complete: $VERSION"
