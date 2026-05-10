#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_USER=${2:-${SUDO_USER:-}}
TARGET_URL=${3:-http://127.0.0.1:5173/cluster}
AUTOSTART_NAME="digital-dash-cluster.desktop"
LIGHTDM_CONF_DIR=/etc/lightdm/lightdm.conf.d
LIGHTDM_KIOSK_CONF=${LIGHTDM_CONF_DIR}/99-digital-dash-kiosk.conf
WAYLAND_SESSIONS_DIR=/usr/share/wayland-sessions
WAYLAND_SESSION_FILE=${WAYLAND_SESSIONS_DIR}/digital-dash-kiosk.desktop

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
SESSION_TMP_FILE=$(mktemp)
LIGHTDM_TMP_FILE=$(mktemp)

cleanup() {
  rm -f "${TMP_FILE}"
  rm -f "${SESSION_TMP_FILE}"
  rm -f "${LIGHTDM_TMP_FILE}"
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

if [ ! -f "${ROOT_DIR}/tools/kiosk/start-kiosk-session.sh" ]; then
  echo "Missing session launcher script: ${ROOT_DIR}/tools/kiosk/start-kiosk-session.sh" >&2
  exit 1
fi

if [ ! -f "${ROOT_DIR}/tools/kiosk/digital-dash-kiosk-session.desktop" ]; then
  echo "Missing LightDM session template: ${ROOT_DIR}/tools/kiosk/digital-dash-kiosk-session.desktop" >&2
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y cage
fi

cat > "${TMP_FILE}" <<EOF
[Desktop Entry]
Type=Application
Name=Digital Dash Cluster
Exec=${ROOT_DIR}/tools/kiosk/launch-cluster-kiosk.sh ${ROOT_DIR} ${TARGET_URL}
Path=${ROOT_DIR}
Terminal=false
StartupNotify=false
X-GNOME-Autostart-enabled=true
EOF

install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${AUTOSTART_DIR}"
install -m 0644 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${TMP_FILE}" "${AUTOSTART_FILE}"
chmod +x "${ROOT_DIR}/tools/kiosk/launch-cluster-kiosk.sh"
chmod +x "${ROOT_DIR}/tools/kiosk/start-kiosk-session.sh"

sed "s|__ROOT_DIR__|${ROOT_DIR}|g" "${ROOT_DIR}/tools/kiosk/digital-dash-kiosk-session.desktop" > "${SESSION_TMP_FILE}"
install -d -m 0755 "${WAYLAND_SESSIONS_DIR}"
install -m 0644 "${SESSION_TMP_FILE}" "${WAYLAND_SESSION_FILE}"

cat > "${LIGHTDM_TMP_FILE}" <<EOF
[Seat:*]
autologin-user=${TARGET_USER}
autologin-session=digital-dash-kiosk
user-session=digital-dash-kiosk
EOF

install -d -m 0755 "${LIGHTDM_CONF_DIR}"
install -m 0644 "${LIGHTDM_TMP_FILE}" "${LIGHTDM_KIOSK_CONF}"

if [ -f "${LABWC_AUTOSTART_FILE}" ]; then
  mv "${LABWC_AUTOSTART_FILE}" "${LABWC_AUTOSTART_FILE}.bak"
fi

rm -f "${AUTOSTART_FILE}"

if command -v raspi-config >/dev/null 2>&1; then
  raspi-config nonint do_boot_behaviour B4 || true
  raspi-config nonint do_boot_splash 0 || true
  raspi-config nonint do_blanking 1 || true
fi

echo "Installed Digital Dash LightDM kiosk session for user: ${TARGET_USER}"
echo "Cluster URL: ${TARGET_URL}"
echo "Raspberry Pi OS will show the standard boot splash, open the local Digital Dash splash, and then hand off to the cluster without showing the normal desktop."
