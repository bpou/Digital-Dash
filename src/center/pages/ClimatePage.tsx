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
          { label: "AC", on: climate.ac, cmd: "climate/set", payload: { ac: !climate.ac } },
          { label: "Recirc", on: climate.recirc, cmd: "climate/set", payload: { recirc: !climate.recirc } },
          { label: "Defrost", on: climate.defrost, cmd: "climate/set", payload: { defrost: !climate.defrost } },
          { label: "Auto", on: climate.auto, cmd: "climate/set", payload: { auto: !climate.auto } },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => sendVehicleCommand(item.cmd, item.payload)}
            className={`rounded-[18px] border px-4 py-4 text-[11px] uppercase tracking-[0.24em] ${
              item.on
                ? "border-white/30 bg-white/10 text-white"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white/80"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
