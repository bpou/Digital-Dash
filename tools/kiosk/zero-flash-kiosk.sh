#!/usr/bin/env bash
# Zero-flash kiosk for Raspberry Pi
# Boots directly to cluster UI without visible transitions

set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_URL=${2:-http://127.0.0.1:5173/cluster}
SPLASH_IMAGE="${ROOT_DIR}/public/Das Rolf.png"
CLUSTER_BG="#07090c"
CLUSTER_BG_HEX="07090c"
USER_ID=$(id -u)
RUNTIME_DIR="/run/user/${USER_ID}"

export XDG_SESSION_TYPE=wayland
export GTK_THEME=Adwaita:dark
export XDG_RUNTIME_DIR="${RUNTIME_DIR}"
mkdir -p "${RUNTIME_DIR}"

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

# Replace placeholders
sed -i "s|SPLASH_URL|file://${SPLASH_IMAGE// /%20}|" "${LABWC_DIR}/splash.html"
sed -i "s|TARGET_URL|${TARGET_URL}|" "${LABWC_DIR}/splash.html"

# Labwc autostart - runs after labwc starts
cat > "${LABWC_DIR}/autostart" <<AUTOSTARTEOF
#!/bin/bash
# Kill existing swaybg
pkill -f swaybg 2>/dev/null || true
# Start background matching splash color - MUST DO THIS BEFORE PLYMOUTH QUIT
swaybg -i "${SPLASH_IMAGE}" -m fill -c ${CLUSTER_BG_HEX} &
# Wait for swaybg to draw
sleep 0.3
# Now tell Plymouth to quit - we have content visible
plymouth --ping && plymouth quit --retain-splash 2>/dev/null || true
# Launch Chromium
chromium --ozone-platform=wayland --kiosk --no-first-run --noerrdialogs \
  --disable-infobars --default-background-color='#07090c' \
  --app="file://${LABWC_DIR}/splash.html" &
AUTOSTARTEOF
chmod +x "${LABWC_DIR}/autostart"

# Environment
cat > "${LABWC_DIR}/environment" <<EOF
GTK_THEME=Adwaita:dark
XDG_SESSION_TYPE=wayland
EOF

# Start labwc - will block until session ends
exec labwc -C "${LABWC_DIR}"