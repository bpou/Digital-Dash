import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { hexToRgba } from "../../utils/color";
import { useVehicleState } from "../../vehicle/vehicleClient";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = { duration: 0.2, ease: "easeOut" };

const MAX_DIAL_LENGTH = 20;
const RECENT_CALLS_KEY = "tesla-dash:recent-calls";

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const KeypadButton = ({
  label,
  sub,
  onPress,
}: {
  label: string;
  sub?: string;
  onPress: (value: string) => void;
}) => (
  <motion.button
    type="button"
    className="flex min-h-[56px] flex-col items-center justify-center rounded-[12px] bg-white/5 text-lg text-white/90 hover:bg-white/10"
    whileTap={{ scale: 0.95, opacity: 0.8 }}
    onClick={() => onPress(label)}
  >
    <span className="text-[20px] font-medium">{label}</span>
    {sub && <span className="text-[10px] uppercase tracking-[0.25em] text-white/50">{sub}</span>}
  </motion.button>
);

type BtDevice = {
  mac: string;
  name: string;
  alias?: string;
  connected: boolean;
};

type CallState = "idle" | "incoming" | "outgoing" | "active";

type RecentCall = {
  id: string;
  name: string;
  number: string;
  type: "incoming" | "outgoing" | "missed";
  timestamp: number;
};

type ActiveCall = {
  name: string;
  number: string;
  direction: "incoming" | "outgoing";
};

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatDateLabel = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === today) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short" });
};

const formatTimeLabel = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

const formatCallMeta = (call: RecentCall) => {
  const day = formatDateLabel(call.timestamp);
  if (call.type === "missed") return `${day} · Missed`;
  return `${day} · ${formatTimeLabel(call.timestamp)}`;
};

const buildSeedCalls = (): RecentCall[] => {
  const now = Date.now();
  return [
    {
      id: "seed-1",
      name: "Jordan Lee",
      number: "+46 70 123 45 67",
      type: "outgoing",
      timestamp: now - 1000 * 60 * 45,
    },
    {
      id: "seed-2",
      name: "Emily Park",
      number: "+46 73 555 11 22",
      type: "missed",
      timestamp: now - 1000 * 60 * 60 * 20,
    },
    {
      id: "seed-3",
      name: "Service Center",
      number: "+46 8 555 00 00",
      type: "incoming",
      timestamp: now - 1000 * 60 * 60 * 72,
    },
  ];
};

export default function PhonePage() {
  const { ambient } = useVehicleState();
  const ambientColor = ambient?.color ?? "#7EE3FF";
  const ambientBrightness = ambient?.brightness ?? 65;
  const ambientStrength = ambientBrightness / 100;
  const [btDevice, setBtDevice] = useState<BtDevice | null>(null);
  const [btError, setBtError] = useState<string | null>(null);
  const [dialNumber, setDialNumber] = useState("");
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_CALLS_KEY);
      if (!raw) return buildSeedCalls();
      const parsed = JSON.parse(raw) as RecentCall[];
      return parsed.length ? parsed : buildSeedCalls();
    } catch {
      return buildSeedCalls();
    }
  });
  const [callState, setCallState] = useState<CallState>("idle");
  const [callStateSince, setCallStateSince] = useState<number | null>(null);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callElapsed, setCallElapsed] = useState(0);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [muted, setMuted] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  const btBaseUrl = useMemo(() => {
    const host = window.location.hostname;
    return `http://${host}:5175`;
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch(`${btBaseUrl}/devices`);
        if (!res.ok) throw new Error("Bluetooth service unavailable");
        const data = (await res.json()) as { devices?: BtDevice[] };
        const connected = (data.devices ?? []).find((device) => device.connected) ?? null;
        setBtDevice(connected);
        setBtError(null);
      } catch (err) {
        setBtDevice(null);
        setBtError(err instanceof Error ? err.message : "Bluetooth service unavailable");
      }
    };

    fetchDevices();
    const interval = window.setInterval(fetchDevices, 4000);
    return () => window.clearInterval(interval);
  }, [btBaseUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_CALLS_KEY, JSON.stringify(recentCalls));
    } catch {
      // ignore persistence failures
    }
  }, [recentCalls]);

  useEffect(() => {
    if (callState === "idle") {
      setCallElapsed(0);
      return;
    }
    const timer = window.setInterval(() => {
      const base = callState === "active" ? callStartedAt : callStateSince;
      if (!base) return;
      setCallElapsed(Math.max(0, Math.floor((Date.now() - base) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callState, callStartedAt, callStateSince]);

  useEffect(() => {
    if (callState !== "outgoing") return;
    const timer = window.setTimeout(() => {
      setCallState("active");
      setCallStartedAt(Date.now());
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [callState]);

  const beginCallState = (state: CallState) => {
    setCallState(state);
    setCallStateSince(Date.now());
    if (state === "active") {
      setCallStartedAt(Date.now());
    } else {
      setCallStartedAt(null);
    }
  };

  const pushRecentCall = (next: Omit<RecentCall, "id" | "timestamp">) => {
    const entry: RecentCall = {
      ...next,
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    setRecentCalls((prev) => [entry, ...prev].slice(0, 10));
  };

  const endCall = async (declined = false) => {
    try {
      const res = await fetch(`${btBaseUrl}/call/hangup`, { method: "POST" });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        setCallError(payload.error || "Hangup failed");
        return;
      }
      setCallError(null);
    } catch {
      setCallError("Hangup failed");
      return;
    }
    if (activeCall) {
      if (activeCall.direction === "outgoing") {
        pushRecentCall({
          name: activeCall.name,
          number: activeCall.number,
          type: "outgoing",
        });
      } else if (declined || callState === "incoming") {
        pushRecentCall({
          name: activeCall.name,
          number: activeCall.number,
          type: "missed",
        });
      } else {
        pushRecentCall({
          name: activeCall.name,
          number: activeCall.number,
          type: "incoming",
        });
      }
    }
    setActiveCall(null);
    setMuted(false);
    setCallState("idle");
    setCallStateSince(null);
    setCallStartedAt(null);
  };

  const startOutgoingCall = async (number: string, name?: string) => {
    if (!btDevice || !number) return;
    try {
      const res = await fetch(`${btBaseUrl}/call/dial?number=${encodeURIComponent(number)}`, { method: "POST" });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        setCallError(payload.error || "Dial failed");
        return;
      }
      setCallError(null);
    } catch {
      setCallError("Dial failed");
      return;
    }
    setActiveCall({
      name: name || number,
      number,
      direction: "outgoing",
    });
    setMuted(false);
    beginCallState("outgoing");
  };

  const acceptIncomingCall = async () => {
    if (callState !== "incoming") return;
    try {
      const res = await fetch(`${btBaseUrl}/call/answer`, { method: "POST" });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        setCallError(payload.error || "Answer failed");
        return;
      }
      setCallError(null);
    } catch {
      setCallError("Answer failed");
      return;
    }
    setCallState("active");
    setCallStartedAt(Date.now());
  };

  const dialPressed = (value: string) => {
    setDialNumber((prev) => (prev.length < MAX_DIAL_LENGTH ? `${prev}${value}` : prev));
  };

  const backspaceDial = () => {
    setDialNumber((prev) => prev.slice(0, -1));
  };

  const clearDial = () => {
    setDialNumber("");
  };

  const callTitle = (() => {
    if (!btDevice) return "No phone connected";
    if (callState === "incoming") return "Incoming call";
    if (callState === "outgoing") return "Calling";
    if (callState === "active") return "On call";
    return "Ready to call";
  })();

  const callSubtitle = (() => {
    if (activeCall) {
      return activeCall.name === activeCall.number
        ? activeCall.number
        : `${activeCall.name} · ${activeCall.number}`;
    }
    if (btDevice) return `Connected to ${btDevice.name || btDevice.alias || btDevice.mac}`;
    return "Connect a phone in Settings";
  })();

  const callMeta = (() => {
    if (callState === "incoming" || callState === "outgoing") {
      return `Ringing · ${formatDuration(callElapsed)}`;
    }
    if (callState === "active") {
      return `Active · ${formatDuration(callElapsed)}`;
    }
    if (callError) return `Call failed · ${callError}`;
    if (btDevice) return "Bluetooth ready";
    return btError ? "Bluetooth offline" : "Bluetooth idle";
  })();

  const canAccept = callState === "incoming";
  const canEnd = callState === "incoming" || callState === "outgoing" || callState === "active";
  const canPlaceCall = Boolean(btDevice && dialNumber);
  const canMute = callState === "active";

  return (
    <motion.div
      className="flex h-full w-full flex-col gap-4 bg-black p-4 text-white overflow-hidden"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <div className="grid flex-1 grid-cols-[1.2fr_1fr] gap-4">
        <div className="flex h-full flex-col gap-4">
          <motion.div
            className="relative overflow-hidden rounded-[16px] bg-white/5 p-5"
            animate={
              callState === "active"
                ? {
                    boxShadow: `0 0 24px ${hexToRgba(ambientColor, 0.35)}, 0 0 60px ${hexToRgba(
                      ambientColor,
                      0.28
                    )}, inset 0 0 0 1px ${hexToRgba(ambientColor, 0.2)}`,
                    borderColor: hexToRgba(ambientColor, 0.35),
                  }
                : {
                    boxShadow: "0 0 0 rgba(0,0,0,0)",
                    borderColor: "rgba(255,255,255,0.05)",
                  }
            }
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="pointer-events-none absolute inset-0">
              <motion.div
                className="absolute -left-8 -top-10 h-36 w-36 rounded-full blur-3xl"
                style={{ background: hexToRgba(ambientColor, 0.6) }}
                animate={
                  callState === "active"
                    ? { opacity: 0.45 * ambientStrength, scale: [1, 1.25, 1] }
                    : { opacity: 0, scale: 0.9 }
                }
                transition={{ duration: 2.6, ease: "easeInOut", repeat: callState === "active" ? Infinity : 0 }}
              />
              <motion.div
                className="absolute -right-6 top-10 h-40 w-40 rounded-full blur-[42px]"
                style={{ background: hexToRgba(ambientColor, 0.5) }}
                animate={
                  callState === "active"
                    ? { opacity: 0.38 * ambientStrength, scale: [1.05, 1.35, 1.05] }
                    : { opacity: 0, scale: 0.95 }
                }
                transition={{ duration: 3.2, ease: "easeInOut", repeat: callState === "active" ? Infinity : 0 }}
              />
              <motion.div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 20% 20%, ${hexToRgba(
                    ambientColor,
                    0.35
                  )}, transparent 55%), radial-gradient(circle at 80% 30%, ${hexToRgba(
                    ambientColor,
                    0.28
                  )}, transparent 60%)`,
                }}
                animate={callState === "active" ? { opacity: 0.55 * ambientStrength } : { opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Call status</p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-white/90">{callTitle}</p>
                <p className="text-sm text-white/60">{callSubtitle}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/50">{callMeta}</p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition ${
                    canAccept ? "bg-emerald-500/80" : "bg-white/10 text-white/40"
                  }`}
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  onClick={acceptIncomingCall}
                  disabled={!canAccept}
                >
                  <PhoneIcon />
                </motion.button>
                <motion.button
                  type="button"
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition ${
                    canEnd ? "bg-red-500/80" : "bg-white/10 text-white/40"
                  }`}
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  onClick={() => endCall(true)}
                  disabled={!canEnd}
                >
                  <PhoneIcon />
                </motion.button>
              </div>
            </div>
          </motion.div>

          <div className="rounded-[16px] bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Recent calls</p>
            <div className="mt-4 space-y-3">
              {recentCalls.map((item) => (
                <motion.button
                  key={item.name}
                  type="button"
                  className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] bg-white/5 px-4 py-2 text-left hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  onClick={() => {
                    setDialNumber(item.number);
                    if (btDevice) {
                      startOutgoingCall(item.number, item.name);
                    }
                  }}
                >
                  <div>
                    <p className="text-sm text-white/90">{item.name}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                      {formatCallMeta(item)}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.3em] text-white/50">Call</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col gap-4">
          <div className="rounded-[16px] bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Keypad</p>
            <div className="mt-4 flex items-center justify-between rounded-[12px] bg-white/5 px-4 py-2">
              <div className="text-lg font-medium text-white/90">
                {dialNumber || "Enter number"}
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  className="rounded-[8px] bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/70"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  onClick={backspaceDial}
                  disabled={!dialNumber}
                >
                  Delete
                </motion.button>
                <motion.button
                  type="button"
                  className="rounded-[8px] bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/70"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  onClick={clearDial}
                  disabled={!dialNumber}
                >
                  Clear
                </motion.button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <KeypadButton label="1" sub="" onPress={dialPressed} />
              <KeypadButton label="2" sub="ABC" onPress={dialPressed} />
              <KeypadButton label="3" sub="DEF" onPress={dialPressed} />
              <KeypadButton label="4" sub="GHI" onPress={dialPressed} />
              <KeypadButton label="5" sub="JKL" onPress={dialPressed} />
              <KeypadButton label="6" sub="MNO" onPress={dialPressed} />
              <KeypadButton label="7" sub="PQRS" onPress={dialPressed} />
              <KeypadButton label="8" sub="TUV" onPress={dialPressed} />
              <KeypadButton label="9" sub="WXYZ" onPress={dialPressed} />
              <KeypadButton label="*" sub="" onPress={dialPressed} />
              <KeypadButton label="0" sub="+" onPress={dialPressed} />
              <KeypadButton label="#" sub="" onPress={dialPressed} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              className={`flex min-h-[52px] items-center justify-center rounded-[12px] text-sm uppercase tracking-[0.3em] text-white transition ${
                canPlaceCall ? "bg-emerald-500/80" : "bg-white/10 text-white/40"
              }`}
              whileTap={{ scale: 0.95, opacity: 0.8 }}
              onClick={() => startOutgoingCall(dialNumber)}
              disabled={!canPlaceCall}
            >
              Call
            </motion.button>
            <motion.button
              type="button"
              className={`flex min-h-[52px] items-center justify-center rounded-[12px] text-sm uppercase tracking-[0.3em] transition ${
                canMute ? "bg-white/5 text-white/70 hover:bg-white/10" : "bg-white/10 text-white/40"
              }`}
              whileTap={{ scale: 0.95, opacity: 0.8 }}
              onClick={() => setMuted((prev) => !prev)}
              disabled={!canMute}
            >
              {muted ? "Muted" : "Mute"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
