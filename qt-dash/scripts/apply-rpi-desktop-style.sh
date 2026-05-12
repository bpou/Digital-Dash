#!/usr/bin/env bash
set -euo pipefail

WALLPAPER=${1:-/usr/share/backgrounds/digital-dash/das-rolf.png}
LOG_DIR=${XDG_CACHE_HOME:-${HOME}/.cache}
LOG_FILE="${LOG_DIR}/digital-dash-desktop-style.log"

mkdir -p "${LOG_DIR}"
exec >> "${LOG_FILE}" 2>&1

echo "[$(date -Iseconds)] Applying desktop style"
echo "WALLPAPER=${WALLPAPER}"
echo "WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-}"
echo "DISPLAY=${DISPLAY:-}"

for _ in $(seq 1 50); do
  if pgrep -x pcmanfm >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

if command -v pcmanfm >/dev/null 2>&1; then
  pcmanfm --set-wallpaper="${WALLPAPER}" --wallpaper-mode=crop || true
fi
