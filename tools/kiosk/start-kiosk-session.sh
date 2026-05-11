#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_URL=${2:-http://127.0.0.1:5173/cluster}
KIOSK_HOLD_SECONDS=${DIGITAL_DASH_KIOSK_HOLD_SECONDS:-0.4}
GTK_THEME_NAME=${DIGITAL_DASH_GTK_THEME:-Adwaita:dark}
USER_ID=$(id -u)
HOME_DIR=${HOME:-$(getent passwd "${USER_ID}" | cut -d: -f6)}
LOG_DIR=${XDG_CACHE_HOME:-${HOME_DIR}/.cache}
LOG_FILE="${LOG_DIR}/digital-dash-kiosk-session.log"
SPLASH_IMAGE_PATH="${ROOT_DIR}/public/Das Rolf.png"

mkdir -p "${LOG_DIR}"
exec >> "${LOG_FILE}" 2>&1

echo "[$(date -Iseconds)] Starting Digital Dash kiosk session"
echo "ROOT_DIR=${ROOT_DIR}"
echo "TARGET_URL=${TARGET_URL}"
echo "KIOSK_HOLD_SECONDS=${KIOSK_HOLD_SECONDS}"

if [ -z "${XDG_RUNTIME_DIR:-}" ] && [ -d "/run/user/${USER_ID}" ]; then
  export XDG_RUNTIME_DIR="/run/user/${USER_ID}"
fi

if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ] && [ -n "${XDG_RUNTIME_DIR:-}" ] && [ -S "${XDG_RUNTIME_DIR}/bus" ]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"
fi

export XDG_SESSION_TYPE=${XDG_SESSION_TYPE:-wayland}
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

if ! command -v labwc >/dev/null 2>&1; then
  echo "labwc not found." >&2
  exit 1
fi

if ! command -v swaybg >/dev/null 2>&1; then
  echo "swaybg not found." >&2
  exit 1
fi

cd "${ROOT_DIR}"

if [ -t 1 ]; then
  printf '\033[?25l'
  if command -v setterm >/dev/null 2>&1; then
    setterm --term linux --foreground black --background black --clear all --cursor off
  fi
fi

sleep "${KIOSK_HOLD_SECONDS}"

LABWC_CONFIG_DIR="${XDG_RUNTIME_DIR:-/tmp}/digital-dash-labwc"
LABWC_AUTOSTART_FILE="${LABWC_CONFIG_DIR}/autostart"
LABWC_ENV_FILE="${LABWC_CONFIG_DIR}/environment"
LABWC_RC_FILE="${LABWC_CONFIG_DIR}/rc.xml"
CHROMIUM_PROFILE_DIR="${LABWC_CONFIG_DIR}/chromium-profile"

mkdir -p "${LABWC_CONFIG_DIR}"
mkdir -p "${CHROMIUM_PROFILE_DIR}"

cat > "${LABWC_AUTOSTART_FILE}" <<EOF
#!/usr/bin/env bash
set -eu

if [ -f "${SPLASH_IMAGE_PATH}" ]; then
  swaybg -i "${SPLASH_IMAGE_PATH}" -m fill -c 000000 &
else
  swaybg -c 000000 &
fi

pkill -x unclutter >/dev/null 2>&1 || true
pkill -x chromium >/dev/null 2>&1 || true
pkill -x chromium-browser >/dev/null 2>&1 || true
rm -f "${CHROMIUM_PROFILE_DIR}/SingletonLock" "${CHROMIUM_PROFILE_DIR}/SingletonSocket" "${CHROMIUM_PROFILE_DIR}/SingletonCookie"
unset CHROME_FLAGS CHROMIUM_FLAGS NODE_OPTIONS V8_OPTIONS

if command -v unclutter >/dev/null 2>&1; then
  if [ -n "\${DISPLAY:-}" ]; then
    unclutter -idle 0.01 -root &
  else
    echo "[\$(date -Iseconds)] unclutter skipped: DISPLAY is not set" >> "${LOG_FILE}"
  fi
fi

echo "[\$(date -Iseconds)] Launching Chromium: ${BROWSER_BIN}" >> "${LOG_FILE}"
echo "[\$(date -Iseconds)] Chromium version: ${BROWSER_VERSION}" >> "${LOG_FILE}"
if [ -d /etc/chromium.d ]; then
  grep -R "no-decommit-pooled-pages" /etc/chromium.d >> "${LOG_FILE}" 2>&1 || true
fi

exec "${BROWSER_BIN}" \
  --ozone-platform=x11 \
  --use-gl=egl \
  --ignore-gpu-blocklist \
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
  --enable-logging=stderr \
  --log-level=0 \
  --vmodule="gpu*=2,zygote*=2" \
  --user-data-dir="${CHROMIUM_PROFILE_DIR}"
EOF

cat > "${LABWC_ENV_FILE}" <<EOF
GTK_THEME=${GTK_THEME_NAME}
XDG_SESSION_TYPE=wayland
EOF

cat > "${LABWC_RC_FILE}" <<'EOF'
<?xml version="1.0"?>
<labwc_config>
  <windowRules>
    <windowRule identifier="chromium*" serverDecoration="no" />
  </windowRules>
</labwc_config>
EOF

chmod +x "${LABWC_AUTOSTART_FILE}"

while true; do
  echo "[$(date -Iseconds)] Launching labwc"
  labwc -C "${LABWC_CONFIG_DIR}"
  echo "[$(date -Iseconds)] labwc exited; restarting in 1s"
  sleep 1
done
