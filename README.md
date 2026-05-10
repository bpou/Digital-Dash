# Digital Dash

Digital instrument cluster and center-screen UI intended to run locally on a Raspberry Pi.

## Local Development

Install dependencies:

```bash
npm install
(cd server/bluetooth-service && npm install)
```

Run the three local processes:

```bash
# UI (Vite dev server)
npm run dev -- --host

# vehicle websocket / MQTT bridge
npm run vehicle-service

# bluetooth bridge
node server/bluetooth-service/server.js
```

Cluster route:

```text
http://127.0.0.1:5173/cluster
```

## Raspberry Pi Install

The Pi install path is production-oriented. It builds the UI into `dist/`, serves it locally from a small Node static server, enables the backend services, and can optionally install the kiosk boot path for a user.

From the repo root on the Pi:

```bash
sudo bash tools/systemd/install.sh "$PWD" <pi-username>
sudo reboot
```

What this installer does:

- installs npm dependencies
- builds the production UI bundle
- enables and restarts `digital-dash-ui.service`
- enables and restarts `digital-dash-vehicle.service`
- enables and restarts `digital-dash-bluetooth.service`
- optionally installs the `tty1` kiosk boot flow for the chosen user

Relevant files:

- `tools/systemd/install.sh`
- `tools/systemd/digital-dash-ui.service`
- `tools/systemd/digital-dash-vehicle.service`
- `tools/systemd/digital-dash-bluetooth.service`
- `tools/kiosk/install-cluster-kiosk.sh`
- `tools/kiosk/start-kiosk-session.sh`
- `tools/ui-server/server.js`

## Kiosk Boot Notes

The current kiosk path is:

- `tty1` autologin for the selected user
- direct kiosk launch from the login shell
- `labwc` Wayland session
- fullscreen Chromium booting into the cluster flow

Current splash assets:

- early boot splash can be handled by Raspberry Pi OS / Plymouth
- the in-browser branded splash uses `public/Das Rolf.png`

On Raspberry Pi 4/5, the physical `HDMI1` connector is typically exposed by Raspberry Pi OS as `HDMI-A-2`.

## Bluetooth Phone Calling (HFP via oFono)

The Phone tab can place, answer, and hang up calls over Bluetooth when the `bluetooth-service` can access an oFono modem. This requires oFono to be installed, configured, and paired to your phone with the Hands-Free profile (HFP).

### 1. Install oFono and BlueZ extras

On Debian, Ubuntu, or Raspberry Pi OS:

```bash
sudo apt update
sudo apt install -y ofono bluez bluez-tools
```

`ofono-phonesim` is optional and only useful for testing without a real phone.

### 2. Configure BlueZ for HFP

Edit [`/etc/bluetooth/main.conf`](/etc/bluetooth/main.conf) and ensure HFP-related profiles are enabled:

```ini
[General]
Enable=Source,Sink,Media,Socket
Class=0x200414
```

Restart BlueZ:

```bash
sudo systemctl restart bluetooth
```

### 3. Configure oFono to use BlueZ

Create or edit [`/etc/ofono/main.conf`](/etc/ofono/main.conf):

```ini
[General]
UseBlueZ=1
UseHfp=1
```

Restart oFono:

```bash
sudo systemctl restart ofono
```

### 4. Pair the phone with HFP enabled

Ensure your phone supports HFP and allow phone calls during pairing. Pair using the Settings tab in the UI. The oFono modem should appear as a BlueZ modem once connected.

### 5. Verify oFono sees the modem

```bash
sudo busctl --system call org.ofono / org.ofono.Manager GetModems
```

You should see an `/ofono/<modem>` path in the output. If not, re-pair the phone and confirm HFP permissions.

If you see `Call failed: Access denied`, allow the service user to call oFono over D-Bus. Install polkit first if needed:

```bash
sudo apt install -y polkitd pkexec
sudo systemctl restart polkit
```

Then install a permissive oFono rule for the service user:

```bash
sudo tee /etc/polkit-1/rules.d/60-digital-dash-ofono.rules <<'EOF'
polkit.addRule(function(action, subject) {
  if (action.id.indexOf("org.ofono.") === 0) {
    if (subject.user == "admin") {
      return polkit.Result.YES;
    }
  }
});
EOF
```

Restart polkit and oFono:

```bash
sudo systemctl restart polkit
sudo systemctl restart ofono
```

### 6. Call actions from the UI

The Phone tab uses these backend endpoints:

- `POST /call/dial?number=...`
- `POST /call/answer`
- `POST /call/hangup`

These map to oFono voice call operations in [server/bluetooth-service/server.js](/server/bluetooth-service/server.js:308).

Useful logs:

```bash
sudo journalctl -u digital-dash-ui.service -f
sudo journalctl -u digital-dash-vehicle.service -f
sudo journalctl -u digital-dash-bluetooth.service -f
```
