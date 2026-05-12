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
AUTOSTART_RUNNER="${ROOT_DIR}/qt-dash/scripts/start-digital-dash-qt-autostart.sh"
PROFILE_FILE="${TARGET_HOME}/.profile"
BASH_PROFILE_FILE="${TARGET_HOME}/.bash_profile"
LABWC_AUTOSTART_DIR="${TARGET_HOME}/.config/labwc"
LABWC_AUTOSTART_FILE="${TARGET_HOME}/.config/labwc/autostart"
SYSTEM_LABWC_AUTOSTART_FILE=/etc/xdg/labwc/autostart
SYSTEM_LABWC_BACKUP_FILE=/etc/xdg/labwc/autostart.digital-dash-desktop.bak
LXSESSION_AUTOSTART_DIR="${TARGET_HOME}/.config/lxsession/LXDE-pi"
LXSESSION_AUTOSTART_FILE="${LXSESSION_AUTOSTART_DIR}/autostart"
USER_SYSTEMD_DIR="${TARGET_HOME}/.config/systemd/user"
GETTY_OVERRIDE_FILE=/etc/systemd/system/getty@tty1.service.d/digital-dash-autologin.conf
LIGHTDM_QT_CONF_FILE=/etc/lightdm/lightdm.conf.d/99-digital-dash-qt-autologin.conf
SYSTEMD_QT_SERVICE_FILE=/etc/systemd/system/digital-dash-qt.service
QT_AUTOSTART_LOCK_DIR="${TARGET_HOME}/.cache/digital-dash-qt-autostart.lock"
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
  labwc \
  ninja-build \
  qt6-base-dev \
  qt6-declarative-dev \
  qt6-websockets-dev \
  qml6-module-qtquick \
  qml6-module-qtquick-controls

rm -rf "${ROOT_DIR}/qt-dash/build"
cmake -S "${ROOT_DIR}/qt-dash" -B "${ROOT_DIR}/qt-dash/build" -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build "${ROOT_DIR}/qt-dash/build"

chmod +x "${RUNNER}" "${AUTOSTART_RUNNER}"
install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${AUTOSTART_DIR}"

rm -f \
  "${AUTOSTART_FILE}" \
  "${AUTOSTART_DIR}/digital-dash-cluster.desktop" \
  "${AUTOSTART_DIR}/digital-dash-kiosk.desktop" \
  "${AUTOSTART_DIR}/digital-dash-splash.desktop" \
  "${LXSESSION_AUTOSTART_FILE}.digital-dash-disabled" \
  "${USER_SYSTEMD_DIR}/digital-dash-kiosk.service" \
  "${USER_SYSTEMD_DIR}/digital-dash-splash.service" \
  "${USER_SYSTEMD_DIR}/default.target.wants/digital-dash-kiosk.service" \
  "${USER_SYSTEMD_DIR}/default.target.wants/digital-dash-splash.service" \
  "${GETTY_OVERRIDE_FILE}" \
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

install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${LABWC_AUTOSTART_DIR}"
rm -f "${LABWC_AUTOSTART_FILE}"

install -d -m 0755 /etc/xdg/labwc
if [ -f "${SYSTEM_LABWC_BACKUP_FILE}" ]; then
  cp -a "${SYSTEM_LABWC_BACKUP_FILE}" "${SYSTEM_LABWC_AUTOSTART_FILE}"
fi

if [ -f "${SYSTEM_LABWC_AUTOSTART_FILE}" ]; then
  chmod 0644 "${SYSTEM_LABWC_AUTOSTART_FILE}"
fi

if [ -f "${LXSESSION_AUTOSTART_FILE}" ] && grep -Eq 'digital-dash|chromium|start-kiosk-session' "${LXSESSION_AUTOSTART_FILE}"; then
  mv -f "${LXSESSION_AUTOSTART_FILE}" "${LXSESSION_AUTOSTART_FILE}.digital-dash-disabled"
fi

install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${LXSESSION_AUTOSTART_DIR}"
rm -f "${LXSESSION_AUTOSTART_FILE}"

rmdir "${QT_AUTOSTART_LOCK_DIR}" 2>/dev/null || true

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

install -d -m 0755 /etc/lightdm/lightdm.conf.d
cat > "${LIGHTDM_QT_CONF_FILE}" <<EOF
[Seat:*]
autologin-user=${TARGET_USER}
autologin-user-timeout=0
user-session=rpd-labwc
autologin-session=rpd-labwc
xserver-command=X
EOF

cat > "${SYSTEMD_QT_SERVICE_FILE}" <<EOF
[Unit]
Description=Digital Dash Qt fullscreen app
After=lightdm.service graphical.target
Wants=lightdm.service

[Service]
Type=simple
User=${TARGET_USER}
Group=${TARGET_GROUP}
WorkingDirectory=${ROOT_DIR}
Environment=HOME=${TARGET_HOME}
Environment=XDG_RUNTIME_DIR=/run/user/$(id -u "${TARGET_USER}")
Environment=WAYLAND_DISPLAY=wayland-0
Environment=DISPLAY=:0
Environment=QT_QPA_PLATFORM=wayland;xcb
ExecStartPre=/bin/sleep 10
ExecStart=${RUNNER} ${ROOT_DIR} ${VIEW} ${WS_URL}
Restart=always
RestartSec=3

[Install]
WantedBy=graphical.target
EOF
chmod 0644 "${SYSTEMD_QT_SERVICE_FILE}"

systemctl daemon-reload
systemctl set-default graphical.target
systemctl enable lightdm.service >/dev/null 2>&1 || true
systemctl enable digital-dash-qt.service >/dev/null 2>&1
systemctl disable digital-dash-kiosk.service >/dev/null 2>&1 || true
systemctl disable digital-dash-zero-flash.service >/dev/null 2>&1 || true

echo "Installed Digital Dash Qt autostart for ${TARGET_USER}."
echo "Systemd service: ${SYSTEMD_QT_SERVICE_FILE}"
echo "Run now with: ${RUNNER} ${ROOT_DIR} ${VIEW} ${WS_URL}"
