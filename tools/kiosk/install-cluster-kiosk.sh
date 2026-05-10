#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_USER=${2:-${SUDO_USER:-}}
TARGET_URL=${3:-http://127.0.0.1:5173/cluster}
MARKER_START="# >>> digital-dash cluster kiosk >>>"
MARKER_END="# <<< digital-dash cluster kiosk <<<"

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
AUTOSTART_DIR="${TARGET_HOME}/.config/labwc"
AUTOSTART_FILE="${AUTOSTART_DIR}/autostart"
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

if [ -f "${AUTOSTART_FILE}" ]; then
  awk -v start="${MARKER_START}" -v end="${MARKER_END}" '
    $0 == start { skip=1; next }
    $0 == end { skip=0; next }
    !skip { print }
  ' "${AUTOSTART_FILE}" > "${TMP_FILE}"
  printf '\n' >> "${TMP_FILE}"
fi

cat >> "${TMP_FILE}" <<EOF
${MARKER_START}
${ROOT_DIR}/tools/kiosk/launch-cluster-kiosk.sh "${ROOT_DIR}" "${TARGET_URL}" &
${MARKER_END}
EOF

install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${AUTOSTART_DIR}"
install -m 0644 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${TMP_FILE}" "${AUTOSTART_FILE}"
chmod +x "${ROOT_DIR}/tools/kiosk/launch-cluster-kiosk.sh"

if command -v raspi-config >/dev/null 2>&1; then
  raspi-config nonint do_boot_behaviour B4 || true
  raspi-config nonint do_blanking 1 || true
fi

echo "Installed Chromium cluster kiosk autostart for desktop user: ${TARGET_USER}"
echo "Cluster URL: ${TARGET_URL}"
echo "Raspberry Pi OS will open the cluster after desktop auto-login."
