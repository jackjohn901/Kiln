import { useState, useRef, useCallback, useEffect } from "react";
import { RotateCw, RotateCcw } from "lucide-react";

const RATIOS = [
  { label: "Free", v: null as number | null },
  { label: "1:1",  v: 1 },
  { label: "4:5",  v: 4 / 5 },
  { label: "3:4",  v: 3 / 4 },
  { label: "16:9", v: 16 / 9 },
];

interface Crop { x: number; y: number; w: number; h: number }
interface Props {
  src: string;
  onApply: (url: string, file: File) => void;
  onCancel: () => void;
}

const HANDLES = [
  { id: "nw", style: { top: -7, left: -7 } },
  { id: "ne", style: { top: -7, right: -7 } },
  { id: "sw", style: { bottom: -7, left: -7 } },
  { id: "se", style: { bottom: -7, right: -7 } },
  { id: "n",  style: { top: -7, left: "50%", marginLeft: -7 } },
  { id: "s",  style: { bottom: -7, left: "50%", marginLeft: -7 } },
  { id: "w",  style: { top: "50%", left: -7, marginTop: -7 } },
  { id: "e",  style: { top: "50%", right: -7, marginTop: -7 } },
];

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function makeCenteredCrop(ar: number): Crop {
  if (ar >= 1) {
    const h = clamp(1 / ar, 0.1, 1);
    return { x: 0, y: (1 - h) / 2, w: 1, h };
  }
  const w = clamp(ar, 0.1, 1);
  return { x: (1 - w) / 2, y: 0, w, h: 1 };
}

export default function CropTool({ src, onApply, onCancel }: Props) {
  const imgRef  = useRef<HTMLImageElement>(null);
  const contRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ handle: string; ox: number; oy: number; sc: Crop } | null>(null);

  const [rotation, setRotation] = useState(0);
  const [aspect,   setAspect]   = useState<number | null>(1);
  const [crop,     setCrop]     = useState<Crop>({ x: 0, y: 0, w: 1, h: 1 });
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (aspect !== null) setCrop(makeCenteredCrop(aspect));
  }, [aspect]);

  const onPtrDown = useCallback(
    (e: React.PointerEvent, handle: string) => {
      e.preventDefault();
      e.stopPropagation();
      const cont = contRef.current;
      if (!cont) return;
      const r = cont.getBoundingClientRect();
      dragRef.current = {
        handle,
        ox: (e.clientX - r.left)  / r.width,
        oy: (e.clientY - r.top)   / r.height,
        sc: { ...crop },
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [crop],
  );

  const onPtrMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const cont = contRef.current;
      if (!cont) return;
      const r   = cont.getBoundingClientRect();
      const dx  = (e.clientX - r.left) / r.width  - d.ox;
      const dy  = (e.clientY - r.top)  / r.height - d.oy;
      const { handle: h, sc } = d;

      let { x, y, w, hgt: hg } = { ...sc, hgt: sc.h };

      if (h === "move") {
        x = clamp(x + dx, 0, 1 - w);
        y = clamp(y + dy, 0, 1 - hg);
      } else {
        let nx = x, ny = y, nw = w, nh = hg;
        if (h === "n"  || h === "nw" || h === "ne") { ny = clamp(y + dy, 0, y + hg - 0.04); nh = y + hg - ny; }
        if (h === "s"  || h === "sw" || h === "se") { nh = clamp(hg + dy, 0.04, 1 - y); }
        if (h === "w"  || h === "nw" || h === "sw") { nx = clamp(x + dx, 0, x + w - 0.04); nw = x + w - nx; }
        if (h === "e"  || h === "ne" || h === "se") { nw = clamp(w + dx, 0.04, 1 - x); }

        if (aspect !== null) {
          if (h === "n" || h === "s") {
            const fw = nh * aspect;
            nx = clamp(nx - (fw - nw) / 2, 0, 1 - fw);
            nw = fw;
          } else {
            const fh = nw / aspect;
            ny = clamp(ny - (fh - nh) / 2, 0, 1 - fh);
            nh = fh;
          }
          if (nx < 0) { nw += nx; nx = 0; }
          if (ny < 0) { nh += ny; ny = 0; }
          if (nx + nw > 1) nw = 1 - nx;
          if (ny + nh > 1) nh = 1 - ny;
        }
        x = nx; y = ny; w = nw; hg = nh;
      }
      setCrop({ x, y, w, h: hg });
    },
    [aspect],
  );

  const onPtrUp = useCallback(() => { dragRef.current = null; }, []);

  async function apply() {
    const img = imgRef.current;
    if (!img) return;
    setApplying(true);
    try {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const rad     = (rotation * Math.PI) / 180;
      const absCos  = Math.abs(Math.cos(rad));
      const absSin  = Math.abs(Math.sin(rad));
      const rw = Math.round(iw * absCos + ih * absSin);
      const rh = Math.round(iw * absSin + ih * absCos);

      const tmp = document.createElement("canvas");
      tmp.width = rw; tmp.height = rh;
      const tCtx = tmp.getContext("2d")!;
      tCtx.translate(rw / 2, rh / 2);
      tCtx.rotate(rad);
      tCtx.drawImage(img, -iw / 2, -ih / 2);

      const cx = Math.round(crop.x * rw);
      const cy = Math.round(crop.y * rh);
      const cw = Math.max(1, Math.round(crop.w * rw));
      const ch = Math.max(1, Math.round(crop.h * rh));

      const out = document.createElement("canvas");
      out.width = cw; out.height = ch;
      out.getContext("2d")!.drawImage(tmp, cx, cy, cw, ch, 0, 0, cw, ch);

      const blob = await new Promise<Blob>((res, rej) =>
        out.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.92),
      );
      const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
      onApply(URL.createObjectURL(blob), file);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={contRef}
        className="relative w-full aspect-square overflow-hidden rounded-xl bg-black select-none touch-none"
        onPointerMove={onPtrMove}
        onPointerUp={onPtrUp}
        onPointerCancel={onPtrUp}
      >
        <img
          ref={imgRef}
          src={src}
          alt="Crop preview"
          crossOrigin="anonymous"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center" }}
        />

        {/* Dark mask outside crop box using two gradient overlays */}
        <div
          className="absolute inset-0 pointer-events-none bg-black/55"
          style={{
            clipPath: `polygon(
              0% 0%, 100% 0%, 100% 100%, 0% 100%,
              0% ${crop.y * 100}%,
              ${crop.x * 100}% ${crop.y * 100}%,
              ${crop.x * 100}% ${(crop.y + crop.h) * 100}%,
              ${(crop.x + crop.w) * 100}% ${(crop.y + crop.h) * 100}%,
              ${(crop.x + crop.w) * 100}% ${crop.y * 100}%,
              0% ${crop.y * 100}%
            )`,
          }}
        />

        {/* Crop box */}
        <div
          className="absolute border-2 border-white/90 cursor-move"
          style={{
            left:   `${crop.x * 100}%`,
            top:    `${crop.y * 100}%`,
            width:  `${crop.w * 100}%`,
            height: `${crop.h * 100}%`,
          }}
          onPointerDown={(e) => onPtrDown(e, "move")}
        >
          {/* Rule-of-thirds grid */}
          {[33.3, 66.6].map((p) => (
            <div key={`v${p}`} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${p}%` }} />
          ))}
          {[33.3, 66.6].map((p) => (
            <div key={`h${p}`} className="absolute left-0 right-0 h-px bg-white/20" style={{ top: `${p}%` }} />
          ))}

          {/* Resize handles */}
          {HANDLES.map(({ id, style }) => (
            <div
              key={id}
              className="absolute h-3.5 w-3.5 rounded-full bg-white shadow-md cursor-pointer"
              style={style as React.CSSProperties}
              onPointerDown={(e) => onPtrDown(e, id)}
            />
          ))}
        </div>
      </div>

      {/* Aspect ratio + rotation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {RATIOS.map(({ label, v }) => (
            <button
              key={label}
              type="button"
              onClick={() => setAspect(v)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                aspect === v
                  ? "bg-amber-500 text-black"
                  : "bg-stone-800 text-stone-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
            className="rounded-lg bg-stone-800 p-2 text-stone-400 hover:text-white transition-colors"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="rounded-lg bg-stone-800 p-2 text-stone-400 hover:text-white transition-colors"
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* Apply / Cancel */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-stone-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={applying}
          className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {applying ? "Applying…" : "Apply crop"}
        </button>
      </div>
    </div>
  );
}
