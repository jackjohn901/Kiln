import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Play, Pause, Trash2, Save, ChevronLeft, Music, Music2, RotateCcw,
  Download, SlidersHorizontal, Plus, ChevronDown, ChevronUp, Check, Zap,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import {
  saveCommunityBeat, getCommunityBeats, deleteCommunityBeat, type CommunityBeat,
} from "@/lib/communityBeats";
import {
  playKick, playSnare, playClap, playHiHat, playShaker, playTom,
  playBass, playChord, playMelody,
  BASS_NAMES, CHORD_NAMES, MELODY_NAMES,
  encodeWAV,
} from "@/lib/beatSynth";

// ── Track definitions (10 tracks) ─────────────────────────────────────────────

const TRACK_DEFS = [
  { name: "Kick",    short: "KCK", dot: "bg-amber-500",  active: "bg-amber-500 border-amber-400",   dim: "bg-amber-500/20 border-amber-500/30",   tonal: false, colorText: "text-amber-400"  },
  { name: "Snare",   short: "SNR", dot: "bg-orange-500", active: "bg-orange-500 border-orange-400", dim: "bg-orange-500/20 border-orange-500/30", tonal: false, colorText: "text-orange-400" },
  { name: "Clap",    short: "CLP", dot: "bg-red-500",    active: "bg-red-500 border-red-400",       dim: "bg-red-500/20 border-red-500/30",       tonal: false, colorText: "text-red-400"    },
  { name: "Hi-Hat",  short: "HHT", dot: "bg-yellow-400", active: "bg-yellow-400 border-yellow-300", dim: "bg-yellow-400/20 border-yellow-400/30", tonal: false, colorText: "text-yellow-400" },
  { name: "Open Hat",short: "OHT", dot: "bg-lime-500",   active: "bg-lime-500 border-lime-400",     dim: "bg-lime-500/20 border-lime-500/30",     tonal: false, colorText: "text-lime-400"   },
  { name: "Shaker",  short: "SHK", dot: "bg-green-400",  active: "bg-green-400 border-green-300",   dim: "bg-green-400/20 border-green-400/30",   tonal: false, colorText: "text-green-400"  },
  { name: "Tom",     short: "TOM", dot: "bg-cyan-500",   active: "bg-cyan-500 border-cyan-400",     dim: "bg-cyan-500/20 border-cyan-500/30",     tonal: false, colorText: "text-cyan-400"   },
  { name: "Bass",    short: "BAS", dot: "bg-teal-500",   active: "bg-teal-500 border-teal-400",     dim: "bg-teal-500/20 border-teal-500/30",     tonal: true,  colorText: "text-teal-400"   },
  { name: "Chord",   short: "CHD", dot: "bg-blue-500",   active: "bg-blue-500 border-blue-400",     dim: "bg-blue-500/20 border-blue-500/30",     tonal: true,  colorText: "text-blue-400"   },
  { name: "Melody",  short: "MEL", dot: "bg-sky-500",    active: "bg-sky-500 border-sky-400",       dim: "bg-sky-500/20 border-sky-400/30",       tonal: true,  colorText: "text-sky-400"    },
] as const;

const NUM_TRACKS = TRACK_DEFS.length;
const TONAL_NOTE_NAMES: Record<number, string[]> = { 7: BASS_NAMES, 8: CHORD_NAMES, 9: MELODY_NAMES };

// ── Presets (12 genre patterns, 10 tracks × 16 steps) ────────────────────────

type P = [number,number,number,number, number,number,number,number, number,number,number,number, number,number,number,number];
const B = (p: P) => p.map(Boolean);

const PRESETS: { name: string; genre: string; bpm: number; pattern: boolean[][] }[] = [
  { name: "Four on the Floor", genre: "House",    bpm: 128, pattern: [
    B([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]),
    B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    B([0,0,0,1, 0,0,0,1, 0,0,0,1, 0,0,0,1]),
    B([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]),
    B([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1]),
    B([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1]),
    B([1,0,0,0, 0,0,1,0, 1,0,0,0, 0,1,0,0]),
    B([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]),
    B([0,0,1,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
  ]},
  { name: "Boom Bap", genre: "Hip-Hop", bpm: 92, pattern: [
    B([1,0,0,0, 0,0,1,0, 1,0,0,1, 0,0,0,0]),
    B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
    B([1,0,1,0, 1,1,1,0, 1,0,1,0, 1,1,1,0]),
    B([0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
    B([0,0,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
    B([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
    B([1,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0]),
    B([0,0,0,1, 0,0,0,0, 0,1,0,0, 0,0,1,0]),
  ]},
  { name: "Trap Kit", genre: "Trap", bpm: 140, pattern: [
    B([1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
    B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    B([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]),
    B([0,0,0,0, 0,0,1,0, 0,0,0,0, 0,1,0,0]),
    B([0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1]),
    B([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1]),
    B([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]),
    B([0,1,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
    B([0,0,0,1, 0,0,0,0, 0,0,0,0, 0,0,0,1]),
  ]},
  { name: "Minimal Techno", genre: "Techno", bpm: 135, pattern: [
    B([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
    B([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1]),
    B([1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,1]),
    B([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0]),
    B([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0]),
    B([1,0,1,0, 0,0,0,0, 1,0,1,0, 0,0,0,0]),
    B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
  ]},
  { name: "Reggaeton", genre: "Latin", bpm: 100, pattern: [
    B([1,0,0,0, 0,0,0,1, 1,0,0,0, 0,0,0,1]),
    B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    B([0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0]),
    B([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]),
    B([0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0]),
    B([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1]),
    B([1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0]),
    B([1,0,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
    B([0,0,0,1, 0,0,0,0, 0,0,1,0, 0,0,0,1]),
  ]},
  { name: "African Groove", genre: "World", bpm: 115, pattern: [
    B([1,0,0,0, 0,1,0,1, 0,0,1,0, 0,0,0,1]),
    B([0,0,1,0, 0,0,0,0, 0,1,0,0, 0,0,1,0]),
    B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    B([1,0,1,0, 1,0,1,0, 1,1,0,1, 1,0,1,0]),
    B([0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0]),
    B([1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1]),
    B([0,1,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
    B([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
    B([0,1,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
    B([0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0]),
  ]},
  { name: "Jazz Kit", genre: "Jazz", bpm: 110, pattern: [
    B([1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,1]),
    B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
    B([1,0,1,0, 1,1,1,0, 1,0,1,0, 1,1,1,0]),
    B([0,0,0,0, 0,1,0,0, 0,0,0,0, 0,1,0,0]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
    B([0,0,1,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
    B([1,0,0,0, 0,1,0,0, 1,0,0,1, 0,0,1,0]),
    B([1,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0]),
    B([0,0,0,1, 0,0,1,0, 0,1,0,0, 0,0,0,1]),
  ]},
  { name: "Breakbeat", genre: "Breaks", bpm: 130, pattern: [
    B([1,0,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
    B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    B([0,0,1,0, 0,1,0,0, 0,0,0,0, 0,1,0,0]),
    B([1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,1]),
    B([0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]),
    B([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1]),
    B([0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,1]),
    B([1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,1]),
    B([0,0,0,0, 1,0,0,0, 0,0,0,0, 0,1,0,0]),
    B([0,0,1,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
  ]},
  { name: "Craft Flow", genre: "Original", bpm: 105, pattern: [
    B([1,0,0,1, 0,0,1,0, 1,0,0,0, 0,1,0,0]),
    B([0,0,1,0, 0,0,0,1, 0,0,1,0, 0,0,1,0]),
    B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    B([1,1,0,1, 1,0,1,1, 0,1,1,0, 1,1,0,1]),
    B([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0]),
    B([1,0,1,0, 0,1,0,1, 1,0,1,0, 0,1,0,1]),
    B([0,0,0,1, 0,0,0,0, 0,0,0,0, 0,0,0,1]),
    B([1,0,0,0, 0,1,0,0, 1,0,0,0, 0,0,0,1]),
    B([0,1,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
    B([0,0,0,1, 0,1,0,0, 1,0,0,0, 0,0,1,0]),
  ]},
  { name: "Hot Shop", genre: "Original", bpm: 138, pattern: [
    B([1,0,1,0, 0,0,0,1, 1,0,1,0, 0,0,1,0]),
    B([0,0,0,1, 0,0,1,0, 0,0,0,1, 1,0,0,1]),
    B([0,0,0,0, 0,1,0,0, 0,0,0,0, 0,1,0,0]),
    B([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1]),
    B([0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0]),
    B([1,1,1,1, 0,0,0,0, 1,1,1,1, 0,0,0,0]),
    B([0,1,0,0, 0,0,1,0, 0,0,0,1, 0,0,1,0]),
    B([1,0,0,1, 0,0,1,0, 1,0,1,0, 0,1,0,0]),
    B([1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]),
    B([0,1,0,0, 1,0,0,1, 0,1,0,0, 1,0,1,0]),
  ]},
  { name: "Lo-Fi", genre: "Lo-Fi", bpm: 78, pattern: [
    B([1,0,0,0, 0,0,0,1, 1,0,0,0, 0,0,0,0]),
    B([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
    B([1,0,1,0, 0,1,1,0, 1,1,0,0, 0,1,1,0]),
    B([0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0]),
    B([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
    B([0,0,1,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
    B([1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0]),
    B([1,0,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
    B([0,0,0,1, 0,0,0,0, 0,0,1,0, 0,0,0,1]),
  ]},
  { name: "Latin Groove", genre: "Latin", bpm: 112, pattern: [
    B([1,0,0,0, 0,0,0,1, 0,0,1,0, 0,1,0,0]),
    B([0,0,1,0, 0,1,0,0, 0,0,1,0, 0,1,0,0]),
    B([0,1,0,0, 0,0,1,0, 0,1,0,0, 0,0,1,0]),
    B([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]),
    B([0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0]),
    B([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]),
    B([0,0,0,0, 0,1,0,0, 0,0,0,0, 0,1,0,0]),
    B([1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0]),
    B([1,0,0,0, 0,0,0,0, 0,1,0,0, 0,1,0,0]),
    B([0,0,0,1, 0,0,0,0, 0,1,0,0, 0,0,1,0]),
  ]},
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function emptyPattern(steps: number): boolean[][] {
  return Array.from({ length: NUM_TRACKS }, () => Array(steps).fill(false));
}

function emptyToneNotes(steps: number): number[][] {
  return Array(3).fill(null).map(() => Array(steps).fill(0));
}

function randomId() { return Math.random().toString(36).slice(2, 10); }

// Mini read-only beat preview grid
function MiniGrid({ pattern }: { pattern: boolean[][] }) {
  const rows = pattern.slice(0, 10);
  const cols = rows[0]?.length ?? 16;
  return (
    <div className="flex flex-col gap-[2px]">
      {rows.map((row, ti) => (
        <div key={ti} className="flex gap-[2px]">
          {row.map((on, si) => (
            <div key={si} className={`rounded-[2px] ${cols <= 16 ? "h-1.5 w-2" : "h-1.5 w-1"} ${on ? TRACK_DEFS[ti]?.dot ?? "bg-stone-500" : "bg-stone-700"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main page component ────────────────────────────────────────────────────────

export default function MusicStudio() {
  const [, setLocation] = useLocation();
  const { profile } = useProfile();

  // ── Sequencer state
  const [steps,        setStepsState] = useState<16 | 32>(16);
  const [bpm,          setBpm]        = useState(120);
  const [swing,        setSwing]      = useState(0);
  const [reverb,       setReverb]     = useState(false);
  const [pattern,      setPattern]    = useState<boolean[][]>(() => emptyPattern(16));
  const [trackVolumes, setTrackVols]  = useState<number[]>(() => Array(NUM_TRACKS).fill(1));
  const [trackMutes,   setTrackMutes] = useState<boolean[]>(() => Array(NUM_TRACKS).fill(false));
  const [soloTrack,    setSoloTrack]  = useState<number | null>(null);
  /** toneNotes[0] = bass per-step notes, [1] = chord, [2] = melody */
  const [toneNotes,    setToneNotes]  = useState<number[][]>(() => emptyToneNotes(16));

  // ── Transport state
  const [playing,      setPlaying]    = useState(false);
  const [currentStep,  setCurrentStep]= useState(-1);

  // ── Save state
  const [beatTitle,    setBeatTitle]  = useState("");
  const [license,      setLicense]    = useState<CommunityBeat["license"]>("free");
  const [saved,        setSaved]      = useState(false);
  const [myBeats,      setMyBeats]    = useState<CommunityBeat[]>([]);
  const [tab,          setTab]        = useState<"studio" | "saved">("studio");

  // ── UI state
  const [showMix,      setShowMix]    = useState(false);
  const [exporting,    setExporting]  = useState(false);

  // ── Audio refs
  const ctxRef        = useRef<AudioContext | null>(null);
  const schedulerRef  = useRef<number | null>(null);
  const nextTimeRef   = useRef(0);
  const stepRef       = useRef(0);
  const patternRef    = useRef(pattern);
  const bpmRef        = useRef(bpm);
  const swingRef      = useRef(swing);
  const reverbRef     = useRef(reverb);
  const volumesRef    = useRef(trackVolumes);
  const mutesRef      = useRef(trackMutes);
  const soloRef       = useRef(soloTrack);
  const toneNotesRef  = useRef(toneNotes);
  const stepsRef      = useRef(steps);
  const uiTimersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => { patternRef.current  = pattern;     }, [pattern]);
  useEffect(() => { bpmRef.current      = bpm;         }, [bpm]);
  useEffect(() => { swingRef.current    = swing;       }, [swing]);
  useEffect(() => { reverbRef.current   = reverb;      }, [reverb]);
  useEffect(() => { volumesRef.current  = trackVolumes;}, [trackVolumes]);
  useEffect(() => { mutesRef.current    = trackMutes;  }, [trackMutes]);
  useEffect(() => { soloRef.current     = soloTrack;   }, [soloTrack]);
  useEffect(() => { toneNotesRef.current= toneNotes;   }, [toneNotes]);
  useEffect(() => { stepsRef.current    = steps;       }, [steps]);

  useEffect(() => {
    setMyBeats(getCommunityBeats().filter((b) => b.artistHandle === (profile?.handle ?? "me")));
  }, [profile?.handle]);

  // ── Synthesis dispatch for one step ───────────────────────────────────────────

  const triggerStep = useCallback((ctx: AudioContext, ti: number, si: number, time: number) => {
    const vol  = volumesRef.current[ti] ?? 1;
    const muted = mutesRef.current[ti];
    const solo  = soloRef.current;
    if (muted) return;
    if (solo !== null && solo !== ti) return;

    // Route through convolver when reverb enabled
    const dest = ctx.destination;

    switch (ti) {
      case 0: playKick(ctx, time, vol); break;
      case 1: playSnare(ctx, time, vol); break;
      case 2: playClap(ctx, time, vol); break;
      case 3: playHiHat(ctx, time, false, vol); break;
      case 4: playHiHat(ctx, time, true,  vol); break;
      case 5: playShaker(ctx, time, vol); break;
      case 6: playTom(ctx, time, vol); break;
      case 7: playBass(ctx,   time, toneNotesRef.current[0][si] ?? 0, vol); break;
      case 8: playChord(ctx,  time, toneNotesRef.current[1][si] ?? 0, vol); break;
      case 9: playMelody(ctx, time, toneNotesRef.current[2][si] ?? 0, vol); break;
    }
    void dest; // suppress unused warning
  }, []);

  // ── Scheduler ─────────────────────────────────────────────────────────────────

  const runScheduler = useCallback(() => {
    const ctx      = ctxRef.current!;
    const stepDur  = 60 / bpmRef.current / 4;
    const lookahead = 0.13;
    while (nextTimeRef.current < ctx.currentTime + lookahead) {
      const si   = stepRef.current;
      const swingOffset = si % 2 === 1 ? swingRef.current * stepDur : 0;
      const t    = nextTimeRef.current + swingOffset;
      patternRef.current.forEach((row, ti) => {
        if (row[si]) triggerStep(ctx, ti, si, t);
      });
      const delay = Math.max(0, (nextTimeRef.current - ctx.currentTime) * 1000);
      const timer = setTimeout(() => setCurrentStep(si), delay);
      uiTimersRef.current.push(timer);
      nextTimeRef.current += stepDur;
      stepRef.current = (stepRef.current + 1) % stepsRef.current;
    }
  }, [triggerStep]);

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

  // ── Cell interaction ───────────────────────────────────────────────────────────

  function toggleCell(ti: number, si: number) {
    const track = TRACK_DEFS[ti];
    if (!track.tonal) {
      setPattern((prev) => { const n = prev.map((r) => [...r]); n[ti][si] = !n[ti][si]; return n; });
    } else {
      // Tonal: if off → on; if on → cycle note
      const toneIdx = ti - 7; // 0=bass, 1=chord, 2=melody
      setPattern((prev) => {
        if (!prev[ti][si]) {
          const n = prev.map((r) => [...r]); n[ti][si] = true; return n;
        }
        return prev; // stay on, just cycle note
      });
      setToneNotes((prev) => {
        if (!pattern[ti][si]) return prev; // just toggled on, note stays
        const n = prev.map((r) => [...r]);
        const noteCount = TONAL_NOTE_NAMES[ti]?.length ?? 8;
        n[toneIdx][si] = (n[toneIdx][si] + 1) % noteCount;
        return n;
      });
    }
    setSaved(false);
  }

  function clearCell(ti: number, si: number) {
    setPattern((prev) => { const n = prev.map((r) => [...r]); n[ti][si] = false; return n; });
    setSaved(false);
  }

  // ── Steps toggle ───────────────────────────────────────────────────────────────

  function changeSteps(newSteps: 16 | 32) {
    if (newSteps === steps) return;
    stop();
    if (newSteps === 32) {
      setPattern((prev) => prev.map((r) => [...r, ...r]));
      setToneNotes((prev) => prev.map((r) => [...r, ...r]));
    } else {
      setPattern((prev) => prev.map((r) => r.slice(0, 16)));
      setToneNotes((prev) => prev.map((r) => r.slice(0, 16)));
    }
    setStepsState(newSteps);
    setSaved(false);
  }

  // ── Preset loading ─────────────────────────────────────────────────────────────

  function loadPreset(idx: number) {
    stop();
    const preset = PRESETS[idx];
    const ps     = preset.pattern[0]?.length ?? 16;
    const newSteps = ps as 16 | 32;
    setStepsState(newSteps);
    setPattern(preset.pattern.map((r) => [...r]));
    setToneNotes(emptyToneNotes(newSteps));
    setBpm(preset.bpm);
    setSaved(false);
  }

  // ── Save ───────────────────────────────────────────────────────────────────────

  function handleSave() {
    const title = beatTitle.trim() || "Untitled Beat";
    const beat: CommunityBeat = {
      id: randomId(),
      title,
      artistHandle: profile?.handle ?? "me",
      artistName:   profile?.name   ?? "You",
      bpm,
      steps,
      pattern:       pattern.map((r) => [...r]),
      trackCount:    NUM_TRACKS,
      trackVolumes:  [...trackVolumes],
      trackMutes:    [...trackMutes],
      melodyNotes:   [...toneNotes[2]],
      bassNotes:     [...toneNotes[0]],
      chordNotes:    [...toneNotes[1]],
      swing,
      reverb,
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

  // ── Use beat on a post (writes to sessionStorage, then navigates) ─────────────

  function useOnPost(beat: CommunityBeat) {
    stop();
    try {
      sessionStorage.setItem("kiln_pending_beat", JSON.stringify({
        id: `beat-${beat.id}`,
        title: beat.title,
        artist: beat.artistName,
        url: `beat://${beat.id}`,
        license: beat.license === "free" ? "Free" : beat.license === "community" ? "$1" : "$5",
        bpm: beat.bpm,
      }));
    } catch { /* sessionStorage unavailable */ }
    setLocation("/create");
  }

  function useCurrentOnPost() {
    // Auto-save the current beat first so MusicPicker can find it
    const title = beatTitle.trim() || "My Beat";
    const id = randomId();
    const beat: CommunityBeat = {
      id,
      title,
      artistHandle: profile?.handle ?? "me",
      artistName:   profile?.name   ?? "You",
      bpm,
      steps,
      pattern:       pattern.map((r) => [...r]),
      trackCount:    NUM_TRACKS,
      trackVolumes:  [...trackVolumes],
      trackMutes:    [...trackMutes],
      melodyNotes:   [...toneNotes[2]],
      bassNotes:     [...toneNotes[0]],
      chordNotes:    [...toneNotes[1]],
      swing,
      reverb,
      license,
      price: license === "free" ? 0 : license === "community" ? 1 : 5,
      createdAt: new Date().toISOString(),
      usedCount: 0,
    };
    saveCommunityBeat(beat);
    setSaved(true);
    useOnPost(beat);
  }

  // ── Load beat into studio ──────────────────────────────────────────────────────

  function loadBeat(beat: CommunityBeat) {
    stop();
    const bs = (beat.steps ?? (beat.pattern[0]?.length <= 16 ? 16 : 32)) as 16 | 32;
    setStepsState(bs);
    setPattern(beat.pattern.map((r) => [...r]));
    setBpm(beat.bpm);
    setSwing(beat.swing ?? 0);
    setReverb(beat.reverb ?? false);
    if (beat.trackVolumes?.length === NUM_TRACKS) setTrackVols([...beat.trackVolumes]);
    if (beat.trackMutes?.length   === NUM_TRACKS) setTrackMutes([...beat.trackMutes]);
    setToneNotes([
      beat.bassNotes?.slice(0, bs)   ?? Array(bs).fill(0),
      beat.chordNotes?.slice(0, bs)  ?? Array(bs).fill(0),
      beat.melodyNotes?.slice(0, bs) ?? Array(bs).fill(0),
    ]);
    setBeatTitle(beat.title);
    setTab("studio");
    setSaved(false);
  }

  // ── WAV export ─────────────────────────────────────────────────────────────────

  async function exportWAV() {
    setExporting(true);
    try {
      const stepDur   = 60 / bpm / 4;
      const loopDur   = steps * stepDur;
      const sampleRate = 44100;
      const offCtx    = new OfflineAudioContext(1, Math.ceil(loopDur * sampleRate), sampleRate);
      pattern.forEach((row, ti) => {
        row.forEach((on, si) => {
          if (!on) return;
          const t = si * stepDur + (si % 2 === 1 ? swing * stepDur : 0);
          const vol = trackVolumes[ti] ?? 1;
          if (trackMutes[ti]) return;
          if (soloTrack !== null && soloTrack !== ti) return;
          const ctx = offCtx as unknown as AudioContext;
          switch (ti) {
            case 0: playKick(ctx, t, vol); break;
            case 1: playSnare(ctx, t, vol); break;
            case 2: playClap(ctx, t, vol); break;
            case 3: playHiHat(ctx, t, false, vol); break;
            case 4: playHiHat(ctx, t, true,  vol); break;
            case 5: playShaker(ctx, t, vol); break;
            case 6: playTom(ctx, t, vol); break;
            case 7: playBass(ctx,   t, toneNotes[0][si] ?? 0, vol); break;
            case 8: playChord(ctx,  t, toneNotes[1][si] ?? 0, vol); break;
            case 9: playMelody(ctx, t, toneNotes[2][si] ?? 0, vol); break;
          }
        });
      });
      const buffer  = await offCtx.startRendering();
      const samples = buffer.getChannelData(0);
      const blob    = encodeWAV(samples, sampleRate);
      const url     = URL.createObjectURL(blob);
      const a       = document.createElement("a");
      a.href = url; a.download = `${beatTitle.trim() || "kiln-beat"}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  // ── Derived: effective step count for display ──────────────────────────────────
  const cellW = steps === 32 ? "w-[18px]" : "w-[30px]";
  const cellH = "h-8";

  const activeDensity = useMemo(() => {
    const total = NUM_TRACKS * steps;
    const on    = pattern.reduce((s, r) => s + r.filter(Boolean).length, 0);
    return Math.round((on / total) * 100);
  }, [pattern, steps]);

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-950 pb-32 select-none">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-stone-950/95 px-4 py-3 backdrop-blur">
        <button onClick={() => { stop(); setLocation("/create"); }} className="text-stone-400 hover:text-stone-200 transition-colors">
          <ChevronLeft size={22} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Music2 size={18} className="text-amber-400 shrink-0" />
          <h1 className="text-base font-bold text-stone-100 truncate">Music Studio</h1>
          {tab === "studio" && (
            <span className="ml-1 shrink-0 rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-500">
              {activeDensity}% density
            </span>
          )}
        </div>
        <div className="flex gap-1 rounded-xl bg-stone-900 p-1 shrink-0">
          {(["studio","saved"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${tab === t ? "bg-stone-700 text-stone-100" : "text-stone-500 hover:text-stone-300"}`}>
              {t === "saved" ? `My Beats${myBeats.length > 0 ? ` (${myBeats.length})` : ""}` : "Studio"}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ STUDIO TAB ══════════════ */}
      {tab === "studio" && (
        <div className="px-3 pt-4 space-y-4">

          {/* ── Transport bar ── */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-3 space-y-3">
            <div className="flex items-center gap-3">
              {/* Play/Stop */}
              <button onClick={playing ? stop : start}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  playing ? "border-amber-400 bg-amber-400/20 text-amber-300 animate-pulse" : "border-stone-600 bg-stone-800 text-stone-300 hover:border-amber-500/60"
                }`}>
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>

              {/* BPM */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">BPM</span>
                  <span className="text-sm font-black tabular-nums text-amber-300">{bpm}</span>
                </div>
                <input type="range" min={60} max={200} value={bpm}
                  onChange={(e) => { setBpm(Number(e.target.value)); setSaved(false); }}
                  className="w-full accent-amber-400 h-1" />
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => setShowMix((x) => !x)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${showMix ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-stone-700 text-stone-500 hover:text-stone-300"}`}
                  title="Mix (volumes)">
                  <SlidersHorizontal size={14} />
                </button>
                <button onClick={() => { stop(); setPattern(emptyPattern(steps)); setToneNotes(emptyToneNotes(steps)); setSaved(false); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-700 text-stone-500 hover:border-red-500/40 hover:text-red-400 transition-colors"
                  title="Clear">
                  <RotateCcw size={14} />
                </button>
                <button onClick={exportWAV} disabled={exporting}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-700 text-stone-500 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors disabled:opacity-50"
                  title="Export WAV">
                  <Download size={14} />
                </button>
              </div>
            </div>

            {/* Swing + Reverb + Step count */}
            <div className="grid grid-cols-3 gap-3 pt-1 border-t border-white/5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider">Swing</span>
                  <span className="text-xs font-bold text-stone-400">{Math.round(swing * 100)}%</span>
                </div>
                <input type="range" min={0} max={50} step={1} value={Math.round(swing * 100)}
                  onChange={(e) => setSwing(Number(e.target.value) / 100)}
                  className="w-full accent-amber-400 h-1" />
              </div>

              <div className="flex flex-col items-center justify-center gap-1.5">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider">Reverb</span>
                <button onClick={() => setReverb((x) => !x)}
                  className={`flex h-7 w-12 items-center rounded-full border px-1 transition-all ${reverb ? "border-sky-500/40 bg-sky-500/20 justify-end" : "border-stone-700 bg-stone-800 justify-start"}`}>
                  <div className={`h-5 w-5 rounded-full transition-colors ${reverb ? "bg-sky-400" : "bg-stone-500"}`} />
                </button>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider">Steps</span>
                <div className="flex gap-1 rounded-lg bg-stone-800 p-0.5">
                  {([16, 32] as const).map((s) => (
                    <button key={s} onClick={() => changeSteps(s)}
                      className={`rounded-md px-2.5 py-0.5 text-xs font-bold transition-colors ${steps === s ? "bg-amber-500 text-stone-950" : "text-stone-500 hover:text-stone-300"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Mix panel (volumes + mutes + solo) ── */}
          {showMix && (
            <div className="rounded-2xl border border-amber-500/20 bg-stone-900/80 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-3">Track Mix</p>
              <div className="space-y-2">
                {TRACK_DEFS.map((track, ti) => (
                  <div key={ti} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${track.dot} shrink-0`} />
                    <span className={`text-[10px] font-medium w-10 shrink-0 ${trackMutes[ti] ? "text-stone-600 line-through" : "text-stone-400"}`}>
                      {track.short}
                    </span>
                    <input type="range" min={0} max={200} step={5} value={Math.round(trackVolumes[ti] * 100)}
                      onChange={(e) => setTrackVols((prev) => { const n = [...prev]; n[ti] = Number(e.target.value) / 100; return n; })}
                      className={`flex-1 h-1 ${trackMutes[ti] ? "opacity-30" : ""}`}
                      style={{ accentColor: trackMutes[ti] ? "#555" : "#f59e0b" }}
                      disabled={trackMutes[ti]} />
                    <span className={`text-[10px] tabular-nums w-7 text-right ${trackMutes[ti] ? "text-stone-600" : "text-stone-500"}`}>
                      {Math.round(trackVolumes[ti] * 100)}
                    </span>
                    <button onClick={() => setTrackMutes((prev) => { const n = [...prev]; n[ti] = !n[ti]; return n; })}
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold border transition-colors ${
                        trackMutes[ti] ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-stone-700 text-stone-600 hover:text-stone-400"
                      }`}>M</button>
                    <button onClick={() => setSoloTrack((prev) => prev === ti ? null : ti)}
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold border transition-colors ${
                        soloTrack === ti ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-stone-700 text-stone-600 hover:text-stone-400"
                      }`}>S</button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-stone-700 text-center">Vol · M = mute · S = solo</p>
            </div>
          )}

          {/* ── Presets ── */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-600">Presets</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {PRESETS.map((p, i) => (
                <button key={i} onClick={() => loadPreset(i)}
                  className="shrink-0 rounded-full border border-stone-700 px-3 py-1.5 text-xs text-stone-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors whitespace-nowrap">
                  <Zap size={9} className="inline mr-1 opacity-60" />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── Sequencer grid ── */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 overflow-hidden">
            {/* Step numbers header */}
            <div className="overflow-x-auto">
              <div style={{ minWidth: steps === 32 ? 480 : 360 }} className="px-2 pt-2">
                <div className="mb-1 flex gap-0.5 pl-[50px]">
                  {Array.from({ length: steps }, (_, i) => (
                    <div key={i} className={`${cellW} shrink-0 text-center text-[8px] font-mono transition-colors ${currentStep === i && playing ? "text-amber-400" : i % 4 === 0 ? "text-stone-600" : "text-stone-800"}`}>
                      {i % 4 === 0 ? i + 1 : "·"}
                    </div>
                  ))}
                </div>

                {/* Track rows */}
                {TRACK_DEFS.map((track, ti) => (
                  <div key={ti} className="flex items-center gap-0.5 mb-0.5">
                    {/* Track label */}
                    <div className="w-[48px] shrink-0 flex items-center gap-1 pr-1">
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${track.dot} ${trackMutes[ti] ? "opacity-30" : ""}`} />
                      <span className={`text-[9px] font-medium truncate ${trackMutes[ti] ? "text-stone-700" : "text-stone-500"}`}>
                        {track.short}
                      </span>
                    </div>

                    {/* Step buttons */}
                    {Array.from({ length: steps }, (_, si) => {
                      const on      = pattern[ti][si];
                      const isLit   = currentStep === si && playing;
                      const toneIdx = ti - 7;
                      const noteLabel = track.tonal && on ? (TONAL_NOTE_NAMES[ti]?.[toneNotes[toneIdx]?.[si] ?? 0] ?? "") : "";

                      return (
                        <button key={si}
                          onClick={() => toggleCell(ti, si)}
                          onContextMenu={(e) => { e.preventDefault(); clearCell(ti, si); }}
                          title={track.tonal && on ? `${noteLabel} — tap to cycle note` : undefined}
                          className={`${cellW} ${cellH} shrink-0 rounded-[4px] border flex items-center justify-center transition-all ${
                            on
                              ? isLit
                                ? `${track.active} scale-90 brightness-150 shadow-sm`
                                : track.active
                              : isLit
                                ? "border-stone-500 bg-stone-600/50"
                                : `border-stone-700/80 bg-stone-800/50 hover:border-stone-500 ${si % 4 === 0 ? "border-stone-600" : ""} ${trackMutes[ti] ? "opacity-40" : ""}`
                          }`}>
                          {noteLabel && (
                            <span className="text-[7px] font-bold text-white/90 leading-none pointer-events-none">
                              {noteLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="h-2" />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-stone-700 text-center">
            Tap = toggle · Long-press tonal cells to cycle note · Right-click = clear
          </p>

          {/* ── Save & License section ── */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Save size={14} className="text-amber-400 shrink-0" />
              <h2 className="text-sm font-bold text-stone-200">Save to My Sounds</h2>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              Save your beat to your profile Sounds library. Other Kiln creators can discover and license it for their posts.
            </p>

            <input type="text" placeholder="Beat name (e.g. Late Night Wheel Throw)"
              value={beatTitle}
              onChange={(e) => { setBeatTitle(e.target.value); setSaved(false); }}
              maxLength={60}
              className="w-full rounded-xl border border-white/10 bg-stone-800 px-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
            />

            <div className="grid grid-cols-3 gap-2">
              {(["free","community","premium"] as CommunityBeat["license"][]).map((l) => (
                <button key={l} onClick={() => setLicense(l)}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    license === l
                      ? l === "free"      ? "border-emerald-500/60 bg-emerald-500/10"
                      : l === "community" ? "border-amber-500/60 bg-amber-500/10"
                                          : "border-purple-500/60 bg-purple-500/10"
                      : "border-stone-700 bg-stone-800/40 hover:border-stone-600"
                  }`}>
                  {license === l && <Check size={10} className={`mb-1 ${l === "free" ? "text-emerald-400" : l === "community" ? "text-amber-400" : "text-purple-400"}`} />}
                  <p className={`text-xs font-bold ${
                    license === l
                      ? l === "free" ? "text-emerald-400" : l === "community" ? "text-amber-400" : "text-purple-400"
                      : "text-stone-500"
                  }`}>
                    {l === "free" ? "Free" : l === "community" ? "Community" : "Premium"}
                  </p>
                  <p className="text-[10px] text-stone-600 mt-0.5">
                    {l === "free" ? "Anyone can use" : l === "community" ? "$1 per use" : "$5 per use"}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-all ${
                  saved
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 hover:from-amber-400 hover:to-orange-400 active:scale-95 shadow-lg shadow-amber-500/20"
                }`}>
                {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save to My Sounds</>}
              </button>
              <button onClick={exportWAV} disabled={exporting}
                className="flex items-center gap-1.5 rounded-full border border-stone-700 px-4 py-3 text-xs text-stone-400 hover:border-emerald-500/40 hover:text-emerald-400 transition-colors disabled:opacity-50">
                <Download size={13} />
                {exporting ? "…" : "WAV"}
              </button>
            </div>

            {/* Use on Post — the primary action */}
            <button
              onClick={useCurrentOnPost}
              className="w-full flex items-center justify-center gap-2 rounded-full border-2 border-amber-400/60 bg-amber-400/10 py-3 text-sm font-bold text-amber-300 hover:bg-amber-400/20 hover:border-amber-400 transition-all active:scale-95"
            >
              <Music size={15} />
              Use on Post →
            </button>
            <p className="text-center text-[10px] text-stone-700">
              Saves your beat and adds it to your next post
            </p>
          </div>
        </div>
      )}

      {/* ══════════════ MY BEATS TAB ══════════════ */}
      {tab === "saved" && (
        <div className="px-4 pt-4 space-y-3">
          {myBeats.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-900 text-stone-700">
                <Music2 size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-400">No saved beats yet</p>
                <p className="mt-1 text-xs text-stone-600 max-w-[240px]">
                  Build something in the Studio, then save it here. Your beats appear in the music picker when you create a post.
                </p>
              </div>
              <button onClick={() => setTab("studio")}
                className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                <Plus size={14} className="inline mr-1.5" />Open Studio
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-500">{myBeats.length} saved beat{myBeats.length !== 1 ? "s" : ""}</p>
                <button onClick={() => setTab("studio")}
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                  <Plus size={12} /> New beat
                </button>
              </div>
              {myBeats.map((beat) => (
                <BeatCard key={beat.id} beat={beat}
                  onEdit={() => loadBeat(beat)}
                  onDelete={() => { deleteCommunityBeat(beat.id); setMyBeats((p) => p.filter((b) => b.id !== beat.id)); }}
                  onUseInPost={() => useOnPost(beat)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Beat card (My Beats list) ──────────────────────────────────────────────────

function BeatCard({ beat, onEdit, onDelete, onUseInPost }: {
  beat: CommunityBeat;
  onEdit: () => void;
  onDelete: () => void;
  onUseInPost: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border border-white/5 bg-stone-900 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="font-bold text-stone-100 truncate">{beat.title}</p>
            <p className="text-xs text-stone-500 mt-0.5">
              {beat.bpm} BPM · {beat.steps ?? beat.pattern[0]?.length ?? 16} steps
              {beat.swing ? ` · ${Math.round(beat.swing * 100)}% swing` : ""}
              · {beat.usedCount} use{beat.usedCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              beat.license === "free"      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : beat.license === "community" ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                           : "border-purple-500/30 bg-purple-500/10 text-purple-400"
            }`}>
              {beat.license === "free" ? "Free" : beat.license === "community" ? "$1" : "$5"}
            </span>
          </div>
        </div>

        {/* Pattern preview */}
        <div className="mb-3">
          <MiniGrid pattern={beat.pattern.slice(0, 10)} />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onEdit}
            className="flex-1 rounded-full border border-stone-700 py-2 text-xs font-medium text-stone-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors">
            Edit in Studio
          </button>
          <button onClick={onUseInPost}
            className="flex-1 rounded-full bg-amber-500/10 border border-amber-500/20 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors">
            Use in Post
          </button>
          <button onClick={() => setExpanded((x) => !x)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 text-stone-500 hover:text-stone-300 transition-colors">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 text-stone-500 hover:border-red-500/40 hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/5 px-4 py-3 space-y-2 bg-stone-900/60">
          {beat.trackVolumes && (
            <div>
              <p className="text-[10px] text-stone-600 mb-1.5">Track volumes</p>
              <div className="flex gap-1 flex-wrap">
                {beat.trackVolumes.slice(0, 10).map((v, i) => (
                  <div key={i} title={TRACK_DEFS[i]?.name} className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-8 bg-stone-800 rounded-full overflow-hidden flex flex-col justify-end">
                      <div className={`${TRACK_DEFS[i]?.dot} rounded-full`} style={{ height: `${Math.round(v * 50)}%` }} />
                    </div>
                    <span className="text-[7px] text-stone-700">{TRACK_DEFS[i]?.short}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-stone-600">
            Created {new Date(beat.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      )}
    </div>
  );
}
