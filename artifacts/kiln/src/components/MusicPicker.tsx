import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Check, Music, Search } from "lucide-react";
import { musicTracks, formatDuration, type MusicTrack } from "@/data/music";

const GENRES = ["All", "Ambient", "Classical", "Electronic", "Jazz", "Orchestral", "World"] as const;

interface WaveformProps { playing: boolean }
function Waveform({ playing }: WaveformProps) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[3, 6, 4, 8, 5, 7, 3, 6].map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-amber-400 origin-bottom"
          style={{
            height: `${h * 2}px`,
            animation: playing ? `waveBar 0.6s ease-in-out ${i * 0.08}s infinite alternate` : "none",
            transform: playing ? undefined : "scaleY(0.4)",
            transition: "transform 0.2s",
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

interface Props {
  selectedTrackId: string | null;
  onSelect: (track: MusicTrack | null) => void;
}

export default function MusicPicker({ selectedTrackId, onSelect }: Props) {
  const [genre, setGenre] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filtered = musicTracks.filter((t) => {
    const matchGenre = genre === "All" || t.genre === genre;
    const matchQuery =
      !query ||
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.artist.toLowerCase().includes(query.toLowerCase());
    return matchGenre && matchQuery;
  });

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setPlaying(false);
    setPreviewId(null);
    setProgress(0);
  }, []);

  const togglePreview = useCallback(
    (track: MusicTrack) => {
      if (previewId === track.id) {
        stopAudio();
        return;
      }
      stopAudio();
      const audio = new Audio(track.url);
      audio.volume = 0.7;
      audioRef.current = audio;
      audio.addEventListener("timeupdate", () => {
        setProgress((audio.currentTime / track.duration) * 100);
      });
      audio.addEventListener("ended", stopAudio);
      audio.play().then(() => {
        setPreviewId(track.id);
        setPlaying(true);
      }).catch(() => {
        setPreviewId(null);
        setPlaying(false);
      });
    },
    [previewId, stopAudio],
  );

  useEffect(() => stopAudio, [stopAudio]);

  return (
    <div className="flex flex-col gap-3">
      {/* Selected track display */}
      {selectedTrackId && (() => {
        const t = musicTracks.find((m) => m.id === selectedTrackId);
        return t ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <Music size={16} className="text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-200 truncate">{t.title}</p>
              <p className="text-xs text-stone-400 truncate">{t.artist}</p>
            </div>
            <button
              onClick={() => onSelect(null)}
              className="text-xs text-stone-500 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : null;
      })()}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          type="text"
          placeholder="Search tracks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-stone-900 py-2 pl-8 pr-3 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
        />
      </div>

      {/* Genre tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              genre === g
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-800 text-stone-400 hover:text-amber-300"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-600">No tracks found</p>
        )}
        {filtered.map((track) => {
          const isSelected = selectedTrackId === track.id;
          const isPreviewing = previewId === track.id;
          return (
            <div
              key={track.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                isSelected
                  ? "bg-amber-500/15 border border-amber-500/30"
                  : "border border-transparent hover:bg-stone-800/60"
              }`}
            >
              {/* Preview button */}
              <button
                onClick={() => togglePreview(track)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isPreviewing
                    ? "border-amber-400 bg-amber-400/20 text-amber-400"
                    : "border-stone-700 bg-stone-800 text-stone-400 hover:border-amber-500/50 hover:text-amber-300"
                }`}
              >
                {isPreviewing && playing ? (
                  <Waveform playing={true} />
                ) : isPreviewing ? (
                  <Pause size={14} />
                ) : (
                  <Play size={14} />
                )}
              </button>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium truncate ${isSelected ? "text-amber-200" : "text-stone-200"}`}>
                    {track.title}
                  </p>
                  <span className="shrink-0 rounded-full bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-500">
                    {track.genre}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-stone-500 truncate">{track.artist}</p>
                  {isPreviewing && (
                    <div className="flex-1 h-0.5 bg-stone-700 rounded-full overflow-hidden max-w-[80px]">
                      <div
                        className="h-full bg-amber-400 transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Duration + select */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs tabular-nums text-stone-600">
                  {formatDuration(track.duration)}
                </span>
                <button
                  onClick={() => onSelect(isSelected ? null : track)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                    isSelected
                      ? "border-amber-400 bg-amber-400 text-stone-950"
                      : "border-stone-600 text-stone-500 hover:border-amber-500/60 hover:text-amber-400"
                  }`}
                >
                  <Check size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-stone-700">
        All tracks are royalty-free. Licensed for use on Kiln.
      </p>
    </div>
  );
}
