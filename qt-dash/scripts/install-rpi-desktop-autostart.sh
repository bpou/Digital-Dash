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
DESKTOP_STYLE_RUNNER="${ROOT_DIR}/qt-dash/scripts/apply-rpi-desktop-style.sh"
PROFILE_FILE="${TARGET_HOME}/.profile"
BASH_PROFILE_FILE="${TARGET_HOME}/.bash_profile"
LABWC_AUTOSTART_DIR="${TARGET_HOME}/.config/labwc"
LABWC_AUTOSTART_FILE="${TARGET_HOME}/.config/labwc/autostart"
SYSTEM_LABWC_AUTOSTART_FILE=/etc/xdg/labwc/autostart
SYSTEM_LABWC_BACKUP_FILE=/etc/xdg/labwc/autostart.digital-dash-desktop.bak
LXSESSION_AUTOSTART_DIR="${TARGET_HOME}/.config/lxsession/LXDE-pi"
LXSESSION_AUTOSTART_FILE="${LXSESSION_AUTOSTART_DIR}/autostart"
PCMANFM_CONFIG_DIR="${TARGET_HOME}/.config/pcmanfm/LXDE-pi"
PCMANFM_DESKTOP_CONFIG_FILE="${PCMANFM_CONFIG_DIR}/desktop-items-0.conf"
SYSTEM_PCMANFM_CONFIG_DIR=/etc/xdg/pcmanfm/LXDE-pi
SYSTEM_PCMANFM_DESKTOP_CONFIG_FILE="${SYSTEM_PCMANFM_CONFIG_DIR}/desktop-items-0.conf"
USER_DIRS_FILE="${TARGET_HOME}/.config/user-dirs.dirs"
USER_DIRS_BACKUP_FILE="${TARGET_HOME}/.config/user-dirs.dirs.digital-dash.bak"
DIGITAL_DASH_CONFIG_DIR="${TARGET_HOME}/.config/digital-dash"
DIGITAL_DASH_EMPTY_DESKTOP_DIR="${DIGITAL_DASH_CONFIG_DIR}/empty-desktop"
DIGITAL_DASH_WALLPAPER_DIR=/usr/share/backgrounds/digital-dash
DIGITAL_DASH_WALLPAPER_FILE="${DIGITAL_DASH_WALLPAPER_DIR}/das-rolf.png"
PLYMOUTH_THEME_SOURCE_DIR="${ROOT_DIR}/tools/kiosk/plymouth-theme"
PLYMOUTH_THEME_TARGET_DIR=/usr/share/plymouth/themes/digital-dash
PLYMOUTH_CONFIG_FILE=/etc/plymouth/plymouthd.conf
CMDLINE_FILE=/boot/firmware/cmdline.txt
USER_SYSTEMD_DIR="${TARGET_HOME}/.config/systemd/user"
GETTY_OVERRIDE_FILE=/etc/systemd/system/getty@tty1.service.d/digital-dash-autologin.conf
LIGHTDM_QT_CONF_FILE=/etc/lightdm/lightdm.conf.d/99-digital-dash-qt-autologin.conf
SYSTEMD_QT_SERVICE_FILE=/etc/systemd/system/digital-dash-qt.service
PLYMOUTH_HANDOFF_SERVICE_FILE=/etc/systemd/system/digital-dash-plymouth-handoff.service
PLYMOUTH_WAIT_SERVICE_FILE=/etc/systemd/system/digital-dash-plymouth-wait.service
QT_AUTOSTART_LOCK_DIR="${TARGET_HOME}/.cache/digital-dash-qt-autostart.lock"
PROFILE_MARKER_START="# >>> digital-dash tty1 kiosk >>>"
PROFILE_MARKER_END="# <<< digital-dash tty1 kiosk <<<"

if [ ! -f "${ROOT_DIR}/qt-dash/CMakeLists.txt" ]; then
  echo "Qt dash project not found at ${ROOT_DIR}/qt-dash" >&2
  exit 1
fi

ensure_cmdline_arg() {
  local arg=$1
  if [ -f "${CMDLINE_FILE}" ] && ! grep -Eq "(^|[[:space:]])${arg}([[:space:]]|$)" "${CMDLINE_FILE}"; then
    sed -i "1s|\$| ${arg}|" "${CMDLINE_FILE}"
  fi
}

remove_cmdline_arg() {
  local arg=$1
  if [ -f "${CMDLINE_FILE}" ]; then
    sed -i -E "s/(^|[[:space:]])${arg}([[:space:]]|$)/ /g; s/[[:space:]]+/ /g; s/^ //; s/ \$//" "${CMDLINE_FILE}"
  fi
}

apt-get update
apt-get install -y \
  build-essential \
  cmake \
  labwc \
  ninja-build \
  plymouth \
  qt6-base-dev \
  qt6-declarative-dev \
  qt6-websockets-dev \
  qml6-module-qtquick \
  qml6-module-qtquick-controls \
  qml6-module-qtquick-window

rm -rf "${ROOT_DIR}/qt-dash/build"
cmake -S "${ROOT_DIR}/qt-dash" -B "${ROOT_DIR}/qt-dash/build" -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build "${ROOT_DIR}/qt-dash/build"

chmod +x "${RUNNER}" "${AUTOSTART_RUNNER}" "${DESKTOP_STYLE_RUNNER}"
install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${AUTOSTART_DIR}"

install -d -m 0755 "${DIGITAL_DASH_WALLPAPER_DIR}"
install -m 0644 "${ROOT_DIR}/public/Das Rolf.png" "${DIGITAL_DASH_WALLPAPER_FILE}"

install -d -m 0755 "${PLYMOUTH_THEME_TARGET_DIR}"
install -m 0644 "${PLYMOUTH_THEME_SOURCE_DIR}/digital-dash.plymouth" "${PLYMOUTH_THEME_TARGET_DIR}/digital-dash.plymouth"
install -m 0644 "${PLYMOUTH_THEME_SOURCE_DIR}/digital-dash.script" "${PLYMOUTH_THEME_TARGET_DIR}/digital-dash.script"
install -m 0644 "${ROOT_DIR}/public/Das Rolf.png" "${PLYMOUTH_THEME_TARGET_DIR}/splash.png"
install -d -m 0755 /etc/plymouth
cat > "${PLYMOUTH_CONFIG_FILE}" <<EOF
[Daemon]
Theme=digital-dash
ShowDelay=0
EOF
remove_cmdline_arg nosplash
remove_cmdline_arg plymouth.enable=0
ensure_cmdline_arg quiet
ensure_cmdline_arg splash
if command -v plymouth-set-default-theme >/dev/null 2>&1; then
  plymouth-set-default-theme -R digital-dash
elif command -v update-initramfs >/dev/null 2>&1; then
  update-initramfs -u
fi

install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_GROUP}" \
  "${PCMANFM_CONFIG_DIR}" \
  "${DIGITAL_DASH_CONFIG_DIR}" \
  "${DIGITAL_DASH_EMPTY_DESKTOP_DIR}"

cat > "${PCMANFM_DESKTOP_CONFIG_FILE}" <<EOF
[*]
desktop_bg=#000000000000
desktop_shadow=#000000000000
desktop_fg=#ffffffffffff
desktop_font=PibotoLt 12
wallpaper=${DIGITAL_DASH_WALLPAPER_FILE}
wallpaper_mode=crop
show_documents=0
show_trash=0
show_mounts=0
EOF
chown "${TARGET_USER}:${TARGET_GROUP}" "${PCMANFM_DESKTOP_CONFIG_FILE}"
chmod 0644 "${PCMANFM_DESKTOP_CONFIG_FILE}"

install -d -m 0755 "${SYSTEM_PCMANFM_CONFIG_DIR}"
cat > "${SYSTEM_PCMANFM_DESKTOP_CONFIG_FILE}" <<EOF
[*]
desktop_bg=#000000000000
desktop_shadow=#000000000000
desktop_fg=#ffffffffffff
desktop_font=PibotoLt 12
wallpaper=${DIGITAL_DASH_WALLPAPER_FILE}
wallpaper_mode=crop
show_documents=0
show_trash=0
show_mounts=0
EOF
chmod 0644 "${SYSTEM_PCMANFM_DESKTOP_CONFIG_FILE}"

if [ -f "${USER_DIRS_FILE}" ] && [ ! -f "${USER_DIRS_BACKUP_FILE}" ]; then
  cp -a "${USER_DIRS_FILE}" "${USER_DIRS_BACKUP_FILE}"
fi

cat > "${USER_DIRS_FILE}" <<EOF
XDG_DESKTOP_DIR="${DIGITAL_DASH_EMPTY_DESKTOP_DIR}"
XDG_DOWNLOAD_DIR="${TARGET_HOME}/Downloads"
XDG_TEMPLATES_DIR="${TARGET_HOME}/Templates"
XDG_PUBLICSHARE_DIR="${TARGET_HOME}/Public"
XDG_DOCUMENTS_DIR="${TARGET_HOME}/Documents"
XDG_MUSIC_DIR="${TARGET_HOME}/Music"
XDG_PICTURES_DIR="${TARGET_HOME}/Pictures"
XDG_VIDEOS_DIR="${TARGET_HOME}/Videos"
EOF
chown "${TARGET_USER}:${TARGET_GROUP}" "${USER_DIRS_FILE}"
chmod 0644 "${USER_DIRS_FILE}"

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
  "${PLYMOUTH_HANDOFF_SERVICE_FILE}" \
  "${PLYMOUTH_WAIT_SERVICE_FILE}" \
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

if [ ! -f "${SYSTEM_LABWC_AUTOSTART_FILE}" ]; then
  cat > "${SYSTEM_LABWC_AUTOSTART_FILE}" <<'EOF'
/usr/bin/lwrespawn /usr/bin/pcmanfm --desktop --profile LXDE-pi &
EOF
fi

if [ -f "${SYSTEM_LABWC_AUTOSTART_FILE}" ]; then
  sed -i -E '/wf-panel-pi|lxpanel/d' "${SYSTEM_LABWC_AUTOSTART_FILE}"
  sed -i '\|apply-rpi-desktop-style\.sh|d' "${SYSTEM_LABWC_AUTOSTART_FILE}"
  if ! grep -Eq 'pcmanfm[[:space:]].*--desktop' "${SYSTEM_LABWC_AUTOSTART_FILE}"; then
    printf '\n/usr/bin/lwrespawn /usr/bin/pcmanfm --desktop --profile LXDE-pi &\n' >> "${SYSTEM_LABWC_AUTOSTART_FILE}"
  fi
  printf '"%s" "%s" &\n' "${DESKTOP_STYLE_RUNNER}" "${DIGITAL_DASH_WALLPAPER_FILE}" >> "${SYSTEM_LABWC_AUTOSTART_FILE}"
  chmod 0644 "${SYSTEM_LABWC_AUTOSTART_FILE}"
fi

pkill -x wf-panel-pi >/dev/null 2>&1 || true
pkill -x lxpanel >/dev/null 2>&1 || true

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
Environment=XDG_SESSION_TYPE=wayland
Environment=WAYLAND_DISPLAY=wayland-0
Environment=DISPLAY=:0
Environment=QT_QPA_PLATFORM=wayland;xcb
ExecStart=${RUNNER} ${ROOT_DIR} ${VIEW} ${WS_URL}
Restart=always
RestartSec=1

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
systemctl disable --now digital-dash-plymouth-handoff.service >/dev/null 2>&1 || true
systemctl disable --now digital-dash-plymouth-wait.service >/dev/null 2>&1 || true

echo "Installed Digital Dash Qt autostart for ${TARGET_USER}."
echo "Systemd service: ${SYSTEMD_QT_SERVICE_FILE}"
echo "Run now with: ${RUNNER} ${ROOT_DIR} ${VIEW} ${WS_URL}"
