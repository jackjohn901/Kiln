import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Check, Music, Search, Upload, X, FileAudio } from "lucide-react";
import { musicTracks, formatDuration, type MusicTrack } from "@/data/music";

const GENRES = ["All", "Ambient", "Classical", "Electronic", "Jazz", "Orchestral", "World"] as const;

// ─── Waveform animation ───────────────────────────────────────────────────────

function Waveform({ playing }: { playing: boolean }) {
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

// ─── Upload tab ───────────────────────────────────────────────────────────────

interface UploadTabProps {
  selectedTrackId: string | null;
  onSelect: (track: MusicTrack | null) => void;
}

function UploadTab({ selectedTrackId, onSelect }: UploadTabProps) {
  const [customTrack, setCustomTrack] = useState<MusicTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isCustomSelected = selectedTrackId?.startsWith("custom-") ?? false;

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlaying(false);
    setProgress(0);
  }

  function handleFile(file: File) {
    const allowed = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/aac", "audio/ogg", "audio/flac"];
    const isAudio = file.type.startsWith("audio/") || allowed.some((t) => file.type === t);
    if (!isAudio) {
      setError("Please upload an audio file (MP3, WAV, M4A, AAC, FLAC)");
      return;
    }
    setError("");
    stopAudio();

    const blobUrl = URL.createObjectURL(file);
    const audio = new Audio(blobUrl);

    audio.addEventListener("loadedmetadata", () => {
      const name = file.name.replace(/\.[^.]+$/, "");
      const track: MusicTrack = {
        id: `custom-${Date.now()}`,
        title: name,
        artist: "Your upload",
        genre: "Electronic",
        mood: "Original",
        bpm: 0,
        duration: Math.round(audio.duration) || 0,
        url: blobUrl,
        license: "Your own music",
      };
      setCustomTrack(track);
      audioRef.current = audio;
      audio.addEventListener("timeupdate", () => {
        if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
      });
      audio.addEventListener("ended", () => { setPlaying(false); setProgress(0); });
    });

    audio.addEventListener("error", () => {
      setError("Could not load this audio file. Try a different format.");
    });

    audio.load();
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !customTrack) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function removeTrack() {
    stopAudio();
    if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
    setCustomTrack(null);
    onSelect(null);
  }

  useEffect(() => () => { stopAudio(); }, []);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {!customTrack && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-700 bg-stone-900/40 px-6 py-10 transition-colors hover:border-amber-500/40 cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-800 text-stone-500">
            <FileAudio size={22} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-stone-300">Drop your audio file here</p>
            <p className="mt-1 text-xs text-stone-600">MP3, WAV, M4A, AAC, FLAC · up to 50 MB</p>
          </div>
          <button className="rounded-full bg-stone-800 px-4 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-700 transition-colors">
            <Upload size={11} className="mr-1.5 inline" />
            Choose file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
      )}

      {/* Loaded track preview */}
      {customTrack && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-900 px-4 py-3">
            {/* Play button */}
            <button
              onClick={togglePlay}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-600 bg-stone-800 text-stone-300 hover:border-amber-500/50 hover:text-amber-300 transition-colors"
            >
              {playing ? <Waveform playing={true} /> : <Play size={15} />}
            </button>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-200 truncate">{customTrack.title}</p>
              <p className="text-xs text-stone-500">Your upload · {customTrack.duration > 0 ? formatDuration(customTrack.duration) : "—"}</p>
              {/* Progress bar */}
              <div className="mt-1.5 h-1 rounded-full bg-stone-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Remove */}
            <button
              onClick={removeTrack}
              className="text-stone-600 hover:text-red-400 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Use this track / change file */}
          <div className="flex gap-2">
            <button
              onClick={() => { stopAudio(); onSelect(customTrack); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-colors ${
                isCustomSelected
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                  : "bg-amber-500 text-stone-950 hover:bg-amber-400"
              }`}
            >
              {isCustomSelected ? <><Check size={14} /> Using this track</> : "Use this track"}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-full border border-stone-700 px-4 py-2.5 text-xs text-stone-400 hover:border-amber-500/30 transition-colors"
            >
              Change
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      <p className="text-center text-[10px] text-stone-700">
        You own the rights to your uploaded music. Kiln doesn't store it on our servers.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  selectedTrackId: string | null;
  selectedTrack?: MusicTrack | null;
  onSelect: (track: MusicTrack | null) => void;
}

export default function MusicPicker({ selectedTrackId, selectedTrack, onSelect }: Props) {
  const [tab, setTab] = useState<"library" | "upload">("library");
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
      if (previewId === track.id) { stopAudio(); return; }
      stopAudio();
      const audio = new Audio(track.url);
      audio.volume = 0.7;
      audioRef.current = audio;
      audio.addEventListener("timeupdate", () => {
        setProgress((audio.currentTime / track.duration) * 100);
      });
      audio.addEventListener("ended", stopAudio);
      audio.play().then(() => { setPreviewId(track.id); setPlaying(true); }).catch(() => {});
    },
    [previewId, stopAudio],
  );

  useEffect(() => stopAudio, [stopAudio]);

  const isCustomSelected = selectedTrackId?.startsWith("custom-") ?? false;

  return (
    <div className="flex flex-col gap-3">
      {/* Selected track display */}
      {selectedTrackId && (() => {
        const t = selectedTrack ?? musicTracks.find((m) => m.id === selectedTrackId);
        return t ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <Music size={16} className="text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-200 truncate">{t.title}</p>
              <p className="text-xs text-stone-400 truncate">{t.artist}</p>
            </div>
            <button onClick={() => onSelect(null)} className="text-xs text-stone-500 hover:text-red-400 transition-colors">
              Remove
            </button>
          </div>
        ) : null;
      })()}

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-stone-900 p-1">
        <button
          onClick={() => setTab("library")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
            tab === "library" ? "bg-stone-700 text-stone-100" : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Library
        </button>
        <button
          onClick={() => setTab("upload")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
            tab === "upload"
              ? isCustomSelected
                ? "bg-amber-500/20 text-amber-300"
                : "bg-stone-700 text-stone-100"
              : "text-stone-500 hover:text-stone-300"
          }`}
        >
          <Upload size={11} />
          Upload
          {isCustomSelected && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
        </button>
      </div>

      {/* Library tab */}
      {tab === "library" && (
        <>
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

          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  genre === g ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-400 hover:text-amber-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

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
                    isSelected ? "bg-amber-500/15 border border-amber-500/30" : "border border-transparent hover:bg-stone-800/60"
                  }`}
                >
                  <button
                    onClick={() => togglePreview(track)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isPreviewing ? "border-amber-400 bg-amber-400/20 text-amber-400" : "border-stone-700 bg-stone-800 text-stone-400 hover:border-amber-500/50 hover:text-amber-300"
                    }`}
                  >
                    {isPreviewing && playing ? <Waveform playing={true} /> : isPreviewing ? <Pause size={14} /> : <Play size={14} />}
                  </button>

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
                          <div className="h-full bg-amber-400 transition-all duration-200" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs tabular-nums text-stone-600">{formatDuration(track.duration)}</span>
                    <button
                      onClick={() => onSelect(isSelected ? null : track)}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                        isSelected ? "border-amber-400 bg-amber-400 text-stone-950" : "border-stone-600 text-stone-500 hover:border-amber-500/60 hover:text-amber-400"
                      }`}
                    >
                      <Check size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-stone-700">All tracks are royalty-free. Licensed for use on Kiln.</p>
        </>
      )}

      {/* Upload tab */}
      {tab === "upload" && (
        <UploadTab selectedTrackId={selectedTrackId} onSelect={onSelect} />
      )}
    </div>
  );
}
