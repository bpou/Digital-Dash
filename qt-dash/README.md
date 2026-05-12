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

This boots the Raspberry Pi into the normal Wayland graphical session and starts the fullscreen Qt app from the user's labwc autostart. The installer restores the default system labwc desktop autostart when a previous Digital Dash backup exists, removes the old tty/Chromium kiosk autostart, enables LightDM autologin, and installs Qt startup entries for the target user.

```bash
cd /home/admin/digital-dash
sudo bash qt-dash/scripts/install-rpi-desktop-autostart.sh /home/admin/digital-dash admin cluster
sudo reboot
```

Logs are written to:

```bash
tail -120 ~/.cache/digital-dash-qt.log
```
