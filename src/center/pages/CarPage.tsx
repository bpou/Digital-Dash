import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sendVehicleCommand, useVehicleState } from "../../vehicle/vehicleClient";

export default function CarPage() {
  const { car, electrical, fuel, temp, turn, ambient } = useVehicleState();
  const hazardPulse = car.hazards && turn.left && turn.right;
  const [ambientOpen, setAmbientOpen] = useState(false);
  const ambientColor = ambient?.color ?? "#7EE3FF";
  const ambientBrightness = ambient?.brightness ?? 65;

  const updateAmbient = (next: Partial<NonNullable<typeof ambient>>) => {
    sendVehicleCommand("ambient/set", {
      color: ambientColor,
      brightness: ambientBrightness,
      ...next,
    });
  };

  const ambientSwatches = [
    "#7EE3FF",
    "#9B8CFF",
    "#62F2C1",
    "#FFB86B",
    "#FF7EB6",
    "#FFD369",
    "#A8FF6A",
    "#5EE4FF",
  ];

  const handleControlClick = (cmd: string) => {
    if (cmd === "ui/openAmbient") {
      setAmbientOpen(true);
      return;
    }
    sendVehicleCommand(cmd);
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="grid grid-cols-10 items-start justify-items-start gap-2">
        {[
          {
            label: "Ambient",
            on: ambientOpen,
            cmd: "ui/openAmbient",
            glow: "glow-purple",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" className="control-icon h-6 w-6">
                <path
                  d="M4 12h16M6.5 8.5l11 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M12 4c3.5 0 6 1.8 6 4.5S15.5 13 12 13 6 11.2 6 8.5 8.5 4 12 4z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            ),
          },
          {
            label: "Hazards",
            on: hazardPulse,
            cmd: "car/toggleHazards",
            glow: "glow-red",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" className="control-icon h-6 w-6">
                <path
                  d="M12 4l7 14H5l7-14z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path d="M12 9v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ),
          },
          {
            label: car.locked ? "Locked" : "Unlocked",
            on: car.locked,
            cmd: "car/toggleLock",
            glow: car.locked ? "glow-green" : "glow-red",
            icon: car.locked ? (
              <svg viewBox="0 0 24 24" fill="none" className="control-icon h-6 w-6">
                <rect x="6" y="11" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="control-icon h-6 w-6">
                <rect x="6" y="11" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 11V8a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.5" />
                <path d="M14 5l2-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ),
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => handleControlClick(item.cmd)}
            className={`control-tile ${item.on ? `control-tile--active glow-animate ${item.glow}` : ""}`}
          >
            <span>{item.label}</span>
            {item.icon}
          </button>
        ))}
      </div>

      <div className="rounded-[26px] border border-white/10 bg-white/5 p-6">
        <p className="text-[12px] uppercase tracking-[0.3em] text-white/45">System</p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-[14px] text-white/70">
          <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
            <span>Battery</span>
            <span>{electrical.batteryV.toFixed(1)} V</span>
          </div>
          <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
            <span>Fuel</span>
            <span>{Math.round(fuel.percent)}%</span>
          </div>
          <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
            <span>Oil</span>
            <span>{temp.oilC.toFixed(1)}°C</span>
          </div>
          <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
            <span>Coolant</span>
            <span>{temp.coolantC.toFixed(1)}°C</span>
          </div>
        </div>
      </div>


      
      <AnimatePresence>
        {ambientOpen && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center"
            onClick={() => setAmbientOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Ambient lighting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              className="relative w-[520px] max-w-[90vw]"
              onClick={(event) => event.stopPropagation()}
              initial={{ y: 18, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="absolute inset-0 rounded-[28px] backdrop-blur-xl" />
              <div className="relative w-full overflow-hidden rounded-[28px] border border-white/15 bg-[radial-gradient(circle_at_top,rgba(82,120,255,0.2),rgba(10,12,18,0.95)_55%,rgba(6,8,12,1)_100%)] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.4em] text-white/55">Ambient</p>
                  <p className="mt-2 text-[22px] font-semibold text-white">Lighting</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
                  onClick={() => setAmbientOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-5">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Color</p>
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {ambientSwatches.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => updateAmbient({ color: swatch })}
                        className="group relative h-12 w-12 rounded-[14px] border border-white/15 transition hover:scale-105"
                        style={{ background: swatch }}
                        aria-label={`Ambient color ${swatch}`}
                      >
                        {ambientColor === swatch && (
                          <span className="absolute inset-0 rounded-[14px] ring-2 ring-white/80" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-white/5 p-5">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Brightness</p>
                  <div className="mt-5 flex flex-col gap-4">
                    <div className="h-20 rounded-[18px] border border-white/10 bg-white/5 p-3">
                      <div
                        className="h-full w-full rounded-[14px]"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, ${ambientColor}66, transparent 60%), linear-gradient(120deg, ${ambientColor}33, transparent)`,
                          opacity: ambientBrightness / 100,
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={ambientBrightness}
                      onChange={(event) => updateAmbient({ brightness: Number(event.target.value) })}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-white/80"
                    />
                    <div className="flex items-center justify-between text-[12px] text-white/60">
                      <span>Low</span>
                      <span>{ambientBrightness}%</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[20px] border border-white/10 bg-white/5 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-white/45">Preview</p>
                    <p className="mt-2 text-[14px] text-white/70">Cabin glow synced across displays</p>
                  </div>
                  <div
                    className="h-12 w-12 rounded-full"
                    style={{
                      background: ambientColor,
                      boxShadow: `0 0 18px ${ambientColor}88, 0 0 36px ${ambientColor}55`,
                      opacity: ambientBrightness / 100,
                    }}
                  />
                </div>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
