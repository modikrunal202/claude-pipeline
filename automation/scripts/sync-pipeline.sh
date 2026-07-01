#!/usr/bin/env bash
# sync-pipeline.sh — vendor/update the Claude SDLC pipeline from a central template repo
# into this project, WITHOUT clobbering project-local facts (.claude/CLAUDE.md, settings.local.json).
#
# Usage:
#   sync-pipeline.sh <template-repo-url-or-path> [ref]
# Example:
#   sync-pipeline.sh git@github.com:acme/claude-pipeline.git v1.2.0
#
# Idempotent. Pins to a ref so upgrades are deliberate. Run from the project root.
set -euo pipefail

SRC="${1:?usage: sync-pipeline.sh <template-repo> [ref]}"
REF="${2:-main}"
DEST="$(pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "▶ Fetching pipeline $SRC @ $REF ..."
if [ -d "$SRC/.git" ] || [[ "$SRC" == *://* || "$SRC" == git@* ]]; then
  git clone --depth 1 --branch "$REF" "$SRC" "$TMP/pipeline" >/dev/null 2>&1 \
    || git clone "$SRC" "$TMP/pipeline" >/dev/null 2>&1
else
  cp -r "$SRC" "$TMP/pipeline"
fi

# Files that carry PROJECT-LOCAL state — never overwrite these.
PRESERVE=( ".claude/CLAUDE.md" ".claude/settings.local.json" ".claude/mcp/mcp.json" )

echo "▶ Syncing shared components (preserving local state) ..."
# Shared, always-updated components:
for path in .claude/agents .claude/skills .claude/hooks prompts templates playbooks workflows automation; do
  if [ -e "$TMP/pipeline/$path" ]; then
    rm -rf "$DEST/$path"
    mkdir -p "$(dirname "$DEST/$path")"
    cp -r "$TMP/pipeline/$path" "$DEST/$path"
    echo "  updated: $path"
  fi
done

# Seed (do not overwrite) project-local files on first adoption only.
for p in "${PRESERVE[@]}"; do
  if [ ! -e "$DEST/$p" ] && [ -e "$TMP/pipeline/${p}.example" ]; then
    cp "$TMP/pipeline/${p}.example" "$DEST/$p"; echo "  seeded (from .example): $p"
  elif [ ! -e "$DEST/$p" ] && [ -e "$TMP/pipeline/$p" ]; then
    cp "$TMP/pipeline/$p" "$DEST/$p"; echo "  seeded: $p"
  else
    echo "  preserved local: $p"
  fi
done

chmod +x "$DEST"/.claude/hooks/*.sh 2>/dev/null || true
echo "✔ Pipeline synced to $REF. Review the diff, run your hook syntax check, and commit."
