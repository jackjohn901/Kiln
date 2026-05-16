import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Play, Pause, Trash2, Save, ChevronLeft, Music2, Shuffle, RotateCcw } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { saveCommunityBeat, getCommunityBeats, deleteCommunityBeat, type CommunityBeat } from "@/lib/communityBeats";

// ── Constants ────────────────────────────────────────────────────────────────

const STEPS = 16;

const TRACK_DEFS = [
  { name: "Kick",     symbol: "●", activeClass: "bg-amber-500 border-amber-400",     dimClass: "bg-amber-500/20 border-amber-500/30"  },
  { name: "Snare",    symbol: "◆", activeClass: "bg-orange-500 border-orange-400",   dimClass: "bg-orange-500/20 border-orange-500/30" },
  { name: "Hi-Hat",   symbol: "×", activeClass: "bg-yellow-400 border-yellow-300",   dimClass: "bg-yellow-400/20 border-yellow-400/30" },
  { name: "Open Hat", symbol: "○", activeClass: "bg-lime-500 border-lime-400",       dimClass: "bg-lime-500/20 border-lime-500/30"     },
  { name: "Bass",     symbol: "▼", activeClass: "bg-teal-500 border-teal-400",       dimClass: "bg-teal-500/20 border-teal-500/30"     },
  { name: "Melody",   symbol: "♪", activeClass: "bg-sky-500 border-sky-400",         dimClass: "bg-sky-500/20 border-sky-400/30"       },
] as const;

const PRESET_PATTERNS: { name: string; pattern: boolean[][] }[] = [
  {
    name: "Four on the Floor",
    pattern: [
      [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0].map(Boolean), // Kick
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0].map(Boolean), // Snare
      [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0].map(Boolean), // Hi-Hat
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1].map(Boolean), // Open Hat
      [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,1,0,0].map(Boolean), // Bass
      [0,0,1,0, 0,1,0,0, 0,0,1,0, 0,0,0,1].map(Boolean), // Melody
    ],
  },
  {
    name: "Craft Flow",
    pattern: [
      [1,0,0,1, 0,0,1,0, 1,0,0,0, 0,1,0,0].map(Boolean),
      [0,0,1,0, 0,0,0,1, 0,0,1,0, 0,0,1,0].map(Boolean),
      [1,1,0,1, 1,0,1,1, 0,1,1,0, 1,1,0,1].map(Boolean),
      [0,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0].map(Boolean),
      [1,0,0,0, 1,0,0,0, 0,0,1,0, 0,0,0,1].map(Boolean),
      [0,0,0,1, 0,1,0,0, 1,0,0,0, 0,0,1,0].map(Boolean),
    ],
  },
  {
    name: "Hot Shop",
    pattern: [
      [1,0,1,0, 0,1,0,0, 1,0,1,0, 0,0,1,0].map(Boolean),
      [0,0,0,1, 0,0,1,0, 0,0,0,1, 1,0,0,1].map(Boolean),
      [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1].map(Boolean),
      [0,0,0,0, 0,1,0,0, 0,0,0,0, 0,1,0,0].map(Boolean),
      [1,0,0,1, 0,0,1,0, 1,0,1,0, 0,1,0,0].map(Boolean),
      [0,1,0,0, 1,0,0,1, 0,1,0,0, 1,0,1,0].map(Boolean),
    ],
  },
];

// ── Web Audio synthesis ───────────────────────────────────────────────────────

function playKick(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.45);
  gain.gain.setValueAtTime(1.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
  osc.start(time); osc.stop(time + 0.5);
}

function playSnare(ctx: AudioContext, time: number) {
  const size = Math.ceil(ctx.sampleRate * 0.18);
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = "highpass"; filt.frequency.value = 1200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  noise.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
  noise.start(time); noise.stop(time + 0.18);

  const osc = ctx.createOscillator();
  const og = ctx.createGain();
  osc.frequency.value = 190;
  og.gain.setValueAtTime(0.6, time);
  og.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  osc.connect(og); og.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.08);
}

function playHiHat(ctx: AudioContext, time: number, open: boolean) {
  const dur = open ? 0.35 : 0.04;
  const size = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = "bandpass"; filt.frequency.value = 9000; filt.Q.value = 0.4;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(open ? 0.5 : 0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  noise.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
  noise.start(time); noise.stop(time + dur);
}

function playBass(ctx: AudioContext, time: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(60, time);
  gain.gain.setValueAtTime(0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.3);
}

function playMelody(ctx: AudioContext, time: number, step: number) {
  const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
  const freq = scale[step % scale.length];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(time); osc.stop(time + 0.25);
}

function triggerTrack(ctx: AudioContext, trackIdx: number, stepIdx: number, time: number) {
  switch (trackIdx) {
    case 0: playKick(ctx, time); break;
    case 1: playSnare(ctx, time); break;
    case 2: playHiHat(ctx, time, false); break;
    case 3: playHiHat(ctx, time, true); break;
    case 4: playBass(ctx, time); break;
    case 5: playMelody(ctx, time, stepIdx); break;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyPattern(): boolean[][] {
  return TRACK_DEFS.map(() => Array(STEPS).fill(false));
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── MiniGrid (read-only beat preview) ────────────────────────────────────────

function MiniGrid({ pattern }: { pattern: boolean[][] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {pattern.map((row, ti) => (
        <div key={ti} className="flex gap-0.5">
          {row.map((on, si) => (
            <div
              key={si}
              className={`h-1.5 w-2.5 rounded-[2px] transition-colors ${
                on ? TRACK_DEFS[ti].activeClass : "bg-stone-700"
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MusicStudio() {
  const [, setLocation] = useLocation();
  const { profile } = useProfile();

  const [pattern, setPattern] = useState<boolean[][]>(emptyPattern);
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [beatTitle, setBeatTitle] = useState("");
  const [license, setLicense] = useState<CommunityBeat["license"]>("free");
  const [saved, setSaved] = useState(false);
  const [myBeats, setMyBeats] = useState<CommunityBeat[]>([]);
  const [tab, setTab] = useState<"studio" | "saved">("studio");

  const ctxRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<number | null>(null);
  const nextTimeRef = useRef(0);
  const stepRef = useRef(0);
  const patternRef = useRef(pattern);
  const bpmRef = useRef(bpm);
  const uiTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => { patternRef.current = pattern; }, [pattern]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  useEffect(() => {
    setMyBeats(
      getCommunityBeats().filter(
        (b) => b.artistHandle === (profile?.handle ?? "me")
      )
    );
  }, [profile?.handle]);

  const scheduleStep = useCallback((step: number, time: number) => {
    const ctx = ctxRef.current!;
    patternRef.current.forEach((row, ti) => {
      if (row[step]) triggerTrack(ctx, ti, step, time);
    });
    const delay = Math.max(0, (time - ctx.currentTime) * 1000);
    const t = setTimeout(() => setCurrentStep(step), delay);
    uiTimersRef.current.push(t);
  }, []);

  const runScheduler = useCallback(() => {
    const ctx = ctxRef.current!;
    const stepDur = 60 / bpmRef.current / 4;
    while (nextTimeRef.current < ctx.currentTime + 0.12) {
      scheduleStep(stepRef.current, nextTimeRef.current);
      nextTimeRef.current += stepDur;
      stepRef.current = (stepRef.current + 1) % STEPS;
    }
  }, [scheduleStep]);

  const stop = useCallback(() => {
    if (schedulerRef.current) { clearInterval(schedulerRef.current); schedulerRef.current = null; }
    uiTimersRef.current.forEach(clearTimeout);
    uiTimersRef.current = [];
    setPlaying(false);
    setCurrentStep(-1);
    stepRef.current = 0;
  }, []);

  const start = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    stepRef.current = 0;
    nextTimeRef.current = ctxRef.current.currentTime + 0.05;
    schedulerRef.current = window.setInterval(runScheduler, 25);
    setPlaying(true);
  }, [runScheduler]);

  useEffect(() => () => stop(), [stop]);

  function toggleCell(ti: number, si: number) {
    setPattern((prev) => {
      const next = prev.map((r) => [...r]);
      next[ti][si] = !next[ti][si];
      return next;
    });
    setSaved(false);
  }

  function loadPreset(idx: number) {
    stop();
    setPattern(PRESET_PATTERNS[idx].pattern.map((r) => [...r]));
    setSaved(false);
  }

  function clearAll() {
    stop();
    setPattern(emptyPattern());
    setSaved(false);
  }

  function handleSave() {
    const title = beatTitle.trim() || "Untitled Beat";
    const beat: CommunityBeat = {
      id: randomId(),
      title,
      artistHandle: profile?.handle ?? "me",
      artistName: profile?.name ?? "You",
      bpm,
      pattern: pattern.map((r) => [...r]),
      license,
      price: license === "free" ? 0 : license === "community" ? 1 : 5,
      createdAt: new Date().toISOString(),
      usedCount: 0,
    };
    saveCommunityBeat(beat);
    setMyBeats(getCommunityBeats().filter((b) => b.artistHandle === (profile?.handle ?? "me")));
    setSaved(true);
    setBeatTitle("");
  }

  function handleDelete(id: string) {
    deleteCommunityBeat(id);
    setMyBeats((prev) => prev.filter((b) => b.id !== id));
  }

  function loadBeat(beat: CommunityBeat) {
    stop();
    setPattern(beat.pattern.map((r) => [...r]));
    setBpm(beat.bpm);
    setBeatTitle(beat.title);
    setTab("studio");
    setSaved(false);
  }

  return (
    <div className="min-h-screen bg-stone-950 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-stone-950/90 px-4 py-3 backdrop-blur">
        <button onClick={() => { stop(); setLocation("/create"); }} className="text-stone-400 hover:text-stone-200 transition-colors">
          <ChevronLeft size={22} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Music2 size={18} className="text-amber-400" />
          <h1 className="text-base font-semibold text-stone-100">Music Studio</h1>
        </div>
        <div className="flex gap-1 rounded-lg bg-stone-900 p-0.5">
          <button
            onClick={() => setTab("studio")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${tab === "studio" ? "bg-stone-700 text-stone-100" : "text-stone-500 hover:text-stone-300"}`}
          >
            Studio
          </button>
          <button
            onClick={() => setTab("saved")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${tab === "saved" ? "bg-stone-700 text-stone-100" : "text-stone-500 hover:text-stone-300"}`}
          >
            Saved {myBeats.length > 0 && <span className="ml-1 rounded-full bg-amber-500/30 px-1.5 text-amber-300">{myBeats.length}</span>}
          </button>
        </div>
      </div>

      {tab === "studio" && (
        <div className="px-4 pt-4 space-y-5">

          {/* BPM + Transport */}
          <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-stone-900 px-4 py-3">
            <button
              onClick={playing ? stop : start}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                playing ? "border-amber-400 bg-amber-400/20 text-amber-300" : "border-stone-600 bg-stone-800 text-stone-300 hover:border-amber-500/60"
              }`}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-stone-500">BPM</span>
                <span className="text-sm font-bold tabular-nums text-amber-300">{bpm}</span>
              </div>
              <input
                type="range" min={60} max={180} value={bpm}
                onChange={(e) => { setBpm(Number(e.target.value)); setSaved(false); }}
                className="w-full accent-amber-400"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearAll}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-700 text-stone-500 hover:border-red-500/40 hover:text-red-400 transition-colors"
                title="Clear all"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Presets */}
          <div>
            <p className="mb-2 text-xs font-medium text-stone-500">Presets</p>
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {PRESET_PATTERNS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => loadPreset(i)}
                  className="shrink-0 rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
                >
                  <Shuffle size={10} className="inline mr-1" />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sequencer grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              {/* Step numbers */}
              <div className="mb-1 flex gap-1 pl-[68px]">
                {Array.from({ length: STEPS }, (_, i) => (
                  <div
                    key={i}
                    className={`flex w-8 shrink-0 items-center justify-center text-[9px] font-mono transition-colors ${
                      currentStep === i ? "text-amber-400" : "text-stone-700"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {TRACK_DEFS.map((track, ti) => (
                <div key={ti} className="mb-1 flex items-center gap-1">
                  <div className="w-16 shrink-0 text-right pr-2">
                    <span className="text-[10px] font-medium text-stone-500">{track.name}</span>
                  </div>
                  {Array.from({ length: STEPS }, (_, si) => {
                    const on = pattern[ti][si];
                    const isActive = currentStep === si && playing;
                    return (
                      <button
                        key={si}
                        onClick={() => toggleCell(ti, si)}
                        className={`h-8 w-8 shrink-0 rounded-md border transition-all ${
                          on
                            ? isActive
                              ? `${track.activeClass} scale-95 brightness-125`
                              : track.activeClass
                            : isActive
                              ? "border-stone-500 bg-stone-600"
                              : `border-stone-700 bg-stone-800/60 hover:border-stone-500 ${si % 4 === 0 ? "border-stone-600" : ""}`
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Track legend */}
          <div className="flex flex-wrap gap-2">
            {TRACK_DEFS.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full border ${t.activeClass}`} />
                <span className="text-[10px] text-stone-600">{t.name}</span>
              </div>
            ))}
          </div>

          {/* Save & License */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-4 space-y-4">
            <h2 className="text-sm font-semibold text-stone-200">Save & License Your Beat</h2>
            <p className="text-xs text-stone-500">
              Other Kiln creators can use your beat in their posts. Set a license to earn from it or share it free.
            </p>

            <input
              type="text"
              placeholder="Beat name (e.g. Late Night Wheel Throw)"
              value={beatTitle}
              onChange={(e) => { setBeatTitle(e.target.value); setSaved(false); }}
              maxLength={60}
              className="w-full rounded-xl border border-white/10 bg-stone-800 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
            />

            <div className="grid grid-cols-3 gap-2">
              {(["free", "community", "premium"] as CommunityBeat["license"][]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLicense(l)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    license === l
                      ? l === "free"
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : l === "community"
                          ? "border-amber-500/60 bg-amber-500/10"
                          : "border-purple-500/60 bg-purple-500/10"
                      : "border-stone-700 bg-stone-800/40 hover:border-stone-600"
                  }`}
                >
                  <p className={`text-xs font-semibold capitalize ${
                    license === l
                      ? l === "free" ? "text-emerald-400" : l === "community" ? "text-amber-400" : "text-purple-400"
                      : "text-stone-400"
                  }`}>
                    {l === "free" ? "Free" : l === "community" ? "Community" : "Premium"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-stone-600">
                    {l === "free" ? "Anyone can use" : l === "community" ? "$1 per use" : "$5 per use"}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={handleSave}
              className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all ${
                saved
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                  : "bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95"
              }`}
            >
              <Save size={15} />
              {saved ? "Beat saved to your library!" : "Save beat"}
            </button>
          </div>
        </div>
      )}

      {tab === "saved" && (
        <div className="px-4 pt-4 space-y-3">
          {myBeats.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 text-stone-600">
                <Music2 size={24} />
              </div>
              <p className="text-sm text-stone-500">No saved beats yet.</p>
              <p className="text-xs text-stone-700">Build a beat in the Studio tab and save it — it'll appear in the music picker when you create a post.</p>
              <button
                onClick={() => setTab("studio")}
                className="mt-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                Open Studio
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-stone-600">These beats appear in the Community tab of the music picker when you post.</p>
              {myBeats.map((beat) => (
                <div key={beat.id} className="rounded-2xl border border-white/5 bg-stone-900 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-200">{beat.title}</p>
                      <p className="text-xs text-stone-500">{beat.bpm} BPM · {beat.usedCount} uses</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] capitalize ${
                      beat.license === "free"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : beat.license === "community"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-purple-500/30 bg-purple-500/10 text-purple-400"
                    }`}>
                      {beat.license}
                    </span>
                  </div>
                  <MiniGrid pattern={beat.pattern} />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => loadBeat(beat)}
                      className="flex-1 rounded-full border border-stone-700 py-1.5 text-xs text-stone-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
                    >
                      Edit in Studio
                    </button>
                    <button
                      onClick={() => handleDelete(beat.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-700 text-stone-500 hover:border-red-500/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
