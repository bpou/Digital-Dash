#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./rpi_canable_test.sh 500000
#   ./rpi_canable_test.sh scan

MODE="${1:-scan}"
IFACE="can0"

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing '$1'. Install can-utils (sudo apt install can-utils)." >&2
    exit 1
  }
}

setup_iface() {
  local bitrate="$1"
  echo "Setting ${IFACE} bitrate=${bitrate}..."
  sudo ip link set "${IFACE}" down || true
  sudo ip link set "${IFACE}" type can bitrate "${bitrate}" restart-ms 100
  sudo ip link set "${IFACE}" up
  ip -details link show "${IFACE}"
}

listen_window() {
  local seconds="$1"
  echo "Listening ${seconds}s... (Ctrl+C to stop)"
  timeout "${seconds}"s candump "${IFACE}" || true
}

send_test() {
  echo "Sending test frame ID=123 DATA=CA C0 01 02 03 04 55 AA"
  cansend "${IFACE}" 123#CAC00102030455AA
}

require ip
require candump
require cansend

if [[ "${MODE}" == "scan" ]]; then
  for rate in 500000 250000 125000; do
    setup_iface "${rate}"
    listen_window 5
    send_test
    listen_window 2
    echo "----"
  done
else
  setup_iface "${MODE}"
  listen_window 5
  send_test
  listen_window 5
fi
