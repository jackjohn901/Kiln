import { useState } from "react";
import { Wand2, Check } from "lucide-react";

const CERAMIC_URL =
  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80";

export function WhiteBackground() {
  const [enabled, setEnabled] = useState(true);
  const [bg, setBg] = useState<"white" | "charcoal">("white");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  function toggle() {
    if (enabled) {
      setEnabled(false);
      setDone(false);
      return;
    }
    setEnabled(true);
    setProcessing(true);
    setDone(false);
    setTimeout(() => {
      setProcessing(false);
      setDone(true);
    }, 1400);
  }

  const bgStyle = !enabled
    ? "bg-transparent"
    : bg === "white"
    ? "bg-white"
    : "bg-[#1c1a18]";

  const shadowClass =
    enabled
      ? "drop-shadow-[0_18px_28px_rgba(0,0,0,0.28)]"
      : "";

  return (
    <div className="min-h-screen bg-[#12100e] flex items-center justify-center p-6">
      <div className="w-[360px] space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Wand2 size={13} className="text-amber-400" />
          </div>
          <span className="text-sm font-semibold text-amber-100">Background Removal</span>
          <span className="ml-auto text-[10px] text-stone-600 uppercase tracking-widest">new</span>
        </div>

        {/* Image Preview Card */}
        <div
          className={`relative w-full rounded-2xl overflow-hidden transition-all duration-300 ${bgStyle}`}
          style={{ aspectRatio: "4/5" }}
        >
          <img
            src={CERAMIC_URL}
            alt="Ceramic piece"
            className={`w-full h-full object-cover transition-all duration-500 ${enabled ? "mix-blend-multiply opacity-100" : "opacity-100"} ${shadowClass}`}
            style={enabled ? { mixBlendMode: bg === "white" ? "multiply" : "normal", opacity: 1 } : {}}
          />
          {/* Shadow overlay at base */}
          {enabled && (
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full pointer-events-none"
              style={{
                background: bg === "white"
                  ? "radial-gradient(ellipse, rgba(0,0,0,0.22) 0%, transparent 75%)"
                  : "radial-gradient(ellipse, rgba(0,0,0,0.45) 0%, transparent 75%)",
                filter: "blur(6px)",
              }}
            />
          )}

          {/* Processing overlay */}
          {processing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span className="text-xs text-amber-300 font-medium">Removing background…</span>
            </div>
          )}

          {/* Done badge */}
          {done && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white">
              <Check size={11} />
              Done
            </div>
          )}
        </div>

        {/* Toggle row */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-200">Remove Background</p>
              <p className="text-xs text-stone-500 mt-0.5">Place piece on a clean studio backdrop</p>
            </div>
            <button
              onClick={toggle}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${enabled ? "bg-amber-500" : "bg-stone-700"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </div>

          {/* Background colour selector */}
          {enabled && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setBg("white")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium transition-all ${
                  bg === "white"
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                    : "border-white/8 bg-stone-800/40 text-stone-500 hover:border-white/15"
                }`}
              >
                <span className="h-3.5 w-3.5 rounded-full border border-stone-400 bg-white inline-block" />
                White
              </button>
              <button
                onClick={() => setBg("charcoal")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium transition-all ${
                  bg === "charcoal"
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                    : "border-white/8 bg-stone-800/40 text-stone-500 hover:border-white/15"
                }`}
              >
                <span className="h-3.5 w-3.5 rounded-full border border-stone-600 bg-[#1c1a18] inline-block" />
                Charcoal
              </button>
            </div>
          )}
        </div>

        {/* Continue button */}
        <button className="w-full rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
          Continue →
        </button>
      </div>
    </div>
  );
}
