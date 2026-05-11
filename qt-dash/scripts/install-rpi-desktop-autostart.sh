#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/home/admin/digital-dash}
TARGET_USER=${2:-${SUDO_USER:-$(id -un)}}
VIEW=${3:-cluster}
WS_URL=${4:-ws://127.0.0.1:8765}

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer with sudo." >&2
  echo "Example: sudo bash qt-dash/scripts/install-rpi-desktop-autostart.sh /home/admin/digital-dash admin cluster" >&2
  exit 1
fi

if ! id "${TARGET_USER}" >/dev/null 2>&1; then
  echo "User not found: ${TARGET_USER}" >&2
  exit 1
fi

TARGET_HOME=$(getent passwd "${TARGET_USER}" | cut -d: -f6)
TARGET_GROUP=$(id -gn "${TARGET_USER}")
AUTOSTART_DIR="${TARGET_HOME}/.config/autostart"
AUTOSTART_FILE="${AUTOSTART_DIR}/digital-dash-qt.desktop"
RUNNER="${ROOT_DIR}/qt-dash/scripts/run-digital-dash-qt.sh"
PROFILE_FILE="${TARGET_HOME}/.profile"
BASH_PROFILE_FILE="${TARGET_HOME}/.bash_profile"
LABWC_AUTOSTART_FILE="${TARGET_HOME}/.config/labwc/autostart"
USER_SYSTEMD_DIR="${TARGET_HOME}/.config/systemd/user"
PROFILE_MARKER_START="# >>> digital-dash tty1 kiosk >>>"
PROFILE_MARKER_END="# <<< digital-dash tty1 kiosk <<<"

if [ ! -f "${ROOT_DIR}/qt-dash/CMakeLists.txt" ]; then
  echo "Qt dash project not found at ${ROOT_DIR}/qt-dash" >&2
  exit 1
fi

apt-get update
apt-get install -y \
  build-essential \
  cmake \
  ninja-build \
  qt6-base-dev \
  qt6-declarative-dev \
  qt6-websockets-dev \
  qml6-module-qtquick \
  qml6-module-qtquick-controls

cmake -S "${ROOT_DIR}/qt-dash" -B "${ROOT_DIR}/qt-dash/build" -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build "${ROOT_DIR}/qt-dash/build"

chmod +x "${RUNNER}"
install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${AUTOSTART_DIR}"

cat > "${AUTOSTART_FILE}" <<EOF
[Desktop Entry]
Type=Application
Name=Digital Dash Qt
Comment=Start the native Digital Dash fullscreen app
Exec=${RUNNER} ${ROOT_DIR} ${VIEW} ${WS_URL}
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

chown "${TARGET_USER}:${TARGET_GROUP}" "${AUTOSTART_FILE}"
chmod 0644 "${AUTOSTART_FILE}"

rm -f \
  "${AUTOSTART_DIR}/digital-dash-cluster.desktop" \
  "${AUTOSTART_DIR}/digital-dash-kiosk.desktop" \
  "${AUTOSTART_DIR}/digital-dash-splash.desktop" \
  "${USER_SYSTEMD_DIR}/digital-dash-kiosk.service" \
  "${USER_SYSTEMD_DIR}/digital-dash-splash.service" \
  "${USER_SYSTEMD_DIR}/default.target.wants/digital-dash-kiosk.service" \
  "${USER_SYSTEMD_DIR}/default.target.wants/digital-dash-splash.service" \
  /etc/systemd/system/digital-dash-kiosk.service \
  /etc/systemd/system/digital-dash-splash.service \
  /etc/systemd/system/digital-dash-zero-flash.service \
  /etc/lightdm/lightdm.conf.d/99-digital-dash-kiosk.conf \
  /usr/share/wayland-sessions/digital-dash-kiosk.desktop

find "${AUTOSTART_DIR}" -maxdepth 1 -type f -name '*.desktop' -print0 2>/dev/null |
  while IFS= read -r -d '' desktop_file; do
    if grep -Eiq 'chromium|splash\.html|start-kiosk-session|digital-dash/.+kiosk' "${desktop_file}"; then
      mv -f "${desktop_file}" "${desktop_file}.disabled"
    fi
  done

if [ -f "${LABWC_AUTOSTART_FILE}" ] && grep -Eq 'digital-dash|chromium|start-kiosk-session' "${LABWC_AUTOSTART_FILE}"; then
  mv -f "${LABWC_AUTOSTART_FILE}" "${LABWC_AUTOSTART_FILE}.disabled"
fi

if [ -f "${TARGET_HOME}/.config/digital-dash/kiosk-login.sh" ]; then
  mv -f "${TARGET_HOME}/.config/digital-dash/kiosk-login.sh" "${TARGET_HOME}/.config/digital-dash/kiosk-login.sh.disabled"
fi

for login_file in "${PROFILE_FILE}" "${BASH_PROFILE_FILE}"; do
  if [ -f "${login_file}" ] && grep -Fq "${PROFILE_MARKER_START}" "${login_file}"; then
    sed -i "/${PROFILE_MARKER_START}/,/${PROFILE_MARKER_END}/d" "${login_file}"
  fi
done

if [ -f /etc/lightdm/lightdm.conf ]; then
  sed -i \
    -e 's/^autologin-user=.*/autologin-user='"${TARGET_USER}"'/' \
    -e 's/^autologin-user-timeout=.*/autologin-user-timeout=0/' \
    -e 's/^autologin-session=.*/autologin-session=rpd-labwc/' \
    -e 's/^user-session=.*/user-session=rpd-labwc/' \
    -e 's/^xserver-command=.*/xserver-command=X/' \
    /etc/lightdm/lightdm.conf
fi

systemctl daemon-reload
systemctl set-default graphical.target
systemctl enable lightdm.service >/dev/null 2>&1 || true
systemctl disable digital-dash-kiosk.service >/dev/null 2>&1 || true
systemctl disable digital-dash-zero-flash.service >/dev/null 2>&1 || true

echo "Installed Digital Dash Qt autostart for ${TARGET_USER}."
echo "Autostart file: ${AUTOSTART_FILE}"
echo "Run now with: ${RUNNER} ${ROOT_DIR} ${VIEW} ${WS_URL}"
