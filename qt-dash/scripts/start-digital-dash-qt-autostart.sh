#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/home/admin/digital-dash}
VIEW=${2:-cluster}
WS_URL=${3:-ws://127.0.0.1:8765}
LOG_DIR=${XDG_CACHE_HOME:-${HOME}/.cache}
LOG_FILE="${LOG_DIR}/digital-dash-qt.log"
LOCK_DIR="${LOG_DIR}/digital-dash-qt-autostart.lock"
RUNNER="${ROOT_DIR}/qt-dash/scripts/run-digital-dash-qt.sh"

mkdir -p "${LOG_DIR}"
exec >> "${LOG_FILE}" 2>&1

echo "[$(date -Iseconds)] Autostart requested"
echo "USER=$(id -un)"
echo "XDG_CURRENT_DESKTOP=${XDG_CURRENT_DESKTOP:-}"
echo "XDG_SESSION_DESKTOP=${XDG_SESSION_DESKTOP:-}"
echo "XDG_SESSION_TYPE=${XDG_SESSION_TYPE:-}"
echo "WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-}"
echo "DISPLAY=${DISPLAY:-}"

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  echo "Another Digital Dash Qt autostart is already running."
  exit 0
fi

cleanup() {
  rmdir "${LOCK_DIR}" 2>/dev/null || true
}
trap cleanup EXIT

sleep 2
"${RUNNER}" "${ROOT_DIR}" "${VIEW}" "${WS_URL}"
