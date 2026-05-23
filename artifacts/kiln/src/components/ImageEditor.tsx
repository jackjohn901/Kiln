import { useReducer, useEffect, useRef, useCallback, useState } from "react";
import { Sun, Contrast, Droplets, Thermometer, Undo2, RotateCcw } from "lucide-react";

export interface FilterSettings {
  preset: string;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  tint: number;
  highlights: number;
  shadows: number;
  blacks: number;
  sharpness: number;
  vignetteStrength: number;
  shadowEnabled: boolean;
  shadowType: "soft" | "hard" | "glow";
  shadowAngle: number;
  shadowDistance: number;
  shadowBlur: number;
  shadowOpacity: number;
}

export const DEFAULT_SETTINGS: FilterSettings = {
  preset: "original",
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  blacks: 0,
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

/* ─── Tone curve ────────────────────────────────────────────────── */
function computeToneCurve(bl: number, sh: number, hl: number): string {
  return Array.from({ length: 11 }, (_, i) => {
    let v = i / 10;
    // Black point lift (+) / crush (-)
    if (bl !== 0) v += (bl / 50) * 0.17 * (1 - v);
    // Shadow lift (+) / crush (−) — lower tones only
    if (sh !== 0) v += (sh / 50) * 0.17 * Math.max(0, 1 - v * 2.5);
    // Highlight boost (+) / recovery (−) — upper tones only
    if (hl !== 0) v += (hl / 50) * 0.14 * Math.max(0, (v - 0.4) / 0.6);
    return Math.max(0, Math.min(1, v)).toFixed(3);
  }).join(" ");
}

/* ─── CSS filter builder ────────────────────────────────────────── */
function buildFilterString(s: FilterSettings): string {
  const preset = PRESETS[s.preset]?.css ?? "";
  const adj = [
    s.brightness !== 100                ? `brightness(${s.brightness / 100})`          : "",
    s.contrast   !== 100                ? `contrast(${s.contrast / 100})`               : "",
    s.saturation !== 100                ? `saturate(${s.saturation / 100})`             : "",
    s.warmth     !== 0                  ? `hue-rotate(${s.warmth}deg) sepia(${Math.abs(s.warmth) * 0.003})` : "",
    s.tint       !== 0                  ? `hue-rotate(${-s.tint * 1.2}deg)`             : "",
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
      const op2 = (s.shadowOpacity * 0.5 / 100).toFixed(2);
      shadow = `drop-shadow(0 0 ${s.shadowBlur * 2}px rgba(0,0,0,${op})) drop-shadow(0 0 ${s.shadowBlur}px rgba(0,0,0,${op2}))`;
    } else {
      shadow = `drop-shadow(${x}px ${y}px ${s.shadowBlur}px rgba(0,0,0,${op}))`;
    }
  }
  return [preset, adj, shadow].filter(Boolean).join(" ").trim();
}

/* ─── Undo reducer ──────────────────────────────────────────────── */
interface EditorState {
  current: FilterSettings;
  history: FilterSettings[];
  histIdx: number;
}
type EditorAction =
  | { type: "update"; next: Partial<FilterSettings> }
  | { type: "undo" }
  | { type: "reset" };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "update") {
    const merged = { ...state.current, ...action.next };
    const trimmed = [...state.history.slice(0, state.histIdx + 1), merged];
    const history = trimmed.length > 20 ? trimmed.slice(-20) : trimmed;
    return { current: merged, history, histIdx: history.length - 1 };
  }
  if (action.type === "undo") {
    if (state.histIdx <= 0) return state;
    const histIdx = state.histIdx - 1;
    return { ...state, current: state.history[histIdx], histIdx };
  }
  if (action.type === "reset") {
    return { current: DEFAULT_SETTINGS, history: [DEFAULT_SETTINGS], histIdx: 0 };
  }
  return state;
}

const INITIAL_STATE: EditorState = {
  current: DEFAULT_SETTINGS,
  history: [DEFAULT_SETTINGS],
  histIdx: 0,
};

/* ─── Compass ───────────────────────────────────────────────────── */
const COMPASS = [
  { label: "↖", angle: 225 }, { label: "↑", angle: 270 }, { label: "↗", angle: 315 },
  { label: "←", angle: 180 }, { label: null,  angle: null }, { label: "→", angle: 0   },
  { label: "↙", angle: 135 }, { label: "↓", angle: 90   }, { label: "↘", angle: 45   },
] as const;

/* ─── Colour palette extractor ──────────────────────────────────── */
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

/* ─── Shared slider row ─────────────────────────────────────────── */
function SliderRow({ label, value, min, max, def, fmt, onChange }: {
  label: string; value: number; min: number; max: number;
  def: number; fmt?: (v: number) => string; onChange: (v: number) => void;
}) {
  const active = value !== def;
  const display = fmt ? fmt(value) : String(value);
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-stone-400">{label}</span>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-amber-400" />
      <button onClick={() => onChange(def)}
        className={`w-9 text-right text-xs tabular-nums transition-colors ${active ? "text-amber-400 hover:text-amber-300" : "text-stone-600 cursor-default"}`}>
        {display}
      </button>
    </div>
  );
}

/* ─── Section card ──────────────────────────────────────────────── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-stone-900/60 p-4 space-y-3">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500">{title}</span>
      {children}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────── */
interface Props {
  previewUrl: string;
  onChange: (settings: FilterSettings, filterCss: string) => void;
}

export default function ImageEditor({ previewUrl, onChange }: Props) {
  const [edState, dispatch] = useReducer(editorReducer, INITIAL_STATE);
  const [showOriginal, setShowOriginal] = useState(false);
  const [palette, setPalette]           = useState<string[]>([]);
  const [copied,  setCopied]            = useState("");
  const svgId = useRef(`kiln-adj-${Math.random().toString(36).slice(2, 7)}`).current;

  const s = edState.current;
  const canUndo = edState.histIdx > 0;

  useEffect(() => { extractPalette(previewUrl, setPalette); }, [previewUrl]);

  // Sync settings up to parent
  useEffect(() => {
    onChange(s, buildFilterString(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  const update = useCallback((next: Partial<FilterSettings>) => {
    dispatch({ type: "update", next });
  }, []);

  /* SVG filter */
  const t = s.sharpness / 100;
  const sharpKernel = `0 ${(-t).toFixed(3)} 0 ${(-t).toFixed(3)} ${(1 + 4 * t).toFixed(3)} ${(-t).toFixed(3)} 0 ${(-t).toFixed(3)} 0`;
  const hasTone   = s.highlights !== 0 || s.shadows !== 0 || s.blacks !== 0;
  const needsSvg  = hasTone || s.sharpness > 0;
  const toneCurve = hasTone ? computeToneCurve(s.blacks, s.shadows, s.highlights) : "0.0 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1.0";
  const stdFilter = buildFilterString(s);
  const fullFilter = needsSvg
    ? [`url(#${svgId})`, stdFilter].filter(Boolean).join(" ").trim() || undefined
    : stdFilter || undefined;

  const vigOpacity = s.vignetteStrength / 100 * 0.82;
  const vigStart   = 65 - s.vignetteStrength * 0.32;

  function copyHex(hex: string) {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopied(hex); setTimeout(() => setCopied(""), 1500);
  }

  const fmtSigned = (v: number) => v > 0 ? `+${v}` : String(v);
  const fmtPct    = (v: number) => String(v);

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden SVG filters */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
        <defs>
          <filter id={svgId} colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="table" tableValues={toneCurve} />
              <feFuncG type="table" tableValues={toneCurve} />
              <feFuncB type="table" tableValues={toneCurve} />
            </feComponentTransfer>
            {s.sharpness > 0 && (
              <feConvolveMatrix order="3" kernelMatrix={sharpKernel} divisor="1" preserveAlpha="true" />
            )}
          </filter>
        </defs>
      </svg>

      {/* Preview */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-stone-950">
        <img src={previewUrl} alt="Preview"
          className="h-full w-full object-cover transition-all duration-200"
          style={{ filter: showOriginal ? undefined : fullFilter }} />
        {!showOriginal && s.vignetteStrength > 0 && (
          <div className="absolute inset-0 pointer-events-none rounded-xl"
            style={{ background: `radial-gradient(ellipse at center, transparent ${vigStart}%, rgba(0,0,0,${vigOpacity.toFixed(2)}) 100%)` }} />
        )}
        {showOriginal && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-stone-300">
            Before
          </div>
        )}
      </div>

      {/* Before/After + Undo row */}
      <div className="flex gap-2">
        <button type="button"
          onPointerDown={() => setShowOriginal(true)}
          onPointerUp={() => setShowOriginal(false)}
          onPointerLeave={() => setShowOriginal(false)}
          className="flex-1 rounded-lg border border-white/10 bg-stone-900/60 py-2 text-xs text-stone-400 hover:text-white active:bg-stone-800 transition-colors select-none">
          Hold to compare
        </button>
        <button type="button" disabled={!canUndo} onClick={() => dispatch({ type: "undo" })}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-stone-900/60 px-3 py-2 text-xs text-stone-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <Undo2 size={13} /> Undo
        </button>
        <button type="button" onClick={() => dispatch({ type: "reset" })}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-stone-900/60 px-3 py-2 text-xs text-stone-400 hover:text-white transition-colors">
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Filter presets */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2" style={{ width: "max-content" }}>
          {Object.entries(PRESETS).map(([key, { label, css }]) => {
            const active = s.preset === key;
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

      {/* Exposure */}
      <Card title="Exposure">
        <SliderRow label="Brightness"  value={s.brightness}  min={50}  max={150} def={100} fmt={fmtPct}    onChange={(v) => update({ brightness: v })} />
        <SliderRow label="Highlights"  value={s.highlights}  min={-50} max={50}  def={0}   fmt={fmtSigned} onChange={(v) => update({ highlights: v })} />
        <SliderRow label="Shadows"     value={s.shadows}     min={-50} max={50}  def={0}   fmt={fmtSigned} onChange={(v) => update({ shadows: v })} />
        <SliderRow label="Blacks/Fade" value={s.blacks}      min={-50} max={50}  def={0}   fmt={fmtSigned} onChange={(v) => update({ blacks: v })} />
      </Card>

      {/* Color */}
      <Card title="Color">
        <SliderRow label="Contrast"   value={s.contrast}   min={50}  max={150} def={100} fmt={fmtPct}    onChange={(v) => update({ contrast: v })} />
        <SliderRow label="Saturation" value={s.saturation} min={0}   max={200} def={100} fmt={fmtPct}    onChange={(v) => update({ saturation: v })} />
        <SliderRow label="Warmth"     value={s.warmth}     min={-30} max={30}  def={0}   fmt={fmtSigned} onChange={(v) => update({ warmth: v })} />
        <SliderRow label="Tint"       value={s.tint}       min={-30} max={30}  def={0}   fmt={fmtSigned} onChange={(v) => update({ tint: v })} />
      </Card>

      {/* Detail */}
      <Card title="Detail">
        <div>
          <SliderRow label="Sharpen" value={s.sharpness} min={0} max={100} def={0} fmt={fmtPct} onChange={(v) => update({ sharpness: v })} />
          <div className="mt-1 flex justify-between text-[10px] text-stone-700 pl-[86px]">
            <span>None</span><span>Soft</span><span>Medium</span><span>Crisp</span>
          </div>
        </div>
        <div>
          <SliderRow label="Vignette" value={s.vignetteStrength} min={0} max={100} def={0} fmt={fmtPct} onChange={(v) => update({ vignetteStrength: v })} />
          <div className="mt-1 flex justify-between text-[10px] text-stone-700 pl-[86px]">
            <span>None</span><span>Subtle</span><span>Strong</span><span>Film</span>
          </div>
        </div>
      </Card>

      {/* Shadow */}
      <div className="rounded-xl border border-white/10 bg-stone-900/60 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Shadow</span>
          </div>
          <button type="button" onClick={() => update({ shadowEnabled: !s.shadowEnabled })}
            className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${s.shadowEnabled ? "bg-amber-500" : "bg-stone-700"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${s.shadowEnabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
          </button>
        </div>
        {s.shadowEnabled && (
          <>
            <div className="flex gap-1.5">
              {(["soft", "hard", "glow"] as const).map((t) => (
                <button key={t} type="button" onClick={() => update({ shadowType: t })}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-all ${s.shadowType === t ? "bg-amber-500 text-black" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
                  {t}
                </button>
              ))}
            </div>
            {s.shadowType !== "glow" && (
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
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-all ${s.shadowAngle === angle ? "bg-amber-500 text-black" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {s.shadowType !== "glow" && (
                <SliderRow label="Distance" value={s.shadowDistance} min={2} max={40} def={10} onChange={(v) => update({ shadowDistance: v })} />
              )}
              {s.shadowType !== "hard" && (
                <SliderRow label="Blur" value={s.shadowBlur} min={1} max={50} def={15} onChange={(v) => update({ shadowBlur: v })} />
              )}
              <SliderRow label="Opacity" value={s.shadowOpacity} min={5} max={100} def={60} onChange={(v) => update({ shadowOpacity: v })} />
            </div>
          </>
        )}
      </div>

      {/* Color palette */}
      {palette.length > 0 && (
        <Card title="Color Palette">
          <div className="flex gap-2 flex-wrap">
            {palette.map((hex) => (
              <button key={hex} onClick={() => copyHex(hex)} title={hex}
                className="group flex flex-col items-center gap-1">
                <div className="h-9 w-9 rounded-full border-2 border-white/10 shadow-sm transition-transform group-hover:scale-110"
                  style={{ backgroundColor: hex }} />
                <span className="text-[9px] tabular-nums text-stone-600 group-hover:text-stone-400">
                  {copied === hex ? "✓" : hex.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-stone-600">Tap a swatch to copy its hex</p>
        </Card>
      )}
    </div>
  );
}
