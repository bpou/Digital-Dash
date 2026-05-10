#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_USER=${2:-${SUDO_USER:-}}
TARGET_URL=${3:-http://127.0.0.1:5173/cluster}

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

CMDLINE_FILE=/boot/firmware/cmdline.txt

# Install packages
if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  for pkg in labwc swaybg chromium; do
    if apt-cache show "${pkg}" >/dev/null 2>&1; then
      apt-get install -y "${pkg}" 2>/dev/null || true
    fi
  done
fi

# Create systemd service that starts BEFORE plymouth-quit-wait
cat > /etc/systemd/system/digital-dash-kiosk.service <<EOF
[Unit]
Description=Digital Dash Zero-Flash Kiosk
Before=plymouth-quit-wait.service
After=plymouth-start.service plymouth-read-write.service network-online.target
Wants=network-online.target
Conflicts=getty@tty1.service display-manager.service

[Service]
Type=simple
User=${TARGET_USER}
WorkingDirectory=${ROOT_DIR}
Environment=XDG_SESSION_TYPE=wayland
Environment=GTK_THEME=Adwaita:dark
ExecStartPre=/bin/sleep 0.5
ExecStart=${ROOT_DIR}/tools/kiosk/zero-flash-kiosk.sh
Restart=always
RestartSec=3
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes

[Install]
WantedBy=graphical.target
EOF

# Clean up legacy configs
rm -f /etc/systemd/system/getty@tty1.service.d/digital-dash-autologin.conf
rm -rf /home/${TARGET_USER}/.config/digital-dash
rm -f /home/${TARGET_USER}/.hushlogin

# Remove Plymouth quit override
rm -f /etc/systemd/system/plymouth-quit.service.d/override.conf

# Cmdline args for clean boot
if [ -f "${CMDLINE_FILE}" ]; then
  sed -i 's/console=tty1 //' "${CMDLINE_FILE}" 2>/dev/null || true
  for arg in quiet splash loglevel=3; do
    grep -q "${arg}" "${CMDLINE_FILE}" || sed -i "1s|\$| ${arg}|" "${CMDLINE_FILE}"
  done
fi

systemctl daemon-reload
systemctl disable getty@tty1.service
systemctl enable digital-dash-kiosk.service
systemctl set-default graphical.target

echo ""
echo "Installed Digital Dash zero-flash kiosk for user: ${TARGET_USER}"
echo ""
echo "To complete setup:"
echo "  1. Install Plymouth theme:"
echo "     sudo mkdir -p /usr/share/plymouth/themes/digital-dash"
echo "     sudo cp -r ${ROOT_DIR}/tools/kiosk/plymouth-theme/* /usr/share/plymouth/themes/digital-dash/"
echo "     sudo plymouth-set-default-theme digital-dash"
echo "     sudo update-initramfs -u"
echo "  2. Reboot: sudo reboot"