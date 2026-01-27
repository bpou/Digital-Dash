import { useEffect, useState } from "react";

interface StatusBarProps {
  outsideTemp?: number;
}

export default function StatusBar({ outsideTemp = 22 }: StatusBarProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-8 w-full items-center justify-between px-4 text-[12px] uppercase tracking-[0.12em] text-[var(--tesla-text-tertiary)]">
      {/* Left section - Time */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium normal-case tracking-normal text-[var(--tesla-text-primary)]">
          {time}
        </span>
      </div>

      {/* Center section - can be used for notifications */}
      <div className="flex items-center gap-2">
        {/* Placeholder for future notifications */}
      </div>

      {/* Right section - Temperature and connectivity */}
      <div className="flex items-center gap-4">
        {/* Temperature */}
        <div className="flex items-center gap-1 text-[var(--tesla-text-secondary)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4 text-[var(--tesla-text-tertiary)]"
          >
            <path
              d="M12 2v8.5M12 14v.5M12 18a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M12 2a2 2 0 0 1 2 2v6.5a4 4 0 1 1-4 0V4a2 2 0 0 1 2-2z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          <span>{outsideTemp}°C</span>
        </div>

        {/* Cellular signal */}
        <div className="flex items-center gap-0.5">
          <div className="h-2 w-1 rounded-sm bg-[var(--tesla-text-secondary)]" />
          <div className="h-2.5 w-1 rounded-sm bg-[var(--tesla-text-secondary)]" />
          <div className="h-3 w-1 rounded-sm bg-[var(--tesla-text-secondary)]" />
          <div className="h-3.5 w-1 rounded-sm bg-[var(--tesla-text-tertiary)]" />
        </div>

        {/* WiFi icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 text-[var(--tesla-text-secondary)]"
        >
          <path
            d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Bluetooth icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 text-[var(--tesla-text-tertiary)]"
        >
          <path
            d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
