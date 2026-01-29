import { useMemo } from "react";
import { sendVehicleCommand, useVehicleState } from "../../vehicle/vehicleClient";

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function MediaPage() {
  const { audio } = useVehicleState();
  const artworkUrl = audio.nowPlaying.artworkUrl?.trim();
  const artistLabel = audio.nowPlaying.artist?.trim() || "Unknown Artist";

  const progressPct = useMemo(() => {
    if (audio.nowPlaying.durationSec <= 0) return 0;
    const pct = (audio.nowPlaying.positionSec / audio.nowPlaying.durationSec) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [audio.nowPlaying.positionSec, audio.nowPlaying.durationSec]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center gap-6 rounded-[26px] border border-white/10 bg-white/5 p-6">
        <div className="h-[140px] w-[140px] overflow-hidden rounded-[20px] bg-white/10">
          {artworkUrl ? (
            <img src={artworkUrl} alt={audio.nowPlaying.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/35">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
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

        <div className="flex flex-1 flex-col">
          <p className="text-[18px] font-semibold text-white">{audio.nowPlaying.title}</p>
          <p className="mt-1 text-[13px] text-white/50">{artistLabel}</p>
          {audio.nowPlaying.album && (
            <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-white/30">
              {audio.nowPlaying.album}
            </p>
          )}

          <div className="mt-6">
            <div className="h-[4px] w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-300/50 via-emerald-300/60 to-sky-300/50"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/45">
              <span>{formatDuration(audio.nowPlaying.positionSec)}</span>
              <span>-{formatDuration(audio.nowPlaying.durationSec - audio.nowPlaying.positionSec)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/5 px-6 py-5">
        <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => sendVehicleCommand("bt/media/control", { action: "prev" })}
              className="h-10 w-10 rounded-full border border-white/10 text-white/70 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-4 w-4">
                <path d="M7 6v12M17 6l-8 6 8 6V6z" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() =>
                sendVehicleCommand("bt/media/control", {
                  action: audio.nowPlaying.isPlaying ? "pause" : "play",
                })
              }
              className="h-12 w-12 rounded-full border border-white/20 bg-white/10 text-white"
            >
              {audio.nowPlaying.isPlaying ? (
                <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-5 w-5">
                  <path d="M8 6v12M16 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="mx-auto h-5 w-5">
                  <path d="M8 5l11 7-11 7V5z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => sendVehicleCommand("bt/media/control", { action: "next" })}
              className="h-10 w-10 rounded-full border border-white/10 text-white/70 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-4 w-4">
                <path d="M17 6v12M7 6l8 6-8 6V6z" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
</div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => sendVehicleCommand("audio/set", { muted: !audio.muted })}
            className="h-9 w-9 rounded-full border border-white/10 text-white/60"
          >
            <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-4 w-4">
              <path d="M9 9H5v6h4l4 4V5l-4 4z" stroke="currentColor" strokeWidth="1.6" />
              {audio.muted && (
                <path d="M16 9l4 6m0-6-4 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={audio.volume}
            onChange={(event) => sendVehicleCommand("audio/set", { volume: Number(event.target.value) })}
            className="h-2 w-[200px] accent-sky-300"
          />
          <span className="text-[12px] text-white/60">{audio.volume}%</span>
        </div>

        <div className="flex items-center gap-2">
          {(["bt", "aux", "spotify"] as const).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => sendVehicleCommand("audio/set", { source })}
              className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.24em] ${
                audio.source === source
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/10 bg-white/5 text-white/50 hover:text-white"
              }`}
            >
              {source.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
