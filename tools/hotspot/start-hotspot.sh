#!/usr/bin/env bash
set -euo pipefail

SSID=${HOTSPOT_SSID:-DigitalDash}
PSK=${HOTSPOT_PSK:-dash12345}
IFACE=${HOTSPOT_IFACE:-wlan0}

if ! command -v nmcli >/dev/null 2>&1; then
  echo "nmcli not found. Install NetworkManager or replace this script with hostapd/dnsmasq." >&2
  exit 1
fi

# Create or reuse a named hotspot connection
if ! nmcli -t -f NAME con show | grep -qx "digital-dash-hotspot"; then
  nmcli con add type wifi ifname "${IFACE}" con-name "digital-dash-hotspot" autoconnect yes \
    ssid "${SSID}" 802-11-wireless.mode ap 802-11-wireless.band bg \
    ipv4.method shared wifi-sec.key-mgmt wpa-psk wifi-sec.psk "${PSK}"
fi

nmcli con up "digital-dash-hotspot"
