import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, Play, Square, Download, Sparkles, Film,
  Megaphone, Star, Zap, RefreshCw, Check, Pencil, X, ChevronRight, Video,
  AlertTriangle, BookOpen, Crown, Camera, Timer, Plus, Trash2, Gauge, Palette,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_IMAGE_MS = 7000;
const MAX_VIDEO_MS     = 30_000;
const CANVAS_W = 540;
const CANVAS_H = 960;

const IMAGE_DURATIONS: { label: string; ms: number }[] = [
  { label: "3s",  ms: 3_000  },
  { label: "7s",  ms: 7_000  },
  { label: "15s", ms: 15_000 },
  { label: "30s", ms: 30_000 },
];

const VIDEO_SPEEDS: { label: string; value: number }[] = [
  { label: "0.5×", value: 0.5  },
  { label: "0.75×", value: 0.75 },
  { label: "1×",  value: 1    },
  { label: "1.5×", value: 1.5  },
  { label: "2×",  value: 2    },
];

const COLOR_GRADES: { id: string; label: string; filter: string; color: string }[] = [
  { id: "cinematic", label: "Cinematic", filter: "contrast(1.15) saturate(0.75) brightness(0.88) sepia(0.06)",  color: "#6b7280" },
  { id: "vibrant",   label: "Vibrant",   filter: "contrast(1.05) saturate(1.4) brightness(1.05)",               color: "#f59e0b" },
  { id: "moody",     label: "Moody",     filter: "contrast(1.25) saturate(0.6) brightness(0.82) hue-rotate(10deg)", color: "#8b5cf6" },
  { id: "clean",     label: "Clean",     filter: "contrast(1.0) saturate(0.85) brightness(1.1)",                 color: "#e5e7eb" },
  { id: "golden",    label: "Golden",    filter: "contrast(1.1) saturate(1.15) brightness(0.93) sepia(0.28)",    color: "#d97706" },
];

function gradeFilter(id: string): string {
  return COLOR_GRADES.find(g => g.id === id)?.filter ?? "";
}

type SourceType = "image" | "video";
type Style =
  | "movie-trailer" | "advertisement" | "commercial" | "short-clip"
  | "documentary"   | "luxury-brand"  | "behind-the-scenes" | "time-lapse-reveal";
type Step = "source" | "style" | "enhancing" | "studio";

// Route external (cross-origin) media through the server proxy so the fetch
// succeeds (same-origin) and the canvas stays untainted. Same-origin and
// blob/data URLs are returned unchanged.
function proxiedMediaUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  try {
    const u = new URL(url, window.location.href);
    if (u.origin === window.location.origin) return url;
    return `/api/media-proxy?url=${encodeURIComponent(u.toString())}`;
  } catch {
    return url;
  }
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
}

let _overlayCounter = 100;
function nextOverlayId() { return `u${++_overlayCounter}`; }

interface Overlay {
  id: string;
  text: string;
  startMs: number;
  durationMs: number;
  position: "top" | "center" | "bottom" | "top-right";
  style: "title" | "large" | "small" | "watermark" | "subtitle";
}

interface Plan {
  headline: string;
  tagline: string;
  overlays: Overlay[];
  colorGrade: string;
  colorFilter: string;
  audioMood: string;
  audioBpm: number;
  transition: string;
  treatmentNotes: string;
}

interface FeedPost {
  id: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  caption: string;
  technique: string | null;
  authorName: string;
}

// ── Style definitions ─────────────────────────────────────────────────────────

const STYLES: { id: Style; label: string; icon: React.ReactNode; desc: string; tags: string[] }[] = [
  {
    id: "movie-trailer",
    label: "Movie Trailer",
    icon: <Film size={18} />,
    desc: "Dramatic. Cinematic. Unforgettable.",
    tags: ["Dark grade", "Bold titles", "Swell audio"],
  },
  {
    id: "advertisement",
    label: "Advertisement",
    icon: <Megaphone size={18} />,
    desc: "Bold. Clear. Action-driven.",
    tags: ["Vibrant grade", "CTA text", "Energetic"],
  },
  {
    id: "commercial",
    label: "Commercial",
    icon: <Star size={18} />,
    desc: "Warm. Story-driven. Authentic.",
    tags: ["Golden grade", "Soft text", "Ambient"],
  },
  {
    id: "short-clip",
    label: "7-Second Clip",
    icon: <Zap size={18} />,
    desc: "Punchy. Social-native. Scroll-stopping.",
    tags: ["Clean grade", "One line", "Impact"],
  },
  {
    id: "documentary",
    label: "Documentary",
    icon: <BookOpen size={18} />,
    desc: "Slow. Meditative. Archival.",
    tags: ["Warm grade", "Sparse text", "Contemplative"],
  },
  {
    id: "luxury-brand",
    label: "Luxury Brand",
    icon: <Crown size={18} />,
    desc: "Minimal. Aspirational. Silent luxury.",
    tags: ["Moody grade", "One word", "Glass tone"],
  },
  {
    id: "behind-the-scenes",
    label: "Behind the Scenes",
    icon: <Camera size={18} />,
    desc: "Raw. Authentic. Unguarded access.",
    tags: ["Warm grade", "Casual text", "Intimate"],
  },
  {
    id: "time-lapse-reveal",
    label: "Time-Lapse Reveal",
    icon: <Timer size={18} />,
    desc: "Fast reveal. Building momentum. Dramatic.",
    tags: ["Clean grade", "Quick bursts", "Crescendo"],
  },
];

// ── Web Audio soundscape builder ──────────────────────────────────────────────

function buildAudio(
  style: Style,
  durationSec: number,
): { ctx: AudioContext; dest: MediaStreamAudioDestinationNode; start: () => void; stop: () => void } {
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  const master = ctx.createGain();
  master.gain.value = 0.65;
  master.connect(ctx.destination);
  master.connect(dest);

  function reverb(secs = 2.5, decay = 2): ConvolverNode {
    const conv = ctx.createConvolver();
    const len = ctx.sampleRate * secs;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    conv.buffer = buf;
    conv.connect(master);
    return conv;
  }

  const oscs: OscillatorNode[] = [];
  const sources: AudioScheduledSourceNode[] = [];

  // ── Existing four ──

  function movieTrailer() {
    const rv = reverb(4, 1.4);
    const drone = ctx.createOscillator();
    const dg = ctx.createGain();
    const f = ctx.createBiquadFilter();
    drone.type = "sawtooth"; drone.frequency.value = 55;
    f.type = "lowpass"; f.frequency.value = 350;
    dg.gain.setValueAtTime(0, ctx.currentTime);
    dg.gain.linearRampToValueAtTime(0.18, ctx.currentTime + Math.min(2.5, durationSec * 0.35));
    dg.gain.linearRampToValueAtTime(0.28, ctx.currentTime + Math.min(5, durationSec * 0.7));
    dg.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
    drone.connect(f); f.connect(dg); dg.connect(rv);
    drone.start(); oscs.push(drone);
    [110, 165, 220].forEach((hz, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = hz;
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.4);
      g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + Math.min(3 + i * 0.3, durationSec * 0.5));
      g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + Math.min(5.5, durationSec * 0.78));
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
      o.connect(g); g.connect(rv); o.start(); oscs.push(o);
    });
  }

  function advertisement() {
    const notes = [261.6, 329.6, 392, 523.3, 659.3];
    const beatSec = 60 / 128;
    const beats = Math.ceil(durationSec / beatSec);
    for (let b = 0; b < beats; b++) {
      const hz = notes[b % notes.length];
      const t = ctx.currentTime + b * beatSec;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = hz;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.22); oscs.push(o);
    }
    const shimmer = ctx.createOscillator();
    const sg = ctx.createGain();
    shimmer.type = "sine"; shimmer.frequency.value = 1046.5;
    sg.gain.setValueAtTime(0.04, ctx.currentTime);
    sg.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
    shimmer.connect(sg); sg.connect(master); shimmer.start(); oscs.push(shimmer);
  }

  function commercial() {
    const rv = reverb(3, 2.2);
    [220, 277.2, 329.6, 440].forEach((hz, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = hz;
      const vol = 0.065 - i * 0.012;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + Math.min(1.8, durationSec * 0.25));
      g.gain.setValueAtTime(vol, ctx.currentTime + durationSec - Math.min(1.2, durationSec * 0.15));
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
      o.connect(g); g.connect(rv); o.start(); oscs.push(o);
    });
  }

  function shortClip() {
    const bass = ctx.createOscillator();
    const bg = ctx.createGain();
    bass.type = "sine";
    bass.frequency.setValueAtTime(80, ctx.currentTime);
    bass.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.3);
    bg.gain.setValueAtTime(0.42, ctx.currentTime);
    bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    bass.connect(bg); bg.connect(master);
    bass.start(); bass.stop(ctx.currentTime + 0.5); oscs.push(bass);

    const riserStart = Math.max(0.8, durationSec * 0.14);
    const riserEnd   = Math.min(durationSec - 0.8, durationSec * 0.86);
    const nBuf = ctx.createBuffer(1, ctx.sampleRate * (riserEnd - riserStart + 0.5), ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = nBuf;
    const rf = ctx.createBiquadFilter();
    rf.type = "bandpass"; rf.Q.value = 8;
    rf.frequency.setValueAtTime(200, ctx.currentTime + riserStart);
    rf.frequency.linearRampToValueAtTime(3200, ctx.currentTime + riserEnd);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0, ctx.currentTime + riserStart);
    rg.gain.linearRampToValueAtTime(0.22, ctx.currentTime + riserEnd);
    rg.gain.linearRampToValueAtTime(0, ctx.currentTime + riserEnd + 0.6);
    noise.connect(rf); rf.connect(rg); rg.connect(master);
    noise.start(ctx.currentTime + riserStart); sources.push(noise);

    const thumpT = riserEnd;
    const drop = ctx.createOscillator();
    const dg2 = ctx.createGain();
    drop.type = "sine"; drop.frequency.value = 58;
    dg2.gain.setValueAtTime(0, ctx.currentTime + thumpT);
    dg2.gain.linearRampToValueAtTime(0.38, ctx.currentTime + thumpT + 0.05);
    dg2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
    drop.connect(dg2); dg2.connect(master);
    drop.start(ctx.currentTime + thumpT); drop.stop(ctx.currentTime + durationSec + 0.1); oscs.push(drop);
  }

  // ── Four new styles ──

  function documentary() {
    const rv = reverb(5, 2.8);
    // Slow sparse piano-like plucks in A minor pentatonic
    const pluckTimes = [0.3, 1.8, 3.6, 5.2, 7.1, 9.4, 12.0, 16.0, 20.0, 25.0].filter(t => t < durationSec - 0.5);
    const notes      = [110, 146.8, 164.8, 220, 246.9, 293.7, 329.6];
    pluckTimes.forEach((t, i) => {
      const hz = notes[i % notes.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = hz;
      g.gain.setValueAtTime(0, ctx.currentTime + t);
      g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 2.2);
      o.connect(g); g.connect(rv);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 2.5); oscs.push(o);
    });
    // Low warm drone
    const drone = ctx.createOscillator();
    const dg = ctx.createGain();
    drone.type = "sine"; drone.frequency.value = 55;
    dg.gain.setValueAtTime(0, ctx.currentTime);
    dg.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 3);
    dg.gain.setValueAtTime(0.04, ctx.currentTime + durationSec - 1.5);
    dg.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
    drone.connect(dg); dg.connect(rv); drone.start(); oscs.push(drone);
  }

  function luxuryBrand() {
    const rv = reverb(6, 3.5);
    // Near-silence: ultra-subtle high glass shimmer
    const shimmer = ctx.createOscillator();
    const sg = ctx.createGain();
    shimmer.type = "sine"; shimmer.frequency.value = 2093;
    sg.gain.setValueAtTime(0, ctx.currentTime);
    sg.gain.linearRampToValueAtTime(0.018, ctx.currentTime + 2.5);
    sg.gain.setValueAtTime(0.018, ctx.currentTime + durationSec - 1.8);
    sg.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
    shimmer.connect(sg); sg.connect(rv); shimmer.start(); oscs.push(shimmer);
    // Single low gong-like strike at the start
    const gong = ctx.createOscillator();
    const gg = ctx.createGain();
    gong.type = "sine"; gong.frequency.value = 164.8;
    gg.gain.setValueAtTime(0.16, ctx.currentTime + 0.1);
    gg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + Math.min(6, durationSec * 0.6));
    gong.connect(gg); gg.connect(rv);
    gong.start(ctx.currentTime + 0.1); gong.stop(ctx.currentTime + Math.min(7, durationSec)); oscs.push(gong);
  }

  function behindTheScenes() {
    const rv = reverb(2.5, 2);
    // Warm strummed chord: D major (D3 F#3 A3 D4)
    const chord = [146.8, 185.0, 220, 293.7];
    chord.forEach((hz, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = hz;
      const startT = ctx.currentTime + i * 0.06;
      g.gain.setValueAtTime(0, startT);
      g.gain.linearRampToValueAtTime(0.06, startT + 0.08);
      g.gain.setValueAtTime(0.055, ctx.currentTime + Math.min(2.5, durationSec * 0.35));
      g.gain.linearRampToValueAtTime(0.02, ctx.currentTime + Math.min(5, durationSec * 0.7));
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
      o.connect(g); g.connect(rv); o.start(startT); oscs.push(o);
    });
    // Optional second strum halfway through for longer clips
    if (durationSec > 10) {
      const mid = durationSec * 0.5;
      chord.forEach((hz, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle"; o.frequency.value = hz;
        const t = ctx.currentTime + mid + i * 0.06;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.045, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(4.5, durationSec * 0.3));
        o.connect(g); g.connect(rv); o.start(t); o.stop(t + Math.min(5, durationSec * 0.35)); oscs.push(o);
      });
    }
  }

  function timeLapseReveal() {
    // Rhythmic pulse that accelerates
    const startBpm = 80;
    const endBpm   = 180;
    let t = 0;
    let pulse = 0;
    while (t < durationSec - 0.1) {
      const progress = t / durationSec;
      const bpm = startBpm + (endBpm - startBpm) * progress;
      const beatSec = 60 / bpm;
      const freq = pulse % 4 === 0 ? 120 : 90;
      const vol  = pulse % 4 === 0 ? 0.28 : 0.14;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + t);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12);
      o.connect(g); g.connect(master);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.15); oscs.push(o);
      t += beatSec; pulse++;
    }
    // Final crash/swell
    const crashT = Math.max(0, durationSec - 1.2);
    const rv = reverb(2, 1.8);
    [220, 330, 440, 660].forEach((hz, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = hz;
      g.gain.setValueAtTime(0, ctx.currentTime + crashT + i * 0.04);
      g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + crashT + i * 0.04 + 0.05);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec + 0.3);
      o.connect(g); g.connect(rv);
      o.start(ctx.currentTime + crashT + i * 0.04);
      o.stop(ctx.currentTime + durationSec + 0.5); oscs.push(o);
    });
  }

  const builders: Record<Style, () => void> = {
    "movie-trailer":    movieTrailer,
    advertisement,
    commercial,
    "short-clip":       shortClip,
    documentary,
    "luxury-brand":     luxuryBrand,
    "behind-the-scenes": behindTheScenes,
    "time-lapse-reveal": timeLapseReveal,
  };

  return {
    ctx,
    dest,
    start() { ctx.resume(); builders[style](); },
    stop() {
      oscs.forEach(o => { try { o.stop(); } catch {} });
      sources.forEach(s => { try { s.stop(); } catch {} });
      setTimeout(() => ctx.close(), 200);
    },
  };
}

// ── Canvas drawing ────────────────────────────────────────────────────────────

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: Overlay,
  progress: number,
  W: number,
  H: number,
) {
  const opacity =
    progress < 0.15 ? progress / 0.15 :
    progress > 0.85 ? (1 - progress) / 0.15 : 1;

  const configs: Record<string, { size: number; weight: string; upper: boolean }> = {
    title:     { size: 76, weight: "900", upper: true  },
    large:     { size: 54, weight: "700", upper: false },
    small:     { size: 38, weight: "400", upper: false },
    watermark: { size: 26, weight: "600", upper: true  },
    subtitle:  { size: 42, weight: "300", upper: false },
  };
  const cfg = configs[overlay.style] ?? configs.large;
  const txt = cfg.upper ? overlay.text.toUpperCase() : overlay.text;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `${cfg.weight} ${cfg.size}px 'Inter', -apple-system, sans-serif`;
  ctx.textBaseline = "top";

  let x = W / 2;
  let align: CanvasTextAlign = "center";
  let baseY: number;
  switch (overlay.position) {
    case "top":       baseY = H * 0.1;  break;
    case "center":    baseY = H * 0.44; break;
    case "bottom":    baseY = H * 0.76; break;
    case "top-right": x = W * 0.94; align = "right"; baseY = H * 0.06; break;
    default:          baseY = H * 0.76;
  }
  ctx.textAlign = align;

  const maxW = overlay.position === "top-right" ? W * 0.42 : W * 0.86;
  const words = txt.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = word; }
    else cur = test;
  }
  if (cur) lines.push(cur);

  const lineH  = cfg.size * 1.28;
  const totalH = lines.length * lineH;
  const startY = baseY - totalH / 2;

  if (overlay.style !== "watermark") {
    const padV = 20;
    const grad = ctx.createLinearGradient(0, startY - padV, 0, startY + totalH + padV);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.25, "rgba(0,0,0,0.58)");
    grad.addColorStop(0.75, "rgba(0,0,0,0.58)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, startY - padV, W, totalH + padV * 2);
  }

  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = overlay.style === "watermark" ? 6 : 18;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = overlay.style === "watermark" ? "rgba(255,255,255,0.82)" : "#ffffff";
  lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineH));
  ctx.restore();
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReelStudio() {
  const [, navigate] = useLocation();
  const { profile } = useProfile();

  // Restore an image passed from the lightbox "AI Studio" button via sessionStorage
  const storedSource = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("kiln_reel_source") : null;
  const initialSource = storedSource ?? "";
  if (storedSource && typeof sessionStorage !== "undefined") sessionStorage.removeItem("kiln_reel_source");

  const [step, setStep]                     = useState<Step>(initialSource ? "style" : "source");
  const [sourceType, setSourceType]         = useState<SourceType>("image");
  const [sourceUrl, setSourceUrl]           = useState(initialSource);
  const [videoSourceUrl, setVideoSourceUrl] = useState("");
  const [pasteUrl, setPasteUrl]             = useState("");
  const [selectedPost, setSelectedPost]     = useState<FeedPost | null>(null);
  const [chosenStyle, setChosenStyle]       = useState<Style>("movie-trailer");
  const [plan, setPlan]                     = useState<Plan | null>(null);
  const [feedPosts, setFeedPosts]           = useState<FeedPost[]>([]);

  // Studio state
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [editText, setEditText]             = useState("");
  const [isPlaying, setIsPlaying]           = useState(false);
  const [isRecording, setIsRecording]       = useState(false);
  const [progressMs, setProgressMs]         = useState(0);
  const [clipDurationMs, setClipDurationMs] = useState(DEFAULT_IMAGE_MS);
  const [imageDurChoice, setImageDurChoice] = useState(DEFAULT_IMAGE_MS);
  const [videoSpeed, setVideoSpeed]         = useState(1);
  const [gradeOverride, setGradeOverride]   = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl]       = useState("");
  const [published, setPublished]           = useState(false);
  const [error, setError]                   = useState("");
  const [corsBlocked, setCorsBlocked]       = useState(false);

  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const imgRef          = useRef<HTMLImageElement | null>(null);
  const videoRef        = useRef<HTMLVideoElement | null>(null);
  const rafRef          = useRef<number>(0);
  const audioRef        = useRef<ReturnType<typeof buildAudio> | null>(null);
  const naturalDurRef   = useRef<number>(DEFAULT_IMAGE_MS); // original video duration (ms)
  const baseOverlaysRef = useRef<Overlay[] | null>(null);   // AI-generated overlays at base duration

  // ── Derived active color filter ──────────────────────────────────────────────
  const activeFilter = gradeOverride ? gradeFilter(gradeOverride) : (plan?.colorFilter ?? "none");

  // ── Load recent posts (own posts only, so Mux/idb videos are selectable) ──
  useEffect(() => {
    fetch("/api/me/posts", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((d: { posts?: Array<{ id: string; thumbnailUrl: string | null; videoUrl: string | null; muxPlaybackId?: string | null; caption: string; technique: string | null; authorName: string }> } | null) => {
        const posts = (d?.posts ?? []).map((p) => ({
          id: p.id,
          thumbnailUrl: p.thumbnailUrl,
          videoUrl: p.videoUrl || (p.muxPlaybackId ? `https://stream.mux.com/${p.muxPlaybackId}.m3u8` : null),
          caption: p.caption,
          technique: p.technique,
          authorName: p.authorName,
        }));
        setFeedPosts(posts);
      })
      .catch(() => {});
  }, []);

  // ── Preload image ────────────────────────────────────────────────────────────
  // Always fetch via XHR and load through an object URL so the canvas is never
  // tainted. A tainted canvas silently produces an empty captureStream() which
  // causes MediaRecorder to record 0 bytes — i.e. "Export" appears to do nothing.
  useEffect(() => {
    if (!sourceUrl || sourceType !== "image") return;
    imgRef.current = null;
    setCorsBlocked(false);
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const fetchUrl = proxiedMediaUrl(sourceUrl);
        const res = await fetch(fetchUrl, { credentials: "include" });
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { if (!cancelled) imgRef.current = img; };
        img.src = objectUrl;
      } catch {
        if (!cancelled) setCorsBlocked(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceUrl, sourceType]);

  // ── Load video element ───────────────────────────────────────────────────────
  // Same canvas-tainting concern as the image path: fetch the video as a blob
  // and load it via an object URL. Without this, captureStream() from a tainted
  // canvas yields an unusable stream and export produces an empty file.
  useEffect(() => {
    if (!videoSourceUrl || sourceType !== "video") return;
    setCorsBlocked(false);
    videoRef.current = null;
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const fetchUrl = proxiedMediaUrl(videoSourceUrl);
        const res = await fetch(fetchUrl, { credentials: "include" });
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        const vid = document.createElement("video");
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = "auto";
        vid.onloadedmetadata = () => {
          if (cancelled) return;
          videoRef.current = vid;
          const raw = Math.min(vid.duration * 1000, MAX_VIDEO_MS);
          const dur = isFinite(raw) && raw > 0 ? raw : DEFAULT_IMAGE_MS;
          naturalDurRef.current = dur;
          setClipDurationMs(Math.round(dur / videoSpeed));
          vid.currentTime = 0;
        };
        vid.src = objectUrl;
      } catch {
        if (!cancelled) setCorsBlocked(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoSourceUrl, sourceType]); // eslint-disable-line

  // ── Update clip duration when video speed changes ────────────────────────────
  useEffect(() => {
    if (sourceType !== "video") return;
    setClipDurationMs(Math.round(naturalDurRef.current / videoSpeed));
  }, [videoSpeed, sourceType]);

  // ── Update clip duration for image sources ───────────────────────────────────
  useEffect(() => {
    if (sourceType !== "image") return;
    setClipDurationMs(imageDurChoice);
    // Re-scale overlays proportionally from base
    if (baseOverlaysRef.current && plan) {
      const scale = imageDurChoice / DEFAULT_IMAGE_MS;
      setPlan(p => p ? {
        ...p,
        overlays: baseOverlaysRef.current!.map(ov => ({
          ...ov,
          startMs:    Math.round(ov.startMs    * scale),
          durationMs: Math.round(ov.durationMs * scale),
        })),
      } : p);
    }
  }, [imageDurChoice, sourceType]); // eslint-disable-line

  // ── renderFrame ──────────────────────────────────────────────────────────────
  const renderFrame = useCallback(
    (ms: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx2d = canvas.getContext("2d")!;
      const W = CANVAS_W, H = CANVAS_H;

      const source = sourceType === "video" ? videoRef.current : imgRef.current;
      if (!source) return;

      try {
        ctx2d.filter = activeFilter || "none";
        ctx2d.drawImage(source as CanvasImageSource, 0, 0, W, H);
        ctx2d.filter = "none";
      } catch { return; }

      const fadeMs = 450;
      if (ms < fadeMs) {
        ctx2d.fillStyle = `rgba(0,0,0,${1 - ms / fadeMs})`;
        ctx2d.fillRect(0, 0, W, H);
      } else if (ms > clipDurationMs - fadeMs) {
        ctx2d.fillStyle = `rgba(0,0,0,${(ms - (clipDurationMs - fadeMs)) / fadeMs})`;
        ctx2d.fillRect(0, 0, W, H);
      }

      (plan?.overlays ?? []).forEach(ov => {
        if (ms >= ov.startMs && ms <= ov.startMs + ov.durationMs) {
          drawOverlay(ctx2d, ov, (ms - ov.startMs) / ov.durationMs, W, H);
        }
      });
    },
    [plan, sourceType, clipDurationMs, activeFilter],
  );

  // ── First frame on studio entry ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== "studio" || !plan) return;
    const t = setTimeout(() => renderFrame(0), 60);
    return () => clearTimeout(t);
  }, [step, plan, renderFrame]);

  // ── stopPlayback ─────────────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    audioRef.current?.stop();
    audioRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  // ── playPreview ──────────────────────────────────────────────────────────────
  const playPreview = useCallback(() => {
    const hasSource = sourceType === "video" ? !!videoRef.current : !!imgRef.current;
    if (!hasSource) return;
    stopPlayback();
    setIsPlaying(true);
    setDownloadUrl("");

    const audio = buildAudio(chosenStyle, clipDurationMs / 1000);
    audioRef.current = audio;
    audio.start();

    if (sourceType === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
      videoRef.current.playbackRate = videoSpeed;
      videoRef.current.play().catch(() => {});
    }

    const wall = performance.now();
    const loop = () => {
      const elapsed = performance.now() - wall;
      if (elapsed >= clipDurationMs) {
        renderFrame(clipDurationMs); setProgressMs(clipDurationMs); stopPlayback(); return;
      }
      setProgressMs(elapsed);
      renderFrame(elapsed);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [chosenStyle, clipDurationMs, renderFrame, sourceType, stopPlayback, videoSpeed]);

  // ── exportClip ───────────────────────────────────────────────────────────────
  const exportClip = useCallback(async () => {
    const canvas = canvasRef.current;
    const hasSource = sourceType === "video" ? !!videoRef.current : !!imgRef.current;
    if (!canvas || !hasSource) return;

    setCorsBlocked(false);
    setIsRecording(true);
    setDownloadUrl("");
    stopPlayback();
    renderFrame(0);

    if (sourceType === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
      videoRef.current.playbackRate = videoSpeed;
      videoRef.current.play().catch(() => {});
    }

    const audio = buildAudio(chosenStyle, clipDurationMs / 1000);
    audio.start();

    let videoStream: MediaStream;
    try { videoStream = canvas.captureStream(30); }
    catch { audio.stop(); setIsRecording(false); setCorsBlocked(true); return; }

    const combined = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audio.dest.stream.getAudioTracks(),
    ]);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus" : "video/webm";

    let recorder: MediaRecorder;
    try { recorder = new MediaRecorder(combined, { mimeType }); }
    catch { audio.stop(); setIsRecording(false); setCorsBlocked(true); return; }

    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      audio.stop();
      if (sourceType === "video" && videoRef.current) {
        videoRef.current.pause(); videoRef.current.currentTime = 0;
      }
      setDownloadUrl(URL.createObjectURL(new Blob(chunks, { type: "video/webm" })));
      setIsRecording(false);
    };

    recorder.start(100);
    const wall = performance.now();
    const loop = () => {
      const elapsed = performance.now() - wall;
      if (elapsed >= clipDurationMs + 400) { recorder.stop(); return; }
      renderFrame(Math.min(elapsed, clipDurationMs));
      setProgressMs(Math.min(elapsed, clipDurationMs));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, [chosenStyle, clipDurationMs, renderFrame, sourceType, stopPlayback, videoSpeed]);

  // ── Enhance ──────────────────────────────────────────────────────────────────
  async function enhance() {
    const aiImageUrl = sourceUrl.trim();
    if (!aiImageUrl && !selectedPost?.caption) return;
    setStep("enhancing"); setError("");
    try {
      const r = await fetch("/api/ai/enhance-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: aiImageUrl || undefined,
          caption: selectedPost?.caption ?? "",
          technique: selectedPost?.technique ?? "",
          style: chosenStyle,
          artistName: selectedPost?.authorName ?? profile?.name ?? "the artist",
          clipDurationMs: clipDurationMs,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data: Plan = await r.json();

      // For video: scale overlays to actual clip duration
      if (sourceType === "video" && clipDurationMs !== DEFAULT_IMAGE_MS) {
        const scale = clipDurationMs / DEFAULT_IMAGE_MS;
        data.overlays = data.overlays.map(ov => ({
          ...ov,
          startMs:    Math.round(ov.startMs    * scale),
          durationMs: Math.round(ov.durationMs * scale),
        }));
      }

      baseOverlaysRef.current = data.overlays;
      setGradeOverride(null);
      setPlan(data);
      setStep("studio");
    } catch {
      setError("Enhancement failed — please try again.");
      setStep("style");
    }
  }

  // ── Overlay CRUD ─────────────────────────────────────────────────────────────
  function saveEdit(id: string) {
    if (!plan) return;
    setPlan({ ...plan, overlays: plan.overlays.map(o => o.id === id ? { ...o, text: editText } : o) });
    setEditingId(null);
    setTimeout(() => renderFrame(progressMs), 50);
  }

  function deleteOverlay(id: string) {
    if (!plan) return;
    setPlan({ ...plan, overlays: plan.overlays.filter(o => o.id !== id) });
    setTimeout(() => renderFrame(progressMs), 50);
  }

  function addOverlay() {
    if (!plan) return;
    const lastStart = plan.overlays.reduce((mx, o) => Math.max(mx, o.startMs + o.durationMs), 0);
    const startMs = Math.min(lastStart + 300, clipDurationMs - 2000);
    const newOv: Overlay = {
      id: nextOverlayId(),
      text: "New overlay text",
      startMs: Math.max(0, startMs),
      durationMs: Math.min(2000, clipDurationMs - Math.max(0, startMs)),
      position: "bottom",
      style: "large",
    };
    setPlan({ ...plan, overlays: [...plan.overlays, newOv] });
    setEditingId(newOv.id);
    setEditText(newOv.text);
  }

  // ── Publish ──────────────────────────────────────────────────────────────────
  async function publishReel() {
    if (!downloadUrl || !plan) return;
    setPublished(true);
    setTimeout(() => navigate("/feed"), 1500);
  }

  // ── Source helpers ───────────────────────────────────────────────────────────
  function selectPost(p: FeedPost) {
    setSelectedPost(p);
    if (p.videoUrl) {
      setSourceType("video");
      setVideoSourceUrl(p.videoUrl);
      setSourceUrl(p.thumbnailUrl ?? "");
    } else {
      setSourceType("image");
      setVideoSourceUrl("");
      setSourceUrl(p.thumbnailUrl ?? "");
    }
  }

  function confirmPasteUrl() {
    const url = pasteUrl.trim();
    if (!url) return;
    if (isVideoUrl(url)) {
      setSourceType("video");
      setVideoSourceUrl(url);
      setSourceUrl("");
    } else {
      setSourceType("image");
      setVideoSourceUrl("");
      setSourceUrl(url);
    }
    setSelectedPost(null);
  }

  const pct = Math.min((progressMs / clipDurationMs) * 100, 100);
  const durationLabel = `${(clipDurationMs / 1000).toFixed(1)}s`;
  const hasSource = sourceType === "video" ? !!videoSourceUrl : !!sourceUrl;
  const readyToRecord = sourceType === "video"
    ? (!!videoRef.current && (videoRef.current.readyState ?? 0) >= 2)
    : !!imgRef.current;

  // ════════════════════════════════════════════════════════════════════════════
  // Step 1: Source
  // ════════════════════════════════════════════════════════════════════════════
  if (step === "source") {
    return (
      <div className="min-h-screen bg-black text-white pb-28 md:pb-8">
        <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
          <Link href="/feed"><ArrowLeft size={20} className="text-amber-400" /></Link>
          <div>
            <h1 className="font-bold text-lg leading-tight">AI Reel Studio</h1>
            <p className="text-xs text-white/40">Step 1 of 3 — Choose source</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Your Posts</h2>
            {feedPosts.length === 0 ? (
              <div className="text-center py-8 text-stone-500 text-sm">
                <Film size={24} className="mx-auto mb-2 text-stone-700" />
                <p>No posts yet.</p>
                <Link href="/create" className="text-amber-400 hover:text-amber-300 text-xs mt-1 inline-block">Create your first post →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[50vh]" style={{ scrollbarWidth: "none" }}>
                {feedPosts.map(p => {
                  const isVideo = !!p.videoUrl;
                  const displaySrc = p.thumbnailUrl ?? undefined;
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectPost(p)}
                      className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all ${
                        selectedPost?.id === p.id ? "border-amber-400 scale-[0.97]" : "border-transparent hover:border-white/30"
                      }`}
                    >
                      {displaySrc ? (
                        <img src={displaySrc} alt="" className="w-full h-full object-cover" />
                      ) : isVideo ? (
                        <div className="w-full h-full bg-stone-900 flex items-center justify-center">
                          <Film size={24} className="text-white/30" />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-stone-900" />
                      )}
                      {isVideo && (
                        <div className="absolute top-1.5 left-1.5 bg-black/70 rounded-md px-1.5 py-0.5 flex items-center gap-1">
                          <Video size={9} className="text-amber-400" />
                          <span className="text-[9px] text-amber-400 font-semibold">VIDEO</span>
                        </div>
                      )}
                      {selectedPost?.id === p.id && (
                        <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center">
                          <div className="bg-amber-400 rounded-full p-1"><Check size={14} className="text-black" /></div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-1.5">
                        <p className="text-[10px] text-white/80 truncate">{p.caption || "Untitled"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-1">Or paste a URL</h2>
            <p className="text-xs text-white/30 mb-3">Image (.jpg / .png) or video (.mp4 / .webm / .mov)</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={pasteUrl}
                onChange={e => setPasteUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={confirmPasteUrl}
                disabled={!pasteUrl.trim()}
                className="px-4 py-3 bg-amber-400 text-black font-semibold rounded-xl disabled:opacity-40"
              >Use</button>
            </div>
          </div>

          {(sourceUrl || videoSourceUrl) && (
            <div className="flex items-center gap-3 p-3 bg-white/5 border border-amber-400/30 rounded-xl">
              {sourceType === "video" ? (
                <div className="w-14 h-14 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                  <Video size={20} className="text-amber-400" />
                </div>
              ) : (
                <img src={sourceUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{sourceType === "video" ? "Video source selected" : "Image source selected"}</p>
                <p className="text-xs text-white/40 truncate">{sourceType === "video" ? (videoSourceUrl || "your video") : sourceUrl}</p>
              </div>
              <Check size={18} className="text-amber-400 shrink-0" />
            </div>
          )}
        </div>

        <div className="fixed bottom-20 md:bottom-4 left-0 right-0 px-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setStep("style")}
              disabled={!hasSource}
              className="w-full py-4 bg-amber-400 text-black font-bold rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Choose Style <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Step 2: Style — 2-column grid, 8 styles
  // ════════════════════════════════════════════════════════════════════════════
  if (step === "style") {
    return (
      <div className="min-h-screen bg-black text-white pb-28 md:pb-8">
        <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setStep("source")}><ArrowLeft size={20} className="text-amber-400" /></button>
          <div>
            <h1 className="font-bold text-lg leading-tight">AI Reel Studio</h1>
            <p className="text-xs text-white/40">Step 2 of 3 — Choose style</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
          {sourceType === "video" && (
            <div className="flex items-center gap-2 p-3 bg-amber-400/8 border border-amber-400/20 rounded-xl">
              <Video size={14} className="text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300">Video detected — AI will re-edit your clip with cinematic grading and overlays.</p>
            </div>
          )}

          <p className="text-white/50 text-sm">Pick the treatment that matches how you want your work to feel.</p>

          {/* 2-column grid of all 8 styles */}
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setChosenStyle(s.id)}
                className={`text-left p-3.5 rounded-2xl border-2 transition-all ${
                  chosenStyle === s.id ? "border-amber-400 bg-amber-400/8" : "border-white/10 hover:border-white/25"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={chosenStyle === s.id ? "text-amber-400" : "text-white/50"}>{s.icon}</span>
                  <span className="font-bold text-sm leading-tight">{s.label}</span>
                  {chosenStyle === s.id && (
                    <span className="ml-auto bg-amber-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">✓</span>
                  )}
                </div>
                <p className="text-xs text-white/50 mb-2 leading-snug">{s.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {s.tags.map(tag => (
                    <span key={tag} className="text-[9px] bg-white/8 text-white/40 px-1.5 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">{error}</div>
          )}
        </div>

        <div className="fixed bottom-20 md:bottom-4 left-0 right-0 px-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={enhance}
              className="w-full py-4 bg-amber-400 text-black font-bold rounded-2xl flex items-center justify-center gap-2"
            >
              <Sparkles size={18} /> Generate Enhancement
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Step 3: Enhancing
  // ════════════════════════════════════════════════════════════════════════════
  if (step === "enhancing") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 px-4">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-amber-400/40 animate-ping [animation-delay:0.3s]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles size={36} className="text-amber-400 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            {sourceType === "video" ? "Re-editing your video" : "Generating your reel"}
          </h2>
          <p className="text-white/50 text-sm max-w-xs">
            AI is crafting a{" "}
            <span className="text-amber-300">{STYLES.find(s => s.id === chosenStyle)?.label}</span>{" "}
            treatment for your {sourceType === "video" ? "video" : "image"}…
          </p>
        </div>
        {sourceType === "image" && sourceUrl && (
          <div className="relative w-32 rounded-xl overflow-hidden opacity-40">
            <img src={sourceUrl} alt="" className="w-full object-cover" />
          </div>
        )}
        {sourceType === "video" && (
          <div className="w-32 h-40 rounded-xl bg-stone-900 flex items-center justify-center opacity-60">
            <Video size={32} className="text-amber-400" />
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Step 4: Studio
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28 md:pb-8">
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => { stopPlayback(); setStep("style"); }}>
          <ArrowLeft size={20} className="text-amber-400" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-base leading-tight">AI Reel Studio</h1>
          <p className="text-xs text-white/40">
            {STYLES.find(s => s.id === chosenStyle)?.label} · {gradeOverride ?? plan?.colorGrade ?? ""} · {durationLabel}
          </p>
        </div>
        <button
          onClick={() => { stopPlayback(); enhance(); }}
          className="text-xs text-white/50 flex items-center gap-1 hover:text-amber-400"
        >
          <RefreshCw size={12} /> Redo
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 md:grid md:grid-cols-[auto_1fr] md:gap-6">

        {/* ── Canvas preview ─────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 md:sticky md:top-20 md:self-start">
          <div
            className="relative rounded-[2.4rem] overflow-hidden border-4 border-white/10 shadow-2xl"
            style={{ width: Math.round(CANVAS_W * 0.33), height: Math.round(CANVAS_H * 0.33) }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="block"
              style={{ width: "100%", height: "100%", imageRendering: "crisp-edges" }}
            />
            {!isPlaying && !isRecording && (
              <button
                onClick={playPreview}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors"
              >
                <div className="bg-white/90 rounded-full p-4 shadow-xl">
                  <Play size={22} className="text-black ml-0.5" />
                </div>
              </button>
            )}
            {isRecording && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 rounded-full px-2 py-1">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-white">REC</span>
              </div>
            )}
            {sourceType === "video" && !isPlaying && !isRecording && (
              <div className="absolute top-2 right-2 bg-black/60 rounded-md px-1.5 py-0.5 flex items-center gap-1">
                <Video size={9} className="text-amber-400" />
                <span className="text-[9px] text-amber-400 font-semibold">VIDEO</span>
              </div>
            )}
          </div>

          <div className="w-full max-w-[180px] h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-none" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-white/30 -mt-1">
            {(progressMs / 1000).toFixed(1)}s / {durationLabel}
          </p>

          <div className="flex items-center gap-2">
            {isPlaying ? (
              <button onClick={stopPlayback} className="flex items-center gap-1.5 px-4 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20">
                <Square size={14} /> Stop
              </button>
            ) : (
              <button onClick={playPreview} className="flex items-center gap-1.5 px-4 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20">
                <Play size={14} /> Preview
              </button>
            )}
          </div>

          {plan && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
              <div className="flex gap-0.5">
                {[3, 5, 4, 6, 3].map((h, i) => (
                  <div key={i} className={`w-0.5 bg-amber-400 rounded-full ${isPlaying ? "animate-pulse" : ""}`}
                    style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <span className="text-[10px] text-white/50 ml-1">{plan.audioMood}</span>
            </div>
          )}
        </div>

        {/* ── Right panel ────────────────────────────────────────────── */}
        <div className="space-y-4 mt-4 md:mt-0">

          {/* AI treatment */}
          {plan && (
            <div className="p-4 bg-white/4 border border-white/10 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">AI Treatment</span>
              </div>
              <p className="text-xl font-black leading-tight">{plan.headline}</p>
              <p className="text-sm text-white/50 italic">{plan.tagline}</p>
              <p className="text-xs text-white/35 mt-1">{plan.treatmentNotes}</p>
            </div>
          )}

          {/* ── Controls ───────────────────────────────────────────────── */}
          <div className="p-4 bg-white/3 border border-white/8 rounded-2xl space-y-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Controls</p>

            {/* Color grade override */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Palette size={12} className="text-white/40" />
                <span className="text-xs text-white/40">Color Grade</span>
                {gradeOverride && (
                  <button
                    onClick={() => { setGradeOverride(null); setTimeout(() => renderFrame(progressMs), 40); }}
                    className="ml-auto text-[10px] text-white/30 hover:text-amber-400"
                  >reset</button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {COLOR_GRADES.map(g => (
                  <button
                    key={g.id}
                    onClick={() => { setGradeOverride(g.id); setTimeout(() => renderFrame(progressMs), 40); }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                      (gradeOverride ?? plan?.colorGrade) === g.id
                        ? "border-amber-400 bg-amber-400/10 text-amber-300"
                        : "border-white/10 text-white/40 hover:border-white/30"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }} />
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image: clip duration picker */}
            {sourceType === "image" && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Timer size={12} className="text-white/40" />
                  <span className="text-xs text-white/40">Clip Duration</span>
                </div>
                <div className="flex gap-1.5">
                  {IMAGE_DURATIONS.map(d => (
                    <button
                      key={d.ms}
                      onClick={() => setImageDurChoice(d.ms)}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                        imageDurChoice === d.ms
                          ? "border-amber-400 bg-amber-400/10 text-amber-300"
                          : "border-white/10 text-white/40 hover:border-white/30"
                      }`}
                    >{d.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Video: playback speed */}
            {sourceType === "video" && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Gauge size={12} className="text-white/40" />
                  <span className="text-xs text-white/40">Playback Speed</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {VIDEO_SPEEDS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setVideoSpeed(s.value)}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                        videoSpeed === s.value
                          ? "border-amber-400 bg-amber-400/10 text-amber-300"
                          : "border-white/10 text-white/40 hover:border-white/30"
                      }`}
                    >{s.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Overlays */}
          {plan && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Text Overlays</h3>
                <button
                  onClick={addOverlay}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-amber-400 transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              </div>

              {plan.overlays.map(ov => (
                <div key={ov.id} className="p-3 bg-white/4 border border-white/8 rounded-xl">
                  {editingId === ov.id ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="flex-1 bg-white/10 border border-amber-400/40 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(ov.id); if (e.key === "Escape") setEditingId(null); }}
                      />
                      <button onClick={() => saveEdit(ov.id)} className="text-amber-400 hover:text-amber-300"><Check size={16} /></button>
                      <button onClick={() => setEditingId(null)} className="text-white/30 hover:text-white/60"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{ov.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-white/30">{(ov.startMs/1000).toFixed(1)}s – {((ov.startMs+ov.durationMs)/1000).toFixed(1)}s</span>
                          <span className="text-[10px] bg-white/6 text-white/35 px-1.5 py-0.5 rounded-full">{ov.style}</span>
                          <span className="text-[10px] bg-white/6 text-white/35 px-1.5 py-0.5 rounded-full">{ov.position}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setEditingId(ov.id); setEditText(ov.text); }} className="text-white/25 hover:text-amber-400 p-1">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => deleteOverlay(ov.id)} className="text-white/20 hover:text-red-400 p-1">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 h-1 bg-white/6 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400/60 rounded-full"
                      style={{ marginLeft: `${(ov.startMs/clipDurationMs)*100}%`, width: `${(ov.durationMs/clipDurationMs)*100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CORS warning */}
          {corsBlocked && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                This video can't be captured due to browser security restrictions on external sources.
                Upload the video to Kiln first, then select it from your posts.
              </p>
            </div>
          )}

          {/* Export */}
          <div className="space-y-2 pt-2">
            {downloadUrl ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">Clip ready</span>
                </div>
                <a
                  href={downloadUrl}
                  download={`kiln-reel-${chosenStyle}.webm`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400"
                >
                  <Download size={16} /> Download Clip
                </a>
                <button
                  onClick={publishReel}
                  disabled={published}
                  className="w-full py-3 border border-emerald-500/40 text-emerald-400 font-semibold rounded-xl hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  {published ? "Published! Redirecting…" : "Publish as Reel"}
                </button>
              </div>
            ) : (
              <button
                onClick={exportClip}
                disabled={isRecording || isPlaying || !readyToRecord}
                className="w-full py-4 bg-amber-400 text-black font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRecording ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Recording {durationLabel} clip…
                  </>
                ) : (
                  <><Download size={18} /> Export & Download</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
