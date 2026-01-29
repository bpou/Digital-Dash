#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
SYSTEMD_DIR=/etc/systemd/system

sudo cp "${ROOT_DIR}/tools/systemd/digital-dash-ui.service" "${SYSTEMD_DIR}/digital-dash-ui.service"
sudo cp "${ROOT_DIR}/tools/systemd/digital-dash-vehicle.service" "${SYSTEMD_DIR}/digital-dash-vehicle.service"
sudo cp "${ROOT_DIR}/tools/systemd/digital-dash-bluetooth.service" "${SYSTEMD_DIR}/digital-dash-bluetooth.service"

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
