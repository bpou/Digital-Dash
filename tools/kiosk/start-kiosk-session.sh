#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_URL=${2:-http://127.0.0.1:5173/cluster}
GTK_THEME_NAME=${DIGITAL_DASH_GTK_THEME:-Adwaita:dark}
USER_ID=$(id -u)
HOME_DIR=${HOME:-$(getent passwd "${USER_ID}" | cut -d: -f6)}
LOG_DIR=${XDG_CACHE_HOME:-${HOME_DIR}/.cache}
LOG_FILE="${LOG_DIR}/digital-dash-kiosk-session.log"
CHROMIUM_PROFILE_DIR="${TMPDIR:-/tmp}/digital-dash-chromium-profile-${USER_ID}"

mkdir -p "${LOG_DIR}" "${CHROMIUM_PROFILE_DIR}"
exec >> "${LOG_FILE}" 2>&1

echo "[$(date -Iseconds)] Starting Digital Dash Xorg kiosk session"
echo "ROOT_DIR=${ROOT_DIR}"
echo "TARGET_URL=${TARGET_URL}"
echo "DISPLAY=${DISPLAY:-}"

if [ -z "${DISPLAY:-}" ]; then
  if command -v startx >/dev/null 2>&1; then
    echo "[$(date -Iseconds)] DISPLAY is not set; launching Xorg with startx -- -nocursor"
    exec startx "$0" "${ROOT_DIR}" "${TARGET_URL}" -- -nocursor
  fi

  echo "startx not found and DISPLAY is not set." >&2
  exit 1
fi

export GTK_THEME="${GTK_THEME_NAME}"

find_browser() {
  local candidate
  for candidate in \
    /usr/lib/chromium/chromium \
    /usr/lib/chromium-browser/chromium-browser \
    /usr/lib/chromium-browser/chromium-browser-v7 \
    chromium \
    chromium-browser; do
    if [ -x "${candidate}" ]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
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
BROWSER_VERSION=$("${BROWSER_BIN}" --version 2>&1 || true)

cd "${ROOT_DIR}"

if command -v xset >/dev/null 2>&1; then
  xset s off -dpms s noblank || true
fi

if command -v xsetroot >/dev/null 2>&1; then
  xsetroot -solid black || true
fi

pkill -x unclutter >/dev/null 2>&1 || true
pkill -x chromium >/dev/null 2>&1 || true
pkill -x chromium-browser >/dev/null 2>&1 || true
rm -rf "${CHROMIUM_PROFILE_DIR}"
mkdir -p "${CHROMIUM_PROFILE_DIR}"
unset CHROME_FLAGS CHROMIUM_FLAGS NODE_OPTIONS V8_OPTIONS

if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0.01 -root &
fi

echo "[$(date -Iseconds)] Launching Chromium: ${BROWSER_BIN}" >> "${LOG_FILE}"
echo "[$(date -Iseconds)] Chromium version: ${BROWSER_VERSION}" >> "${LOG_FILE}"

exec "${BROWSER_BIN}" \
  --ozone-platform=x11 \
  --kiosk \
  --app="${TARGET_URL}" \
  --start-maximized \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --hide-scrollbars \
  --no-default-browser-check \
  --disable-vulkan \
  --disable-features=Translate,MediaRouter,Vulkan,DefaultANGLEVulkan \
  --default-background-color=000000ff \
  --force-dark-mode \
  --enable-features=OverlayScrollbar \
  --user-data-dir="${CHROMIUM_PROFILE_DIR}"
