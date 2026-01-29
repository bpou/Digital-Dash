import { useEffect, useMemo, useState } from "react";
import MusicPlayer from "../components/MusicPlayer";
import SquircleGauge from "../components/SquircleGauge";
import { hexToRgba } from "../utils/color";
import { useVehicleState } from "../vehicle/vehicleClient";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const estimateRangeKm = (fuelPercent: number) => Math.round(250 - (1 - fuelPercent / 100) * 40);

export default function ClusterScreen() {
  const data = useVehicleState();
  const [scale, setScale] = useState(1);
  const ambientColor = data.ambient?.color ?? "#7EE3FF";
  const ambientBrightness = data.ambient?.brightness ?? 65;
  const ambientStrength = ambientBrightness / 100;

  const tempPct = clamp((data.temp.coolantC - 0) / 160, 0, 1) * 100;
  const nowPlaying = useMemo(
    () => ({ ...data.audio.nowPlaying, isPlaying: data.audio.nowPlaying.isPlaying }),
    [data.audio]
  );
  const rangeKm = estimateRangeKm(data.fuel.percent);
  const leftBlink = data.turn.left;
  const rightBlink = data.turn.right;

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

  return (
    <div className="min-h-screen bg-[#07090c] text-white">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 cluster-ambient ambient-glow"
            style={{
              background: `radial-gradient(circle at 30% 40%, ${hexToRgba(
                ambientColor,
                0.22 * ambientStrength
              )}, transparent 55%), radial-gradient(circle at 70% 60%, ${hexToRgba(
                ambientColor,
                0.18 * ambientStrength
              )}, transparent 60%)`,
            }}
          />
          <div className="absolute inset-0 cluster-vignette" />
          <div className="absolute inset-0 cluster-noise" />
        </div>

        <div
          className="relative z-10 origin-center"
          style={{
            width: 1920,
            height: 720,
            transform: `scale(${scale})`,
          }}
        >
          <div
            className="relative h-full w-full overflow-hidden ambient-panel"
            style={{
              background: `radial-gradient(circle at 40% 40%, ${hexToRgba(
                ambientColor,
                0.25 * ambientStrength
              )}, rgba(6, 8, 10, 0.95) 60%, rgba(4, 5, 7, 1) 100%)`,
            }}
          >
            <div className="absolute inset-0 cluster-edge" />

            <div className="absolute left-1/2 top-[28px] w-[720px] -translate-x-1/2">
              <div className="flex items-center justify-between text-[15px] text-white/60">
                <span className="tracking-[0.35em]">0°</span>
                <div className="flex items-center gap-3 text-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white/70">
                    <path
                      d="M14 14.5a2 2 0 1 1-4 0V6.5a2 2 0 1 1 4 0v8Z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M8 14.5a4 4 0 1 0 8 0"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-[17px]">80°</span>
                </div>
                <span className="tracking-[0.35em]">160°</span>
              </div>
              <div className="relative mt-3 h-[6px] rounded-full bg-white/10">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-teal-500/30 via-teal-300/70 to-teal-200/40"
                  style={{ width: `${tempPct}%` }}
                />
                <div className="absolute left-1/2 top-1/2 h-4 w-[2px] -translate-y-1/2 bg-white/30" />
              </div>
            </div>

            <div className="absolute bottom-[34px] right-[68px]">
              <div className="flex items-center gap-4 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-[14px] text-white/65">
                <span className="text-white/50">BATTERY</span>
                <span className="text-white">{data.electrical.batteryV.toFixed(1)}V</span>
              </div>
            </div>

            <div className="relative flex h-full items-center justify-between px-[90px]">
              <SquircleGauge
                currentValue={data.engine.rpm}
                min={0}
                max={8000}
                unit="RPM"
                valueFormatter={(v) => Math.round(v).toString()}
                size={520}
                direction="clockwise"
                startAngleDeg={135}
                sweepAngleDeg={270}
                showNeedle={false}
                accentColor="#0080FF"
                ticks={[0, 3000, 5000, 7000]}
                tickLabelValues={[0, 3000, 5000, 7000]}
                tickLabelFormatter={(value) => Math.round(value / 1000).toString()}
                valueStops={[
                  { value: 0, position: 0 },
                  { value: 3000, position: 1 / 3 },
                  { value: 5000, position: 2 / 3 },
                  { value: 7000, position: 1 },
                ]}
                zones={[
                  { min: 0, max: 5000, color: "#0080FF" },
                  { min: 5000, max: 6500, color: "#FFB800" },
                  { min: 6500, max: 8000, color: "#FF4444" },
                ]}
                roundness={0.6}
              />

              <div className="flex flex-col items-center gap-5">
                <div className="relative flex items-center gap-5 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)_45%,rgba(10,12,16,0.9))] px-6 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
                    <div className="absolute -left-8 -top-10 h-[140px] w-[140px] rounded-full bg-[radial-gradient(circle,rgba(110,220,210,0.28),transparent_70%)] blur-2xl" />
                    <div className="absolute -right-10 -bottom-12 h-[180px] w-[180px] rounded-full bg-[radial-gradient(circle,rgba(60,140,200,0.22),transparent_70%)] blur-3xl" />
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_40%,rgba(255,255,255,0.04))]" />
                  </div>
                  <div className="relative z-10 flex flex-col items-start">
                    <span className="text-[10px] uppercase tracking-[0.42em] text-white/40">Fuel</span>
                    <span className="mt-2 text-[28px] font-semibold text-white tracking-tight">
                      {Math.round(data.fuel.percent)}%
                    </span>
                    <span className="text-[12px] text-white/45">{rangeKm} KM range</span>
                  </div>
                  <div className="relative z-10 flex h-[96px] w-[16px] items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-white/10 shadow-[inset_0_0_16px_rgba(0,0,0,0.6)]" />
                    <div
                      className="absolute bottom-[6px] left-1/2 w-[8px] -translate-x-1/2 rounded-full bg-gradient-to-t from-emerald-400 via-emerald-300 to-cyan-200 shadow-[0_0_18px_rgba(110,220,210,0.55)]"
                      style={{ height: `${Math.max(8, Math.min(88, (data.fuel.percent / 100) * 88))}px` }}
                    />
                    <div className="absolute inset-0 rounded-full ring-1 ring-white/20" />
                  </div>
                </div>

                <div className="relative flex items-center">
                  <div className="absolute -left-16 top-1/2 -translate-y-1/2">
                    <div className={`turn-orb turn-orb--left ${leftBlink ? "turn-orb--active" : ""}`} />
                  </div>

                  <div className="flex items-center gap-3 rounded-full border border-white/10 px-4 py-2">
                    <div className="flex h-8 w-8 items-center justify-center">
                      <img
                        src="/lights/check%20engine/off.png"
                        alt="Check engine"
                        className="h-5 w-5 object-contain"
                      />
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center">
                      <img
                        src="/lights/high%20beam/off.png"
                        alt="High beam"
                        className="h-5 w-5 object-contain"
                      />
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center">
                      <img
                        src="/lights/low%20beam/off.png"
                        alt="Low beam"
                        className="h-5 w-5 object-contain"
                      />
                    </div>
                  </div>

                  <div className="absolute -right-16 top-1/2 -translate-y-1/2">
                    <div className={`turn-orb turn-orb--right ${rightBlink ? "turn-orb--active" : ""}`} />
                  </div>
                </div>
              </div>

              <SquircleGauge
                currentValue={data.vehicle.speedKmh}
                min={0}
                max={200}
                unit="km/h"
                valueFormatter={(v) => Math.round(v).toString()}
                size={520}
                direction="counterclockwise"
                startAngleDeg={45}
                sweepAngleDeg={270}
                showNeedle={false}
                accentColor="#0080FF"
                ticks={[20, 70, 100, 150]}
                tickLabelValues={[20, 70, 100, 150]}
                valueStops={[
                  { value: 20, position: 0 },
                  { value: 70, position: 1 / 3 },
                  { value: 100, position: 2 / 3 },
                  { value: 150, position: 1 },
                ]}
                zones={[
                  { min: 0, max: 120, color: "#0080FF" },
                  { min: 120, max: 160, color: "#FFB800" },
                  { min: 160, max: 200, color: "#FF4444" },
                ]}
                roundness={0.6}
              />
            </div>

            <div className="absolute bottom-[26px] left-1/2 -translate-x-1/2">
              <div className="origin-top scale-[0.9]">
                <MusicPlayer nowPlaying={nowPlaying} formatDuration={formatDuration} textSizeBoost={1} />
              </div>
            </div>

            <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 text-[14px] text-white/25 tracking-[0.18em]">
              180000km
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
