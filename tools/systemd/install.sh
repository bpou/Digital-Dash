#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
SYSTEMD_DIR=/etc/systemd/system

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

sudo cp "${ROOT_DIR}/tools/systemd/digital-dash-ui.service" "${SYSTEMD_DIR}/digital-dash-ui.service"
sudo cp "${ROOT_DIR}/tools/systemd/digital-dash-vehicle.service" "${SYSTEMD_DIR}/digital-dash-vehicle.service"
sudo cp "${ROOT_DIR}/tools/systemd/digital-dash-bluetooth.service" "${SYSTEMD_DIR}/digital-dash-bluetooth.service"

sudo sed -i "s|__ROOT_DIR__|${ROOT_DIR}|g" "${SYSTEMD_DIR}/digital-dash-bluetooth.service"
sudo sed -i "s|__NODE_BIN__|${NODE_BIN}|g" "${SYSTEMD_DIR}/digital-dash-bluetooth.service"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found; please install Node.js/npm before running this installer."
  exit 1
fi

echo "Installing bluetooth-service dependencies (npm install) in: ${ROOT_DIR}/server/bluetooth-service"
(
  cd "${ROOT_DIR}/server/bluetooth-service"
  npm install
)

sudo systemctl daemon-reload
sudo systemctl enable digital-dash-ui.service
sudo systemctl enable digital-dash-vehicle.service
sudo systemctl enable digital-dash-bluetooth.service

sudo systemctl restart digital-dash-ui.service
sudo systemctl restart digital-dash-vehicle.service
sudo systemctl restart digital-dash-bluetooth.service

echo "Installed and started: digital-dash-ui.service, digital-dash-vehicle.service, digital-dash-bluetooth.service"
echo "If Bluetooth audio uses a user session (PipeWire/PulseAudio), enable lingering for the service user so audio is available on boot:"
echo "  sudo loginctl enable-linger admin"
