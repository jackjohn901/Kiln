import { useState } from "react";
import ImageEditor, { type FilterSettings } from "@/components/ImageEditor";
import CropTool from "@/components/CropTool";
import BgRemoveToggle from "@/components/BgRemoveToggle";
import WatermarkTool from "@/components/WatermarkTool";

type Tab = "adjust" | "crop" | "background" | "watermark";

interface Props {
  previewUrl: string;
  sourceFile: File | null;
  onFilterChange: (settings: FilterSettings, css: string) => void;
  onCrop: (url: string, file: File) => void;
  onBgResult: (url: string, file: File) => void;
  onBgReset: () => void;
  onWatermark?: (url: string, file: File) => void;
}

export default function ImageEditPanel({
  previewUrl,
  sourceFile,
  onFilterChange,
  onCrop,
  onBgResult,
  onBgReset,
  onWatermark,
}: Props) {
  const [tab,      setTab]      = useState<Tab>("adjust");
  const [showCrop, setShowCrop] = useState(false);

  const TABS: { id: Tab; label: string }[] = [
    { id: "adjust",     label: "Adjust"     },
    { id: "crop",       label: "Crop"       },
    { id: "background", label: "BG"         },
    { id: "watermark",  label: "Watermark"  },
  ];

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-0.5 rounded-xl border border-white/8 bg-stone-900/60 p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); if (id !== "crop") setShowCrop(false); }}
            className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all ${
              tab === id
                ? "bg-stone-700 text-white shadow-sm"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
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

      {tab === "background" && (
        <BgRemoveToggle
          sourceFile={sourceFile}
          onResult={onBgResult}
          onReset={onBgReset}
        />
      )}

      {tab === "watermark" && onWatermark && (
        <WatermarkTool
          previewUrl={previewUrl}
          onApply={(url, file) => { onWatermark(url, file); setTab("adjust"); }}
        />
      )}

      {tab === "watermark" && !onWatermark && (
        <p className="rounded-xl border border-white/8 bg-stone-900/40 p-4 text-center text-sm text-stone-500">
          Watermark not available here
        </p>
      )}
    </div>
  );
}
