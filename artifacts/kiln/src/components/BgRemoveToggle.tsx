import { useState, useEffect, useRef } from "react";
import { Wand2, Check, AlertCircle } from "lucide-react";
import { useBgRemove, type BgColor } from "@/hooks/useBgRemove";

interface Props {
  sourceFile: File | null;
  onResult: (url: string, file: File) => void;
  onReset: () => void;
}

export default function BgRemoveToggle({ sourceFile, onResult, onReset }: Props) {
  const { removeBackground, processing, error } = useBgRemove();
  const [enabled, setEnabled] = useState(false);
  const [bgColor, setBgColor] = useState<BgColor>("white");
  const [done, setDone] = useState(false);
  const prevFileRef = useRef<File | null>(null);
  const prevBgRef = useRef<BgColor>("white");

  useEffect(() => {
    if (!enabled) return;
    if (!sourceFile) return;
    if (sourceFile === prevFileRef.current && bgColor === prevBgRef.current && done) return;
    prevFileRef.current = sourceFile;
    prevBgRef.current = bgColor;
    setDone(false);
    removeBackground(sourceFile, bgColor)
      .then(({ url, file }) => {
        onResult(url, file);
        setDone(true);
      })
      .catch(() => {});
  }, [enabled, bgColor, sourceFile]);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    setDone(false);
    if (!next) {
      onReset();
      prevFileRef.current = null;
    }
  }

  if (!sourceFile) return null;

  return (
    <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/25">
            <Wand2 size={13} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-200 leading-none">Remove Background</p>
            <p className="text-xs text-stone-500 mt-0.5">Place on a clean studio backdrop</p>
          </div>
          {done && !processing && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              <Check size={9} /> Done
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={processing}
          className={`relative h-6 w-11 rounded-full transition-colors duration-200 disabled:opacity-50 ${
            enabled ? "bg-amber-500" : "bg-stone-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBgColor("white")}
              disabled={processing}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium transition-all disabled:opacity-50 ${
                bgColor === "white"
                  ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                  : "border-white/8 bg-stone-800/40 text-stone-500 hover:border-white/15"
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full border border-stone-400 bg-white inline-block shrink-0" />
              White
            </button>
            <button
              type="button"
              onClick={() => setBgColor("charcoal")}
              disabled={processing}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium transition-all disabled:opacity-50 ${
                bgColor === "charcoal"
                  ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                  : "border-white/8 bg-stone-800/40 text-stone-500 hover:border-white/15"
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full border border-stone-600 bg-[#1c1a18] inline-block shrink-0" />
              Charcoal
            </button>
          </div>

          {processing && (
            <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2.5">
              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <p className="text-xs text-amber-300">
                Removing background — takes a few seconds on first use…
              </p>
            </div>
          )}

          {error && !processing && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5">
              <AlertCircle size={13} className="text-rose-400 shrink-0" />
              <p className="text-xs text-rose-300">Couldn't remove background — original photo will be used.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
