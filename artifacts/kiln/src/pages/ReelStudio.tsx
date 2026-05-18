import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, Play, Square, Download, Sparkles, Film,
  Megaphone, Star, Zap, RefreshCw, Check, Pencil, X, ChevronRight,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";

// ── Constants ────────────────────────────────────────────────────────────────

const CLIP_MS = 7000;
const CANVAS_W = 540;
const CANVAS_H = 960;

type Style = "movie-trailer" | "advertisement" | "commercial" | "short-clip";
type Step = "source" | "style" | "enhancing" | "studio";

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
    icon: <Film size={22} />,
    desc: "Dramatic. Cinematic. Unforgettable.",
    tags: ["Dark grade", "Bold titles", "Swell audio"],
  },
  {
    id: "advertisement",
    label: "Advertisement",
    icon: <Megaphone size={22} />,
    desc: "Bold. Clear. Action-driven.",
    tags: ["Vibrant grade", "CTA text", "Energetic"],
  },
  {
    id: "commercial",
    label: "Commercial",
    icon: <Star size={22} />,
    desc: "Warm. Story-driven. Authentic.",
    tags: ["Golden grade", "Soft text", "Ambient"],
  },
  {
    id: "short-clip",
    label: "7-Second Clip",
    icon: <Zap size={22} />,
    desc: "Punchy. Social-native. Scroll-stopping.",
    tags: ["Clean grade", "One line", "Impact"],
  },
];

const GRADE_COLORS: Record<string, string> = {
  cinematic: "#6b7280",
  vibrant: "#f59e0b",
  moody: "#6d28d9",
  clean: "#e5e7eb",
  golden: "#d97706",
};

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

  function movieTrailer() {
    const rv = reverb(4, 1.4);
    // Low drone swell
    const drone = ctx.createOscillator();
    const dg = ctx.createGain();
    const f = ctx.createBiquadFilter();
    drone.type = "sawtooth";
    drone.frequency.value = 55;
    f.type = "lowpass";
    f.frequency.value = 350;
    dg.gain.setValueAtTime(0, ctx.currentTime);
    dg.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 2.5);
    dg.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 5);
    dg.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
    drone.connect(f); f.connect(dg); dg.connect(rv);
    drone.start(); oscs.push(drone);

    // Swell chord (A minor: A2 E3 A3)
    [110, 165, 220].forEach((hz, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = hz;
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.4);
      g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 3 + i * 0.3);
      g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 5.5);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
      o.connect(g); g.connect(rv);
      o.start(); oscs.push(o);
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
    // Bright shimmer
    const shimmer = ctx.createOscillator();
    const sg = ctx.createGain();
    shimmer.type = "sine"; shimmer.frequency.value = 1046.5;
    sg.gain.setValueAtTime(0.04, ctx.currentTime);
    sg.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
    shimmer.connect(sg); sg.connect(master);
    shimmer.start(); oscs.push(shimmer);
  }

  function commercial() {
    const rv = reverb(3, 2.2);
    // Warm A major pad
    [220, 277.2, 329.6, 440].forEach((hz, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = hz;
      const vol = 0.065 - i * 0.012;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.8);
      g.gain.setValueAtTime(vol, ctx.currentTime + durationSec - 1.2);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
      o.connect(g); g.connect(rv);
      o.start(); oscs.push(o);
    });
  }

  function shortClip() {
    // Bass hit
    const bass = ctx.createOscillator();
    const bg = ctx.createGain();
    bass.type = "sine";
    bass.frequency.setValueAtTime(80, ctx.currentTime);
    bass.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.3);
    bg.gain.setValueAtTime(0.42, ctx.currentTime);
    bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    bass.connect(bg); bg.connect(master);
    bass.start(); bass.stop(ctx.currentTime + 0.5); oscs.push(bass);

    // Riser
    const nBuf = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = nBuf;
    const rf = ctx.createBiquadFilter();
    rf.type = "bandpass"; rf.Q.value = 8;
    rf.frequency.setValueAtTime(200, ctx.currentTime + 1);
    rf.frequency.linearRampToValueAtTime(3200, ctx.currentTime + 5.2);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0, ctx.currentTime + 1);
    rg.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 5);
    rg.gain.linearRampToValueAtTime(0, ctx.currentTime + 5.8);
    noise.connect(rf); rf.connect(rg); rg.connect(master);
    noise.start(ctx.currentTime + 1);
    sources.push(noise);

    // Drop thump
    const drop = ctx.createOscillator();
    const dg2 = ctx.createGain();
    drop.type = "sine"; drop.frequency.value = 58;
    dg2.gain.setValueAtTime(0, ctx.currentTime + 5.5);
    dg2.gain.linearRampToValueAtTime(0.38, ctx.currentTime + 5.55);
    dg2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 7);
    drop.connect(dg2); dg2.connect(master);
    drop.start(ctx.currentTime + 5.5); drop.stop(ctx.currentTime + 7.1); oscs.push(drop);
  }

  const builders: Record<Style, () => void> = {
    "movie-trailer": movieTrailer,
    advertisement,
    commercial,
    "short-clip": shortClip,
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
    title:     { size: 76, weight: "900", upper: true },
    large:     { size: 54, weight: "700", upper: false },
    small:     { size: 38, weight: "400", upper: false },
    watermark: { size: 26, weight: "600", upper: true },
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

  const lineH = cfg.size * 1.28;
  const totalH = lines.length * lineH;
  const startY = baseY - totalH / 2;

  // Backdrop gradient for readability (skip for watermark)
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

  const [step, setStep] = useState<Step>("source");
  const [sourceUrl, setSourceUrl] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [chosenStyle, setChosenStyle] = useState<Style>("movie-trailer");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number>(0);
  const audioRef = useRef<ReturnType<typeof buildAudio> | null>(null);

  // Load recent posts for source picking
  useEffect(() => {
    fetch("/api/feed?limit=12")
      .then(r => r.json())
      .then(d => setFeedPosts(d.posts ?? []))
      .catch(() => {});
  }, []);

  // Pre-load image when source is chosen
  useEffect(() => {
    if (!sourceUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = sourceUrl;
    img.onload = () => {
      imgRef.current = img;
      if (canvasRef.current) renderFrame(0);
    };
    img.onerror = () => {
      // Fallback: try without crossOrigin
      const img2 = new Image();
      img2.src = sourceUrl;
      img2.onload = () => { imgRef.current = img2; if (canvasRef.current) renderFrame(0); };
    };
  }, [sourceUrl]); // eslint-disable-line

  const renderFrame = useCallback(
    (ms: number) => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img) return;
      const ctx = canvas.getContext("2d")!;
      const W = CANVAS_W, H = CANVAS_H;

      // Color-graded image
      ctx.filter = plan?.colorFilter ?? "none";
      ctx.drawImage(img, 0, 0, W, H);
      ctx.filter = "none";

      // Fade transition
      const fadeMs = 450;
      if (ms < fadeMs) {
        ctx.fillStyle = `rgba(0,0,0,${1 - ms / fadeMs})`;
        ctx.fillRect(0, 0, W, H);
      } else if (ms > CLIP_MS - fadeMs) {
        ctx.fillStyle = `rgba(0,0,0,${(ms - (CLIP_MS - fadeMs)) / fadeMs})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Active overlays
      (plan?.overlays ?? []).forEach(ov => {
        if (ms >= ov.startMs && ms <= ov.startMs + ov.durationMs) {
          const p = (ms - ov.startMs) / ov.durationMs;
          drawOverlay(ctx, ov, p, W, H);
        }
      });
    },
    [plan],
  );

  const stopPlayback = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    audioRef.current?.stop();
    audioRef.current = null;
    setIsPlaying(false);
  }, []);

  const playPreview = useCallback(() => {
    if (!imgRef.current) return;
    stopPlayback();
    setIsPlaying(true);
    setDownloadUrl("");

    const audio = buildAudio(chosenStyle, CLIP_MS / 1000);
    audioRef.current = audio;
    audio.start();

    const wall = performance.now();
    const loop = () => {
      const elapsed = performance.now() - wall;
      if (elapsed >= CLIP_MS) {
        renderFrame(CLIP_MS);
        setProgressMs(CLIP_MS);
        stopPlayback();
        return;
      }
      setProgressMs(elapsed);
      renderFrame(elapsed);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [chosenStyle, renderFrame, stopPlayback]);

  const exportClip = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    setIsRecording(true);
    setDownloadUrl("");
    stopPlayback();

    // Render first frame
    renderFrame(0);

    const audio = buildAudio(chosenStyle, CLIP_MS / 1000);
    audio.start();

    const videoStream = canvas.captureStream(30);
    const combined = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audio.dest.stream.getAudioTracks(),
    ]);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const recorder = new MediaRecorder(combined, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      audio.stop();
      const blob = new Blob(chunks, { type: "video/webm" });
      setDownloadUrl(URL.createObjectURL(blob));
      setIsRecording(false);
    };

    recorder.start(100);
    const wall = performance.now();
    const loop = () => {
      const elapsed = performance.now() - wall;
      if (elapsed >= CLIP_MS + 300) { recorder.stop(); return; }
      renderFrame(Math.min(elapsed, CLIP_MS));
      setProgressMs(Math.min(elapsed, CLIP_MS));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, [chosenStyle, renderFrame, stopPlayback]);

  // ── Enhance request ──────────────────────────────────────────────────────

  async function enhance() {
    const url = sourceUrl || pasteUrl.trim();
    if (!url) return;
    setStep("enhancing");
    setError("");
    try {
      const r = await fetch("/api/ai/enhance-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: url,
          caption: selectedPost?.caption ?? "",
          technique: selectedPost?.technique ?? "",
          style: chosenStyle,
          artistName: selectedPost?.authorName ?? profile?.name ?? "the artist",
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data: Plan = await r.json();
      setPlan(data);
      setStep("studio");
      // Render first frame once image is ready
      setTimeout(() => { if (imgRef.current) renderFrame(0); }, 100);
    } catch (e) {
      setError("Enhancement failed — please try again.");
      setStep("style");
    }
  }

  // ── Overlay editing ──────────────────────────────────────────────────────

  function saveEdit(id: string) {
    if (!plan) return;
    setPlan({
      ...plan,
      overlays: plan.overlays.map(o => (o.id === id ? { ...o, text: editText } : o)),
    });
    setEditingId(null);
    setTimeout(() => renderFrame(progressMs), 50);
  }

  function startEdit(ov: Overlay) {
    setEditingId(ov.id);
    setEditText(ov.text);
  }

  // ── Publish ───────────────────────────────────────────────────────────────

  async function publishReel() {
    if (!downloadUrl || !plan) return;
    setPublished(true);
    setTimeout(() => navigate("/feed"), 1500);
  }

  // ── Source selection helpers ─────────────────────────────────────────────

  function selectPost(p: FeedPost) {
    setSelectedPost(p);
    const url = p.thumbnailUrl ?? p.videoUrl ?? "";
    setSourceUrl(url);
  }

  function confirmPasteUrl() {
    const url = pasteUrl.trim();
    if (!url) return;
    setSourceUrl(url);
    setSelectedPost(null);
  }

  // ── Progress bar ─────────────────────────────────────────────────────────

  const pct = Math.min((progressMs / CLIP_MS) * 100, 100);

  // ── Step 1: Source ────────────────────────────────────────────────────────

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
          {/* Recent posts */}
          <div>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
              Recent Posts
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {feedPosts.map(p => {
                const thumb = p.thumbnailUrl ?? p.videoUrl;
                if (!thumb) return null;
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPost(p)}
                    className={`relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all ${
                      selectedPost?.id === p.id
                        ? "border-amber-400 scale-[0.97]"
                        : "border-transparent hover:border-white/30"
                    }`}
                  >
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                    {selectedPost?.id === p.id && (
                      <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center">
                        <div className="bg-amber-400 rounded-full p-1">
                          <Check size={14} className="text-black" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-1.5">
                      <p className="text-[10px] text-white/80 truncate">{p.authorName}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Or paste URL */}
          <div>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
              Or paste an image URL
            </h2>
            <div className="flex gap-2">
              <input
                type="url"
                value={pasteUrl}
                onChange={e => setPasteUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={confirmPasteUrl}
                disabled={!pasteUrl.trim()}
                className="px-4 py-3 bg-amber-400 text-black font-semibold rounded-xl disabled:opacity-40"
              >
                Use
              </button>
            </div>
          </div>

          {/* Preview of chosen source */}
          {sourceUrl && (
            <div className="flex items-center gap-3 p-3 bg-white/5 border border-amber-400/30 rounded-xl">
              <img src={sourceUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Source selected</p>
                <p className="text-xs text-white/40 truncate">{sourceUrl}</p>
              </div>
              <Check size={18} className="text-amber-400 shrink-0" />
            </div>
          )}
        </div>

        {/* Next */}
        <div className="fixed bottom-20 md:bottom-4 left-0 right-0 px-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setStep("style")}
              disabled={!sourceUrl}
              className="w-full py-4 bg-amber-400 text-black font-bold rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Choose Style <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Style ─────────────────────────────────────────────────────────

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

        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-3">
          <p className="text-white/50 text-sm mb-4">
            Pick the treatment that matches how you want your work to feel.
          </p>
          {STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setChosenStyle(s.id)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                chosenStyle === s.id
                  ? "border-amber-400 bg-amber-400/8"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={chosenStyle === s.id ? "text-amber-400" : "text-white/60"}>
                  {s.icon}
                </span>
                <span className="font-bold">{s.label}</span>
                {chosenStyle === s.id && (
                  <span className="ml-auto bg-amber-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-sm text-white/60 mb-2">{s.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {s.tags.map(tag => (
                  <span key={tag} className="text-xs bg-white/8 text-white/50 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              {error}
            </div>
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

  // ── Step 3: Enhancing ─────────────────────────────────────────────────────

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
          <h2 className="text-2xl font-bold mb-2">Generating your reel</h2>
          <p className="text-white/50 text-sm max-w-xs">
            AI is analyzing your work and crafting a cinematic{" "}
            {STYLES.find(s => s.id === chosenStyle)?.label.toLowerCase()} treatment…
          </p>
        </div>
        {sourceUrl && (
          <div className="relative w-32 rounded-xl overflow-hidden">
            <img src={sourceUrl} alt="" className="w-full object-cover opacity-40" />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.7))" }}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Step 4: Studio ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28 md:pb-8">
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => { stopPlayback(); setStep("style"); }}>
          <ArrowLeft size={20} className="text-amber-400" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-base leading-tight">AI Reel Studio</h1>
          <p className="text-xs text-white/40">
            {STYLES.find(s => s.id === chosenStyle)?.label} · {plan?.colorGrade ?? ""}
          </p>
        </div>
        <button
          onClick={() => { stopPlayback(); setStep("style"); enhance(); }}
          className="text-xs text-white/50 flex items-center gap-1 hover:text-amber-400"
        >
          <RefreshCw size={12} /> Redo
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 md:grid md:grid-cols-[auto_1fr] md:gap-6">

        {/* ── Canvas preview ────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 md:sticky md:top-20 md:self-start">
          {/* Phone-frame wrapper */}
          <div className="relative rounded-[2.4rem] overflow-hidden border-4 border-white/10 shadow-2xl"
               style={{ width: Math.round(CANVAS_W * 0.33), height: Math.round(CANVAS_H * 0.33) }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="block"
              style={{ width: "100%", height: "100%", imageRendering: "crisp-edges" }}
            />
            {/* Play overlay */}
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
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-[180px] h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            {isPlaying ? (
              <button
                onClick={stopPlayback}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20"
              >
                <Square size={14} /> Stop
              </button>
            ) : (
              <button
                onClick={playPreview}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20"
              >
                <Play size={14} /> Preview
              </button>
            )}
          </div>

          {/* Audio badge */}
          {plan && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
              <div className="flex gap-0.5">
                {[3, 5, 4, 6, 3].map((h, i) => (
                  <div
                    key={i}
                    className={`w-0.5 bg-amber-400 rounded-full ${isPlaying ? "animate-pulse" : ""}`}
                    style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-white/50 ml-1">{plan.audioMood}</span>
            </div>
          )}
        </div>

        {/* ── Right panel ───────────────────────────────────────────── */}
        <div className="space-y-4 mt-4 md:mt-0">

          {/* AI treatment summary */}
          {plan && (
            <div className="p-4 bg-white/4 border border-white/10 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  AI Treatment
                </span>
                <span
                  className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: `${GRADE_COLORS[plan.colorGrade] ?? "#6b7280"}22`,
                    color: GRADE_COLORS[plan.colorGrade] ?? "#9ca3af",
                    border: `1px solid ${GRADE_COLORS[plan.colorGrade] ?? "#6b7280"}44`,
                  }}
                >
                  {plan.colorGrade} grade
                </span>
              </div>
              <p className="text-xl font-black leading-tight">{plan.headline}</p>
              <p className="text-sm text-white/50 italic">{plan.tagline}</p>
              <p className="text-xs text-white/35 mt-1">{plan.treatmentNotes}</p>
            </div>
          )}

          {/* Overlay editor */}
          {plan && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1">
                Text Overlays — tap to edit
              </h3>
              {plan.overlays.map(ov => (
                <div
                  key={ov.id}
                  className="p-3 bg-white/4 border border-white/8 rounded-xl"
                >
                  {editingId === ov.id ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="flex-1 bg-white/10 border border-amber-400/40 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(ov.id); if (e.key === "Escape") setEditingId(null); }}
                      />
                      <button onClick={() => saveEdit(ov.id)} className="text-amber-400 hover:text-amber-300">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-white/30 hover:text-white/60">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{ov.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-white/30">
                            {(ov.startMs / 1000).toFixed(1)}s – {((ov.startMs + ov.durationMs) / 1000).toFixed(1)}s
                          </span>
                          <span className="text-[10px] bg-white/6 text-white/35 px-1.5 py-0.5 rounded-full">
                            {ov.style}
                          </span>
                          <span className="text-[10px] bg-white/6 text-white/35 px-1.5 py-0.5 rounded-full">
                            {ov.position}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => startEdit(ov)}
                        className="text-white/25 hover:text-amber-400 shrink-0 mt-0.5"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}

                  {/* Timeline strip */}
                  <div className="mt-2 h-1 bg-white/6 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400/60 rounded-full"
                      style={{
                        marginLeft: `${(ov.startMs / CLIP_MS) * 100}%`,
                        width: `${(ov.durationMs / CLIP_MS) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Export + Publish */}
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
                disabled={isRecording || isPlaying || !imgRef.current}
                className="w-full py-4 bg-amber-400 text-black font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRecording ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Recording 7-second clip…
                  </>
                ) : (
                  <>
                    <Download size={18} /> Export & Download
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
