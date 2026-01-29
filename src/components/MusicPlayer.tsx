import { useMemo } from "react";

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
    <div className="relative flex h-[96px] w-[760px] items-center gap-5 overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_10%_20%,rgba(90,150,150,0.12),rgba(10,12,14,0.96)_55%,rgba(6,7,9,1))] px-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
      {/* Ambient background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 rounded-[32px]" />
        <div className="absolute inset-0 rounded-[32px] bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_45%,rgba(255,255,255,0.04))]" />
        <div className="absolute -left-10 top-3 h-[140px] w-[140px] rounded-full bg-[radial-gradient(circle,rgba(110,190,190,0.16),transparent_65%)] blur-2xl" />
        <div className="absolute -right-16 bottom-6 h-[140px] w-[140px] rounded-full bg-[radial-gradient(circle,rgba(90,160,160,0.10),transparent_65%)] blur-2xl" />
      </div>

      {/* Artwork */}
      <div className="relative z-10 h-[68px] w-[68px] flex-shrink-0 overflow-hidden rounded-[16px] border border-white/10 bg-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
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

      {/* Track info */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <p
          className="font-medium tracking-[0.01em] text-white truncate"
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

      {/* Progress */}
      <div
        className="relative z-10 h-full w-[420px]"
        style={{ transform: "translateX(-16px)" }}
      >
        <div className="absolute left-0 top-1/2 w-full -translate-y-1/2 h-[4px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-200/30 via-teal-300/60 to-teal-200/30 shadow-[0_0_10px_rgba(110,200,200,0.25)] transition-all duration-300 opacity-80"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div
          className="absolute left-0 w-full flex items-center justify-between text-white/45"
          style={{ top: "calc(50% + 10px)" }}
        >
          <span style={{ fontSize: 12 + textSizeBoost }}>
            {formatDuration(nowPlaying.positionSec)}
          </span>
          <span style={{ fontSize: 12 + textSizeBoost }}>
            -{formatDuration(nowPlaying.durationSec - nowPlaying.positionSec)}
          </span>
        </div>
      </div>
    </div>
  );
}
