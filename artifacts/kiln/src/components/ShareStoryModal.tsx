import { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Flame, X, Share2, Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface ShareStoryModalProps {
  open: boolean;
  onClose: () => void;
  /** The piece photo to feature (listing image, post thumbnail, etc.) */
  imageUrl?: string;
  /** Main line — usually the piece title */
  title: string;
  /** Small line above the title (medium, collection, etc.) */
  eyebrow?: string;
  /** A short badge such as "SOLD", "NEW WORK", "FOR SALE" */
  badge?: string;
  /** Artist handle, with or without a leading @ */
  handle?: string;
  /** Optional price string, e.g. "$240" */
  price?: string;
}

const SHARE_DOMAIN = "kilnfire.replit.app";

/**
 * Loads a remote image and returns it as a data URL so html-to-image can
 * rasterize it without tainting the canvas. Returns null on any failure
 * (CORS, network, etc.) so the card can still render without the photo.
 */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function ShareStoryModal({
  open,
  onClose,
  imageUrl,
  title,
  eyebrow,
  badge,
  handle,
  price,
}: ShareStoryModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cleanHandle = handle
    ? (handle.startsWith("@") || handle.includes(" ") ? handle : `@${handle}`)
    : undefined;
  const caption = `${badge === "SOLD" ? "Just sold" : "Just listed"} on Kiln 🔥 ${title}${
    cleanHandle ? ` — ${cleanHandle}` : ""
  }. See more at ${SHARE_DOMAIN}/kiln/`;

  useEffect(() => {
    if (!open) return;
    setPhoto(null);
    if (imageUrl) {
      toDataUrl(imageUrl).then(setPhoto);
    }
  }, [open, imageUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function buildImage(): Promise<Blob | null> {
    if (!cardRef.current) return null;
    return toBlob(cardRef.current, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: "#12100e",
    });
  }

  async function handleShare() {
    setBusy(true);
    try {
      const blob = await buildImage();
      if (!blob) throw new Error("could not render card");
      const file = new File([blob], "kiln-story.png", { type: "image/png" });

      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "Share on Kiln",
          text: caption,
        });
        setBusy(false);
        return;
      }

      // Desktop / unsupported: download the image + copy the caption.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kiln-story.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      try { await navigator.clipboard.writeText(caption); } catch { /* clipboard optional */ }
      toast({
        title: "Image saved",
        description: "Open Instagram, add it to your Story — your caption is copied to paste.",
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User dismissed the native share sheet — not an error.
      } else {
        toast({
          title: "Couldn't create the image",
          description: "Please try again in a moment.",
          variant: "destructive",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-sm flex-col overflow-y-auto rounded-3xl border border-white/10 bg-[#1a1209] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg text-amber-100">Share to your Story</h2>
          <button onClick={onClose} className="rounded-full p-1 text-stone-400 hover:text-stone-200" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* The card that gets rasterized — fixed 9:16 ratio */}
        <div className="mx-auto w-full" style={{ maxWidth: 300 }}>
          <div
            ref={cardRef}
            style={{ width: "100%", aspectRatio: "9 / 16" }}
            className="relative flex flex-col overflow-hidden rounded-2xl bg-[#12100e]"
          >
            {/* Ambient glow */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(120% 60% at 50% 0%, rgba(245,158,11,0.22), transparent 60%)" }}
            />

            {/* Header */}
            <div className="relative flex items-center gap-1.5 px-5 pt-5">
              <Flame size={18} className="text-amber-400" />
              <span className="font-serif text-lg font-bold tracking-tight text-amber-100">Kiln</span>
            </div>

            {/* Photo */}
            <div className="relative mx-5 mt-4 flex-1 overflow-hidden rounded-xl border border-white/10 bg-stone-900">
              {photo ? (
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #2a1d0c, #12100e)" }}
                >
                  <Flame size={48} className="text-amber-500/40" />
                </div>
              )}
              {badge && (
                <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-950">
                  {badge}
                </span>
              )}
              {price && (
                <span className="absolute right-3 top-3 rounded-full bg-stone-950/80 px-3 py-1 text-sm font-semibold text-amber-200">
                  {price}
                </span>
              )}
            </div>

            {/* Caption */}
            <div className="relative px-5 pb-6 pt-4">
              {eyebrow && (
                <p className="text-[11px] font-medium uppercase tracking-wide text-amber-400/80">{eyebrow}</p>
              )}
              <p className="mt-0.5 font-serif text-xl font-bold leading-tight text-amber-50 line-clamp-2">{title}</p>
              {cleanHandle && <p className="mt-1 text-sm text-stone-300">{cleanHandle}</p>}
              <p className="mt-3 text-[11px] text-stone-500">{SHARE_DOMAIN}/kiln</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleShare}
          disabled={busy}
          className="mt-5 flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-base font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
          {busy ? "Preparing…" : "Share"}
        </button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-stone-500">
          <Download size={12} /> On desktop this saves the image to share manually.
        </p>
      </div>
    </div>
  );
}
