import { useEffect, useMemo, useRef, useState } from "react";
import { BatteryCharging, Droplets, Gauge, Lightbulb, MapPinned, Thermometer, Zap } from "lucide-react";
import MusicPlayer from "../components/MusicPlayer";
import SquircleGauge from "../components/SquircleGauge";
import { hexToRgba } from "../utils/color";
import { useVehicleState } from "../vehicle/vehicleClient";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const formatDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const estimateRangeKm = (fuelPercent: number) => Math.round(250 - (1 - fuelPercent / 100) * 40);

const formatHeading = (heading?: number | null) => {
  if (!Number.isFinite(heading ?? NaN)) return "N";
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalized = (((heading ?? 0) % 360) + 360) % 360;
  return labels[Math.round(normalized / 45) % labels.length];
};

type MetricTileProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  tone?: "normal" | "warm" | "danger";
};

function MetricTile({ icon, label, value, detail, tone = "normal" }: MetricTileProps) {
  const toneClass =
    tone === "danger" ? "text-red-200" : tone === "warm" ? "text-amber-200" : "text-cyan-100";

  return (
    <div className="cluster-metric">
      <div className={`cluster-metric-icon ${toneClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="cluster-metric-label">{label}</p>
        <p className="cluster-metric-value">{value}</p>
        {detail && <p className="cluster-metric-detail">{detail}</p>}
      </div>
    </div>
  );
}

type BarMeterProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  warnAt?: number;
};

function BarMeter({ label, value, min, max, unit, warnAt }: BarMeterProps) {
  const pct = clamp(((value - min) / (max - min)) * 100, 0, 100);
  const warning = warnAt !== undefined && value >= warnAt;

  return (
    <div className="bar-meter">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <strong className={warning ? "text-amber-200" : "text-white"}>{Math.round(value)}{unit}</strong>
      </div>
      <div className="bar-meter-track">
        <div className={warning ? "bar-meter-fill bar-meter-fill--warm" : "bar-meter-fill"} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ClusterScreen() {
  const data = useVehicleState();
  const [scale, setScale] = useState(1);
  const readySignalSentRef = useRef(false);
  const ambientColor = data.ambient?.color ?? "#7EE3FF";
  const ambientBrightness = data.ambient?.brightness ?? 65;
  const ambientStrength = ambientBrightness / 100;

  const nowPlaying = useMemo(
    () => ({ ...data.audio.nowPlaying, isPlaying: data.audio.nowPlaying.isPlaying }),
    [data.audio.nowPlaying]
  );
  const rangeKm = estimateRangeKm(data.fuel.percent);
  const gpsSpeed = data.gps?.speedKmh;
  const speedSource = Number.isFinite(gpsSpeed ?? NaN) && Math.abs((gpsSpeed ?? 0) - data.vehicle.speedKmh) > 3 ? "GPS crosscheck" : "CAN speed";
  const oilTone = data.temp.oilC >= 120 ? "danger" : data.temp.oilC >= 105 ? "warm" : "normal";
  const coolantTone = data.temp.coolantC >= 112 ? "danger" : data.temp.coolantC >= 98 ? "warm" : "normal";
  const voltageTone = data.electrical.batteryV < 12.2 || data.electrical.batteryV > 15 ? "warm" : "normal";
  const fuelTone = data.fuel.percent <= 10 ? "danger" : data.fuel.percent <= 20 ? "warm" : "normal";

  useEffect(() => {
    const baseWidth = 1920;
    const baseHeight = 720;
    const handleResize = () => {
      const next = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
      setScale(Number.isFinite(next) ? next : 1);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (readySignalSentRef.current) return;

    const readyUrl = new URLSearchParams(window.location.search).get("kiosk_ready");
    readySignalSentRef.current = true;
    let cancelled = false;

    const sendReady = () => {
      if (cancelled) return;
      try {
        if (window.top && window.top !== window) {
          window.top.postMessage({ type: "digital-dash-ready" }, "*");
        }
      } catch {
        // ignore postMessage failures
      }
      if (!readyUrl) return;
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(readyUrl, "ready");
          return;
        }
      } catch {
        // Fall through to fetch.
      }
      fetch(readyUrl, { method: "POST", mode: "no-cors", keepalive: true }).catch(() => {
        // ignore readiness signal failures
      });
    };

    const markReady = async () => {
      if ("fonts" in document) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font readiness issues
        }
      }
      await Promise.all(
        Array.from(document.images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            })
        )
      );
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      window.setTimeout(sendReady, 120);
    };

    void markReady();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 cluster-lux-ambient"
            style={{
              background: `radial-gradient(circle at 18% 42%, ${hexToRgba(
                ambientColor,
                0.24 * ambientStrength
              )}, transparent 34%), radial-gradient(circle at 82% 45%, ${hexToRgba(
                "#8EDCFF",
                0.18 * ambientStrength
              )}, transparent 36%), linear-gradient(110deg, #020405 0%, #071013 42%, #030506 100%)`,
            }}
          />
          <div className="absolute inset-0 cluster-carbon" />
          <div className="absolute inset-0 cluster-vignette" />
        </div>

        <div
          className="relative z-10 origin-center"
          style={{
            width: 1920,
            height: 720,
            transform: `scale(${scale})`,
          }}
        >
          <main className="cluster-shell">
            <div className="cluster-topline">
              <div className="flex items-center gap-4">
                <span className="cluster-brand">GOLF MK2</span>
                <span className="cluster-subbrand">OEM+ DIGITAL COCKPIT</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="cluster-status-dot" />
                <span>{speedSource}</span>
                <span className="text-white/25">|</span>
                <span>{formatHeading(data.gps?.heading)} heading</span>
              </div>
            </div>

            <div className="cluster-stage">
              <aside className="cluster-side cluster-side--left">
                <MetricTile
                  icon={<Droplets size={22} />}
                  label="Fuel"
                  value={`${Math.round(data.fuel.percent)}%`}
                  detail={`${rangeKm} km est.`}
                  tone={fuelTone}
                />
                <MetricTile
                  icon={<Thermometer size={22} />}
                  label="Oil temp"
                  value={`${Math.round(data.temp.oilC)}C`}
                  detail={oilTone === "normal" ? "stable" : "watch"}
                  tone={oilTone}
                />
                <MetricTile
                  icon={<Thermometer size={22} />}
                  label="Coolant"
                  value={`${Math.round(data.temp.coolantC)}C`}
                  detail={coolantTone === "normal" ? "regulated" : "high"}
                  tone={coolantTone}
                />
                <MetricTile
                  icon={<BatteryCharging size={22} />}
                  label="Charging"
                  value={`${data.electrical.batteryV.toFixed(1)}V`}
                  detail={voltageTone === "normal" ? "alternator ok" : "verify"}
                  tone={voltageTone}
                />
              </aside>

              <section className="cluster-gauge-wrap cluster-gauge-wrap--rpm">
                <div className="cluster-gauge-halo" />
                <SquircleGauge
                  currentValue={data.engine.rpm}
                  min={0}
                  max={8000}
                  unit="RPM"
                  label="16V READY"
                  valueFormatter={(v) => Math.round(v).toString()}
                  size={500}
                  direction="clockwise"
                  startAngleDeg={132}
                  sweepAngleDeg={278}
                  showNeedle
                  accentColor="#66E5FF"
                  ticks={[0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000]}
                  tickLabelValues={[0, 2000, 4000, 6000, 8000]}
                  tickLabelFormatter={(value) => Math.round(value / 1000).toString()}
                  zones={[
                    { min: 0, max: 5200, color: "#66E5FF" },
                    { min: 5200, max: 6500, color: "#FFD166" },
                    { min: 6500, max: 8000, color: "#FF4D5E" },
                  ]}
                  roundness={0.78}
                />
              </section>

              <section className="cluster-center">
                <div className="turn-row">
                  <span className={`turn-signal turn-signal--left ${data.turn.left ? "turn-signal--active" : ""}`} />
                  <div className="lamp-strip">
                    <span className={`lamp-chip ${data.car.lights ? "lamp-chip--active" : ""}`}>
                      <Lightbulb size={17} />
                      LOW
                    </span>
                    <span className={`lamp-chip ${data.car.hazards ? "lamp-chip--hazard" : ""}`}>
                      <Zap size={17} />
                      HAZ
                    </span>
                  </div>
                  <span className={`turn-signal turn-signal--right ${data.turn.right ? "turn-signal--active" : ""}`} />
                </div>

                <div className="cluster-focus">
                  <div>
                    <p className="cluster-focus-label">Speed</p>
                    <p className="cluster-focus-value">{Math.round(data.vehicle.speedKmh)}</p>
                    <p className="cluster-focus-unit">km/h</p>
                  </div>
                  <div className="cluster-focus-ring" />
                </div>

                <div className="cluster-bars">
                  <BarMeter label="Oil" value={data.temp.oilC} min={40} max={140} unit="C" warnAt={110} />
                  <BarMeter label="Coolant" value={data.temp.coolantC} min={40} max={120} unit="C" warnAt={100} />
                  <BarMeter label="Fuel" value={data.fuel.percent} min={0} max={100} unit="%" />
                </div>
              </section>

              <section className="cluster-gauge-wrap cluster-gauge-wrap--speed">
                <div className="cluster-gauge-halo" />
                <SquircleGauge
                  currentValue={data.vehicle.speedKmh}
                  min={0}
                  max={240}
                  unit="km/h"
                  label="ROAD SPEED"
                  valueFormatter={(v) => Math.round(v).toString()}
                  size={500}
                  direction="counterclockwise"
                  startAngleDeg={48}
                  sweepAngleDeg={278}
                  showNeedle
                  accentColor="#B4F8C8"
                  ticks={[0, 30, 50, 70, 90, 110, 130, 160, 200, 240]}
                  tickLabelValues={[0, 50, 90, 130, 200, 240]}
                  zones={[
                    { min: 0, max: 120, color: "#B4F8C8" },
                    { min: 120, max: 180, color: "#FFD166" },
                    { min: 180, max: 240, color: "#FF4D5E" },
                  ]}
                  roundness={0.78}
                />
              </section>

              <aside className="cluster-side cluster-side--right">
                <MetricTile icon={<Gauge size={22} />} label="RPM" value={Math.round(data.engine.rpm).toString()} detail="live engine" />
                <MetricTile icon={<MapPinned size={22} />} label="Heading" value={formatHeading(data.gps?.heading)} detail="GPS" />
                <MetricTile icon={<Zap size={22} />} label="Audio" value={`${data.audio.volume}%`} detail={data.audio.source.toUpperCase()} />
                <MetricTile
                  icon={<Lightbulb size={22} />}
                  label="Exterior"
                  value={data.car.lights ? "ON" : "OFF"}
                  detail={data.car.locked ? "locked" : "unlocked"}
                />
              </aside>
            </div>

            <div className="cluster-media">
              <MusicPlayer nowPlaying={nowPlaying} formatDuration={formatDuration} textSizeBoost={2} />
            </div>

            <div className="cluster-odo">
              <span>180000 km</span>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
