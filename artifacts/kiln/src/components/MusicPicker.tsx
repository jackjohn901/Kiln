import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Play, Pause, Check, Music, Search, Upload, X, FileAudio, Music2, ExternalLink, Lock, ShoppingBag } from "lucide-react";
import { musicTracks, GENRES, CRAFT_MOODS, formatDuration, type MusicTrack } from "@/data/music";
import { getCommunityBeats, type CommunityBeat } from "@/lib/communityBeats";
import { hasLicense } from "@/lib/beatLicenses";
import { createBeatLooper } from "@/lib/beatSynth";
import { useProfile } from "@/contexts/ProfileContext";

// ── Waveform animation ────────────────────────────────────────────────────────

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
      <style>{`@keyframes waveBar { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }`}</style>
    </div>
  );
}

// ── Mini beat grid ─────────────────────────────────────────────────────────────

const TRACK_COLORS = [
  "bg-amber-500",  // Kick
  "bg-orange-500", // Snare
  "bg-yellow-400", // Hi-Hat
  "bg-lime-500",   // Open Hat
  "bg-teal-500",   // Bass
  "bg-sky-500",    // Melody
];

function MiniGrid({ pattern }: { pattern: boolean[][] }) {
  return (
    <div className="flex flex-col gap-[2px]">
      {pattern.map((row, ti) => (
        <div key={ti} className="flex gap-[2px]">
          {row.map((on, si) => (
            <div key={si} className={`h-1.5 w-2 rounded-[2px] ${on ? TRACK_COLORS[ti] : "bg-stone-700"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Community tab ─────────────────────────────────────────────────────────────

interface CommunityTabProps {
  selectedTrackId: string | null;
  onSelect: (track: MusicTrack | null) => void;
}

function CommunityTab({ selectedTrackId, onSelect }: CommunityTabProps) {
  const [, setLocation] = useLocation();
  const { profile } = useProfile();
  const [beats, setBeats] = useState<CommunityBeat[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const stopperRef = useRef<{ stop: () => void } | null>(null);

  const myHandle = profile?.handle ?? "me";

  useEffect(() => { setBeats(getCommunityBeats()); }, []);

  function togglePreview(beat: CommunityBeat) {
    if (stopperRef.current) { stopperRef.current.stop(); stopperRef.current = null; setPreviewId(null); }
    if (previewId === beat.id) return;
    setPreviewId(beat.id);
    stopperRef.current = createBeatLooper(beat);
    setTimeout(() => { if (stopperRef.current) { stopperRef.current.stop(); stopperRef.current = null; setPreviewId(null); } }, 8000);
  }

  useEffect(() => () => { stopperRef.current?.stop(); }, []);

  function selectBeat(beat: CommunityBeat) {
    stopperRef.current?.stop(); stopperRef.current = null; setPreviewId(null);
    const track: MusicTrack = {
      id: `beat-${beat.id}`,
      title: beat.title,
      artist: beat.artistName,
      genre: "Electronic",
      mood: "Original",
      craftMood: "Studio Vibes",
      bpm: beat.bpm,
      duration: 0,
      url: `beat://${beat.id}`,
      license: beat.license === "free" ? "Free" : beat.license === "community" ? "$1" : "$5",
    };
    const isSelected = selectedTrackId === track.id;
    onSelect(isSelected ? null : track);
  }

  if (beats.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-stone-600">
          <Music2 size={20} />
        </div>
        <p className="text-sm text-stone-500">No community beats yet.</p>
        <p className="text-xs text-stone-700 max-w-[220px]">
          Browse the Sound Market for beats from other creators, or make your own in Music Studio.
        </p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => setLocation("/sound-market")}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            <ShoppingBag size={11} /> Sound Market
          </button>
          <button
            onClick={() => setLocation("/music-studio")}
            className="flex items-center gap-1.5 rounded-full border border-stone-700 px-4 py-2 text-xs font-semibold text-stone-400 hover:border-amber-500/30 hover:text-amber-300 transition-colors"
          >
            <Music2 size={11} /> Create Beat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header with Sound Market link */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-600">{beats.length} beat{beats.length !== 1 ? "s" : ""} from Kiln creators</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation("/sound-market")}
            className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-300 transition-colors"
          >
            <ShoppingBag size={9} /> Sound Market
          </button>
          <span className="text-stone-700">·</span>
          <button
            onClick={() => setLocation("/music-studio")}
            className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-stone-300 transition-colors"
          >
            Create <ExternalLink size={9} />
          </button>
        </div>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {beats.map((beat) => {
          const id = `beat-${beat.id}`;
          const isSelected = selectedTrackId === id;
          const isPreviewing = previewId === beat.id;
          const isLicensed = hasLicense(beat.id, myHandle);
          const isOwn = beat.artistHandle === myHandle;
          const canUse = isOwn || isLicensed || beat.license === "free";

          return (
            <div
              key={beat.id}
              className={`rounded-xl border p-3 transition-colors ${isSelected ? "border-amber-500/30 bg-amber-500/10" : "border-stone-700/60 bg-stone-900/60 hover:border-stone-600"}`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => togglePreview(beat)}
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isPreviewing ? "border-amber-400 bg-amber-400/20 text-amber-400" : "border-stone-700 bg-stone-800 text-stone-400 hover:border-amber-500/50 hover:text-amber-300"
                  }`}
                >
                  {isPreviewing ? <Waveform playing={true} /> : <Play size={13} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium truncate ${isSelected ? "text-amber-200" : "text-stone-200"}`}>{beat.title}</p>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] ${
                      beat.license === "free" ? "border-emerald-500/30 text-emerald-400" : beat.license === "community" ? "border-amber-500/30 text-amber-400" : "border-purple-500/30 text-purple-400"
                    }`}>
                      {beat.license === "free" ? "Free" : beat.license === "community" ? "$1" : "$5"}
                    </span>
                    {isLicensed && !isOwn && (
                      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-400">Licensed ✓</span>
                    )}
                    {isOwn && (
                      <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] text-sky-400">Yours</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500">{beat.artistName} · {beat.bpm} BPM</p>
                  <div className="mt-2">
                    <MiniGrid pattern={beat.pattern} />
                  </div>
                </div>

                {canUse ? (
                  <button
                    onClick={() => selectBeat(beat)}
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isSelected ? "border-amber-400 bg-amber-400 text-stone-950" : "border-stone-600 text-stone-500 hover:border-amber-500/60 hover:text-amber-400"
                    }`}
                  >
                    <Check size={12} />
                  </button>
                ) : (
                  <button
                    onClick={() => setLocation(`/sound-market`)}
                    title={`License this beat for ${beat.license === "community" ? "$1" : "$5"} in Sound Market`}
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <Lock size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-stone-700">
        Beats are synthesized live · <button className="text-amber-600 hover:text-amber-400 transition-colors" onClick={() => setLocation("/sound-market")}>Browse Sound Market</button>
      </p>
    </div>
  );
}

// ── Upload tab ────────────────────────────────────────────────────────────────

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

  function stopAudio() { audioRef.current?.pause(); setPlaying(false); setProgress(0); }

  function handleFile(file: File) {
    const isAudio = file.type.startsWith("audio/");
    if (!isAudio) { setError("Please upload an audio file (MP3, WAV, M4A, AAC, FLAC)"); return; }
    setError("");
    stopAudio();
    const blobUrl = URL.createObjectURL(file);
    const audio = new Audio(blobUrl);
    audio.addEventListener("loadedmetadata", () => {
      const track: MusicTrack = {
        id: `custom-${Date.now()}`,
        title: file.name.replace(/\.[^.]+$/, ""),
        artist: "Your upload",
        genre: "Electronic",
        mood: "Original",
        craftMood: "Studio Vibes",
        bpm: 0,
        duration: Math.round(audio.duration) || 0,
        url: blobUrl,
        license: "Your own music",
      };
      setCustomTrack(track);
      audioRef.current = audio;
      audio.addEventListener("timeupdate", () => { if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100); });
      audio.addEventListener("ended", () => { setPlaying(false); setProgress(0); });
    });
    audio.addEventListener("error", () => setError("Could not load this audio file."));
    audio.load();
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !customTrack) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  function removeTrack() {
    stopAudio();
    if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
    setCustomTrack(null); onSelect(null);
  }

  useEffect(() => () => stopAudio(), []);

  return (
    <div className="space-y-4">
      {!customTrack && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-700 bg-stone-900/40 px-6 py-10 cursor-pointer hover:border-amber-500/40 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-800 text-stone-500">
            <FileAudio size={22} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-stone-300">Drop your audio file here</p>
            <p className="mt-1 text-xs text-stone-600">MP3, WAV, M4A, AAC, FLAC</p>
          </div>
          <button className="rounded-full bg-stone-800 px-4 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-700 transition-colors">
            <Upload size={11} className="mr-1.5 inline" /> Choose file
          </button>
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

      {customTrack && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-900 px-4 py-3">
            <button onClick={togglePlay} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-600 bg-stone-800 text-stone-300 hover:border-amber-500/50 hover:text-amber-300 transition-colors">
              {playing ? <Waveform playing={true} /> : <Play size={15} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-200 truncate">{customTrack.title}</p>
              <p className="text-xs text-stone-500">Your upload · {customTrack.duration > 0 ? formatDuration(customTrack.duration) : "—"}</p>
              <div className="mt-1.5 h-1 rounded-full bg-stone-700 overflow-hidden">
                <div className="h-full rounded-full bg-amber-400 transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <button onClick={removeTrack} className="text-stone-600 hover:text-red-400 transition-colors"><X size={15} /></button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { stopAudio(); onSelect(customTrack); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-colors ${
                isCustomSelected ? "bg-amber-500/20 border border-amber-500/40 text-amber-300" : "bg-amber-500 text-stone-950 hover:bg-amber-400"
              }`}
            >
              {isCustomSelected ? <><Check size={14} /> Using this track</> : "Use this track"}
            </button>
            <button onClick={() => fileRef.current?.click()} className="rounded-full border border-stone-700 px-4 py-2.5 text-xs text-stone-400 hover:border-amber-500/30 transition-colors">
              Change
            </button>
          </div>
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      <p className="text-center text-[10px] text-stone-700">You own the rights to your uploaded music.</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  selectedTrackId: string | null;
  selectedTrack?: MusicTrack | null;
  onSelect: (track: MusicTrack | null) => void;
}

export default function MusicPicker({ selectedTrackId, selectedTrack, onSelect }: Props) {
  const [tab, setTab] = useState<"library" | "community" | "upload">("library");
  const [craftMood, setCraftMood] = useState<string>("All");
  const [genre, setGenre] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filtered = musicTracks.filter((t) => {
    const matchMood = craftMood === "All" || t.craftMood === craftMood;
    const matchGenre = genre === "All" || t.genre === genre;
    const matchQuery = !query || t.title.toLowerCase().includes(query.toLowerCase()) || t.artist.toLowerCase().includes(query.toLowerCase());
    return matchMood && matchGenre && matchQuery;
  });

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setPlaying(false); setPreviewId(null); setProgress(0);
  }, []);

  const togglePreview = useCallback((track: MusicTrack) => {
    if (previewId === track.id) { stopAudio(); return; }
    stopAudio();
    const audio = new Audio(track.url);
    audio.volume = 0.7;
    audioRef.current = audio;
    audio.addEventListener("timeupdate", () => { setProgress((audio.currentTime / track.duration) * 100); });
    audio.addEventListener("ended", stopAudio);
    audio.play().then(() => { setPreviewId(track.id); setPlaying(true); }).catch(() => {});
  }, [previewId, stopAudio]);

  useEffect(() => stopAudio, [stopAudio]);

  const isCustomSelected = selectedTrackId?.startsWith("custom-") ?? false;
  const isBeatSelected = selectedTrackId?.startsWith("beat-") ?? false;

  // Resolve display track (handles beat:// and custom:// and library tracks)
  const displayTrack = selectedTrack ?? musicTracks.find((m) => m.id === selectedTrackId);

  return (
    <div className="flex flex-col gap-3">
      {/* Selected track banner */}
      {selectedTrackId && displayTrack && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <Music size={16} className="text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-200 truncate">{displayTrack.title}</p>
            <p className="text-xs text-stone-400 truncate">{displayTrack.artist}</p>
          </div>
          <button onClick={() => onSelect(null)} className="text-xs text-stone-500 hover:text-red-400 transition-colors">Remove</button>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-stone-900 p-1">
        <button
          onClick={() => setTab("library")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${tab === "library" ? "bg-stone-700 text-stone-100" : "text-stone-500 hover:text-stone-300"}`}
        >
          Library
        </button>
        <button
          onClick={() => setTab("community")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
            tab === "community" ? isBeatSelected ? "bg-amber-500/20 text-amber-300" : "bg-stone-700 text-stone-100" : "text-stone-500 hover:text-stone-300"
          }`}
        >
          Community
          {isBeatSelected && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
        </button>
        <button
          onClick={() => setTab("upload")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors ${
            tab === "upload" ? isCustomSelected ? "bg-amber-500/20 text-amber-300" : "bg-stone-700 text-stone-100" : "text-stone-500 hover:text-stone-300"
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
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text" placeholder="Search tracks or artists..." value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-stone-900 py-2 pl-8 pr-3 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          {/* Craft mood filter — prominent, TikTok-style */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600">Craft Mood</p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <button
                onClick={() => setCraftMood("All")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${craftMood === "All" ? "bg-stone-600 text-stone-100" : "bg-stone-800 text-stone-500 hover:text-stone-300"}`}
              >
                All
              </button>
              {CRAFT_MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setCraftMood(craftMood === m.id ? "All" : m.id); setGenre("All"); }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    craftMood === m.id ? "bg-amber-500 text-stone-950 shadow-sm shadow-amber-500/30" : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Genre filter */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600">Genre</p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => { setGenre(g); if (g !== "All") setCraftMood("All"); }}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    genre === g ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-400 hover:text-amber-300"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Trending shelf — shown only when no active filters */}
          {craftMood === "All" && genre === "All" && !query && (() => {
            const trending = [
              musicTracks.find(t => t.id === "equatorial-complex"),
              musicTracks.find(t => t.id === "lost-frontier"),
              musicTracks.find(t => t.id === "tempting-secrets"),
              musicTracks.find(t => t.id === "space-jazz"),
              musicTracks.find(t => t.id === "inner-light"),
              musicTracks.find(t => t.id === "impact-moderato"),
            ].filter(Boolean) as MusicTrack[];
            return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-600">🔥 Trending in Craft</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {trending.map((track) => {
                    const isSelected = selectedTrackId === track.id;
                    const isPreviewing = previewId === track.id;
                    const moodEmoji = CRAFT_MOODS.find(m => m.id === track.craftMood)?.emoji ?? "🎵";
                    return (
                      <button
                        key={track.id}
                        onClick={() => onSelect(isSelected ? null : track)}
                        className={`shrink-0 flex flex-col gap-1.5 rounded-xl border p-3 w-28 text-left transition-all ${
                          isSelected
                            ? "border-amber-500/40 bg-amber-500/15"
                            : "border-stone-700/60 bg-stone-900/60 hover:border-amber-500/30"
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${isSelected ? "bg-amber-500/20" : "bg-stone-800"}`}>
                          {isPreviewing && playing ? <Waveform playing /> : moodEmoji}
                        </div>
                        <p className={`text-[11px] font-semibold leading-tight line-clamp-2 ${isSelected ? "text-amber-200" : "text-stone-200"}`}>{track.title}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-[9px] text-stone-600">{track.bpm} BPM</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePreview(track); }}
                            className="text-stone-500 hover:text-amber-400 transition-colors"
                          >
                            {isPreviewing ? <Pause size={10} /> : <Play size={10} />}
                          </button>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Track count */}
          <p className="text-xs text-stone-600">{filtered.length} track{filtered.length !== 1 ? "s" : ""}</p>

          {/* Track list */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-stone-600">No tracks match — try a different filter</p>
            )}
            {filtered.map((track) => {
              const isSelected = selectedTrackId === track.id;
              const isPreviewing = previewId === track.id;
              return (
                <div
                  key={track.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${isSelected ? "bg-amber-500/15 border border-amber-500/30" : "border border-transparent hover:bg-stone-800/60"}`}
                >
                  <button
                    onClick={() => togglePreview(track)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isPreviewing ? "border-amber-400 bg-amber-400/20 text-amber-400" : "border-stone-700 bg-stone-800 text-stone-400 hover:border-amber-500/50 hover:text-amber-300"
                    }`}
                  >
                    {isPreviewing && playing ? <Waveform playing /> : isPreviewing ? <Pause size={14} /> : <Play size={14} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-medium truncate ${isSelected ? "text-amber-200" : "text-stone-200"}`}>{track.title}</p>
                      <span className="shrink-0 rounded-full bg-stone-800 px-1.5 py-0.5 text-[9px] text-stone-500">{track.genre}</span>
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

          <p className="text-center text-[10px] text-stone-700">
            {musicTracks.length} royalty-free tracks · CC BY / Public Domain
          </p>
        </>
      )}

      {tab === "community" && (
        <CommunityTab selectedTrackId={selectedTrackId} onSelect={onSelect} />
      )}

      {tab === "upload" && (
        <UploadTab selectedTrackId={selectedTrackId} onSelect={onSelect} />
      )}
    </div>
  );
}
