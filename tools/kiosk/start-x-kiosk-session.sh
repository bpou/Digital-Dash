#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_URL=${2:-http://127.0.0.1:5173/cluster}
GTK_THEME_NAME=${DIGITAL_DASH_GTK_THEME:-Adwaita:dark}
USER_ID=$(id -u)
HOME_DIR=${HOME:-$(getent passwd "${USER_ID}" | cut -d: -f6)}
LOG_DIR=${XDG_CACHE_HOME:-${HOME_DIR}/.cache}
LOG_FILE="${LOG_DIR}/digital-dash-kiosk-session.log"
CHROMIUM_PROFILE_DIR="${LOG_DIR}/digital-dash-chromium-profile"
BLANK_CURSOR_DIR="${LOG_DIR}/digital-dash-blank-cursor"

mkdir -p "${LOG_DIR}" "${CHROMIUM_PROFILE_DIR}" "${BLANK_CURSOR_DIR}"
exec >> "${LOG_FILE}" 2>&1

echo "[$(date -Iseconds)] Starting Digital Dash X11 kiosk session"
echo "ROOT_DIR=${ROOT_DIR}"
echo "TARGET_URL=${TARGET_URL}"

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

pkill -x unclutter >/dev/null 2>&1 || true
pkill -x chromium >/dev/null 2>&1 || true
pkill -x chromium-browser >/dev/null 2>&1 || true
rm -f "${CHROMIUM_PROFILE_DIR}/SingletonLock" "${CHROMIUM_PROFILE_DIR}/SingletonSocket" "${CHROMIUM_PROFILE_DIR}/SingletonCookie"
unset CHROME_FLAGS CHROMIUM_FLAGS NODE_OPTIONS V8_OPTIONS

if command -v xsetroot >/dev/null 2>&1; then
  xsetroot -solid black || true
fi

if command -v xsetroot >/dev/null 2>&1; then
  BLANK_CURSOR_BITMAP="${BLANK_CURSOR_DIR}/blank-cursor.xbm"
  BLANK_CURSOR_MASK="${BLANK_CURSOR_DIR}/blank-cursor-mask.xbm"
  cat > "${BLANK_CURSOR_BITMAP}" <<'EOF'
#define blank_cursor_width 1
#define blank_cursor_height 1
static unsigned char blank_cursor_bits[] = { 0x00 };
EOF
  cat > "${BLANK_CURSOR_MASK}" <<'EOF'
#define blank_cursor_mask_width 1
#define blank_cursor_mask_height 1
static unsigned char blank_cursor_mask_bits[] = { 0x00 };
EOF
  xsetroot -cursor "${BLANK_CURSOR_BITMAP}" "${BLANK_CURSOR_MASK}" || true
fi

if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0 -root -grab &
fi

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
