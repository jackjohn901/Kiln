import { useState, useCallback, useEffect, useRef } from "react";
import { Sun, Contrast, Droplets, Thermometer } from "lucide-react";

export interface FilterSettings {
  preset: string;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  sharpness: number;
  vignetteStrength: number;
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
  sharpness: 0,
  vignetteStrength: 0,
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
    s.warmth !== 0 ? `hue-rotate(${s.warmth}deg) sepia(${Math.abs(s.warmth) * 0.003})` : "",
  ].filter(Boolean).join(" ");

  let shadow = "";
  if (s.shadowEnabled) {
    const rad = (s.shadowAngle * Math.PI) / 180;
    const x  = Math.round(s.shadowDistance * Math.cos(rad));
    const y  = Math.round(s.shadowDistance * Math.sin(rad));
    const op = (s.shadowOpacity / 100).toFixed(2);
    if (s.shadowType === "hard") {
      shadow = `drop-shadow(${x}px ${y}px 0px rgba(0,0,0,${op}))`;
    } else if (s.shadowType === "glow") {
      const op2 = (s.shadowOpacity * 0.5 / 100).toFixed(2);
      shadow = `drop-shadow(0px 0px ${s.shadowBlur * 2}px rgba(0,0,0,${op})) drop-shadow(0px 0px ${s.shadowBlur}px rgba(0,0,0,${op2}))`;
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

function SliderRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-xs text-stone-500">{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-amber-400" />
      <span className="w-7 text-right text-xs tabular-nums text-stone-500">{value}</span>
    </div>
  );
}

function extractPalette(src: string, cb: (colors: string[]) => void) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const c = document.createElement("canvas");
      c.width = 80; c.height = 80;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 80, 80);
      const data = ctx.getImageData(0, 0, 80, 80).data;
      const freq: Record<string, number> = {};
      for (let i = 0; i < data.length; i += 16) {
        if (data[i + 3] < 128) continue;
        const r = Math.round(data[i]     / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        freq[hex] = (freq[hex] || 0) + 1;
      }
      cb(Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([h]) => h));
    } catch { cb([]); }
  };
  img.src = src;
}

interface Props {
  previewUrl: string;
  onChange: (settings: FilterSettings, filterCss: string) => void;
}

export default function ImageEditor({ previewUrl, onChange }: Props) {
  const [settings, setSettings] = useState<FilterSettings>(DEFAULT_SETTINGS);
  const [palette, setPalette]   = useState<string[]>([]);
  const [copied, setCopied]     = useState("");
  const svgId = useRef(`kiln-sharpen-${Math.random().toString(36).slice(2, 7)}`).current;

  useEffect(() => { extractPalette(previewUrl, setPalette); }, [previewUrl]);

  const update = useCallback(
    (next: Partial<FilterSettings>) => {
      const merged = { ...settings, ...next };
      setSettings(merged);
      onChange(merged, buildFilterString(merged));
    },
    [settings, onChange],
  );

  const stdFilter = buildFilterString(settings);
  const t = settings.sharpness / 100;
  const sharpKernel = `0 ${(-t).toFixed(3)} 0 ${(-t).toFixed(3)} ${(1 + 4 * t).toFixed(3)} ${(-t).toFixed(3)} 0 ${(-t).toFixed(3)} 0`;
  const fullFilter = [settings.sharpness > 0 ? `url(#${svgId})` : "", stdFilter].filter(Boolean).join(" ").trim() || undefined;

  const vigOpacity = settings.vignetteStrength / 100 * 0.82;
  const vigStart   = 65 - settings.vignetteStrength * 0.32;

  function copyHex(hex: string) {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopied(hex);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden SVG filter defs */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
        <defs>
          <filter id={svgId} colorInterpolationFilters="sRGB">
            <feConvolveMatrix order="3" kernelMatrix={sharpKernel} divisor="1" preserveAlpha="true" />
          </filter>
        </defs>
      </svg>

      {/* Preview */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-stone-950">
        <img src={previewUrl} alt="Preview"
          className="h-full w-full object-cover transition-all duration-200"
          style={{ filter: fullFilter }} />
        {settings.vignetteStrength > 0 && (
          <div className="absolute inset-0 pointer-events-none rounded-xl"
            style={{ background: `radial-gradient(ellipse at center, transparent ${vigStart}%, rgba(0,0,0,${vigOpacity.toFixed(2)}) 100%)` }} />
        )}
      </div>

      {/* Filter presets */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2" style={{ width: "max-content" }}>
          {Object.entries(PRESETS).map(([key, { label, css }]) => {
            const active = settings.preset === key;
            return (
              <button key={key} onClick={() => update({ preset: key })} className="flex flex-col items-center gap-1.5">
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
        {([
          { key: "brightness" as const, label: "Brightness", Icon: Sun,         min: 50,  max: 150 },
          { key: "contrast"   as const, label: "Contrast",   Icon: Contrast,    min: 50,  max: 150 },
          { key: "saturation" as const, label: "Saturation", Icon: Droplets,    min: 0,   max: 200 },
          { key: "warmth"     as const, label: "Warmth",     Icon: Thermometer, min: -30, max: 30  },
        ] as const).map(({ key, label, Icon, min, max }) => {
          const val = settings[key];
          const def = key === "warmth" ? 0 : 100;
          return (
            <div key={key} className="flex items-center gap-3">
              <Icon size={15} className={val !== def ? "text-amber-400" : "text-stone-500"} />
              <span className="w-20 text-xs text-stone-400">{label}</span>
              <input type="range" min={min} max={max} value={val}
                onChange={(e) => update({ [key]: Number(e.target.value) })} className="flex-1 accent-amber-400" />
              <button onClick={() => update({ [key]: def })}
                className={`w-8 text-right text-xs tabular-nums transition-colors ${val !== def ? "text-amber-400 hover:text-amber-300" : "text-stone-600"}`}>
                {key === "warmth" ? (val > 0 ? `+${val}` : val) : val}
              </button>
            </div>
          );
        })}
      </div>

      {/* Sharpen */}
      <div className="rounded-xl border border-white/10 bg-stone-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-300">Sharpen / Clarity</span>
          {settings.sharpness > 0 && (
            <button onClick={() => update({ sharpness: 0 })} className="text-[10px] text-stone-500 hover:text-stone-300">Reset</button>
          )}
        </div>
        <input type="range" min={0} max={100} value={settings.sharpness}
          onChange={(e) => update({ sharpness: Number(e.target.value) })} className="w-full accent-amber-400" />
        <div className="flex justify-between text-[10px] text-stone-600">
          <span>None</span><span>Soft</span><span>Medium</span><span>Sharp</span><span>Crisp</span>
        </div>
      </div>

      {/* Vignette */}
      <div className="rounded-xl border border-white/10 bg-stone-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-300">Vignette</span>
          {settings.vignetteStrength > 0 && (
            <button onClick={() => update({ vignetteStrength: 0 })} className="text-[10px] text-stone-500 hover:text-stone-300">Reset</button>
          )}
        </div>
        <input type="range" min={0} max={100} value={settings.vignetteStrength}
          onChange={(e) => update({ vignetteStrength: Number(e.target.value) })} className="w-full accent-amber-400" />
        <div className="flex justify-between text-[10px] text-stone-600">
          <span>None</span><span>Subtle</span><span>Medium</span><span>Strong</span><span>Dramatic</span>
        </div>
      </div>

      {/* Shadow */}
      <div className="rounded-xl border border-white/10 bg-stone-900/60 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-stone-800 ring-1 ring-stone-600" style={{ boxShadow: "3px 3px 0 rgba(0,0,0,0.8)" }} />
            <span className="text-xs font-medium text-stone-300">Shadow</span>
          </div>
          <button type="button" onClick={() => update({ shadowEnabled: !settings.shadowEnabled })}
            className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${settings.shadowEnabled ? "bg-amber-500" : "bg-stone-700"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${settings.shadowEnabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
          </button>
        </div>
        {settings.shadowEnabled && (
          <>
            <div className="flex gap-1.5">
              {(["soft", "hard", "glow"] as const).map((t) => (
                <button key={t} type="button" onClick={() => update({ shadowType: t })}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-all ${settings.shadowType === t ? "bg-amber-500 text-black" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
                  {t}
                </button>
              ))}
            </div>
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
                      <button key={i} type="button" onClick={() => update({ shadowAngle: angle! })}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-all ${settings.shadowAngle === angle ? "bg-amber-500 text-black" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {settings.shadowType !== "glow" && (
                <SliderRow label="Distance" value={settings.shadowDistance} min={2} max={40} onChange={(v) => update({ shadowDistance: v })} />
              )}
              {settings.shadowType !== "hard" && (
                <SliderRow label="Blur" value={settings.shadowBlur} min={1} max={50} onChange={(v) => update({ shadowBlur: v })} />
              )}
              <SliderRow label="Opacity" value={settings.shadowOpacity} min={5} max={100} onChange={(v) => update({ shadowOpacity: v })} />
            </div>
          </>
        )}
      </div>

      {/* Color palette */}
      {palette.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-stone-900/60 p-4 space-y-3">
          <span className="text-xs font-medium text-stone-300">Color Palette</span>
          <div className="flex gap-2 flex-wrap">
            {palette.map((hex) => (
              <button key={hex} onClick={() => copyHex(hex)} title={hex}
                className="group relative flex flex-col items-center gap-1">
                <div className="h-9 w-9 rounded-full border-2 border-white/10 shadow-sm transition-transform group-hover:scale-110"
                  style={{ backgroundColor: hex }} />
                <span className="text-[9px] tabular-nums text-stone-600 group-hover:text-stone-400 transition-colors">
                  {copied === hex ? "✓" : hex.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-stone-600">Tap a swatch to copy its hex code</p>
        </div>
      )}
    </div>
  );
}
