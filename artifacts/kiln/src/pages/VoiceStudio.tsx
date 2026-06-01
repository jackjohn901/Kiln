import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Mic, Play, Pause, Download, Loader2, Volume2, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import Nav from "@/components/Nav";

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url?: string;
}

const CHAR_LIMIT = 2500;

const PRESETS = [
  { label: "Process intro", text: "Welcome to my studio. Today I'm working on a new piece — let me walk you through my process from start to finish." },
  { label: "Workshop teaser", text: "In this workshop, you'll learn the fundamental techniques that took me years to master. Seats are limited, so grab yours before it's gone." },
  { label: "Drop announcement", text: "This is one of my most personal pieces to date. It drops Friday at noon — only one available, and it won't last." },
  { label: "Artist bio", text: "I'm a craft artist based in the Pacific Northwest. My work explores the tension between raw material and refined form." },
];

export default function VoiceStudio() {
  const [, navigate] = useLocation();
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [voicesError, setVoicesError] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [text, setText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/elevenlabs/voices", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { voices?: ElevenLabsVoice[]; error?: string }) => {
        if (data.error) { setVoicesError(data.error); return; }
        const list = (data.voices ?? []).filter((v) => v.category !== "cloned");
        setVoices(list);
        if (list.length > 0) setSelectedVoiceId(list[0].voice_id);
      })
      .catch(() => setVoicesError("Couldn't load voices"))
      .finally(() => setLoadingVoices(false));
  }, []);

  async function handleGenerate() {
    if (!text.trim() || !selectedVoiceId) return;
    setError("");
    setAudioUrl("");
    setGenerating(true);
    try {
      const res = await fetch("/api/elevenlabs/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: text.trim(), voiceId: selectedVoiceId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  function togglePlay() {
    if (!audioRef.current || !audioUrl) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }

  function handleDownload() {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = "kiln-voiceover.mp3";
    a.click();
  }

  function previewVoice(voice: ElevenLabsVoice) {
    if (!voice.preview_url) return;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = "";
    }
    if (previewingId === voice.voice_id) {
      setPreviewingId(null);
      return;
    }
    const audio = new Audio(voice.preview_url);
    previewAudioRef.current = audio;
    audio.play();
    setPreviewingId(voice.voice_id);
    audio.onended = () => setPreviewingId(null);
  }

  const selectedVoice = voices.find((v) => v.voice_id === selectedVoiceId);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 py-8 pb-32">

        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => (window.history.length > 1 ? window.history.back() : navigate("/create"))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100 flex items-center gap-2">
              <Mic size={20} className="text-amber-400" />
              Voice Studio
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">Generate AI voiceovers for your reels, workshops, and drops</p>
          </div>
        </div>

        {/* Preset prompts */}
        <div className="mb-5">
          <p className="text-xs font-medium text-stone-500 mb-2">Quick starts</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setText(p.text)}
                className="rounded-full border border-white/10 bg-stone-900/50 px-3 py-1 text-xs text-stone-400 hover:border-amber-500/30 hover:text-amber-300 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Script input */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-stone-400">Script</label>
            <span className={`text-xs ${text.length > CHAR_LIMIT ? "text-rose-400" : "text-stone-600"}`}>
              {text.length} / {CHAR_LIMIT}
            </span>
          </div>
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your narration here — what do you want to say over your video?"
            className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-3 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-none"
          />
        </div>

        {/* Voice picker */}
        <div className="mb-6">
          <label className="text-sm font-medium text-stone-400 mb-2 block">Voice</label>
          {loadingVoices ? (
            <div className="flex items-center gap-2 text-stone-500 text-sm py-4">
              <Loader2 size={14} className="animate-spin" /> Loading voices…
            </div>
          ) : voicesError ? (
            <p className="text-sm text-rose-400">{voicesError}</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {voices.slice(0, 16).map((voice) => (
                <button
                  key={voice.voice_id}
                  onClick={() => setSelectedVoiceId(voice.voice_id)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selectedVoiceId === voice.voice_id
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-white/8 bg-stone-900/40 hover:border-white/15"
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 shrink-0">
                    <Volume2 size={13} className={selectedVoiceId === voice.voice_id ? "text-amber-400" : "text-stone-500"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${selectedVoiceId === voice.voice_id ? "text-amber-200" : "text-stone-300"}`}>
                      {voice.name}
                    </p>
                    <p className="text-xs text-stone-600 truncate">
                      {voice.labels?.accent ?? voice.labels?.description ?? voice.category ?? ""}
                    </p>
                  </div>
                  {voice.preview_url && (
                    <button
                      onClick={(e) => { e.stopPropagation(); previewVoice(voice); }}
                      className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-white/5 hover:bg-amber-500/20 transition-colors"
                      title="Preview voice"
                    >
                      {previewingId === voice.voice_id
                        ? <Pause size={10} className="text-amber-400" />
                        : <Play size={10} className="text-stone-400" />
                      }
                    </button>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</p>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !text.trim() || !selectedVoiceId || text.length > CHAR_LIMIT}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-4"
        >
          {generating ? (
            <><Loader2 size={16} className="animate-spin" /> Generating…</>
          ) : (
            <><Mic size={16} /> Generate voiceover</>
          )}
        </button>

        {/* Audio player */}
        {audioUrl && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                <Volume2 size={14} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-200">Voiceover ready</p>
                <p className="text-xs text-stone-500">{selectedVoice?.name ?? "Generated voice"}</p>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              onPause={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                onClick={togglePlay}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                {playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center justify-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-sm text-stone-400 hover:border-amber-500/30 hover:text-amber-300 transition-colors disabled:opacity-40"
                title="Regenerate"
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-1.5 rounded-full border border-white/10 px-4 py-2.5 text-sm text-stone-400 hover:border-emerald-500/30 hover:text-emerald-300 transition-colors"
              >
                <Download size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
