import { useState, useRef } from "react";
import { Wand2, Loader2, Play, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  previewUrl: string;
  sourceFile: File | null;
  onApply: (videoUrl: string, file: File) => void;
}

const PRESETS = [
  { label: "Glass shimmer", prompt: "light refracting through glass, gentle shimmer and glow" },
  { label: "Glaze glow", prompt: "ceramic glaze catching light, subtle warm glow emanating from surface" },
  { label: "Fabric ripple", prompt: "soft fabric gently rippling in a light breeze, flowing motion" },
  { label: "Metal sheen", prompt: "metalwork surface with shifting light reflections, polished sheen" },
  { label: "Fire glow", prompt: "warm kiln fire glow pulsing softly, embers flickering" },
  { label: "Clay spin", prompt: "slow elegant rotation revealing all angles, studio lighting" },
  { label: "Water drip", prompt: "single water droplet on ceramic surface, ripple spreading outward" },
  { label: "Ambient life", prompt: "subtle natural motion, gentle ambient atmosphere coming alive" },
];

type Phase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "queued"; requestId: string }
  | { kind: "generating"; requestId: string }
  | { kind: "done"; videoUrl: string; videoFile: File }
  | { kind: "error"; message: string };

export default function AnimateTool({ previewUrl, sourceFile, onApply }: Props) {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<"5" | "10">("5");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function startPolling(requestId: string) {
    setPhase({ kind: "queued", requestId });

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/animate/${requestId}/status`, {
          credentials: "include",
        });
        const data = (await res.json()) as {
          status: string;
          videoUrl?: string;
          error?: string;
        };

        if (data.status === "IN_PROGRESS") {
          setPhase({ kind: "generating", requestId });
          return;
        }

        if (data.status === "COMPLETED" && data.videoUrl) {
          stopPolling();
          const videoRes = await fetch(data.videoUrl);
          const blob = await videoRes.blob();
          const file = new File([blob], "animated.mp4", { type: "video/mp4" });
          const objectUrl = URL.createObjectURL(blob);
          setPhase({ kind: "done", videoUrl: objectUrl, videoFile: file });
          return;
        }

        if (data.status === "FAILED") {
          stopPolling();
          setPhase({ kind: "error", message: data.error ?? "Generation failed" });
        }
      } catch {
        stopPolling();
        setPhase({ kind: "error", message: "Lost connection while polling" });
      }
    }, 3000);
  }

  async function handleAnimate() {
    const imageFile = sourceFile;
    if (!imageFile && !previewUrl) return;

    setPhase({ kind: "uploading" });

    try {
      let fileToSend: File;

      if (imageFile) {
        fileToSend = imageFile;
      } else {
        const blob = await fetch(previewUrl).then((r) => r.blob());
        fileToSend = new File([blob], "image.jpg", { type: blob.type || "image/jpeg" });
      }

      const formData = new FormData();
      formData.append("image", fileToSend);
      formData.append("prompt", prompt.trim() || "subtle natural motion, ambient life");
      formData.append("duration", duration);

      const res = await fetch("/api/animate", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = (await res.json()) as { requestId?: string; error?: string };

      if (!res.ok || !data.requestId) {
        throw new Error(data.error ?? "Failed to start animation");
      }

      await startPolling(data.requestId);
    } catch (err: unknown) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  function handleReset() {
    stopPolling();
    setPhase({ kind: "idle" });
  }

  const busy =
    phase.kind === "uploading" ||
    phase.kind === "queued" ||
    phase.kind === "generating";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Wand2 size={14} className="text-amber-400" />
        <p className="text-xs font-medium text-stone-300">Bring this image to life</p>
      </div>

      {/* Preset chips */}
      {phase.kind === "idle" && (
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPrompt(p.prompt)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all ${
                prompt === p.prompt
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                  : "border-white/10 bg-stone-900/50 text-stone-400 hover:border-amber-500/30 hover:text-stone-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Prompt input */}
      {phase.kind === "idle" && (
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the motion… or pick a preset above"
          rows={2}
          className="w-full resize-none rounded-xl border border-white/10 bg-stone-900/60 px-3 py-2.5 text-xs text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/40"
        />
      )}

      {/* Duration toggle */}
      {phase.kind === "idle" && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-stone-500">Duration</span>
          <div className="flex gap-0.5 rounded-lg border border-white/8 bg-stone-900/60 p-0.5">
            {(["5", "10"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`rounded-md px-3 py-1 text-[10px] font-medium transition-all ${
                  duration === d
                    ? "bg-stone-700 text-white shadow-sm"
                    : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Animate button */}
      {phase.kind === "idle" && (
        <button
          type="button"
          onClick={handleAnimate}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-amber-500 hover:to-orange-500 active:scale-95"
        >
          <Wand2 size={14} />
          Animate
        </button>
      )}

      {/* Progress states */}
      {busy && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/8 bg-stone-900/60 py-8">
          <Loader2 size={28} className="animate-spin text-amber-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-stone-200">
              {phase.kind === "uploading"
                ? "Uploading image…"
                : phase.kind === "queued"
                ? "In queue…"
                : "Generating animation…"}
            </p>
            <p className="mt-1 text-[10px] text-stone-500">
              {phase.kind === "generating"
                ? "Kling AI is rendering your clip — usually 20–40s"
                : "This only takes a moment"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-[10px] text-stone-600 underline hover:text-stone-400"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Done state */}
      {phase.kind === "done" && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              src={phase.videoUrl}
              controls
              loop
              className="h-auto w-full"
            />
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              <CheckCircle2 size={10} />
              Ready
            </div>
          </div>
          <button
            type="button"
            onClick={() => onApply(phase.videoUrl, phase.videoFile)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-green-500 hover:to-emerald-500 active:scale-95"
          >
            <Play size={14} />
            Use this animation
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-xl border border-white/8 py-2 text-xs text-stone-500 hover:text-stone-300 transition-colors"
          >
            Try again with different settings
          </button>
        </div>
      )}

      {/* Error state */}
      {phase.kind === "error" && (
        <div className="space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
            <p className="text-xs text-red-300">{phase.message}</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-xl border border-white/8 py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
