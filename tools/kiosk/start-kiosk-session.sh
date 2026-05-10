#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_URL=${2:-http://127.0.0.1:5173/cluster}
USER_ID=$(id -u)
HOME_DIR=${HOME:-$(getent passwd "${USER_ID}" | cut -d: -f6)}
LOG_DIR=${XDG_CACHE_HOME:-${HOME_DIR}/.cache}
LOG_FILE="${LOG_DIR}/digital-dash-kiosk-session.log"
SPLASH_PATH="${ROOT_DIR}/tools/kiosk/splash.html"

mkdir -p "${LOG_DIR}"
exec >> "${LOG_FILE}" 2>&1

echo "[$(date -Iseconds)] Starting Digital Dash kiosk session"
echo "ROOT_DIR=${ROOT_DIR}"
echo "TARGET_URL=${TARGET_URL}"
echo "XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-unset}"

find_browser() {
  local candidate
  for candidate in chromium chromium-browser; do
    if command -v "${candidate}" >/dev/null 2>&1; then
      command -v "${candidate}"
      return 0
    fi
  done
  return 1
}

BROWSER_BIN=$(find_browser || true)
if [ -z "${BROWSER_BIN}" ]; then
  echo "Chromium not found." >&2
  exit 1
fi

if ! command -v cage >/dev/null 2>&1; then
  echo "cage not found." >&2
  exit 1
fi

START_PAGE="${TARGET_URL}"
if [ -f "${SPLASH_PATH}" ]; then
  START_PAGE="file://${SPLASH_PATH}"
fi

echo "BROWSER_BIN=${BROWSER_BIN}"
echo "START_PAGE=${START_PAGE}"

cd "${ROOT_DIR}"

while true; do
  cage -d -s -- "${BROWSER_BIN}" \
    --ozone-platform=wayland \
    --kiosk \
    --start-maximized \
    --no-first-run \
    --noerrdialogs \
    --disable-infobars \
    --default-background-color=000000ff \
    --enable-features=UseOzonePlatform,OverlayScrollbar \
    "${START_PAGE}"
  echo "Chromium exited; restarting in 1s"
  sleep 1
done
