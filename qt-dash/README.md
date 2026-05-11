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
