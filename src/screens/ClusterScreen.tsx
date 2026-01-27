import { useEffect, useMemo, useState } from "react";
import MusicPlayer from "../components/MusicPlayer";
import SquircleGauge from "../components/SquircleGauge";
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

  const tempPct = clamp((data.temp.coolantC - 0) / 160, 0, 1) * 100;
  const nowPlaying = useMemo(
    () => ({ ...data.audio.nowPlaying, isPlaying: data.audio.nowPlaying.isPlaying }),
    [data.audio]
  );
  const rangeKm = estimateRangeKm(data.fuel.percent);

  useEffect(() => {
    const baseWidth = 2048;
    const baseHeight = 672;
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
          <div className="absolute inset-0 cluster-ambient" />
          <div className="absolute inset-0 cluster-vignette" />
          <div className="absolute inset-0 cluster-noise" />
        </div>

        <div
          className="relative z-10 origin-center"
          style={{
            width: 2048,
            height: 672,
            transform: `scale(${scale})`,
          }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[60px] bg-[radial-gradient(circle_at_40%_40%,rgba(26,44,45,0.9),rgba(6,8,10,0.95)_60%,rgba(4,5,7,1)_100%)]">
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
                ticks={[0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000]}
                zones={[
                  { min: 0, max: 5000, color: "#0080FF" },
                  { min: 5000, max: 6500, color: "#FFB800" },
                  { min: 6500, max: 8000, color: "#FF4444" },
                ]}
                roundness={0.6}
              />

              <div className="flex flex-col items-center gap-5">
                <div className="flex items-center gap-4 rounded-[26px] border border-white/10 bg-white/5 px-5 py-4">
                  <div className="flex flex-col items-start">
                    <span className="text-[11px] uppercase tracking-[0.35em] text-white/45">Fuel</span>
                    <span className="mt-2 text-[26px] font-semibold text-white">
                      {Math.round(data.fuel.percent)}%
                    </span>
                    <span className="text-[12px] text-white/45">{rangeKm} KM range</span>
                  </div>
                  <div className="relative h-[90px] w-[12px] overflow-hidden rounded-full bg-white/10">
                    <div
                      className="absolute bottom-0 left-0 w-full rounded-full bg-gradient-to-t from-emerald-400/70 via-emerald-300/50 to-emerald-200/30"
                      style={{ height: `${Math.max(6, Math.min(100, data.fuel.percent))}%` }}
                    />
                    <div className="absolute left-1/2 top-1/2 h-[2px] w-[18px] -translate-x-1/2 -translate-y-1/2 bg-white/25" />
                  </div>
                </div>

                <div className="relative flex items-center">
                  <div className="absolute -left-28 top-1/2 -translate-y-1/2">
                    <svg width="100" height="56" viewBox="0 0 100 56" fill="none">
                      <defs>
                        <linearGradient id="turn-left-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#2dd4bf" />
                          <stop offset="50%" stopColor="#60a5fa" />
                          <stop offset="100%" stopColor="#2dd4bf" />
                          <animate attributeName="x1" values="0%;100%" dur="4.5s" repeatCount="indefinite" />
                          <animate attributeName="x2" values="100%;200%" dur="4.5s" repeatCount="indefinite" />
                        </linearGradient>
                      </defs>
                      <path d="M56 10L30 28l26 18v-11h24V21H56V10z" fill="url(#turn-left-gradient)" />
                    </svg>
                  </div>

                  <div className="flex items-center gap-3 rounded-full border border-white/10 px-4 py-2">
                    <div className="flex h-8 w-8 items-center justify-center">
                      <img
                        src="/lights/check%20engine/on.png"
                        alt="Check engine"
                        className="h-5 w-5 object-contain"
                      />
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center">
                      <img
                        src="/lights/high%20beam/on.png"
                        alt="High beam"
                        className="h-5 w-5 object-contain"
                      />
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center">
                      <img
                        src="/lights/low%20beam/on.png"
                        alt="Low beam"
                        className="h-5 w-5 object-contain"
                      />
                    </div>
                  </div>

                  <div className="absolute -right-28 top-1/2 -translate-y-1/2">
                    <svg width="100" height="56" viewBox="0 0 100 56" fill="none">
                      <defs>
                        <linearGradient id="turn-right-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#2dd4bf" />
                          <stop offset="50%" stopColor="#60a5fa" />
                          <stop offset="100%" stopColor="#2dd4bf" />
                          <animate attributeName="x1" values="0%;100%" dur="4.5s" repeatCount="indefinite" />
                          <animate attributeName="x2" values="100%;200%" dur="4.5s" repeatCount="indefinite" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M56 10L30 28l26 18v-11h24V21H56V10z"
                        fill="url(#turn-right-gradient)"
                        transform="translate(100 0) scale(-1 1)"
                      />
                    </svg>
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
                ticks={[0, 25, 50, 75, 100, 125, 150, 175, 200]}
                zones={[
                  { min: 0, max: 120, color: "#0080FF" },
                  { min: 120, max: 160, color: "#FFB800" },
                  { min: 160, max: 200, color: "#FF4444" },
                ]}
                roundness={0.6}
              />
            </div>

            <div className="absolute bottom-[26px] left-1/2 -translate-x-1/2">
              <MusicPlayer nowPlaying={nowPlaying} formatDuration={formatDuration} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
