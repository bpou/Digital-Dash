#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_URL=${2:-http://127.0.0.1:5173/cluster}
KIOSK_RUNTIME=${DIGITAL_DASH_KIOSK_RUNTIME:-auto}
KIOSK_HOLD_SECONDS=${DIGITAL_DASH_KIOSK_HOLD_SECONDS:-0.4}
SPLASH_MAX_WAIT_SECONDS=${DIGITAL_DASH_SPLASH_MAX_WAIT_SECONDS:-20}
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
echo "KIOSK_RUNTIME=${KIOSK_RUNTIME}"
echo "KIOSK_HOLD_SECONDS=${KIOSK_HOLD_SECONDS}"
echo "SPLASH_MAX_WAIT_SECONDS=${SPLASH_MAX_WAIT_SECONDS}"
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

find_chromium() {
  local candidate
  for candidate in chromium chromium-browser; do
    if command -v "${candidate}" >/dev/null 2>&1; then
      command -v "${candidate}"
      return 0
    fi
  done
  return 1
}

find_cog() {
  if command -v cog >/dev/null 2>&1; then
    command -v cog
    return 0
  fi
  return 1
}

CHROMIUM_BIN=$(find_chromium || true)
COG_BIN=$(find_cog || true)

select_runtime() {
  case "${KIOSK_RUNTIME}" in
    auto)
      if [ -n "${COG_BIN}" ]; then
        echo "cog"
      else
        echo "chromium"
      fi
      ;;
    cog|wpe)
      if [ -z "${COG_BIN}" ]; then
        echo "Requested runtime '${KIOSK_RUNTIME}' but cog is not installed." >&2
        exit 1
      fi
      echo "cog"
      ;;
    chromium)
      if [ -z "${CHROMIUM_BIN}" ]; then
        echo "Requested Chromium runtime but Chromium is not installed." >&2
        exit 1
      fi
      echo "chromium"
      ;;
    *)
      echo "Unsupported DIGITAL_DASH_KIOSK_RUNTIME: ${KIOSK_RUNTIME}" >&2
      exit 1
      ;;
  esac
}

RUNTIME=$(select_runtime)
echo "RUNTIME=${RUNTIME}"

if [ "${RUNTIME}" = "chromium" ]; then
  if [ -z "${CHROMIUM_BIN}" ]; then
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
  if ! command -v swaylock >/dev/null 2>&1; then
    echo "swaylock not found." >&2
    exit 1
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "node not found." >&2
    exit 1
  fi
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
READY_MARKER_FILE="${LABWC_CONFIG_DIR}/cluster-ready"
RUNTIME_SPLASH_FILE="${LABWC_CONFIG_DIR}/splash-runtime.html"
SPLASH_IMAGE_URL="file://${SPLASH_IMAGE_PATH// /%20}"

mkdir -p "${LABWC_CONFIG_DIR}"

write_runtime_splash() {
  local ready_signal_url=$1
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
      const readySignalUrl = ${ready_signal_url@Q};
      const splashEl = document.querySelector(".splash");
      const frameEl = document.querySelector(".cluster");
      const clusterUrl = new URL(clusterUrlBase);
      if (readySignalUrl) {
        clusterUrl.searchParams.set("kiosk_ready", readySignalUrl);
      }

      let loadingStarted = false;
      let frameLoaded = false;
      let appReady = false;

      const maybeReveal = () => {
        if (!frameLoaded || !appReady) return;
        frameEl.classList.add("cluster--visible");
        splashEl.classList.add("splash--hidden");
      };

      frameEl.addEventListener("load", () => {
        frameLoaded = true;
        maybeReveal();
      });

      window.addEventListener("message", (event) => {
        if (event.source !== frameEl.contentWindow) return;
        const payload = event.data;
        const type = typeof payload === "string" ? payload : payload && payload.type;
        if (type === "digital-dash-ready") {
          appReady = true;
          maybeReveal();
        }
      });

      window.setTimeout(() => {
        appReady = true;
        maybeReveal();
      }, 20000);

      const checkCluster = async () => {
        try {
          await fetch(clusterUrlBase, { cache: "no-store", mode: "no-cors" });
          if (!loadingStarted) {
            loadingStarted = true;
            frameEl.src = clusterUrl.toString();
          }
          return;
        } catch {
          // Ignore until service is ready.
        }
        window.setTimeout(checkCluster, 500);
      };

      checkCluster();
    </script>
  </body>
</html>
EOF
}

run_cog_once() {
  local url=$1
  if "${COG_BIN}" --help 2>&1 | grep -q -- "--platform"; then
    "${COG_BIN}" --platform=drm "${url}"
  else
    COG_PLATFORM_NAME=drm "${COG_BIN}" "${url}"
  fi
}

run_cog_session() {
  write_runtime_splash ""
  local runtime_url="file://${RUNTIME_SPLASH_FILE// /%20}"
  local started_at
  local finished_at
  local runtime_seconds
  local exit_code

  echo "Launching Cog DRM runtime"
  while true; do
    started_at=$(date +%s)
    set +e
    run_cog_once "${runtime_url}"
    exit_code=$?
    set -e
    finished_at=$(date +%s)
    runtime_seconds=$((finished_at - started_at))

    echo "Cog exited with code ${exit_code} after ${runtime_seconds}s"
    if [ "${KIOSK_RUNTIME}" = "auto" ] && [ -n "${CHROMIUM_BIN}" ] && [ "${runtime_seconds}" -lt 5 ]; then
      echo "Cog exited too quickly in auto mode; falling back to Chromium"
      run_chromium_session
      return
    fi

    echo "Restarting Cog in 1s"
    sleep 1
  done
}

run_chromium_session() {
  local ready_port ready_signal_url

  rm -f "${READY_MARKER_FILE}"
  ready_port=$((38000 + (USER_ID % 1000)))
  ready_signal_url="http://127.0.0.1:${ready_port}/ready"
  write_runtime_splash "${ready_signal_url}"

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
' "${ready_port}" "${READY_MARKER_FILE}" &
READY_SERVER_PID=\$!

SWAYLOCK_READY_FIFO="${LABWC_CONFIG_DIR}/swaylock-ready.fifo"
rm -f "\${SWAYLOCK_READY_FIFO}"
mkfifo "\${SWAYLOCK_READY_FIFO}"

if command -v timeout >/dev/null 2>&1; then
  timeout 5 head -c 1 < "\${SWAYLOCK_READY_FIFO}" >/dev/null &
else
  head -c 1 < "\${SWAYLOCK_READY_FIFO}" >/dev/null &
fi
SWAYLOCK_READY_PID=\$!

if [ -f "${SPLASH_IMAGE_PATH}" ]; then
  swaylock \
    --color 000000 \
    --image "${SPLASH_IMAGE_PATH}" \
    --scaling fill \
    --no-unlock-indicator \
    --ready-fd 3 \
    3>"\${SWAYLOCK_READY_FIFO}" &
else
  swaylock \
    --color 000000 \
    --no-unlock-indicator \
    --ready-fd 3 \
    3>"\${SWAYLOCK_READY_FIFO}" &
fi
SPLASH_PID=\$!

if ! wait "\${SWAYLOCK_READY_PID}"; then
  echo "swaylock readiness timed out; continuing"
fi
rm -f "\${SWAYLOCK_READY_FIFO}"

"${CHROMIUM_BIN}" \
  --ozone-platform=wayland \
  --kiosk \
  --app="file://${RUNTIME_SPLASH_FILE// /%20}" \
  --start-maximized \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --hide-scrollbars \
  --default-background-color=000000ff \
  --force-dark-mode \
  --enable-features=UseOzonePlatform,OverlayScrollbar &
CHROMIUM_PID=\$!

for _ in \$(seq 1 $((SPLASH_MAX_WAIT_SECONDS * 10))); do
  if [ -f "${READY_MARKER_FILE}" ]; then
    break
  fi
  sleep 0.1
done

if [ -n "\${SPLASH_PID}" ] && kill -0 "\${SPLASH_PID}" 2>/dev/null; then
  kill "\${SPLASH_PID}" || true
fi

if kill -0 "\${READY_SERVER_PID}" 2>/dev/null; then
  kill "\${READY_SERVER_PID}" || true
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

  echo "Launching Chromium fallback runtime"
  while true; do
    labwc -C "${LABWC_CONFIG_DIR}"
    echo "labwc exited; restarting in 1s"
    sleep 1
  done
}

case "${RUNTIME}" in
  cog)
    run_cog_session
    ;;
  chromium)
    run_chromium_session
    ;;
esac
