import { sendVehicleCommand, useVehicleState } from "../../vehicle/vehicleClient";

export default function ClimatePage() {
  const { climate, temp } = useVehicleState();

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between rounded-[26px] border border-white/10 bg-white/5 px-6 py-5">
        <div>
          <p className="text-[12px] uppercase tracking-[0.3em] text-white/45">Cabin Temp</p>
          <p className="mt-3 text-[36px] font-semibold text-white">{climate.tempSetC}°C</p>
          <p className="text-[12px] text-white/50">Current: {temp.coolantC.toFixed(1)}°C</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => sendVehicleCommand("climate/set", { tempSetC: climate.tempSetC - 1 })}
            className="h-12 w-12 rounded-full border border-white/10 text-white/70"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => sendVehicleCommand("climate/set", { tempSetC: climate.tempSetC + 1 })}
            className="h-12 w-12 rounded-full border border-white/10 text-white/70"
          >
            +
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <p className="text-[12px] uppercase tracking-[0.3em] text-white/45">Fan</p>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={5}
              value={climate.fan}
              onChange={(event) => sendVehicleCommand("climate/set", { fan: Number(event.target.value) })}
              className="h-2 w-full accent-emerald-300"
            />
            <span className="w-6 text-right text-[14px] text-white/70">{climate.fan}</span>
          </div>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <p className="text-[12px] uppercase tracking-[0.3em] text-white/45">Status</p>
          <div className="mt-3 text-[13px] text-white/60">
            <p>AC: {climate.ac ? "On" : "Off"}</p>
            <p>Recirc: {climate.recirc ? "On" : "Off"}</p>
            <p>Defrost: {climate.defrost ? "On" : "Off"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "AC",
            on: climate.ac,
            cmd: "climate/set",
            payload: { ac: !climate.ac },
            glow: "glow-blue",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" className="control-icon h-6 w-6">
                <path
                  d="M6 8h12M6 16h12M9 4l-3 4 3 4M15 12l3 4-3 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
          },
          {
            label: "Recirc",
            on: climate.recirc,
            cmd: "climate/set",
            payload: { recirc: !climate.recirc },
            glow: "glow-emerald",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" className="control-icon h-6 w-6">
                <path
                  d="M8 7h7a4 4 0 0 1 4 4v1M16 17H9a4 4 0 0 1-4-4v-1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M12 5l-4 2 4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12 19l4-2-4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ),
          },
          {
            label: "Defrost",
            on: climate.defrost,
            cmd: "climate/set",
            payload: { defrost: !climate.defrost },
            glow: "glow-amber",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" className="control-icon h-6 w-6">
                <path
                  d="M4 14c2-1 4-1 6 0 2 1 4 1 6 0 2-1 4-1 4 0"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path d="M7 5l2 3M12 4v4M17 5l-2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ),
          },
          {
            label: "Auto",
            on: climate.auto,
            cmd: "climate/set",
            payload: { auto: !climate.auto },
            glow: "glow-purple",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" className="control-icon h-6 w-6">
                <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ),
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => sendVehicleCommand(item.cmd, item.payload)}
            className={`control-tile ${item.on ? `control-tile--active glow-animate ${item.glow}` : ""}`}
          >
            <span>{item.label}</span>
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
