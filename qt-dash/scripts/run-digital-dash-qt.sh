#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/home/admin/digital-dash}
VIEW=${2:-cluster}
WS_URL=${3:-ws://127.0.0.1:8765}
LOG_DIR=${XDG_CACHE_HOME:-${HOME}/.cache}
LOG_FILE="${LOG_DIR}/digital-dash-qt.log"
APP_BIN="${ROOT_DIR}/qt-dash/build/digital-dash-qt"
RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
WAYLAND_SOCKET="${RUNTIME_DIR}/${WAYLAND_DISPLAY:-wayland-0}"

mkdir -p "${LOG_DIR}"
exec >> "${LOG_FILE}" 2>&1

echo "[$(date -Iseconds)] Starting Digital Dash Qt"
echo "ROOT_DIR=${ROOT_DIR}"
echo "VIEW=${VIEW}"
echo "WS_URL=${WS_URL}"
echo "XDG_SESSION_TYPE=${XDG_SESSION_TYPE:-}"
echo "WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-}"
echo "DISPLAY=${DISPLAY:-}"

if [ ! -x "${APP_BIN}" ]; then
  echo "Missing Qt binary: ${APP_BIN}" >&2
  exit 1
fi

if [ -n "${WAYLAND_DISPLAY:-}" ]; then
  for _ in $(seq 1 40); do
    [ -S "${WAYLAND_SOCKET}" ] && break
    sleep 0.1
  done
fi

cd "${ROOT_DIR}"

export QT_QPA_PLATFORM="${QT_QPA_PLATFORM:-wayland;xcb}"

exec "${APP_BIN}" --view "${VIEW}" --ws "${WS_URL}"
