import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = { duration: 0.2, ease: "easeOut" };

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white/60">
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function SettingsPage() {
  const [showBluetooth, setShowBluetooth] = useState(false);
  const [btDevices, setBtDevices] = useState<
    Array<{
      mac: string;
      name: string;
      alias?: string;
      connected: boolean;
      paired: boolean;
      trusted: boolean;
      blocked: boolean;
      rssi: number | null;
    }>
  >([]);
  const [btBusyMac, setBtBusyMac] = useState<string | null>(null);
  const [btError, setBtError] = useState<string | null>(null);
  const [btScanning, setBtScanning] = useState(false);

  const btBaseUrl = useMemo(() => {
    const host = window.location.hostname;
    return `http://${host}:5175`;
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${btBaseUrl}/devices`);
      if (!res.ok) throw new Error("Failed to load devices");
      const data = (await res.json()) as { devices: typeof btDevices };
      setBtDevices(data.devices ?? []);
      setBtError(null);
    } catch (err) {
      setBtError(err instanceof Error ? err.message : "Bluetooth service error");
    }
  };

  const btAction = async (path: string, mac?: string) => {
    try {
      if (mac) setBtBusyMac(mac);
      const url = mac ? `${btBaseUrl}${path}?mac=${encodeURIComponent(mac)}` : `${btBaseUrl}${path}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Bluetooth action failed");
      await fetchDevices();
    } catch (err) {
      setBtError(err instanceof Error ? err.message : "Bluetooth action failed");
    } finally {
      setBtBusyMac(null);
    }
  };

  useEffect(() => {
    if (!showBluetooth) return;
    fetchDevices();
    btAction("/scan/start").then(() => setBtScanning(true));
    const interval = setInterval(fetchDevices, 2500);
    return () => {
      clearInterval(interval);
      btAction("/scan/stop").finally(() => setBtScanning(false));
    };
  }, [showBluetooth]);

  return (
    <motion.div
      className="flex h-full w-full flex-col gap-4 bg-black p-4 text-white overflow-hidden"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <div className="grid flex-1 grid-cols-[1.4fr_1fr] gap-4">
        <div className="flex h-full flex-col gap-4">
          <div className="rounded-[16px] bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Settings</p>
            <div className="mt-4 space-y-3">
              {[
                { title: "Display", meta: "Brightness · Auto" },
                { title: "Controls", meta: "Steering · Mirrors" },
                { title: "Safety", meta: "Sentry · Alarms" },
                { title: "Autopilot", meta: "Navigate on AP" },
                { title: "Software", meta: "Version 2024.12" },
              ].map((item) => (
                <motion.button
                  key={item.title}
                  type="button"
                  className="flex min-h-[52px] w-full items-center justify-between rounded-[12px] bg-white/5 px-4 py-3 text-left hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                >
                  <div>
                    <p className="text-sm text-white/90">{item.title}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">{item.meta}</p>
                  </div>
                  <ChevronRight />
                </motion.button>
              ))}
            </div>
          </div>

          <div className="rounded-[16px] bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Driver profile</p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-white/90">Profile · Alex</p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Easy entry enabled</p>
              </div>
              <motion.button
                type="button"
                className="min-h-[44px] rounded-[10px] bg-white/5 px-4 text-xs uppercase tracking-[0.3em] text-white/70 hover:bg-white/10"
                whileTap={{ scale: 0.95, opacity: 0.8 }}
              >
                Manage
              </motion.button>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col gap-4">
          <div className="rounded-[16px] bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Software update</p>
              <span className="text-xs uppercase tracking-[0.2em] text-emerald-400">Ready</span>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-lg font-medium text-white/90">Version 2024.12.5</p>
              <p className="text-sm text-white/60">Download complete · 85% charged</p>
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">Install time · 25 min</p>
            </div>
            <motion.button
              type="button"
              className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-[12px] bg-white/10 text-xs uppercase tracking-[0.3em] text-white/80 hover:bg-white/20"
              whileTap={{ scale: 0.95, opacity: 0.8 }}
            >
              Schedule install
            </motion.button>
          </div>

          <div className="rounded-[16px] bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Connectivity</p>
            <div className="mt-4 space-y-3">
              {[
                { label: "Bluetooth", value: "On · 3 devices" },
                { label: "Premium Connectivity", value: "Active" },
              ].map((item, index) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/90">{item.label}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">{item.value}</p>
                  </div>
                  {index === 0 && (
                    <motion.button
                      type="button"
                      onClick={() => setShowBluetooth(true)}
                      className="min-h-[44px] rounded-[10px] bg-white/5 px-3 text-xs uppercase tracking-[0.3em] text-white/70 hover:bg-white/10"
                      whileTap={{ scale: 0.95, opacity: 0.8 }}
                    >
                      Manage
                    </motion.button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showBluetooth && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex max-h-[640px] w-[520px] flex-col rounded-[20px] border border-white/10 bg-[#0b0f14] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">Bluetooth devices</p>
                <p className="mt-2 text-lg font-medium text-white/90">Manage devices</p>
              </div>
              <motion.button
                type="button"
                onClick={() => setShowBluetooth(false)}
                className="min-h-[40px] rounded-[10px] bg-white/5 px-3 text-xs uppercase tracking-[0.3em] text-white/70 hover:bg-white/10"
                whileTap={{ scale: 0.95, opacity: 0.8 }}
              >
                Close
              </motion.button>
            </div>
            {btError && (
              <div className="mt-4 rounded-[12px] border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                {btError}
              </div>
            )}
            <div className="mt-4 h-[320px] space-y-3 overflow-y-scroll pr-2">
              {btDevices.length === 0 ? (
                <div className="rounded-[12px] bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.2em] text-white/40">
                  No devices found
                </div>
              ) : (
                btDevices.map((device) => (
                  <div
                    key={device.mac}
                    className="flex items-center justify-between rounded-[12px] bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-white/90">{device.name || device.alias || device.mac}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                        {device.connected ? "Connected" : device.paired ? "Paired" : "Available"}
                        {device.rssi !== null ? ` · RSSI ${device.rssi}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!device.paired && (
                        <motion.button
                          type="button"
                          disabled={btBusyMac === device.mac}
                          onClick={() => btAction("/pair", device.mac)}
                          className="min-h-[36px] rounded-[10px] bg-white/10 px-3 text-[10px] uppercase tracking-[0.3em] text-white/80 hover:bg-white/20 disabled:opacity-50"
                          whileTap={{ scale: 0.95, opacity: 0.8 }}
                        >
                          Pair
                        </motion.button>
                      )}
                      {device.connected ? (
                        <motion.button
                          type="button"
                          disabled={btBusyMac === device.mac}
                          onClick={() => btAction("/disconnect", device.mac)}
                          className="min-h-[36px] rounded-[10px] bg-white/10 px-3 text-[10px] uppercase tracking-[0.3em] text-white/80 hover:bg-white/20 disabled:opacity-50"
                          whileTap={{ scale: 0.95, opacity: 0.8 }}
                        >
                          Disconnect
                        </motion.button>
                      ) : (
                        <motion.button
                          type="button"
                          disabled={btBusyMac === device.mac}
                          onClick={() => btAction("/connect", device.mac)}
                          className="min-h-[36px] rounded-[10px] bg-white/10 px-3 text-[10px] uppercase tracking-[0.3em] text-white/80 hover:bg-white/20 disabled:opacity-50"
                          whileTap={{ scale: 0.95, opacity: 0.8 }}
                        >
                          Connect
                        </motion.button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.25em] text-white/40">Search for new device</span>
              <motion.button
                type="button"
                onClick={async () => {
                  if (btScanning) {
                    await btAction("/scan/stop");
                    setBtScanning(false);
                  } else {
                    await btAction("/scan/start");
                    setBtScanning(true);
                  }
                }}
                className="min-h-[44px] rounded-[12px] bg-white/10 px-4 text-xs uppercase tracking-[0.3em] text-white/80 hover:bg-white/20"
                whileTap={{ scale: 0.95, opacity: 0.8 }}
              >
                {btScanning ? "Stop" : "Scan"}
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
