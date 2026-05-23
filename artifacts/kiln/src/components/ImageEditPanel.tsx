import { useState } from "react";
import ImageEditor, { type FilterSettings } from "@/components/ImageEditor";
import CropTool from "@/components/CropTool";
import BgRemoveToggle from "@/components/BgRemoveToggle";
import WatermarkTool from "@/components/WatermarkTool";
import TiltShiftTool from "@/components/TiltShiftTool";

type Tab = "adjust" | "crop" | "bg" | "mark" | "tilt";

interface Props {
  previewUrl: string;
  sourceFile: File | null;
  onFilterChange: (settings: FilterSettings, css: string) => void;
  onCrop:        (url: string, file: File) => void;
  onBgResult:    (url: string, file: File) => void;
  onBgReset:     () => void;
  onWatermark?:  (url: string, file: File) => void;
  onTiltShift?:  (url: string, file: File) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "adjust", label: "Adjust" },
  { id: "crop",   label: "Crop"   },
  { id: "bg",     label: "BG"     },
  { id: "mark",   label: "Mark"   },
  { id: "tilt",   label: "Tilt"   },
];

export default function ImageEditPanel({
  previewUrl,
  sourceFile,
  onFilterChange,
  onCrop,
  onBgResult,
  onBgReset,
  onWatermark,
  onTiltShift,
}: Props) {
  const [tab,      setTab]      = useState<Tab>("adjust");
  const [showCrop, setShowCrop] = useState(false);

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-0.5 rounded-xl border border-white/8 bg-stone-900/60 p-1">
        {TABS.map(({ id, label }) => (
          <button key={id} type="button"
            onClick={() => { setTab(id); if (id !== "crop") setShowCrop(false); }}
            className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium transition-all ${
              tab === id ? "bg-stone-700 text-white shadow-sm" : "text-stone-500 hover:text-stone-300"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "adjust" && (
        <ImageEditor previewUrl={previewUrl} onChange={onFilterChange} />
      )}

      {tab === "crop" && !showCrop && (
        <button type="button" onClick={() => setShowCrop(true)}
          className="w-full rounded-xl border border-dashed border-white/10 bg-stone-900/40 py-8 text-sm text-stone-500 hover:border-amber-500/30 hover:text-stone-400 transition-all">
          Open crop &amp; letterbox tool →
        </button>
      )}
      {tab === "crop" && showCrop && (
        <CropTool
          src={previewUrl}
          onApply={(url, file) => { onCrop(url, file); setShowCrop(false); }}
          onCancel={() => setShowCrop(false)}
        />
      )}

      {tab === "bg" && (
        <BgRemoveToggle sourceFile={sourceFile} onResult={onBgResult} onReset={onBgReset} />
      )}

      {tab === "mark" && onWatermark && (
        <WatermarkTool
          previewUrl={previewUrl}
          onApply={(url, file) => { onWatermark(url, file); setTab("adjust"); }}
        />
      )}
      {tab === "mark" && !onWatermark && (
        <p className="rounded-xl border border-white/8 bg-stone-900/40 p-4 text-center text-sm text-stone-500">
          Watermark not available here
        </p>
      )}

      {tab === "tilt" && onTiltShift && (
        <TiltShiftTool
          previewUrl={previewUrl}
          onApply={(url, file) => { onTiltShift(url, file); setTab("adjust"); }}
        />
      )}
      {tab === "tilt" && !onTiltShift && (
        <p className="rounded-xl border border-white/8 bg-stone-900/40 p-4 text-center text-sm text-stone-500">
          Tilt-shift not available here
        </p>
      )}
    </div>
  );
}
