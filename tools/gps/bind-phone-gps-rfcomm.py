#!/usr/bin/env python3
"""
Bind an already-paired phone's Bluetooth SPP GPS stream to /dev/rfcomm0,
verify NMEA data, and start gpsd on that device.

Configure PHONE_MAC below, then run as root or with sudo:
    sudo python3 tools/gps/bind-phone-gps-rfcomm.py
"""

import os
import subprocess
import sys
import time

PHONE_MAC = "AA:BB:CC:DD:EE:FF"
RFCOMM_DEV = "/dev/rfcomm0"
RFCOMM_NAME = "rfcomm0"
RFCOMM_CHANNEL = "1"
GPSD_SOCKET = "/var/run/gpsd.sock"
VERIFY_TIMEOUT_SEC = 18
RETRY_DELAY_SEC = 8
READ_CHUNK_BYTES = 256


def log(message):
    print(time.strftime("[%Y-%m-%d %H:%M:%S]"), message, flush=True)


def run(cmd, check=False):
    log("+ " + " ".join(cmd))
    return subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=check)


def require_root():
    if os.geteuid() != 0:
        log("This script must run as root. Use: sudo python3 tools/gps/bind-phone-gps-rfcomm.py")
        sys.exit(1)


def rfcomm_exists():
    return os.path.exists(RFCOMM_DEV)


def unbind_rfcomm():
    if not rfcomm_exists():
        return
    log(f"{RFCOMM_DEV} already exists; releasing it first")
    result = run(["rfcomm", "release", RFCOMM_NAME])
    if result.returncode != 0:
        log(result.stderr.strip() or "rfcomm release failed; continuing")
    time.sleep(1)


def bind_rfcomm():
    result = run(["rfcomm", "bind", RFCOMM_NAME, PHONE_MAC, RFCOMM_CHANNEL])
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "rfcomm bind failed")
    deadline = time.time() + 5
    while time.time() < deadline:
        if rfcomm_exists():
            log(f"Bound {RFCOMM_DEV} to {PHONE_MAC} channel {RFCOMM_CHANNEL}")
            return
        time.sleep(0.2)
    raise RuntimeError(f"{RFCOMM_DEV} was not created after rfcomm bind")


def verify_nmea():
    log(f"Waiting for NMEA data from {RFCOMM_DEV}")
    deadline = time.time() + VERIFY_TIMEOUT_SEC
    buffer = ""
    fd = os.open(RFCOMM_DEV, os.O_RDONLY | os.O_NONBLOCK)
    try:
        while time.time() < deadline:
            try:
                chunk = os.read(fd, READ_CHUNK_BYTES)
            except BlockingIOError:
                time.sleep(0.25)
                continue
            if not chunk:
                time.sleep(0.25)
                continue
            buffer += chunk.decode("ascii", errors="ignore")
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                log(f"NMEA: {line[:96]}")
                if line.startswith("$GP") or line.startswith("$GN"):
                    return True
        return False
    finally:
        os.close(fd)


def stop_gpsd():
    run(["systemctl", "stop", "gpsd.socket"])
    run(["systemctl", "stop", "gpsd"])
    run(["pkill", "-x", "gpsd"])


def start_gpsd():
    stop_gpsd()
    os.makedirs(os.path.dirname(GPSD_SOCKET), exist_ok=True)
    result = subprocess.Popen(["gpsd", "-N", "-F", GPSD_SOCKET, RFCOMM_DEV])
    log(f"Started gpsd pid={result.pid} on {RFCOMM_DEV}")
    return result


def main():
    require_root()
    if PHONE_MAC == "AA:BB:CC:DD:EE:FF":
        log("Set PHONE_MAC at the top of this script before running.")
        sys.exit(2)

    gpsd_process = None
    while True:
        try:
            if gpsd_process and gpsd_process.poll() is None:
                time.sleep(RETRY_DELAY_SEC)
                continue

            unbind_rfcomm()
            bind_rfcomm()

            if not verify_nmea():
                raise RuntimeError("No $GP/$GN NMEA sentence received. Is the phone GPS app broadcasting SPP/NMEA?")

            gpsd_process = start_gpsd()
            log("gpsd is running. The dashboard service can read live GPS from gpspipe/gpsd.")

        except KeyboardInterrupt:
            log("Stopping")
            if gpsd_process and gpsd_process.poll() is None:
                gpsd_process.terminate()
            unbind_rfcomm()
            return
        except Exception as exc:
            log(f"GPS bind failed: {exc}")
            unbind_rfcomm()
            log(f"Retrying in {RETRY_DELAY_SEC}s")
            time.sleep(RETRY_DELAY_SEC)


if __name__ == "__main__":
    main()
