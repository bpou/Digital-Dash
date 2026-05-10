#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_USER=${2:-${SUDO_USER:-}}
TARGET_URL=${3:-http://127.0.0.1:5173/cluster}
AUTOSTART_NAME="digital-dash-cluster.desktop"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer with sudo." >&2
  exit 1
fi

if [ -z "${TARGET_USER}" ] || [ "${TARGET_USER}" = "root" ]; then
  echo "Provide the Raspberry Pi desktop user as the second argument." >&2
  echo "Example: sudo bash tools/kiosk/install-cluster-kiosk.sh /digital-dash admin" >&2
  exit 1
fi

if ! id "${TARGET_USER}" >/dev/null 2>&1; then
  echo "User not found: ${TARGET_USER}" >&2
  exit 1
fi

TARGET_HOME=$(getent passwd "${TARGET_USER}" | cut -d: -f6)
TARGET_GROUP=$(id -gn "${TARGET_USER}")
LABWC_DIR="${TARGET_HOME}/.config/labwc"
LABWC_AUTOSTART_FILE="${LABWC_DIR}/autostart"
AUTOSTART_DIR="${TARGET_HOME}/.config/autostart"
AUTOSTART_FILE="${AUTOSTART_DIR}/${AUTOSTART_NAME}"
TMP_FILE=$(mktemp)

cleanup() {
  rm -f "${TMP_FILE}"
}
trap cleanup EXIT

if [ ! -d "${TARGET_HOME}" ]; then
  echo "Home directory not found for user: ${TARGET_USER}" >&2
  exit 1
fi

if [ ! -f "${ROOT_DIR}/tools/kiosk/launch-cluster-kiosk.sh" ]; then
  echo "Missing launcher script: ${ROOT_DIR}/tools/kiosk/launch-cluster-kiosk.sh" >&2
  exit 1
fi

cat > "${TMP_FILE}" <<EOF
[Desktop Entry]
Type=Application
Name=Digital Dash Cluster
Exec=/bin/sh -lc '${ROOT_DIR}/tools/kiosk/launch-cluster-kiosk.sh "${ROOT_DIR}" "${TARGET_URL}"'
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${AUTOSTART_DIR}"
install -m 0644 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${TMP_FILE}" "${AUTOSTART_FILE}"
chmod +x "${ROOT_DIR}/tools/kiosk/launch-cluster-kiosk.sh"

if [ -f "${LABWC_AUTOSTART_FILE}" ]; then
  cp "${LABWC_AUTOSTART_FILE}" "${LABWC_AUTOSTART_FILE}.bak"
fi

if command -v raspi-config >/dev/null 2>&1; then
  raspi-config nonint do_boot_behaviour B4 || true
  raspi-config nonint do_boot_splash 0 || true
  raspi-config nonint do_blanking 1 || true
fi

echo "Installed Chromium cluster kiosk desktop autostart for user: ${TARGET_USER}"
echo "Cluster URL: ${TARGET_URL}"
echo "Raspberry Pi OS will show the standard boot splash, open the local Digital Dash splash, and then hand off to the cluster."
