import { useState, useCallback } from "react";
import { Sun, Contrast, Droplets, Thermometer } from "lucide-react";

export interface FilterSettings {
  preset: string;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  shadowEnabled: boolean;
  shadowType: "soft" | "hard" | "glow";
  shadowAngle: number;
  shadowDistance: number;
  shadowBlur: number;
  shadowOpacity: number;
}

const DEFAULT_SETTINGS: FilterSettings = {
  preset: "original",
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  shadowEnabled: false,
  shadowType: "soft",
  shadowAngle: 45,
  shadowDistance: 10,
  shadowBlur: 15,
  shadowOpacity: 60,
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

function buildFilterString(s: FilterSettings): string {
  const preset = PRESETS[s.preset]?.css ?? "";
  const adjustments = [
    s.brightness !== 100 ? `brightness(${s.brightness / 100})` : "",
    s.contrast   !== 100 ? `contrast(${s.contrast / 100})`     : "",
    s.saturation !== 100 ? `saturate(${s.saturation / 100})`   : "",
    s.warmth     !== 0   ? `hue-rotate(${s.warmth}deg) sepia(${Math.abs(s.warmth) * 0.003})` : "",
  ].filter(Boolean).join(" ");

  let shadow = "";
  if (s.shadowEnabled) {
    const rad = (s.shadowAngle * Math.PI) / 180;
    const x   = Math.round(s.shadowDistance * Math.cos(rad));
    const y   = Math.round(s.shadowDistance * Math.sin(rad));
    const op  = (s.shadowOpacity / 100).toFixed(2);
    if (s.shadowType === "hard") {
      shadow = `drop-shadow(${x}px ${y}px 0px rgba(0,0,0,${op}))`;
    } else if (s.shadowType === "glow") {
      const b1 = s.shadowBlur * 2;
      const b2 = s.shadowBlur;
      const op2 = (s.shadowOpacity * 0.5 / 100).toFixed(2);
      shadow = `drop-shadow(0px 0px ${b1}px rgba(0,0,0,${op})) drop-shadow(0px 0px ${b2}px rgba(0,0,0,${op2}))`;
    } else {
      shadow = `drop-shadow(${x}px ${y}px ${s.shadowBlur}px rgba(0,0,0,${op}))`;
    }
  }

  return [preset, adjustments, shadow].filter(Boolean).join(" ").trim();
}

const COMPASS = [
  { label: "↖", angle: 225 }, { label: "↑", angle: 270 }, { label: "↗", angle: 315 },
  { label: "←", angle: 180 }, { label: null, angle: null }, { label: "→", angle: 0   },
  { label: "↙", angle: 135 }, { label: "↓", angle: 90  }, { label: "↘", angle: 45  },
] as const;

function SliderRow({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-xs text-stone-500">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-amber-400"
      />
      <span className="w-7 text-right text-xs tabular-nums text-stone-500">{value}</span>
    </div>
  );
}

interface Props {
  previewUrl: string;
  onChange: (settings: FilterSettings, filterCss: string) => void;
}

export default function ImageEditor({ previewUrl, onChange }: Props) {
  const [settings, setSettings] = useState<FilterSettings>(DEFAULT_SETTINGS);

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
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-stone-950">
        <img
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
                <div className={`h-14 w-14 overflow-hidden rounded-lg border-2 transition-all ${active ? "border-amber-400 ring-2 ring-amber-400/40" : "border-transparent"}`}>
                  <img src={previewUrl} alt={label} className="h-full w-full object-cover" style={{ filter: css || undefined }} />
                </div>
                <span className={`text-[10px] font-medium ${active ? "text-amber-400" : "text-stone-400"}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Adjustment sliders */}
      <div className="space-y-3 rounded-xl border border-white/10 bg-stone-900/60 p-4">
        {[
          { key: "brightness" as const, label: "Brightness", Icon: Sun,         min: 50,  max: 150 },
          { key: "contrast"   as const, label: "Contrast",   Icon: Contrast,    min: 50,  max: 150 },
          { key: "saturation" as const, label: "Saturation", Icon: Droplets,    min: 0,   max: 200 },
          { key: "warmth"     as const, label: "Warmth",     Icon: Thermometer, min: -30, max: 30  },
        ].map(({ key, label, Icon, min, max }) => {
          const val        = settings[key];
          const defaultVal = key === "warmth" ? 0 : 100;
          const changed    = val !== defaultVal;
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

      {/* Shadow section */}
      <div className="rounded-xl border border-white/10 bg-stone-900/60 p-4 space-y-4">
        {/* Header + toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-full bg-stone-800 ring-1 ring-stone-600"
              style={{ boxShadow: "3px 3px 0 rgba(0,0,0,0.8)" }}
            />
            <span className="text-xs font-medium text-stone-300">Shadow</span>
          </div>
          <button
            type="button"
            onClick={() => update({ shadowEnabled: !settings.shadowEnabled })}
            className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${settings.shadowEnabled ? "bg-amber-500" : "bg-stone-700"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${settings.shadowEnabled ? "translate-x-[18px]" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        {settings.shadowEnabled && (
          <>
            {/* Type */}
            <div className="flex gap-1.5">
              {(["soft", "hard", "glow"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update({ shadowType: t })}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-all ${
                    settings.shadowType === t
                      ? "bg-amber-500 text-black"
                      : "bg-stone-800 text-stone-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Direction compass (hidden for glow since it's center-based) */}
            {settings.shadowType !== "glow" && (
              <div>
                <span className="mb-2 block text-xs text-stone-500">Direction</span>
                <div className="mx-auto grid w-28 grid-cols-3 gap-1">
                  {COMPASS.map(({ label, angle }, i) =>
                    label === null ? (
                      <div key={i} className="flex h-8 w-8 items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-stone-700" />
                      </div>
                    ) : (
                      <button
                        key={i}
                        type="button"
                        onClick={() => update({ shadowAngle: angle! })}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-all ${
                          settings.shadowAngle === angle
                            ? "bg-amber-500 text-black"
                            : "bg-stone-800 text-stone-400 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Numeric sliders */}
            <div className="space-y-3">
              {settings.shadowType !== "glow" && (
                <SliderRow
                  label="Distance"
                  value={settings.shadowDistance}
                  min={2}
                  max={40}
                  onChange={(v) => update({ shadowDistance: v })}
                />
              )}
              {settings.shadowType !== "hard" && (
                <SliderRow
                  label="Blur"
                  value={settings.shadowBlur}
                  min={1}
                  max={50}
                  onChange={(v) => update({ shadowBlur: v })}
                />
              )}
              <SliderRow
                label="Opacity"
                value={settings.shadowOpacity}
                min={5}
                max={100}
                onChange={(v) => update({ shadowOpacity: v })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
