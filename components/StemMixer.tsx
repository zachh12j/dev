"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StemKey, Stems } from "@/lib/replicate";

type Props = {
  trackName: string;
  stems: Stems;
};

type StemMeta = {
  key: StemKey;
  label: string;
  swatch: string; // tailwind color class for the badge
  bar: string; // tailwind color class for the volume fill
};

const STEMS: StemMeta[] = [
  { key: "vocals", label: "Vocals", swatch: "bg-cyan-400 text-slate-950", bar: "accent-cyan-400" },
  { key: "drums", label: "Drums", swatch: "bg-violet-400 text-slate-950", bar: "accent-violet-400" },
  { key: "bass", label: "Bass", swatch: "bg-amber-400 text-slate-950", bar: "accent-amber-400" },
  { key: "other", label: "Other", swatch: "bg-emerald-400 text-slate-950", bar: "accent-emerald-400" },
];

type ChannelState = {
  volume: number; // 0..1, the fader position
  muted: boolean;
  solo: boolean;
};

const INITIAL_CHANNEL: ChannelState = { volume: 1, muted: false, solo: false };

export default function StemMixer({ trackName, stems }: Props) {
  const audioRefs = useRef<Record<StemKey, HTMLAudioElement | null>>({
    vocals: null,
    drums: null,
    bass: null,
    other: null,
  });

  const [channels, setChannels] = useState<Record<StemKey, ChannelState>>({
    vocals: { ...INITIAL_CHANNEL },
    drums: { ...INITIAL_CHANNEL },
    bass: { ...INITIAL_CHANNEL },
    other: { ...INITIAL_CHANNEL },
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [seeking, setSeeking] = useState(false);

  // Effective gain per channel: solo mode (any solo enabled) silences
  // non-soloed channels. Otherwise muted channels are silenced. Volume is
  // applied as a multiplier on top.
  const effectiveVolumes = useMemo(() => {
    const anySolo = STEMS.some((s) => channels[s.key].solo);
    const out = {} as Record<StemKey, number>;
    for (const s of STEMS) {
      const c = channels[s.key];
      const audible = anySolo ? c.solo && !c.muted : !c.muted;
      out[s.key] = audible ? c.volume : 0;
    }
    return out;
  }, [channels]);

  // Push effective volumes to the underlying <audio> elements whenever they
  // change. Browsers smoothly interpolate volume so this is glitch-free.
  useEffect(() => {
    for (const s of STEMS) {
      const el = audioRefs.current[s.key];
      if (el) el.volume = effectiveVolumes[s.key];
    }
  }, [effectiveVolumes]);

  // Track time + duration off the vocals stem (they're all the same length).
  useEffect(() => {
    const el = audioRefs.current.vocals;
    if (!el) return;
    const onTime = () => {
      if (!seeking) setCurrentTime(el.currentTime);
    };
    const onMeta = () => setDuration(el.duration || 0);
    const onEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      for (const s of STEMS) {
        const a = audioRefs.current[s.key];
        if (a) a.currentTime = 0;
      }
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("durationchange", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("durationchange", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [seeking]);

  const handleCanPlay = useCallback(() => {
    setReadyCount((n) => Math.min(n + 1, STEMS.length));
  }, []);

  const allReady = readyCount >= STEMS.length;

  const togglePlay = useCallback(async () => {
    if (!allReady) return;
    if (isPlaying) {
      for (const s of STEMS) audioRefs.current[s.key]?.pause();
      setIsPlaying(false);
      return;
    }
    // Re-align time before playing to keep stems in sync if any drifted.
    const t = audioRefs.current.vocals?.currentTime ?? 0;
    for (const s of STEMS) {
      const a = audioRefs.current[s.key];
      if (a) a.currentTime = t;
    }
    try {
      await Promise.all(
        STEMS.map((s) => audioRefs.current[s.key]?.play() ?? Promise.resolve())
      );
      setIsPlaying(true);
    } catch {
      // Autoplay can be blocked if invoked outside a user gesture; ignore.
    }
  }, [allReady, isPlaying]);

  const seekTo = useCallback((t: number) => {
    for (const s of STEMS) {
      const a = audioRefs.current[s.key];
      if (a) a.currentTime = t;
    }
    setCurrentTime(t);
  }, []);

  const onScrubChange = (e: ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setCurrentTime(t);
  };
  const onScrubCommit = () => {
    seekTo(currentTime);
    setSeeking(false);
  };

  const setChannel = (key: StemKey, patch: Partial<ChannelState>) =>
    setChannels((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-white/50">Now mixing</p>
          <p className="font-medium text-white truncate">{trackName}</p>
        </div>
        <div className="text-xs text-white/50">
          {allReady ? "Ready" : `Loading stems… ${readyCount}/${STEMS.length}`}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!allReady}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-slate-950 shadow-glow transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPlaying ? (
            <span className="flex gap-1">
              <span className="block h-4 w-1.5 rounded-sm bg-slate-950" />
              <span className="block h-4 w-1.5 rounded-sm bg-slate-950" />
            </span>
          ) : (
            <span
              className="block h-0 w-0 border-y-[8px] border-l-[12px] border-y-transparent border-l-slate-950 ml-1"
              aria-hidden
            />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.01)}
            step={0.05}
            value={currentTime}
            onChange={onScrubChange}
            onMouseDown={() => setSeeking(true)}
            onTouchStart={() => setSeeking(true)}
            onMouseUp={onScrubCommit}
            onTouchEnd={onScrubCommit}
            disabled={!allReady}
            className="w-full accent-cyan-400"
          />
          <div className="flex justify-between text-xs text-white/50 mt-1 tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {STEMS.map((s) => {
          const c = channels[s.key];
          const url = stems[s.key];
          return (
            <div
              key={s.key}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 sm:px-4 py-3"
            >
              <span
                className={[
                  "inline-flex h-8 w-16 items-center justify-center rounded-full text-xs font-semibold",
                  s.swatch,
                ].join(" ")}
              >
                {s.label}
              </span>

              <div className="flex-1 flex items-center gap-3 min-w-0">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={c.volume}
                  onChange={(e) =>
                    setChannel(s.key, { volume: Number(e.target.value) })
                  }
                  className={["w-full", s.bar].join(" ")}
                  aria-label={`${s.label} volume`}
                />
                <span className="hidden sm:inline w-10 text-right text-xs text-white/50 tabular-nums">
                  {Math.round(c.volume * 100)}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setChannel(s.key, { muted: !c.muted })}
                  aria-pressed={c.muted}
                  title="Mute"
                  className={[
                    "h-8 w-8 rounded-lg text-xs font-semibold transition",
                    c.muted
                      ? "bg-rose-500 text-white"
                      : "bg-white/5 text-white/70 hover:bg-white/10",
                  ].join(" ")}
                >
                  M
                </button>
                <button
                  type="button"
                  onClick={() => setChannel(s.key, { solo: !c.solo })}
                  aria-pressed={c.solo}
                  title="Solo"
                  className={[
                    "h-8 w-8 rounded-lg text-xs font-semibold transition",
                    c.solo
                      ? "bg-amber-400 text-slate-950"
                      : "bg-white/5 text-white/70 hover:bg-white/10",
                  ].join(" ")}
                >
                  S
                </button>
                <a
                  href={url}
                  download={`${sanitize(trackName)}-${s.key}.mp3`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Download ${s.label.toLowerCase()} stem`}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition"
                >
                  ↓
                </a>
              </div>

              <audio
                ref={(el) => {
                  audioRefs.current[s.key] = el;
                }}
                src={url}
                preload="auto"
                onCanPlayThrough={handleCanPlay}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function sanitize(name: string): string {
  return (name || "track").replace(/\.[^/.]+$/, "").replace(/[^a-z0-9-_]+/gi, "_");
}
