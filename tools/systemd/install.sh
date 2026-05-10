#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
KIOSK_USER=${2:-}
SYSTEMD_DIR=/etc/systemd/system

run_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

NODE_BIN=$(command -v node || true)
if [ -z "${NODE_BIN}" ]; then
  if [ -x /usr/bin/node ]; then
    NODE_BIN=/usr/bin/node
  elif [ -x /usr/local/bin/node ]; then
    NODE_BIN=/usr/local/bin/node
  else
    NODE_BIN=/usr/bin/env
  fi
fi

NPM_BIN=$(command -v npm || true)
if [ -z "${NPM_BIN}" ]; then
  if [ -x /usr/bin/npm ]; then
    NPM_BIN=/usr/bin/npm
  elif [ -x /usr/local/bin/npm ]; then
    NPM_BIN=/usr/local/bin/npm
  else
    echo "npm not found; please install Node.js/npm before running this installer."
    exit 1
  fi
fi

run_root cp "${ROOT_DIR}/tools/systemd/digital-dash-ui.service" "${SYSTEMD_DIR}/digital-dash-ui.service"
run_root cp "${ROOT_DIR}/tools/systemd/digital-dash-vehicle.service" "${SYSTEMD_DIR}/digital-dash-vehicle.service"
run_root cp "${ROOT_DIR}/tools/systemd/digital-dash-bluetooth.service" "${SYSTEMD_DIR}/digital-dash-bluetooth.service"

run_root sed -i "s|__ROOT_DIR__|${ROOT_DIR}|g" "${SYSTEMD_DIR}/digital-dash-ui.service"
run_root sed -i "s|__ROOT_DIR__|${ROOT_DIR}|g" "${SYSTEMD_DIR}/digital-dash-vehicle.service"
run_root sed -i "s|__ROOT_DIR__|${ROOT_DIR}|g" "${SYSTEMD_DIR}/digital-dash-bluetooth.service"
run_root sed -i "s|__NPM_BIN__|${NPM_BIN}|g" "${SYSTEMD_DIR}/digital-dash-ui.service"
run_root sed -i "s|__NPM_BIN__|${NPM_BIN}|g" "${SYSTEMD_DIR}/digital-dash-vehicle.service"
run_root sed -i "s|__NODE_BIN__|${NODE_BIN}|g" "${SYSTEMD_DIR}/digital-dash-bluetooth.service"

if [ -f "${ROOT_DIR}/tools/hotspot/start-hotspot.sh" ]; then
  run_root chmod +x "${ROOT_DIR}/tools/hotspot/start-hotspot.sh"
fi

if [ -f "${ROOT_DIR}/tools/kiosk/launch-cluster-kiosk.sh" ]; then
  run_root chmod +x "${ROOT_DIR}/tools/kiosk/launch-cluster-kiosk.sh"
fi

if [ -f "${ROOT_DIR}/tools/kiosk/start-kiosk-session.sh" ]; then
  run_root chmod +x "${ROOT_DIR}/tools/kiosk/start-kiosk-session.sh"
fi

if [ -f "${ROOT_DIR}/tools/kiosk/install-cluster-kiosk.sh" ]; then
  run_root chmod +x "${ROOT_DIR}/tools/kiosk/install-cluster-kiosk.sh"
fi

echo "Installing app dependencies (npm install) in: ${ROOT_DIR}"
(
  cd "${ROOT_DIR}"
  "${NPM_BIN}" install
)

echo "Installing bluetooth-service dependencies (npm install) in: ${ROOT_DIR}/server/bluetooth-service"
(
  cd "${ROOT_DIR}/server/bluetooth-service"
  "${NPM_BIN}" install
)

run_root systemctl daemon-reload
run_root systemctl enable digital-dash-ui.service
run_root systemctl enable digital-dash-vehicle.service
run_root systemctl enable digital-dash-bluetooth.service

run_root systemctl restart digital-dash-ui.service
run_root systemctl restart digital-dash-vehicle.service
run_root systemctl restart digital-dash-bluetooth.service

if [ -n "${KIOSK_USER}" ] && [ -f "${ROOT_DIR}/tools/kiosk/install-cluster-kiosk.sh" ]; then
  run_root bash "${ROOT_DIR}/tools/kiosk/install-cluster-kiosk.sh" "${ROOT_DIR}" "${KIOSK_USER}"
fi

echo "Installed and started: digital-dash-ui.service, digital-dash-vehicle.service, digital-dash-bluetooth.service"
if [ -n "${KIOSK_USER}" ]; then
  echo "Cluster kiosk boot installed for user: ${KIOSK_USER}"
fi
echo "If Bluetooth audio uses a user session (PipeWire/PulseAudio), enable lingering for the service user so audio is available on boot:"
echo "  sudo loginctl enable-linger admin"
