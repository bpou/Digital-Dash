import { useMemo, useState } from "react";
import { sendCommand, useVehicleState } from "../../vehicle/vehicleClient";

// Interfaces
interface SourceOption {
  id: "BT" | "AUX" | "Spotify";
  label: string;
  icon: React.ReactNode;
}

// Helper functions
const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Icons
const ShuffleIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`h-5 w-5 ${
      active ? "text-[var(--tesla-text-primary)]" : "text-[var(--tesla-text-secondary)]"
    }`}
  >
    <path
      d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PreviousIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
    <path d="M6 6v12M18 6l-10 6 10 6V6z" fill="currentColor" />
  </svg>
);

const NextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
    <path d="M18 6v12M6 6l10 6-10 6V6z" fill="currentColor" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 ml-1">
    <path d="M8 5l11 7-11 7V5z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
    <path d="M6 4h4v16H6V4zM14 4h4v16h-4V4z" />
  </svg>
);

const RepeatIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={`h-5 w-5 ${
      active ? "text-[var(--tesla-text-primary)]" : "text-[var(--tesla-text-secondary)]"
    }`}
  >
    <path
      d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BluetoothIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path
      d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

const AuxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 4v2M12 18v2M4 12h2M18 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const VolumeIcon = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    {muted ? (
      <>
        <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 9l-6 6M17 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    )}
  </svg>
);

const MusicNoteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-16 w-16 text-[var(--tesla-text-tertiary)]">
    <path
      d="M9 18V6l9-2v12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="7" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// Source options
const sourceOptions: SourceOption[] = [
  { id: "BT", label: "Bluetooth", icon: <BluetoothIcon /> },
  { id: "Spotify", label: "Spotify", icon: <SpotifyIcon /> },
  { id: "AUX", label: "AUX", icon: <AuxIcon /> },
];

export default function MediaPage() {
  const { audio } = useVehicleState();
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const progressPct = useMemo(() => {
    if (audio.nowPlaying.durationSec <= 0) return 0;
    const pct = (audio.nowPlaying.positionSec / audio.nowPlaying.durationSec) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [audio.nowPlaying.positionSec, audio.nowPlaying.durationSec]);

  return (
    <div className="flex h-full flex-col items-center justify-between px-8 py-4 overflow-hidden">
      {/* Album Artwork Section */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        {/* Album Art */}
        <div className="relative h-[200px] w-[200px] overflow-hidden rounded-[var(--tesla-radius-lg)] bg-[var(--tesla-bg-surface)] shadow-[var(--tesla-shadow-lg)]">
          {audio.nowPlaying.artworkUrl ? (
            <img
              src={audio.nowPlaying.artworkUrl}
              alt={audio.nowPlaying.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
              <MusicNoteIcon />
            </div>
          )}
        </div>

        {/* Song Info */}
        <div className="text-center">
          <h2 className="text-[22px] font-semibold text-[var(--tesla-text-primary)]">
            {audio.nowPlaying.title || "No Track Playing"}
          </h2>
          <p className="mt-1 text-[15px] text-[var(--tesla-text-secondary)]">
            {audio.nowPlaying.artist || "Unknown Artist"}
          </p>
          {audio.nowPlaying.album && (
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--tesla-text-tertiary)]">
              {audio.nowPlaying.album}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-[400px]">
          <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--tesla-bg-surface)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--tesla-accent-blue)] to-[rgba(62,106,225,0.6)] transition-all duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--tesla-text-tertiary)]">
            <span>{formatDuration(audio.nowPlaying.positionSec)}</span>
            <span>{formatDuration(audio.nowPlaying.durationSec)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-6">
          {/* Shuffle */}
          <button
            type="button"
            onClick={() => setShuffle(!shuffle)}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              shuffle
                ? "bg-[var(--tesla-bg-surface-active)] shadow-[0_0_16px_rgba(62,106,225,0.2)]"
                : "hover:bg-[var(--tesla-bg-surface-hover)]"
            }`}
          >
            <ShuffleIcon active={shuffle} />
          </button>

          {/* Previous */}
          <button
            type="button"
            onClick={() => sendCommand("audio/prev")}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--tesla-text-secondary)] transition-colors hover:bg-[var(--tesla-bg-surface-hover)] hover:text-[var(--tesla-text-primary)]"
          >
            <PreviousIcon />
          </button>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={() => sendCommand("audio/togglePlay")}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tesla-text-primary)] text-black shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-transform hover:scale-105 active:scale-95"
          >
            {audio.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={() => sendCommand("audio/next")}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--tesla-text-secondary)] transition-colors hover:bg-[var(--tesla-bg-surface-hover)] hover:text-[var(--tesla-text-primary)]"
          >
            <NextIcon />
          </button>

          {/* Repeat */}
          <button
            type="button"
            onClick={() => setRepeat(!repeat)}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              repeat
                ? "bg-[var(--tesla-bg-surface-active)] shadow-[0_0_16px_rgba(62,106,225,0.2)]"
                : "hover:bg-[var(--tesla-bg-surface-hover)]"
            }`}
          >
            <RepeatIcon active={repeat} />
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex w-full items-center justify-between pt-2">
        {/* Source Selector */}
        <div className="flex items-center gap-2">
          {sourceOptions.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => sendCommand("audio/setSource", source.id)}
            className={`flex h-10 items-center gap-2 rounded-[var(--tesla-radius-md)] px-3 text-[13px] transition-colors ${
              audio.source === source.id
                ? "bg-[var(--tesla-bg-surface-active)] text-[var(--tesla-text-primary)] shadow-[0_0_16px_rgba(62,106,225,0.18)]"
                : "text-[var(--tesla-text-secondary)] hover:bg-[var(--tesla-bg-surface-hover)]"
            }`}
          >
            {source.icon}
            <span className="hidden sm:inline">{source.label}</span>
          </button>
        ))}
      </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => sendCommand("audio/setVolume", audio.volume > 0 ? 0 : 50)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--tesla-text-secondary)] transition-colors hover:bg-[var(--tesla-bg-surface-hover)] hover:text-[var(--tesla-text-primary)]"
          >
            <VolumeIcon muted={audio.volume === 0} />
          </button>
          
          {/* Custom Volume Slider */}
          <div className="relative h-1 w-28 rounded-full bg-[var(--tesla-bg-surface)]">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[var(--tesla-accent-blue)] to-[rgba(62,106,225,0.5)]"
              style={{ width: `${audio.volume}%` }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={audio.volume}
              onChange={(e) => sendCommand("audio/setVolume", Number(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            {/* Volume Knob */}
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[var(--tesla-text-primary)] shadow-[var(--tesla-shadow-sm)] transition-all"
              style={{ left: `calc(${audio.volume}% - 6px)` }}
            />
          </div>
          
          <span className="w-10 text-right text-[11px] text-[var(--tesla-text-tertiary)]">
            {audio.volume}%
          </span>
        </div>
      </div>
    </div>
  );
}
