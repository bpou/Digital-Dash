#!/usr/bin/env bash
# Zero-flash Digital Dash kiosk launcher
# Designed to eliminate the grey flash between Plymouth and compositor

set -euo pipefail

ROOT_DIR=${1:-/digital-dash}
TARGET_URL=${2:-http://127.0.0.1:5173/cluster}
SPLASH_IMAGE="${ROOT_DIR}/public/Das Rolf.png"
READY_PORT=$((38000 + (RANDOM % 1000)))

# Colors matching cluster theme
CLUSTER_BG="#07090c"
CLUSTER_BG_HEX="07090c"

export XDG_SESSION_TYPE=wayland
export GTK_THEME=Adwaita:dark

find_chromium() {
    local candidate
    for candidate in chromium chromium-browser; do
        if command -v "${candidate}" >/dev/null 2>&1; then
            command -v "${candidate}"
            return 0
        fi
    done
    return 1
}

CHROMIUM_BIN=$(find_chromium || true)
if [ -z "${CHROMIUM_BIN}" ]; then
    echo "Chromium not found" >&2
    exit 1
fi

# Create runtime directory
USER_ID=$(id -u)
RUNTIME_DIR="/run/user/${USER_ID}"
export XDG_RUNTIME_DIR="${RUNTIME_DIR}"
mkdir -p "${RUNTIME_DIR}"

# Critical: Start compositor FIRST with splash background
# This ensures no grey buffer appears
echo "Starting compositor with splash background..."

# Create labwc config with immediate splash
LABWC_DIR="${RUNTIME_DIR}/digital-dash-labwc"
mkdir -p "${LABWC_DIR}"

# Generate splash HTML that matches Plymouth exactly
SPLASH_HTML="${LABWC_DIR}/splash.html"
cat > "${SPLASH_HTML}" <<EOF
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark">
<style>
html,body{margin:0;padding:0;width:100%;height:100%;background:${CLUSTER_BG};overflow:hidden}
#splash{width:100vw;height:100vh;object-fit:cover;object-position:center}
#iframe{width:100%;height:100%;border:0;background:${CLUSTER_BG};opacity:0;transition:opacity 180ms}
</style>
</head>
<body>
<img id="splash" src="file://${SPLASH_IMAGE// /%20}" alt="">
<script>
const clusterUrl = "${TARGET_URL}?kiosk_ready=1";
const iframe = document.createElement('iframe');
iframe.src = clusterUrl;
iframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;background:${CLUSTER_BG}";
iframe.onload = () => {
  iframe.style.opacity = '1';
};
document.body.appendChild(iframe);

// Hide splash when cluster is ready
window.addEventListener('message', (e) => {
  if (e.data?.type === 'digital-dash-ready') {
    document.getElementById('splash').style.opacity = '0';
  }
});
</script>
</body>
</html>
EOF

# Labwc autostart - start with splash immediately
cat > "${LABWC_DIR}/autostart" <<EOF
#!/bin/bash
# Start background that matches splash exactly - NO DELAY
cat > "${RUNTIME_DIR}/digital-dash-ready" <<READY_EOF
$(date +%s)
READY_EOF
swaybg -i "${SPLASH_IMAGE}" -m fill -c ${CLUSTER_BG_HEX} &
EOF
chmod +x "${LABWC_DIR}/autostart"

# Environment for labwc
cat > "${LABWC_DIR}/environment" <<EOF
GTK_THEME=Adwaita:dark
XDG_SESSION_TYPE=wayland
EOF

# Now start labwc - this draws to the same framebuffer Plymouth used
echo "Launching labwc..."
labwc -C "${LABWC_DIR}" &
LABWC_PID=$!

# Wait for Wayland socket
for i in $(seq 1 50); do
    if [ -S "${RUNTIME_DIR}/wayland-1" ]; then
        break
    fi
    sleep 0.1
done

# CRITICAL: Don't quit Plymouth until compositor has drawn
# Plymouth will still be showing, and now labwc draws over it
# Give it a moment for first frame
sleep 0.3

# Now safe to quit Plymouth (compositor has content)
echo "Quitting Plymouth - compositor ready"
plymouth quit --retain-splash 2>/dev/null || true

# Launch Chromium with matching background
echo "Launching Chromium..."
"${CHROMIUM_BIN}" \
    --ozone-platform=wayland \
    --kiosk \
    --no-first-run \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --hide-scrollbars \
    --default-background-color='#07090c' \
    --force-dark-mode \
    --enable-features=UseOzonePlatform,WebUIDarkMode \
    --force-color-profile=srgb \
    --disable-translate \
    --disable-features=TranslateUI \
    "file://${SPLASH_HTML}" &

CHROMIUM_PID=$!

# When Chromium signals ready, navigate to cluster
# (This is handled by the splash.html loading the cluster iframe after ready signal)

wait "${CHROMIUM_PID}"
kill "${LABWC_PID}" 2>/dev/null || true
labwc --exit 2>/dev/null || true