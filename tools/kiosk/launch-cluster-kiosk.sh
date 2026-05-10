#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_URL=${2:-http://127.0.0.1:5173/cluster}
WAIT_SECONDS=${DIGITAL_DASH_WAIT_SECONDS:-90}
KIOSK_HOLD_SECONDS=${DIGITAL_DASH_KIOSK_HOLD_SECONDS:-1.2}
GTK_THEME_NAME=${DIGITAL_DASH_GTK_THEME:-Adwaita:dark}
USER_ID=$(id -u)
HOME_DIR=${HOME:-$(getent passwd "${USER_ID}" | cut -d: -f6)}
LOG_DIR=${XDG_CACHE_HOME:-${HOME_DIR}/.cache}
LOG_FILE="${LOG_DIR}/digital-dash-kiosk.log"
SPLASH_PATH="${ROOT_DIR}/tools/kiosk/splash.html"

mkdir -p "${LOG_DIR}"
exec >> "${LOG_FILE}" 2>&1

echo "[$(date -Iseconds)] Starting digital-dash kiosk launcher"
echo "ROOT_DIR=${ROOT_DIR}"
echo "TARGET_URL=${TARGET_URL}"
echo "KIOSK_HOLD_SECONDS=${KIOSK_HOLD_SECONDS}"
echo "GTK_THEME_NAME=${GTK_THEME_NAME}"

if [ -z "${XDG_RUNTIME_DIR:-}" ] && [ -d "/run/user/${USER_ID}" ]; then
  export XDG_RUNTIME_DIR="/run/user/${USER_ID}"
fi

if [ -z "${WAYLAND_DISPLAY:-}" ] && [ -n "${XDG_RUNTIME_DIR:-}" ]; then
  for socket in "${XDG_RUNTIME_DIR}"/wayland-*; do
    if [ -S "${socket}" ]; then
      export WAYLAND_DISPLAY
      WAYLAND_DISPLAY=$(basename "${socket}")
      break
    fi
  done
fi

echo "XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-unset}"
echo "WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-unset}"
echo "DISPLAY=${DISPLAY:-unset}"

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
  echo "Chromium not found. Install it on the Pi before enabling kiosk mode." >&2
  exit 1
fi

echo "BROWSER_BIN=${BROWSER_BIN}"

if pgrep -f "${SPLASH_PATH}" >/dev/null 2>&1 || pgrep -f "${TARGET_URL}" >/dev/null 2>&1; then
  echo "Browser already running for splash or target URL"
  exit 0
fi

cd "${ROOT_DIR}"
if [ -f "${SPLASH_PATH}" ]; then
  START_PAGE="${SPLASH_PATH}"
else
  echo "Splash page missing at ${SPLASH_PATH}; falling back to ${TARGET_URL}"
  START_PAGE="${TARGET_URL}"
fi

echo "Launching Chromium"
sleep "${KIOSK_HOLD_SECONDS}"
export GTK_THEME="${GTK_THEME_NAME}"
exec "${BROWSER_BIN}" \
  --ozone-platform=wayland \
  --kiosk \
  --app="${START_PAGE}" \
  --start-maximized \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --default-background-color=000000ff \
  --force-dark-mode \
  --enable-features=UseOzonePlatform,OverlayScrollbar
