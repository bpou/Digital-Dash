import { useState } from "react";
import { sendCommand, useVehicleState } from "../../vehicle/vehicleClient";

// Interfaces
interface SeatHeaterLevel {
  driver: number;
  passenger: number;
}

// Icons
const ACIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`h-6 w-6 ${active ? "text-[var(--tesla-accent-blue)]" : "text-[var(--tesla-text-secondary)]"}`}
  >
    <path
      d="M12 3v18M8 6c0 3 4 4 4 7s-4 4-4 7M16 6c0 3-4 4-4 7s4 4 4 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const AutoIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`h-6 w-6 ${active ? "text-[var(--tesla-accent-green)]" : "text-[var(--tesla-text-secondary)]"}`}
  >
    <path
      d="M12 4l8 16H4L12 4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 14h6M10 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const RecircIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`h-6 w-6 ${active ? "text-[var(--tesla-accent-blue)]" : "text-[var(--tesla-text-secondary)]"}`}
  >
    <path
      d="M4 12a8 8 0 0116 0M20 12a8 8 0 01-16 0"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M4 12l2-2m-2 2l2 2M20 12l-2-2m2 2l-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FrontDefrostIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`h-6 w-6 ${active ? "text-[var(--tesla-accent-orange)]" : "text-[var(--tesla-text-secondary)]"}`}
  >
    <path
      d="M3 8c4-4 14-4 18 0M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h.01M10 16h.01M14 16h.01M18 16h.01"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const RearDefrostIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`h-6 w-6 ${active ? "text-[var(--tesla-accent-orange)]" : "text-[var(--tesla-text-secondary)]"}`}
  >
    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 10h10M7 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SeatHeaterIcon = ({ level }: { level: number }) => (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
    <path
      d="M7 18v-6a5 5 0 0110 0v6"
      stroke={level > 0 ? "var(--tesla-accent-orange)" : "currentColor"}
      strokeWidth="1.5"
      strokeLinecap="round"
      className={level > 0 ? "" : "text-white/60"}
    />
    <circle
      cx="12"
      cy="7"
      r="3"
      stroke={level > 0 ? "var(--tesla-accent-orange)" : "currentColor"}
      strokeWidth="1.5"
      className={level > 0 ? "" : "text-[var(--tesla-text-secondary)]"}
    />
    {level >= 1 && (
      <path d="M9 15c0-1 1-2 1-3" stroke="var(--tesla-accent-orange)" strokeWidth="1.5" strokeLinecap="round" />
    )}
    {level >= 2 && (
      <path d="M12 15c0-1 1-2 1-3" stroke="var(--tesla-accent-orange)" strokeWidth="1.5" strokeLinecap="round" />
    )}
    {level >= 3 && (
      <path d="M15 15c0-1 1-2 1-3" stroke="var(--tesla-accent-orange)" strokeWidth="1.5" strokeLinecap="round" />
    )}
  </svg>
);

const SyncIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path
      d="M4 12a8 8 0 0114.5-4.5M20 12a8 8 0 01-14.5 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M20 4v4h-4M4 20v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Car Silhouette SVG
const CarSilhouette = () => (
  <svg viewBox="0 0 200 100" className="h-full w-full">
    {/* Car body outline */}
    <path
      d="M30 60 Q30 45 50 40 L70 35 Q100 25 130 35 L150 40 Q170 45 170 60 L170 70 Q170 75 165 75 L35 75 Q30 75 30 70 Z"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      strokeOpacity="0.3"
    />
    {/* Windshield */}
    <path
      d="M55 40 Q100 30 145 40"
      fill="none"
      stroke="white"
      strokeWidth="1"
      strokeOpacity="0.2"
    />
    {/* Windows */}
    <path
      d="M60 42 L75 38 Q100 32 125 38 L140 42 L135 55 L65 55 Z"
      fill="white"
      fillOpacity="0.05"
      stroke="white"
      strokeWidth="0.5"
      strokeOpacity="0.2"
    />
    {/* Wheels */}
    <circle cx="55" cy="70" r="12" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
    <circle cx="55" cy="70" r="6" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.2" />
    <circle cx="145" cy="70" r="12" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
    <circle cx="145" cy="70" r="6" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.2" />
    {/* Airflow indicators */}
    <g className="animate-pulse">
      <path d="M85 50 L95 50" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
      <path d="M105 50 L115 50" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
      <path d="M90 55 L100 55" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
      <path d="M100 55 L110 55" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
    </g>
  </svg>
);

// Temperature Control Component
const TemperatureControl = ({
  label,
  temp,
  onIncrease,
  onDecrease,
}: {
  label: string;
  temp: number;
  onIncrease: () => void;
  onDecrease: () => void;
}) => (
  <div className="flex flex-col items-center">
    <span className="text-[12px] uppercase tracking-[0.2em] text-[var(--tesla-text-tertiary)]">
      {label}
    </span>
    <div className="mt-4 flex items-center gap-4">
      <button
        type="button"
        onClick={onDecrease}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--tesla-bg-surface)] text-2xl text-[var(--tesla-text-secondary)] transition-colors hover:bg-[var(--tesla-bg-surface-hover)] active:bg-[var(--tesla-bg-surface-active)]"
      >
        −
      </button>
      <div className="flex flex-col items-center">
        <span className="text-6xl font-light text-[var(--tesla-text-primary)]">{temp}</span>
        <span className="text-lg text-[var(--tesla-text-tertiary)]">°C</span>
      </div>
      <button
        type="button"
        onClick={onIncrease}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--tesla-bg-surface)] text-2xl text-[var(--tesla-text-secondary)] transition-colors hover:bg-[var(--tesla-bg-surface-hover)] active:bg-[var(--tesla-bg-surface-active)]"
      >
        +
      </button>
    </div>
  </div>
);

// Fan Speed Control Component
const FanSpeedControl = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const steps = [0, 1, 2, 3, 4, 5];
  
  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-[12px] uppercase tracking-[0.2em] text-[var(--tesla-text-tertiary)]">
        Fan Speed
      </span>
      <div className="flex items-center gap-3">
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange(step)}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
              step <= value
                ? "bg-[var(--tesla-accent-blue)]/80 text-[var(--tesla-text-primary)] shadow-[0_0_12px_rgba(62,106,225,0.2)]"
                : "bg-[var(--tesla-bg-surface)] text-[var(--tesla-text-tertiary)] hover:bg-[var(--tesla-bg-surface-hover)]"
            }`}
          >
            {step === 0 ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              step
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Seat Heater Control Component
const SeatHeaterControl = ({
  label,
  level,
  onChange,
}: {
  label: string;
  level: number;
  onChange: (level: number) => void;
}) => (
  <div className="flex flex-col items-center gap-2">
    <span className="text-[12px] uppercase tracking-[0.2em] text-[var(--tesla-text-tertiary)]">
      {label}
    </span>
    <button
      type="button"
      onClick={() => onChange((level + 1) % 4)}
      className={`flex h-14 w-14 items-center justify-center rounded-xl transition-all ${
        level > 0
          ? "bg-[var(--tesla-accent-orange)]/15 ring-1 ring-[var(--tesla-accent-orange)]/40 shadow-[0_0_16px_rgba(255,152,0,0.2)]"
          : "bg-[var(--tesla-bg-surface)] hover:bg-[var(--tesla-bg-surface-hover)]"
      }`}
    >
      <SeatHeaterIcon level={level} />
    </button>
    <div className="flex gap-1">
      {[1, 2, 3].map((l) => (
        <div
          key={l}
          className={`h-1 w-3 rounded-full transition-colors ${
            l <= level ? "bg-[var(--tesla-accent-orange)]" : "bg-white/20"
          }`}
        />
      ))}
    </div>
  </div>
);

export default function ClimatePage() {
  const { climate, tempC } = useVehicleState();
  const [synced, setSynced] = useState(true);
  const [passengerTemp, setPassengerTemp] = useState(climate.tempSet);
  const [seatHeaters, setSeatHeaters] = useState<SeatHeaterLevel>({ driver: 0, passenger: 0 });
  const [rearDefrost, setRearDefrost] = useState(false);

  const handleDriverTempChange = (delta: number) => {
    const newTemp = Math.min(28, Math.max(16, climate.tempSet + delta));
    sendCommand("climate/setTemp", newTemp);
    if (synced) {
      setPassengerTemp(newTemp);
    }
  };

  const handlePassengerTempChange = (delta: number) => {
    if (synced) {
      handleDriverTempChange(delta);
    } else {
      setPassengerTemp(Math.min(28, Math.max(16, passengerTemp + delta)));
    }
  };

  const toggleSync = () => {
    if (!synced) {
      setPassengerTemp(climate.tempSet);
    }
    setSynced(!synced);
  };

  return (
    <div className="flex h-full flex-col px-6 py-4 overflow-hidden">
      {/* Top Section: Car Visualization with Temperature Controls */}
      <div className="flex flex-1 items-center justify-between">
        {/* Driver Temperature */}
        <TemperatureControl
          label="Driver"
          temp={climate.tempSet}
          onIncrease={() => handleDriverTempChange(1)}
          onDecrease={() => handleDriverTempChange(-1)}
        />

        {/* Car Visualization */}
        <div className="relative flex h-48 w-64 flex-col items-center justify-center">
          <CarSilhouette />
          {/* Sync Button */}
          <button
            type="button"
            onClick={toggleSync}
            className={`absolute bottom-0 flex h-10 items-center gap-2 rounded-full px-4 text-sm transition-all ${
              synced
                ? "bg-[var(--tesla-accent-blue)]/15 text-[var(--tesla-accent-blue)] ring-1 ring-[var(--tesla-accent-blue)]/40 shadow-[0_0_16px_rgba(62,106,225,0.2)]"
                : "bg-[var(--tesla-bg-surface)] text-[var(--tesla-text-secondary)] hover:bg-[var(--tesla-bg-surface-hover)]"
            }`}
          >
            <SyncIcon />
            <span>Sync</span>
          </button>
          {/* Current Cabin Temp */}
          <div className="absolute -top-2 text-center">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--tesla-text-tertiary)]">
              Cabin
            </span>
            <span className="ml-2 text-sm text-[var(--tesla-text-secondary)]">
              {tempC.toFixed(0)}°C
            </span>
          </div>
        </div>

        {/* Passenger Temperature */}
        <TemperatureControl
          label="Passenger"
          temp={synced ? climate.tempSet : passengerTemp}
          onIncrease={() => handlePassengerTempChange(1)}
          onDecrease={() => handlePassengerTempChange(-1)}
        />
      </div>

      {/* Fan Speed Control */}
      <div className="my-6">
        <FanSpeedControl
          value={climate.fan}
          onChange={(v) => sendCommand("climate/setFan", v)}
        />
      </div>

      {/* Quick Toggle Buttons */}
      <div className="flex justify-center gap-3">
        {[
          { label: "A/C", icon: <ACIcon active={climate.ac} />, active: climate.ac, cmd: "climate/toggleAc" },
          { label: "Auto", icon: <AutoIcon active={climate.auto} />, active: climate.auto, cmd: "climate/toggleAuto" },
          { label: "Recirc", icon: <RecircIcon active={climate.recirc} />, active: climate.recirc, cmd: "climate/toggleRecirc" },
          { label: "Front", icon: <FrontDefrostIcon active={climate.defrost} />, active: climate.defrost, cmd: "climate/toggleDefrost" },
          { label: "Rear", icon: <RearDefrostIcon active={rearDefrost} />, active: rearDefrost, cmd: null },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              if (item.cmd) {
                sendCommand(item.cmd as never);
              } else {
                setRearDefrost(!rearDefrost);
              }
            }}
            className={`flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl transition-all ${
              item.active
                ? "bg-[var(--tesla-bg-surface-active)] ring-1 ring-white/10 shadow-[0_0_14px_rgba(255,255,255,0.08)]"
                : "bg-[var(--tesla-bg-surface)] hover:bg-[var(--tesla-bg-surface-hover)]"
            }`}
          >
            {item.icon}
            <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--tesla-text-tertiary)]">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Seat Heaters */}
      <div className="mt-6 flex justify-center gap-12">
        <SeatHeaterControl
          label="Driver Seat"
          level={seatHeaters.driver}
          onChange={(level) => setSeatHeaters({ ...seatHeaters, driver: level })}
        />
        <SeatHeaterControl
          label="Passenger Seat"
          level={seatHeaters.passenger}
          onChange={(level) => setSeatHeaters({ ...seatHeaters, passenger: level })}
        />
      </div>
    </div>
  );
}
