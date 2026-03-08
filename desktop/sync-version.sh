#!/bin/bash
# sync-version.sh - Synchronize version from version.txt to all config files
# Usage: ./sync-version.sh [version]
#   If version argument is provided, it updates version.txt and all config files
#   If no argument, reads from version.txt and syncs to config files
#
# 版本同步脚本 - 从 version.txt 同步版本号到所有配置文件
# 用法: ./sync-version.sh [版本号]
#   如果提供版本号参数，会更新 version.txt 和所有配置文件
#   如果没有参数，从 version.txt 读取并同步到配置文件

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

VERSION_FILE="$SCRIPT_DIR/version.txt"
PACKAGE_JSON="$SCRIPT_DIR/package.json"
TAURI_CONF="$SCRIPT_DIR/src-tauri/tauri.conf.json"
CARGO_TOML="$SCRIPT_DIR/src-tauri/Cargo.toml"

# If version argument is provided, update version.txt first
if [ -n "$1" ]; then
  VERSION="$1"
  # Strip leading 'v' if present (e.g., v1.7.0 -> 1.7.0)
  VERSION="${VERSION#v}"
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
