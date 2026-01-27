import { motion } from "framer-motion";
import { sendVehicleCommand, useVehicleState } from "../../vehicle/vehicleClient";

interface QuickControlsBarProps {
  onLauncherToggle: () => void;
  onMediaOpen: () => void;
  climateTemp?: number;
}

export default function QuickControlsBar({
  onLauncherToggle,
  onMediaOpen,
  climateTemp = 21,
}: QuickControlsBarProps) {
  const { audio } = useVehicleState();

  return (
    <div className="flex h-16 w-full items-center justify-between border-t border-[var(--tesla-border-subtle)] bg-[var(--tesla-bg-primary)]/90 px-4 backdrop-blur-xl">
      <button
        type="button"
        onClick={onLauncherToggle}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--tesla-radius-md)] bg-[var(--tesla-bg-surface)] text-[var(--tesla-text-secondary)] transition hover:bg-[var(--tesla-bg-surface-hover)] hover:text-[var(--tesla-text-primary)]"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <motion.button
        type="button"
        onClick={onMediaOpen}
        className="flex items-center gap-3 rounded-[var(--tesla-radius-md)] px-2 py-1 transition-colors hover:bg-[var(--tesla-bg-surface-hover)]"
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="h-10 w-10 overflow-hidden rounded-[var(--tesla-radius-sm)] bg-[var(--tesla-bg-surface)] shadow-[var(--tesla-shadow-sm)]">
          {audio.nowPlaying.artworkUrl ? (
            <img
              src={audio.nowPlaying.artworkUrl}
              alt={audio.nowPlaying.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--tesla-text-tertiary)]">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M9 18V6l9-2v12"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="16" cy="16" r="2" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex w-32 flex-col">
          <span className="truncate text-[14px] font-medium text-[var(--tesla-text-primary)]">
            {audio.nowPlaying.title || "Not Playing"}
          </span>
          <span className="truncate text-[11px] text-[var(--tesla-text-secondary)]">
            {audio.nowPlaying.artist || "—"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => sendVehicleCommand("audio/control", { action: "toggle" })}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tesla-bg-surface)] text-[var(--tesla-text-primary)] transition hover:bg-[var(--tesla-bg-surface-hover)]"
          >
            {audio.nowPlaying.isPlaying ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M8 6v12M16 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M8 5l11 7-11 7V5z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => sendVehicleCommand("audio/control", { action: "next" })}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--tesla-text-secondary)] transition hover:text-[var(--tesla-text-primary)]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M17 6v12M7 6l8 6-8 6V6z" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
      </motion.button>

      <button
        type="button"
        className="flex items-center gap-2 rounded-[var(--tesla-radius-md)] bg-[var(--tesla-bg-surface)] px-4 py-2 text-[var(--tesla-text-secondary)] transition hover:bg-[var(--tesla-bg-surface-hover)] hover:text-[var(--tesla-text-primary)]"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M12 3v18M8 7c0-2 1.8-3.5 4-3.5S16 5 16 7s-1.8 3.5-4 3.5S8 9 8 7zM8 17c0-2 1.8-3.5 4-3.5S16 15 16 17s-1.8 3.5-4 3.5S8 19 8 17z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[14px] font-medium">{climateTemp}°</span>
      </button>
    </div>
  );
}
