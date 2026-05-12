import { useMemo } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { sendVehicleCommand } from "../vehicle/vehicleClient";

type NowPlaying = {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  durationSec: number;
  positionSec: number;
  isPlaying: boolean;
};

type MusicPlayerProps = {
  nowPlaying: NowPlaying;
  formatDuration: (seconds: number) => string;
  textSizeBoost?: number;
};

export default function MusicPlayer({
  nowPlaying,
  formatDuration,
  textSizeBoost = 0,
}: MusicPlayerProps) {
  const artworkUrl = nowPlaying.artworkUrl?.trim();
  const artistLabel = nowPlaying.artist?.trim() || "Unknown Artist";
  const progressPct = useMemo(() => {
    if (nowPlaying.durationSec <= 0) return 0;
    const pct = (nowPlaying.positionSec / nowPlaying.durationSec) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [nowPlaying.positionSec, nowPlaying.durationSec]);

  return (
    <div className="music-glass relative flex h-[106px] w-[790px] items-center gap-5 overflow-hidden px-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 rounded-[26px] bg-[linear-gradient(120deg,rgba(255,255,255,0.09),transparent_42%,rgba(255,255,255,0.035))]" />
        <div className="absolute -left-10 top-3 h-[140px] w-[140px] rounded-full bg-[radial-gradient(circle,rgba(115,226,255,0.18),transparent_65%)] blur-2xl" />
        <div className="absolute -right-16 bottom-6 h-[150px] w-[150px] rounded-full bg-[radial-gradient(circle,rgba(176,255,202,0.12),transparent_65%)] blur-2xl" />
      </div>

      <div className="relative z-10 h-[74px] w-[74px] flex-shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt={nowPlaying.album ?? nowPlaying.title}
            className="h-full w-full object-cover saturate-75"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_30%,rgba(110,190,190,0.25),rgba(14,18,20,0.98))]">
            <svg
              width="38"
              height="38"
              viewBox="0 0 24 24"
              fill="none"
              className="text-white/45"
            >
              <path
                d="M9 18V6l9-2v12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 rounded-[16px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" />
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <p
          className="font-semibold tracking-[0.01em] text-white truncate"
          style={{ fontSize: 16 + textSizeBoost }}
        >
          {nowPlaying.title}
        </p>
        <p
          className="mt-1 text-white/45 truncate"
          style={{ fontSize: 12 + textSizeBoost }}
        >
          {artistLabel}
        </p>
        {nowPlaying.album && (
          <p
            className="mt-1 uppercase tracking-[0.28em] text-white/25 truncate"
            style={{ fontSize: 10 + textSizeBoost }}
          >
            {nowPlaying.album}
          </p>
        )}
      </div>

      <div className="relative z-10 flex h-full w-[392px] flex-col justify-center gap-4">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous track"
            onClick={() => sendVehicleCommand("bt/media/control", { action: "prev" })}
            className="music-control"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label={nowPlaying.isPlaying ? "Pause" : "Play"}
            onClick={() =>
              sendVehicleCommand("bt/media/control", {
                action: nowPlaying.isPlaying ? "pause" : "play",
              })
            }
            className="music-control music-control--primary"
          >
            {nowPlaying.isPlaying ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}
          </button>
          <button
            type="button"
            aria-label="Next track"
            onClick={() => sendVehicleCommand("bt/media/control", { action: "next" })}
            className="music-control"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>

        <div>
          <div className="h-[4px] w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-200/45 via-white/80 to-emerald-200/55 shadow-[0_0_12px_rgba(126,227,255,0.35)] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-white/45">
            <span style={{ fontSize: 11 + textSizeBoost }}>{formatDuration(nowPlaying.positionSec)}</span>
            <span style={{ fontSize: 11 + textSizeBoost }}>
              -{formatDuration(nowPlaying.durationSec - nowPlaying.positionSec)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
