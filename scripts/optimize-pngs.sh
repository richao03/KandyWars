#!/usr/bin/env bash
# Optimize PNG sprites to fix iOS decode-memory OOMs.
#
# Walks the sprite directories, downsizes anything larger than MAX_DIM on any
# side (preserving aspect ratio), then re-encodes with pngquant. Scene
# backgrounds under assets/images/ (titleScreen, neighborhood, etc.) are
# intentionally excluded — they render full-screen and need the resolution.
#
# A timestamped backup of every touched file lands in /tmp/png-backup-<ts>/
# so the run is fully recoverable even for untracked files.
#
# Usage:
#   ./scripts/optimize-pngs.sh            # process all sprite dirs
#   ./scripts/optimize-pngs.sh --dry-run  # show what would change, touch nothing

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MAX_DIM="${MAX_DIM:-256}"
QUALITY_MIN="${QUALITY_MIN:-65}"
QUALITY_MAX="${QUALITY_MAX:-85}"

DIRS=(
  "assets/images/emojis"
  "assets/images/icons"
  "assets/images/doggs"
)

DRY_RUN=0
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=1
fi

command -v sips >/dev/null || { echo "sips not found (macOS only)"; exit 1; }
command -v pngquant >/dev/null || { echo "pngquant not found — brew install pngquant"; exit 1; }

TS=$(date +%Y%m%d-%H%M%S)
BACKUP_ROOT="/tmp/png-backup-$TS"
[ "$DRY_RUN" -eq 0 ] && mkdir -p "$BACKUP_ROOT"

total_before=0
total_after=0
processed=0
skipped=0

for dir in "${DIRS[@]}"; do
  [ -d "$dir" ] || continue
  while IFS= read -r -d '' f; do
    size_before=$(stat -f '%z' "$f")
    dims=$(sips -g pixelWidth -g pixelHeight "$f" 2>/dev/null | awk '/pixelWidth/ {w=$2} /pixelHeight/ {h=$2} END {print w" "h}')
    w=${dims% *}
    h=${dims#* }
    if [ -z "$w" ] || [ -z "$h" ]; then
      echo "skip (could not read dims): $f"
      skipped=$((skipped + 1))
      continue
    fi

    needs_resize=0
    if [ "$w" -gt "$MAX_DIM" ] || [ "$h" -gt "$MAX_DIM" ]; then
      needs_resize=1
    fi

    total_before=$((total_before + size_before))

    if [ "$DRY_RUN" -eq 1 ]; then
      action="compress"
      [ "$needs_resize" -eq 1 ] && action="resize+compress"
      printf '%-20s %4sx%-4s %8d  %s\n' "$action" "$w" "$h" "$size_before" "$f"
      processed=$((processed + 1))
      continue
    fi

    # Backup before any mutation
    rel="$f"
    backup_path="$BACKUP_ROOT/$rel"
    mkdir -p "$(dirname "$backup_path")"
    cp "$f" "$backup_path"

    if [ "$needs_resize" -eq 1 ]; then
      sips -Z "$MAX_DIM" "$f" >/dev/null
    fi

    # --skip-if-larger preserves original if pngquant would bloat it
    # --force lets us overwrite the input in place via --output
    pngquant --skip-if-larger --force --quality="${QUALITY_MIN}-${QUALITY_MAX}" --output "$f" "$f" || {
      echo "pngquant could not improve: $f (leaving as-is)"
    }

    size_after=$(stat -f '%z' "$f")
    total_after=$((total_after + size_after))
    processed=$((processed + 1))

    if [ $((processed % 20)) -eq 0 ]; then
      echo "  ... processed $processed"
    fi
  done < <(find "$dir" -name '*.png' -print0)
done

echo
if [ "$DRY_RUN" -eq 1 ]; then
  printf 'DRY RUN: would process %d files (%.2f MB)\n' "$processed" "$(echo "$total_before" | awk '{printf "%f", $1/1048576}')"
else
  mb_before=$(echo "$total_before" | awk '{printf "%.2f", $1/1048576}')
  mb_after=$(echo "$total_after" | awk '{printf "%.2f", $1/1048576}')
  reduction=$(awk -v b="$total_before" -v a="$total_after" 'BEGIN { if (b>0) printf "%.1f", (1 - a/b)*100; else print "0" }')
  echo "=== Done ==="
  printf 'Processed: %d files\n' "$processed"
  printf 'Skipped:   %d files\n' "$skipped"
  printf 'Before:    %s MB\n' "$mb_before"
  printf 'After:     %s MB\n' "$mb_after"
  printf 'Reduction: %s%%\n' "$reduction"
  printf 'Backup:    %s\n' "$BACKUP_ROOT"
fi
