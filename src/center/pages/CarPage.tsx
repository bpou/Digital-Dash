import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sendCommand, useVehicleState } from "../../vehicle/vehicleClient";

// Interfaces
// Icons
const LockIcon = ({ locked }: { locked: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
    {locked ? (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ) : (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 11V7a4 4 0 018 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    )}
  </svg>
);

const HazardIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`h-6 w-6 ${active ? "text-[var(--tesla-accent-red)]" : ""}`}
  >
    <path
      d="M12 2L2 20h20L12 2z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.2 : 0}
    />
    <path
      d="M12 9v4M12 16v.01"
      stroke={active ? "var(--tesla-accent-red)" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const AmbientIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
    <path
      d="M12 3v6M7 9l5-3 5 3M6 13h12M9 13v5a3 3 0 006 0v-5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="20" r="1" fill="currentColor" />
  </svg>
);

const BatteryIcon = ({ percent }: { percent: number }) => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <rect x="2" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M22 11v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect
      x="4"
      y="9"
      width={Math.max(0, (percent / 100) * 14)}
      height="6"
      rx="1"
      fill={percent > 20 ? "#22c55e" : "#ef4444"}
    />
  </svg>
);

const TireIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const UpdateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function CarPage() {
  const { car, batteryV, fuelPct, rangeKm } = useVehicleState();
  const [ambientOpen, setAmbientOpen] = useState(false);
  const [ambientHue, setAmbientHue] = useState(210);
  const [ambientBrightness, setAmbientBrightness] = useState(60);
  const [tirePressure] = useState({ fl: 2.4, fr: 2.4, rl: 2.3, rr: 2.3 });
  const ambientColor = `hsl(${ambientHue} 100% ${Math.max(15, Math.min(80, ambientBrightness))}%)`;

  return (
    <div className="relative flex h-full gap-6 px-6 py-4 overflow-hidden">
      <div className="flex w-full justify-center">
        <div className="flex w-full max-w-[760px] flex-col gap-4">
        {/* Quick Controls */}
        <div className="rounded-[var(--tesla-radius-lg)] bg-[var(--tesla-bg-surface)] p-4">
          <h3 className="mb-4 text-[12px] uppercase tracking-[0.2em] text-[var(--tesla-text-tertiary)]">
            Controls
          </h3>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setAmbientOpen(true)}
              className="flex h-16 w-20 flex-col items-center justify-center gap-1 rounded-[var(--tesla-radius-md)] bg-[var(--tesla-bg-surface)] transition-all hover:bg-[var(--tesla-bg-surface-hover)]"
            >
              <AmbientIcon />
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--tesla-text-tertiary)]">
                Ambient
              </span>
            </button>

            <button
              type="button"
              onClick={() => sendCommand("car/toggleHazards")}
              className={`flex h-16 w-20 flex-col items-center justify-center gap-1 rounded-[var(--tesla-radius-md)] transition-all ${
                car.hazards
                  ? "bg-[var(--tesla-accent-red)]/15 ring-1 ring-[var(--tesla-accent-red)]/40 shadow-[0_0_16px_rgba(232,33,39,0.2)]"
                  : "bg-[var(--tesla-bg-surface)] hover:bg-[var(--tesla-bg-surface-hover)]"
              }`}
            >
              <HazardIcon active={car.hazards} />
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--tesla-text-tertiary)]">
                Hazards
              </span>
            </button>
            
            <button
              type="button"
              onClick={() => sendCommand("car/toggleLock")}
              className={`flex h-16 w-20 flex-col items-center justify-center gap-1 rounded-[var(--tesla-radius-md)] transition-all ${
                car.locked
                  ? "bg-[var(--tesla-accent-green)]/15 ring-1 ring-[var(--tesla-accent-green)]/40 text-[var(--tesla-accent-green)] shadow-[0_0_16px_rgba(0,200,83,0.2)]"
                  : "bg-[var(--tesla-accent-red)]/15 ring-1 ring-[var(--tesla-accent-red)]/40 text-[var(--tesla-accent-red)] shadow-[0_0_16px_rgba(232,33,39,0.2)]"
              }`}
            >
              <LockIcon locked={car.locked} />
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--tesla-text-tertiary)]">
                {car.locked ? "Locked" : "Unlocked"}
              </span>
            </button>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="rounded-[var(--tesla-radius-lg)] bg-[var(--tesla-bg-surface)] p-4">
          <h3 className="mb-4 text-[12px] uppercase tracking-[0.2em] text-[var(--tesla-text-tertiary)]">
            Vehicle Info
          </h3>
          
          {/* Battery/Fuel */}
          <div className="mb-4 flex items-center justify-between rounded-[var(--tesla-radius-md)] bg-[var(--tesla-bg-surface)] p-3">
            <div className="flex items-center gap-2">
              <BatteryIcon percent={fuelPct} />
              <span className="text-[14px] text-[var(--tesla-text-secondary)]">Battery</span>
            </div>
            <div className="text-right">
              <span className="text-[18px] font-semibold text-[var(--tesla-text-primary)]">
                {Math.round(fuelPct)}%
              </span>
              <span className="ml-2 text-[13px] text-[var(--tesla-text-tertiary)]">
                {rangeKm} km
              </span>
            </div>
          </div>

          {/* Voltage */}
          <div className="mb-4 flex items-center justify-between rounded-[var(--tesla-radius-md)] bg-[var(--tesla-bg-surface)] p-3">
            <span className="text-[14px] text-[var(--tesla-text-secondary)]">System Voltage</span>
            <span className="text-[18px] font-semibold text-[var(--tesla-text-primary)]">
              {batteryV.toFixed(1)}V
            </span>
          </div>

          {/* Tire Pressure */}
          <div className="rounded-[var(--tesla-radius-md)] bg-[var(--tesla-bg-surface)] p-3">
            <div className="mb-2 flex items-center gap-2">
              <TireIcon />
              <span className="text-[14px] text-[var(--tesla-text-secondary)]">
                Tire Pressure (bar)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-[13px]">
              <div className="rounded-[var(--tesla-radius-sm)] bg-[var(--tesla-bg-surface)] py-2">
                <span className="text-[var(--tesla-text-tertiary)]">FL</span>
                <span className="ml-2 text-[var(--tesla-text-primary)]">{tirePressure.fl}</span>
              </div>
              <div className="rounded-[var(--tesla-radius-sm)] bg-[var(--tesla-bg-surface)] py-2">
                <span className="text-[var(--tesla-text-tertiary)]">FR</span>
                <span className="ml-2 text-[var(--tesla-text-primary)]">{tirePressure.fr}</span>
              </div>
              <div className="rounded-[var(--tesla-radius-sm)] bg-[var(--tesla-bg-surface)] py-2">
                <span className="text-[var(--tesla-text-tertiary)]">RL</span>
                <span className="ml-2 text-[var(--tesla-text-primary)]">{tirePressure.rl}</span>
              </div>
              <div className="rounded-[var(--tesla-radius-sm)] bg-[var(--tesla-bg-surface)] py-2">
                <span className="text-[var(--tesla-text-tertiary)]">RR</span>
                <span className="ml-2 text-[var(--tesla-text-primary)]">{tirePressure.rr}</span>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>

      <AnimatePresence>
        {ambientOpen && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              className="w-[360px] rounded-[var(--tesla-radius-lg)] bg-[var(--tesla-bg-surface)] p-5 shadow-[var(--tesla-shadow-lg)] ring-1 ring-[var(--tesla-border-subtle)]"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--tesla-text-tertiary)]">
                  Ambient Lighting
                </p>
                <p className="mt-1 text-sm text-[var(--tesla-text-secondary)]">Color & brightness</p>
              </div>
              <button
                type="button"
                onClick={() => setAmbientOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tesla-bg-surface)] text-[var(--tesla-text-secondary)] hover:bg-[var(--tesla-bg-surface-hover)]"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div
                className="h-12 w-12 rounded-full border border-white/10"
                style={{ background: ambientColor, boxShadow: `0 0 20px ${ambientColor}40` }}
              />
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--tesla-text-tertiary)]">Hue</p>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={ambientHue}
                  onChange={(e) => setAmbientHue(Number(e.target.value))}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #ff004c 0%, #ff7a00 15%, #ffe600 30%, #12d900 45%, #00c8ff 60%, #5b5bff 75%, #ff00cc 100%)",
                  }}
                />
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--tesla-text-tertiary)]">Brightness</p>
              <input
                type="range"
                min={10}
                max={90}
                value={ambientBrightness}
                onChange={(e) => setAmbientBrightness(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--tesla-bg-surface)]"
                style={{
                  background: `linear-gradient(90deg, #000000 0%, ${ambientColor} 100%)`,
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setAmbientOpen(false)}
              className="mt-6 flex w-full min-h-[44px] items-center justify-center rounded-[var(--tesla-radius-md)] bg-[var(--tesla-accent-blue)] text-[13px] font-medium text-white"
            >
              Save Ambient Lighting
            </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
