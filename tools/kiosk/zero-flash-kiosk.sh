#!/usr/bin/env bash
# Zero-flash kiosk for Raspberry Pi
# Boots directly to cluster UI without visible transitions

set -euo pipefail

# Find the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

TARGET_URL=${1:-http://127.0.0.1:5173/cluster}
SPLASH_IMAGE="${ROOT_DIR}/public/Das Rolf.png"
CLUSTER_BG="#07090c"
CLUSTER_BG_HEX="07090c"
USER_ID=$(id -u)
RUNTIME_DIR="/run/user/${USER_ID}"

export XDG_SESSION_TYPE=wayland
export GTK_THEME=Adwaita:dark
export XDG_RUNTIME_DIR="${RUNTIME_DIR}"
mkdir -p "${RUNTIME_DIR}"

# Find binaries
CHROMIUM_BIN=$(command -v chromium chromium-browser 2>/dev/null | head -1 || echo "/usr/bin/chromium")
SWAYBG_BIN=$(command -v swaybg 2>/dev/null || echo "/usr/bin/swaybg")
PLYMOUTH_BIN=$(command -v plymouth 2>/dev/null || echo "/usr/bin/plymouth")

# Setup labwc config directory
LABWC_DIR="${RUNTIME_DIR}/digital-dash"
mkdir -p "${LABWC_DIR}"

# Create splash HTML
cat > "${LABWC_DIR}/splash.html" <<'HTMLEOF'
<!doctype html>
<html><head>
<meta charset="utf-8">
<style>
html,body{margin:0;padding:0;width:100%;height:100%;background:#07090c;overflow:hidden}
#splash{width:100vw;height:100vh;object-fit:cover;display:block}
iframe{width:100%;height:100%;border:0;position:absolute;inset:0;opacity:0;background:#07090c}
</style></head>
<body>
<img id="splash" src="SPLASH_URL" alt="">
<script>
const f=document.createElement('iframe');
f.src='TARGET_URL?kiosk_ready=1';
f.onload=()=>{f.style.opacity='1'};
document.body.appendChild(f);
window.addEventListener('message',e=>{
  if(e.data&&e.data.type==='digital-dash-ready'){
    document.getElementById('splash').style.opacity='0';
  }
});
</script>
</body></html>
HTMLEOF

sed -i "s|SPLASH_URL|file://${SPLASH_IMAGE// /%20}|" "${LABWC_DIR}/splash.html"
sed -i "s|TARGET_URL|${TARGET_URL}|" "${LABWC_DIR}/splash.html"

# Labwc autostart
cat > "${LABWC_DIR}/autostart" <<AUTOSTARTEOF
#!/bin/bash
pkill -f swaybg 2>/dev/null || true
"${SWAYBG_BIN}" -i "${SPLASH_IMAGE}" -m fill -c ${CLUSTER_BG_HEX} &
sleep 0.3
"${PLYMOUTH_BIN}" --ping && "${PLYMOUTH_BIN}" quit --retain-splash 2>/dev/null || true
"${CHROMIUM_BIN}" --ozone-platform=wayland --kiosk --no-first-run --noerrdialogs \
  --disable-infobars --default-background-color='#07090c' \
  --app="file://${LABWC_DIR}/splash.html" &
AUTOSTARTEOF
chmod +x "${LABWC_DIR}/autostart"

# Environment
cat > "${LABWC_DIR}/environment" <<EOF
GTK_THEME=Adwaita:dark
XDG_SESSION_TYPE=wayland
EOF

exec labwc -C "${LABWC_DIR}"