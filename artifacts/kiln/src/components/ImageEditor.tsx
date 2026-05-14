import { useState, useRef, useCallback } from "react";
import { Sun, Contrast, Droplets, Thermometer } from "lucide-react";

export interface FilterSettings {
  preset: string;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

const DEFAULT_SETTINGS: FilterSettings = {
  preset: "original",
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
};

export const PRESETS: Record<string, { label: string; css: string }> = {
  original: { label: "Original", css: "" },
  warm:     { label: "Warm",     css: "sepia(0.18) saturate(1.35) brightness(1.06)" },
  cool:     { label: "Cool",     css: "hue-rotate(20deg) saturate(0.88) brightness(1.02)" },
  vivid:    { label: "Vivid",    css: "saturate(1.75) contrast(1.08)" },
  fade:     { label: "Fade",     css: "brightness(1.12) contrast(0.82) saturate(0.72)" },
  bw:       { label: "B&W",      css: "grayscale(1)" },
  studio:   { label: "Studio",   css: "contrast(1.18) brightness(0.94) saturate(1.2)" },
  golden:   { label: "Golden",   css: "sepia(0.32) saturate(1.55) brightness(1.04) hue-rotate(-8deg)" },
  mist:     { label: "Mist",     css: "brightness(1.18) contrast(0.78) saturate(0.62) hue-rotate(5deg)" },
  film:     { label: "Film",     css: "contrast(1.12) brightness(0.88) saturate(0.88) sepia(0.08)" },
};

function buildFilterString(settings: FilterSettings): string {
  const preset = PRESETS[settings.preset]?.css ?? "";
  const adjustments = [
    settings.brightness !== 100 ? `brightness(${settings.brightness / 100})` : "",
    settings.contrast !== 100 ? `contrast(${settings.contrast / 100})` : "",
    settings.saturation !== 100 ? `saturate(${settings.saturation / 100})` : "",
    settings.warmth !== 0 ? `hue-rotate(${settings.warmth}deg) sepia(${Math.abs(settings.warmth) * 0.003})` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [preset, adjustments].filter(Boolean).join(" ").trim();
}

interface Props {
  previewUrl: string;
  onChange: (settings: FilterSettings, filterCss: string) => void;
}

export default function ImageEditor({ previewUrl, onChange }: Props) {
  const [settings, setSettings] = useState<FilterSettings>(DEFAULT_SETTINGS);
  const imgRef = useRef<HTMLImageElement>(null);

  const update = useCallback(
    (next: Partial<FilterSettings>) => {
      const merged = { ...settings, ...next };
      setSettings(merged);
      onChange(merged, buildFilterString(merged));
    },
    [settings, onChange],
  );

  const filterCss = buildFilterString(settings);

  return (
    <div className="flex flex-col gap-4">
      {/* Preview */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
        <img
          ref={imgRef}
          src={previewUrl}
          alt="Preview"
          className="h-full w-full object-cover transition-all duration-200"
          style={{ filter: filterCss || undefined }}
        />
      </div>

      {/* Filter presets */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2" style={{ width: "max-content" }}>
          {Object.entries(PRESETS).map(([key, { label, css }]) => {
            const active = settings.preset === key;
            return (
              <button
                key={key}
                onClick={() => update({ preset: key })}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`h-14 w-14 overflow-hidden rounded-lg border-2 transition-all ${
                    active
                      ? "border-amber-400 ring-2 ring-amber-400/40"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={previewUrl}
                    alt={label}
                    className="h-full w-full object-cover"
                    style={{ filter: css || undefined }}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium ${active ? "text-amber-400" : "text-stone-400"}`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Adjustment sliders */}
      <div className="space-y-3 rounded-xl border border-white/10 bg-stone-900/60 p-4">
        {[
          { key: "brightness" as const, label: "Brightness", Icon: Sun, min: 50, max: 150 },
          { key: "contrast" as const, label: "Contrast", Icon: Contrast, min: 50, max: 150 },
          { key: "saturation" as const, label: "Saturation", Icon: Droplets, min: 0, max: 200 },
          { key: "warmth" as const, label: "Warmth", Icon: Thermometer, min: -30, max: 30 },
        ].map(({ key, label, Icon, min, max }) => {
          const val = settings[key];
          const defaultVal = key === "warmth" ? 0 : 100;
          const changed = val !== defaultVal;
          return (
            <div key={key} className="flex items-center gap-3">
              <Icon size={15} className={changed ? "text-amber-400" : "text-stone-500"} />
              <span className="w-20 text-xs text-stone-400">{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                value={val}
                onChange={(e) => update({ [key]: Number(e.target.value) })}
                className="flex-1 accent-amber-400"
              />
              <button
                onClick={() => update({ [key]: defaultVal })}
                className={`w-8 text-right text-xs tabular-nums transition-colors ${changed ? "text-amber-400 hover:text-amber-300" : "text-stone-600"}`}
              >
                {key === "warmth" ? (val > 0 ? `+${val}` : val) : val}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
