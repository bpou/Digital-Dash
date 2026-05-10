#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_USER=${2:-${SUDO_USER:-}}
TARGET_URL=${3:-http://127.0.0.1:5173/cluster}
GETTY_OVERRIDE_DIR=/etc/systemd/system/getty@tty1.service.d
GETTY_OVERRIDE_FILE=${GETTY_OVERRIDE_DIR}/digital-dash-autologin.conf

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

if [ ! -d "${TARGET_HOME}" ]; then
  echo "Home directory not found for user: ${TARGET_USER}" >&2
  exit 1
fi

if [ ! -f "${ROOT_DIR}/tools/kiosk/start-kiosk-session.sh" ]; then
  echo "Missing session launcher script: ${ROOT_DIR}/tools/kiosk/start-kiosk-session.sh" >&2
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y cage
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

cat > "${GETTY_TMP_FILE}" <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${TARGET_USER} --noclear %I \$TERM
Type=simple
EOF

install -d -m 0755 "${GETTY_OVERRIDE_DIR}"
install -m 0644 "${GETTY_TMP_FILE}" "${GETTY_OVERRIDE_FILE}"

if [ -f "${LABWC_AUTOSTART_FILE}" ]; then
  mv "${LABWC_AUTOSTART_FILE}" "${LABWC_AUTOSTART_FILE}.bak"
fi

rm -f "${AUTOSTART_FILE}"
rm -f /etc/lightdm/lightdm.conf.d/99-digital-dash-kiosk.conf
rm -f /usr/share/wayland-sessions/digital-dash-kiosk.desktop

systemctl daemon-reload
systemctl enable getty@tty1.service
systemctl disable lightdm.service >/dev/null 2>&1 || true
systemctl set-default multi-user.target

if command -v raspi-config >/dev/null 2>&1; then
  raspi-config nonint do_blanking 1 || true
fi

echo "Installed Digital Dash tty1 kiosk for user: ${TARGET_USER}"
echo "Cluster URL: ${TARGET_URL}"
echo "On next boot, Raspberry Pi OS will skip the desktop manager and launch the kiosk directly from tty1."
