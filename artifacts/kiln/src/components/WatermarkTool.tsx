import { useState } from "react";

type PosKey =
  | "top-left" | "top-center" | "top-right"
  | "mid-left" | "mid-center" | "mid-right"
  | "bot-left" | "bot-center" | "bot-right";

const POS_GRID: { key: PosKey; label: string }[][] = [
  [
    { key: "top-left",    label: "↖" },
    { key: "top-center",  label: "↑" },
    { key: "top-right",   label: "↗" },
  ],
  [
    { key: "mid-left",    label: "←" },
    { key: "mid-center",  label: "·" },
    { key: "mid-right",   label: "→" },
  ],
  [
    { key: "bot-left",    label: "↙" },
    { key: "bot-center",  label: "↓" },
    { key: "bot-right",   label: "↘" },
  ],
];

const POS_CSS: Record<PosKey, React.CSSProperties> = {
  "top-left":    { top: "8%",  left: "5%",  textAlign: "left"   },
  "top-center":  { top: "8%",  left: "50%", transform: "translateX(-50%)", textAlign: "center" },
  "top-right":   { top: "8%",  right: "5%", textAlign: "right"  },
  "mid-left":    { top: "50%", left: "5%",  transform: "translateY(-50%)", textAlign: "left"  },
  "mid-center":  { top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" },
  "mid-right":   { top: "50%", right: "5%", transform: "translateY(-50%)", textAlign: "right" },
  "bot-left":    { bottom: "8%", left: "5%",  textAlign: "left"  },
  "bot-center":  { bottom: "8%", left: "50%", transform: "translateX(-50%)", textAlign: "center" },
  "bot-right":   { bottom: "8%", right: "5%", textAlign: "right" },
};

const FONT_SIZES = { S: 14, M: 22, L: 34 };
const COLORS = [
  { label: "White",  value: "#ffffff" },
  { label: "Black",  value: "#1a1a1a" },
  { label: "Gold",   value: "#f59e0b" },
];

interface Props {
  previewUrl: string;
  onApply: (url: string, file: File) => void;
}

export default function WatermarkTool({ previewUrl, onApply }: Props) {
  const [text,     setText]    = useState("© My Studio");
  const [position, setPosition] = useState<PosKey>("bot-right");
  const [size,     setSize]    = useState<"S" | "M" | "L">("M");
  const [opacity,  setOpacity] = useState(70);
  const [color,    setColor]   = useState("#ffffff");
  const [applying, setApplying] = useState(false);

  async function apply() {
    if (!text.trim()) return;
    setApplying(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = previewUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const scale  = img.naturalWidth / 390;
      const px     = FONT_SIZES[size] * scale;
      const margin = 18 * scale;

      ctx.globalAlpha = opacity / 100;
      ctx.fillStyle   = color;
      ctx.font        = `italic ${px}px Georgia, serif`;
      ctx.textBaseline = "middle";

      const pos = position;
      let x: number, y: number;
      let align: CanvasTextAlign = "left";

      if (pos.includes("left"))   { x = margin;                        align = "left";   }
      else if (pos.includes("right")) { x = canvas.width - margin;     align = "right";  }
      else                         { x = canvas.width / 2;             align = "center"; }

      if (pos.includes("top"))    y = margin + px / 2;
      else if (pos.includes("bot")) y = canvas.height - margin - px / 2;
      else                         y = canvas.height / 2;

      ctx.textAlign = align;

      // Subtle text shadow for legibility
      ctx.shadowColor   = color === "#ffffff" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.3)";
      ctx.shadowBlur    = px * 0.25;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillText(text.trim(), x, y);

      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => b ? res(b) : rej(new Error("toBlob failed")), "image/jpeg", 0.92),
      );
      onApply(URL.createObjectURL(blob), new File([blob], "watermarked.jpg", { type: "image/jpeg" }));
    } finally {
      setApplying(false);
    }
  }

  const fontSize = `${FONT_SIZES[size]}px`;

  return (
    <div className="flex flex-col gap-4">
      {/* Live preview */}
      <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-stone-950">
        <img src={previewUrl} alt="Watermark preview" className="h-full w-full object-cover" />
        {text.trim() && (
          <div
            className="absolute pointer-events-none font-serif italic leading-tight"
            style={{
              ...POS_CSS[position],
              fontSize,
              color,
              opacity: opacity / 100,
              textShadow: color === "#ffffff"
                ? "0 0 6px rgba(0,0,0,0.6)"
                : "0 0 6px rgba(255,255,255,0.4)",
              maxWidth: "80%",
              wordBreak: "break-word",
            }}
          >
            {text}
          </div>
        )}
      </div>

      {/* Text input */}
      <div>
        <label className="mb-1.5 block text-xs text-stone-500">Watermark text</label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. © Elena Vasquez"
          maxLength={60}
          className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-3 py-2 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
        />
      </div>

      {/* Position grid */}
      <div>
        <label className="mb-2 block text-xs text-stone-500">Position</label>
        <div className="mx-auto grid w-28 grid-cols-3 gap-1">
          {POS_GRID.flat().map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setPosition(key)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-all ${
                position === key ? "bg-amber-500 text-black" : "bg-stone-800 text-stone-400 hover:text-white"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-500 w-10">Size</span>
        <div className="flex gap-1.5">
          {(["S", "M", "L"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSize(s)}
              className={`h-8 w-10 rounded-lg text-xs font-medium transition-all ${
                size === s ? "bg-amber-500 text-black" : "bg-stone-800 text-stone-400 hover:text-white"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-500 w-10">Color</span>
        <div className="flex gap-2">
          {COLORS.map(({ label, value }) => (
            <button key={value} type="button" onClick={() => setColor(value)} title={label}
              className={`h-8 w-8 rounded-full border-2 transition-all ${
                color === value ? "border-amber-400 scale-110" : "border-white/20"
              }`}
              style={{ backgroundColor: value }} />
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-500 w-10">Opacity</span>
        <input type="range" min={20} max={100} value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.preventDefault()}
          className="flex-1 accent-amber-400"
          style={{ touchAction: "none" }}
        />
        <span className="w-8 text-right text-xs tabular-nums text-stone-500">{opacity}%</span>
      </div>

      {/* Apply */}
      <button type="button" onClick={apply} disabled={applying || !text.trim()}
        className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors disabled:opacity-50">
        {applying ? "Applying…" : "Apply watermark"}
      </button>
    </div>
  );
}
