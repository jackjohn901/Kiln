import { useState } from "react";

interface Props {
  previewUrl: string;
  onApply: (url: string, file: File) => void;
}

async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

async function bakeTiltShift(
  src: string,
  focus: number,
  band: number,
  blur: number,
): Promise<{ url: string; file: File }> {
  const img = await loadImg(src);
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  // ── 1. Blurred background canvas ────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const blurPx = Math.max(1, Math.round(blur * W / 390));
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(img, 0, 0, W, H);
  ctx.filter = "none";

  // ── 2. Sharp image on a temp canvas ─────────────────────────────
  const temp = document.createElement("canvas");
  temp.width = W; temp.height = H;
  const tCtx = temp.getContext("2d")!;
  tCtx.drawImage(img, 0, 0, W, H);

  // ── 3. Gradient mask cuts the focus band out of the temp canvas ──
  const centerY  = (focus / 100) * H;
  const halfBand = (band / 100) * H / 2;
  const feather  = H * 0.12;
  const y0 = Math.max(0, centerY - halfBand - feather);
  const y1 = Math.max(0, centerY - halfBand);
  const y2 = Math.min(H, centerY + halfBand);
  const y3 = Math.min(H, centerY + halfBand + feather);

  const grad = tCtx.createLinearGradient(0, y0, 0, y3);
  const range = y3 - y0 || 1;
  grad.addColorStop(0,                      "rgba(0,0,0,0)");
  grad.addColorStop((y1 - y0) / range,      "rgba(0,0,0,1)");
  grad.addColorStop((y2 - y0) / range,      "rgba(0,0,0,1)");
  grad.addColorStop(1,                      "rgba(0,0,0,0)");

  tCtx.globalCompositeOperation = "destination-in";
  tCtx.fillStyle = grad;
  tCtx.fillRect(0, 0, W, H);

  // ── 4. Composite sharp band onto blurred image ───────────────────
  ctx.drawImage(temp, 0, 0);

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.92),
  );
  return {
    url:  URL.createObjectURL(blob),
    file: new File([blob], "tiltshift.jpg", { type: "image/jpeg" }),
  };
}

export default function TiltShiftTool({ previewUrl, onApply }: Props) {
  const [focus,    setFocus]    = useState(50);  // 0–100 % from top
  const [band,     setBand]     = useState(30);  // 0–80 %
  const [blur,     setBlur]     = useState(8);   // px at 390w reference
  const [applying, setApplying] = useState(false);

  const focusTop = Math.max(0, focus - band / 2);
  const focusBot = Math.min(100, focus + band / 2);
  const topZone  = focusTop;              // % covered by top blur
  const botZone  = 100 - focusBot;        // % covered by bottom blur

  async function apply() {
    setApplying(true);
    try {
      const result = await bakeTiltShift(previewUrl, focus, band, blur);
      onApply(result.url, result.file);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Live preview */}
      <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-stone-950">
        <img src={previewUrl} alt="Tilt-shift preview" className="h-full w-full object-cover" />

        {/* Top blur zone */}
        {topZone > 0 && (
          <div className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: `${topZone}%`,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
            }} />
        )}

        {/* Bottom blur zone */}
        {botZone > 0 && (
          <div className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: `${botZone}%`,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: "linear-gradient(to top, black 50%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to top, black 50%, transparent 100%)",
            }} />
        )}

        {/* Focus band edge lines */}
        <div className="absolute inset-x-0 pointer-events-none border-t border-white/30 border-dashed"
          style={{ top: `${focusTop}%` }} />
        <div className="absolute inset-x-0 pointer-events-none border-t border-white/30 border-dashed"
          style={{ top: `${focusBot}%` }} />

        {/* Focus label */}
        <div className="absolute right-2 pointer-events-none"
          style={{ top: `${focus}%`, transform: "translateY(-50%)" }}>
          <div className="rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-stone-300">focus</div>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-white/10 bg-stone-900/60 p-4 space-y-4">
        {/* Focus position */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Focus position</span>
            <span className="tabular-nums text-amber-400">{focus}%</span>
          </div>
          <input type="range" min={10} max={90} value={focus}
            onChange={(e) => setFocus(Number(e.target.value))}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.preventDefault()}
            className="w-full accent-amber-400"
            style={{ touchAction: "none" }}
          />
          <div className="flex justify-between text-[10px] text-stone-600">
            <span>Top</span><span>Middle</span><span>Bottom</span>
          </div>
        </div>

        {/* Band width */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Sharp zone width</span>
            <span className="tabular-nums text-amber-400">{band}%</span>
          </div>
          <input type="range" min={5} max={80} value={band}
            onChange={(e) => setBand(Number(e.target.value))}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.preventDefault()}
            className="w-full accent-amber-400"
            style={{ touchAction: "none" }}
          />
          <div className="flex justify-between text-[10px] text-stone-600">
            <span>Narrow</span><span>Medium</span><span>Wide</span>
          </div>
        </div>

        {/* Blur intensity */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Blur intensity</span>
            <span className="tabular-nums text-amber-400">{blur}</span>
          </div>
          <input type="range" min={2} max={20} value={blur}
            onChange={(e) => setBlur(Number(e.target.value))}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.preventDefault()}
            className="w-full accent-amber-400"
            style={{ touchAction: "none" }}
          />
          <div className="flex justify-between text-[10px] text-stone-600">
            <span>Subtle</span><span>Medium</span><span>Strong</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-stone-600 text-center px-2">
        "Apply" bakes the blur permanently into the image
      </p>

      <button type="button" onClick={apply} disabled={applying}
        className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors disabled:opacity-50">
        {applying ? "Applying…" : "Apply tilt-shift"}
      </button>
    </div>
  );
}
