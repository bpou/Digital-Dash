#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_USER=${2:-${SUDO_USER:-}}
TARGET_URL=${3:-http://127.0.0.1:5173/cluster}
GETTY_OVERRIDE_DIR=/etc/systemd/system/getty@tty1.service.d
GETTY_OVERRIDE_FILE=${GETTY_OVERRIDE_DIR}/digital-dash-autologin.conf
CMDLINE_FILE=/boot/firmware/cmdline.txt
PLYMOUTH_QUIT_OVERRIDE_DIR=/etc/systemd/system/plymouth-quit.service.d
PLYMOUTH_QUIT_OVERRIDE_FILE=${PLYMOUTH_QUIT_OVERRIDE_DIR}/override.conf

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer with sudo." >&2
  exit 1
fi

if [ -z "${TARGET_USER}" ] || [ "${TARGET_USER}" = "root" ]; then
  echo "Provide the Raspberry Pi kiosk user as the second argument." >&2
  echo "Example: sudo bash tools/kiosk/install-cluster-kiosk.sh /digital-dash admin" >&2
  exit 1
fi

if ! id "${TARGET_USER}" >/dev/null 2>&1; then
  echo "User not found: ${TARGET_USER}" >&2
  exit 1
fi

TARGET_HOME=$(getent passwd "${TARGET_USER}" | cut -d: -f6)
TARGET_GROUP=$(id -gn "${TARGET_USER}")
LABWC_AUTOSTART_FILE="${TARGET_HOME}/.config/labwc/autostart"
AUTOSTART_FILE="${TARGET_HOME}/.config/autostart/digital-dash-cluster.desktop"
LOGIN_HELPER_DIR="${TARGET_HOME}/.config/digital-dash"
LOGIN_HELPER_FILE="${LOGIN_HELPER_DIR}/kiosk-login.sh"
PROFILE_FILE="${TARGET_HOME}/.profile"
HUSHLOGIN_FILE="${TARGET_HOME}/.hushlogin"
PROFILE_MARKER_START="# >>> digital-dash tty1 kiosk >>>"
PROFILE_MARKER_END="# <<< digital-dash tty1 kiosk <<<"
LOGIN_HELPER_TMP_FILE=$(mktemp)
PROFILE_TMP_FILE=$(mktemp)
GETTY_TMP_FILE=$(mktemp)

cleanup() {
  rm -f "${LOGIN_HELPER_TMP_FILE}"
  rm -f "${PROFILE_TMP_FILE}"
  rm -f "${GETTY_TMP_FILE}"
}
trap cleanup EXIT

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

if [ ! -d "${TARGET_HOME}" ]; then
  echo "Home directory not found for user: ${TARGET_USER}" >&2
  exit 1
fi

if [ ! -f "${ROOT_DIR}/tools/kiosk/start-kiosk-session.sh" ]; then
  echo "Missing session launcher script: ${ROOT_DIR}/tools/kiosk/start-kiosk-session.sh" >&2
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  PACKAGES=()

  apt-get update
  if apt-cache show cog >/dev/null 2>&1; then
    PACKAGES+=(cog)
  fi
  if apt-cache show labwc >/dev/null 2>&1; then
    PACKAGES+=(labwc)
  fi
  if apt-cache show swaybg >/dev/null 2>&1; then
    PACKAGES+=(swaybg)
  fi
  if apt-cache show swaylock >/dev/null 2>&1; then
    PACKAGES+=(swaylock)
  fi
  if apt-cache show chromium >/dev/null 2>&1; then
    PACKAGES+=(chromium)
  elif apt-cache show chromium-browser >/dev/null 2>&1; then
    PACKAGES+=(chromium-browser)
  fi

  if [ "${#PACKAGES[@]}" -gt 0 ]; then
    apt-get install -y "${PACKAGES[@]}"
  fi
fi

cat > "${LOGIN_HELPER_TMP_FILE}" <<EOF
#!/usr/bin/env bash
if [ -n "\${SSH_TTY:-}" ]; then
  return 0 2>/dev/null || exit 0
fi

TTY_NAME=\$(tty 2>/dev/null || true)
if [ "\${XDG_VTNR:-}" != "1" ] && [ "\${TTY_NAME}" != "/dev/tty1" ]; then
  return 0 2>/dev/null || exit 0
fi

if [ -n "\${DISPLAY:-}" ] || [ -n "\${WAYLAND_DISPLAY:-}" ] || [ -n "\${DIGITAL_DASH_KIOSK_STARTED:-}" ]; then
  return 0 2>/dev/null || exit 0
fi

export DIGITAL_DASH_KIOSK_STARTED=1
exec "${ROOT_DIR}/tools/kiosk/start-kiosk-session.sh" "${ROOT_DIR}" "${TARGET_URL}"
EOF

install -d -m 0755 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${LOGIN_HELPER_DIR}"
install -m 0755 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${LOGIN_HELPER_TMP_FILE}" "${LOGIN_HELPER_FILE}"
chmod +x "${ROOT_DIR}/tools/kiosk/start-kiosk-session.sh"

if [ -f "${PROFILE_FILE}" ]; then
  if ! grep -Fq "${PROFILE_MARKER_START}" "${PROFILE_FILE}"; then
    printf '\n%s\n[ -f "$HOME/.config/digital-dash/kiosk-login.sh" ] && . "$HOME/.config/digital-dash/kiosk-login.sh"\n%s\n' \
      "${PROFILE_MARKER_START}" \
      "${PROFILE_MARKER_END}" >> "${PROFILE_FILE}"
  fi
else
  cat > "${PROFILE_TMP_FILE}" <<EOF
# ~/.profile: executed by the command interpreter for login shells.
if [ -n "\${BASH_VERSION:-}" ] && [ -f "\$HOME/.bashrc" ]; then
  . "\$HOME/.bashrc"
fi

${PROFILE_MARKER_START}
[ -f "\$HOME/.config/digital-dash/kiosk-login.sh" ] && . "\$HOME/.config/digital-dash/kiosk-login.sh"
${PROFILE_MARKER_END}
EOF
  install -m 0644 -o "${TARGET_USER}" -g "${TARGET_GROUP}" "${PROFILE_TMP_FILE}" "${PROFILE_FILE}"
fi

touch "${HUSHLOGIN_FILE}"
chown "${TARGET_USER}:${TARGET_GROUP}" "${HUSHLOGIN_FILE}"

# Zero-flash kiosk service
cat > /etc/systemd/system/digital-dash-kiosk.service <<EOF
[Unit]
Description=Digital Dash Zero-Flash Kiosk
After=plymouth-start.service network-online.target
Wants=network-online.target
Conflicts=getty@tty1.service display-manager.service

[Service]
Type=simple
User=${TARGET_USER}
Group=${TARGET_GROUP}
WorkingDirectory=${ROOT_DIR}
Environment=XDG_SESSION_TYPE=wayland
Environment=GTK_THEME=Adwaita:dark
ExecStart=${ROOT_DIR}/tools/kiosk/zero-flash-kiosk.sh
Restart=always
RestartSec=3
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes

[Install]
WantedBy=graphical.target
EOF

# Override Plymouth quit to NOT auto-quit - we handle it manually
install -d -m 0755 "${PLYMOUTH_QUIT_OVERRIDE_DIR}"
cat > "${PLYMOUTH_QUIT_OVERRIDE_FILE}" <<EOF
[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/true
EOF

rm -f /etc/systemd/system/digital-dash-plymouth-handoff.service 2>/dev/null || true

# Plymouth cmdline args for clean boot
ensure_cmdline_arg quiet
ensure_cmdline_arg splash
ensure_cmdline_arg loglevel=3

systemctl daemon-reload
systemctl disable getty@tty1.service
systemctl enable digital-dash-kiosk.service
systemctl set-default graphical.target

if [ -f "${LABWC_AUTOSTART_FILE}" ]; then
  mv "${LABWC_AUTOSTART_FILE}" "${LABWC_AUTOSTART_FILE}.bak"
fi

rm -f "${AUTOSTART_FILE}"
rm -f /etc/lightdm/lightdm.conf.d/99-digital-dash-kiosk.conf
rm -f /usr/share/wayland-sessions/digital-dash-kiosk.desktop
rm -rf /etc/systemd/system/plymouth-quit-wait.service.d
rm -f /etc/tmpfiles.d/digital-dash.conf

echo "Installed Digital Dash zero-flash kiosk for user: ${TARGET_USER}"
echo "Cluster URL: ${TARGET_URL}"
echo ""
echo "Next steps:"
echo "1. Install Plymouth theme: sudo cp -r tools/kiosk/plymouth-theme/* /usr/share/plymouth/themes/digital-dash/"
echo "2. Set theme: sudo plymouth-set-default-theme digital-dash"
echo "3. Update initramfs: sudo update-initramfs -u"
echo "4. Reboot to test zero-flash boot"
