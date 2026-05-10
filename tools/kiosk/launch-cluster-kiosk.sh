#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_URL=${2:-http://127.0.0.1:5173/cluster}
WAIT_SECONDS=${DIGITAL_DASH_WAIT_SECONDS:-90}
USER_ID=$(id -u)
HOME_DIR=${HOME:-$(getent passwd "${USER_ID}" | cut -d: -f6)}
LOG_DIR=${XDG_CACHE_HOME:-${HOME_DIR}/.cache}
LOG_FILE="${LOG_DIR}/digital-dash-kiosk.log"

mkdir -p "${LOG_DIR}"
exec >> "${LOG_FILE}" 2>&1

echo "[$(date -Iseconds)] Starting digital-dash kiosk launcher"
echo "ROOT_DIR=${ROOT_DIR}"
echo "TARGET_URL=${TARGET_URL}"

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

probe_url() {
  local url=$1
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "${url}" >/dev/null 2>&1
    return $?
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -q -O /dev/null "${url}" >/dev/null 2>&1
    return $?
  fi
  return 0
}

wait_for_url() {
  local url=$1
  local waited=0
  until probe_url "${url}"; do
    sleep 2
    waited=$((waited + 2))
    if [ "${waited}" -ge "${WAIT_SECONDS}" ]; then
      echo "Timed out waiting for ${url}" >&2
      return 1
    fi
  done
}

BROWSER_BIN=$(find_browser || true)
if [ -z "${BROWSER_BIN}" ]; then
  echo "Chromium not found. Install it on the Pi before enabling kiosk mode." >&2
  exit 1
fi

echo "BROWSER_BIN=${BROWSER_BIN}"

if pgrep -f "${TARGET_URL}" >/dev/null 2>&1; then
  echo "Browser already running for ${TARGET_URL}"
  exit 0
fi

cd "${ROOT_DIR}"
wait_for_url "${TARGET_URL}"

echo "Launching Chromium"
exec "${BROWSER_BIN}" \
  --ozone-platform=wayland \
  --kiosk \
  --start-maximized \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --enable-features=UseOzonePlatform,OverlayScrollbar \
  "${TARGET_URL}"
