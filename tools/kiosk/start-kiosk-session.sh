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
SYSTEM_READY_MARKER_FILE=/run/digital-dash/cluster-ready

mkdir -p "${LOG_DIR}"
exec >> "${LOG_FILE}" 2>&1

echo "[$(date -Iseconds)] Starting Digital Dash kiosk session"
echo "ROOT_DIR=${ROOT_DIR}"
echo "TARGET_URL=${TARGET_URL}"
echo "KIOSK_HOLD_SECONDS=${KIOSK_HOLD_SECONDS}"
echo "GTK_THEME_NAME=${GTK_THEME_NAME}"

if [ -z "${XDG_RUNTIME_DIR:-}" ] && [ -d "/run/user/${USER_ID}" ]; then
  export XDG_RUNTIME_DIR="/run/user/${USER_ID}"
fi

if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ] && [ -n "${XDG_RUNTIME_DIR:-}" ] && [ -S "${XDG_RUNTIME_DIR}/bus" ]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"
fi

export XDG_SESSION_TYPE=${XDG_SESSION_TYPE:-wayland}
export GTK_THEME="${GTK_THEME_NAME}"

echo "XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-unset}"
echo "DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unset}"

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

if ! command -v labwc >/dev/null 2>&1; then
  echo "labwc not found." >&2
  exit 1
fi

if ! command -v swaybg >/dev/null 2>&1; then
  echo "swaybg not found." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node not found." >&2
  exit 1
fi

echo "BROWSER_BIN=${BROWSER_BIN}"
echo "SYSTEM_READY_MARKER_FILE=${SYSTEM_READY_MARKER_FILE}"

cd "${ROOT_DIR}"

if [ -t 1 ]; then
  printf '\033[?25l'
  if command -v setterm >/dev/null 2>&1; then
    setterm --term linux --foreground black --background black --clear all --cursor off
  fi
fi

sleep "${KIOSK_HOLD_SECONDS}"

LABWC_CONFIG_DIR="${XDG_RUNTIME_DIR}/digital-dash-labwc"
LABWC_AUTOSTART_FILE="${LABWC_CONFIG_DIR}/autostart"
LABWC_ENV_FILE="${LABWC_CONFIG_DIR}/environment"
LABWC_RC_FILE="${LABWC_CONFIG_DIR}/rc.xml"
RUNTIME_SPLASH_FILE="${LABWC_CONFIG_DIR}/splash-runtime.html"

mkdir -p "${LABWC_CONFIG_DIR}"
rm -f "${SYSTEM_READY_MARKER_FILE}" 2>/dev/null || true

READY_PORT=$((38000 + (USER_ID % 1000)))
READY_SIGNAL_URL="http://127.0.0.1:${READY_PORT}/ready"
SPLASH_IMAGE_URL="file://${SPLASH_IMAGE_PATH// /%20}"

cat > "${RUNTIME_SPLASH_FILE}" <<EOF
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <title>Digital Dash Boot</title>
    <style>
      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #000;
      }

      body {
        position: relative;
      }

      .cluster {
        position: absolute;
        inset: 0;
        width: 100vw;
        height: 100vh;
        border: 0;
        background: #000;
        opacity: 0;
        transition: opacity 180ms linear;
        pointer-events: none;
      }

      .cluster--visible {
        opacity: 1;
        pointer-events: auto;
      }

      .splash {
        position: absolute;
        inset: 0;
        display: block;
        width: 100vw;
        height: 100vh;
        object-fit: cover;
        object-position: center;
        user-select: none;
        -webkit-user-drag: none;
        opacity: 1;
        transition: opacity 180ms linear;
      }

      .splash--hidden {
        opacity: 0;
      }
    </style>
  </head>
  <body>
    <img class="splash" src="${SPLASH_IMAGE_URL}" alt="Das Rolf" />
    <iframe class="cluster" title="Digital Dash Cluster" tabindex="-1"></iframe>
    <script>
      const clusterUrlBase = ${TARGET_URL@Q};
      const readySignalUrl = ${READY_SIGNAL_URL@Q};
      const splashEl = document.querySelector(".splash");
      const frameEl = document.querySelector(".cluster");
      const clusterUrl = new URL(clusterUrlBase);
      clusterUrl.searchParams.set("kiosk_ready", readySignalUrl);
      let loadingStarted = false;

      frameEl.addEventListener("load", () => {
        frameEl.classList.add("cluster--visible");
        splashEl.classList.add("splash--hidden");
      });

      const checkCluster = async () => {
        try {
          await fetch(clusterUrlBase, { cache: "no-store", mode: "no-cors" });
          if (!loadingStarted) {
            loadingStarted = true;
            frameEl.src = clusterUrl.toString();
          }
          return;
        } catch {
          // Ignore until service is ready
        }
        window.setTimeout(checkCluster, 500);
      };

      checkCluster();
    </script>
  </body>
</html>
EOF

cat > "${LABWC_AUTOSTART_FILE}" <<EOF
#!/usr/bin/env bash
set -eu
if [ -f "${SPLASH_IMAGE_PATH}" ]; then
  swaybg -i "${SPLASH_IMAGE_PATH}" -m fill -c 000000 &
else
  swaybg -c 000000 &
fi

node -e '
const fs = require("fs");
const http = require("http");
const port = Number(process.argv[1]);
const marker = process.argv[2];
const server = http.createServer((req, res) => {
  res.statusCode = 204;
  res.end();
  try { fs.writeFileSync(marker, String(Date.now())); } catch {}
  setTimeout(() => server.close(() => process.exit(0)), 50);
});
server.listen(port, "127.0.0.1");
setTimeout(() => server.close(() => process.exit(0)), 30000);
' "${READY_PORT}" "${SYSTEM_READY_MARKER_FILE}" &
READY_SERVER_PID=\$!

"${BROWSER_BIN}" \
  --ozone-platform=wayland \
  --kiosk \
  --app="file://${RUNTIME_SPLASH_FILE}" \
  --start-maximized \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --default-background-color=000000ff \
  --force-dark-mode \
  --enable-features=UseOzonePlatform,OverlayScrollbar &
CHROMIUM_PID=\$!

if kill -0 "\${READY_SERVER_PID}" 2>/dev/null; then
  wait "\${READY_SERVER_PID}" || true
fi

wait "\${CHROMIUM_PID}"
labwc --exit
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
  labwc -C "${LABWC_CONFIG_DIR}"
  echo "labwc exited; restarting in 1s"
  sleep 1
done
