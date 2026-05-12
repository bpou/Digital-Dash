# Digital Dash Qt

Qt/QML prototype for replacing the React kiosk UI with a native fullscreen app.

## Build on Raspberry Pi

```bash
sudo apt update
sudo apt install -y build-essential cmake ninja-build qt6-base-dev qt6-declarative-dev qt6-websockets-dev qml6-module-qtquick qml6-module-qtquick-controls

cd /home/admin/digital-dash/qt-dash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/digital-dash-qt --ws ws://127.0.0.1:8765
```

Use `Esc` to quit while testing.

Choose the screen with `--view cluster` or `--view center`:

```bash
./build/digital-dash-qt --view cluster --ws ws://127.0.0.1:8765
./build/digital-dash-qt --view center --ws ws://127.0.0.1:8765
```

## Install as Raspberry Pi Desktop autostart

This boots the Raspberry Pi into the normal Wayland graphical session and starts the fullscreen Qt app with a systemd service running as the target user. The installer sets `Das Rolf.png` as the Plymouth boot splash and PCManFM desktop wallpaper, restores the system labwc desktop autostart, removes old tty/Chromium, desktop autostart, Plymouth handoff wait, and panel entries, points desktop icons at an empty folder, enables LightDM autologin, and enables `digital-dash-qt.service`.

```bash
cd /home/admin/digital-dash
sudo bash qt-dash/scripts/install-rpi-desktop-autostart.sh /home/admin/digital-dash admin cluster
sudo reboot
```

Logs are written to:

```bash
tail -120 ~/.cache/digital-dash-qt.log
```

Check the service with:

```bash
systemctl status digital-dash-qt.service
journalctl -u digital-dash-qt.service -n 120 --no-pager
```

Check the boot splash with:

```bash
plymouth-set-default-theme
cat /etc/plymouth/plymouthd.conf
cat /boot/firmware/cmdline.txt
```
