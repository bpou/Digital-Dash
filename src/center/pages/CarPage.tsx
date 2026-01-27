import { sendVehicleCommand, useVehicleState } from "../../vehicle/vehicleClient";

export default function CarPage() {
  const { car, electrical, fuel, temp } = useVehicleState();

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Lights", on: car.lights, cmd: "car/toggleLights" },
          { label: "Hazards", on: car.hazards, cmd: "car/toggleHazards" },
          { label: "Lock", on: car.locked, cmd: "car/toggleLock" },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => sendVehicleCommand(item.cmd)}
            className={`rounded-[20px] border px-4 py-5 text-[12px] uppercase tracking-[0.24em] ${
              item.on
                ? "border-white/30 bg-white/10 text-white"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white/80"
            }`}
          >
            {item.label}
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
    </div>
  );
}
