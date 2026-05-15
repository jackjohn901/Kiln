import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Download, Share2, Check, Flame, QrCode,
  Smartphone, ExternalLink, Copy,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

function buildQRUrl(text: string, size: number = 256): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=12100e&color=f59e0b&margin=2&qzone=1&format=png`;
}

const FRAME_STYLES = [
  { id: "dark", label: "Dark", bg: "#12100e", border: "#3d3530", text: "#f5e9d6", accent: "#f59e0b" },
  { id: "warm", label: "Warm", bg: "#2a1f0e", border: "#a16207", text: "#fef3c7", accent: "#fbbf24" },
  { id: "stone", label: "Stone", bg: "#1c1917", border: "#57534e", text: "#e7e5e4", accent: "#78716c" },
  { id: "light", label: "Light", bg: "#fdf8f0", border: "#d6d3d1", text: "#1c1917", accent: "#b45309" },
];

export default function QRProfile() {
  const { profile } = useProfile();
  const [frame, setFrame] = useState(FRAME_STYLES[0]);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handle = profile?.name?.toLowerCase().replace(/\s+/g, "-") ?? "your-kiln-handle";
  const profileUrl = `${window.location.origin}${import.meta.env.BASE_URL}artists/${handle}`;
  const qrUrl = buildQRUrl(profileUrl, 300);

  function handleCopy() {
    navigator.clipboard.writeText(profileUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: `${profile?.name ?? "My"} Kiln profile`, url: profileUrl }).catch(() => {});
    } else {
      handleCopy();
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kiln-qr-${handle}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setDownloading(false);
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-md px-4 pb-32 pt-6">

        <div className="mb-6">
          <h1 className="font-serif text-3xl text-amber-100 flex items-center gap-2">
            <QrCode size={22} className="text-amber-400" /> QR Profile
          </h1>
          <p className="text-sm text-stone-500 mt-1">Share your Kiln profile at craft fairs, open studios, and events</p>
        </div>

        {/* QR card preview */}
        <motion.div
          key={frame.id}
          initial={{ opacity: 0.6, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl overflow-hidden mb-5 shadow-2xl"
          style={{ background: frame.bg, border: `2px solid ${frame.border}` }}
        >
          <div className="p-6 flex flex-col items-center gap-4">
            {/* Logo + brand */}
            <div className="flex items-center gap-2">
              <Flame size={18} style={{ color: frame.accent }} />
              <span className="font-serif text-xl font-bold" style={{ color: frame.text }}>Kiln</span>
            </div>

            {/* QR code */}
            <div className="rounded-2xl overflow-hidden p-3" style={{ background: frame.id === "light" ? "#fff" : "#1c1917" }}>
              <img
                src={qrUrl}
                alt="QR code"
                className="w-48 h-48 block"
                style={{ imageRendering: "crisp-edges" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(profileUrl)}&margin=4`;
                }}
              />
            </div>

            {/* Artist info */}
            {profile?.name && (
              <div className="text-center">
                <p className="font-serif text-lg font-semibold" style={{ color: frame.text }}>{profile.name}</p>
                {profile.mediums && profile.mediums.length > 0 && (
                  <p className="text-sm mt-0.5" style={{ color: frame.accent, opacity: 0.8 }}>{profile.mediums[0]}</p>
                )}
              </div>
            )}

            {/* URL */}
            <p className="text-xs font-mono" style={{ color: frame.text, opacity: 0.4 }}>
              kiln.art/{handle}
            </p>

            {/* Scan prompt */}
            <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ background: `${frame.accent}20`, border: `1px solid ${frame.accent}40` }}>
              <Smartphone size={13} style={{ color: frame.accent }} />
              <span className="text-xs font-medium" style={{ color: frame.accent }}>Scan to follow</span>
            </div>
          </div>
        </motion.div>

        {/* Frame picker */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-2.5">Card style</p>
          <div className="flex gap-2">
            {FRAME_STYLES.map((f) => (
              <button
                key={f.id}
                onClick={() => setFrame(f)}
                className={`flex-1 rounded-xl py-2 text-xs font-medium transition-all border ${
                  frame.id === f.id ? "border-amber-500 text-amber-300" : "border-white/10 text-stone-500 hover:border-white/20"
                }`}
                style={{ background: f.bg }}
              >
                <span style={{ color: f.id === frame.id ? f.accent : undefined }}>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Profile URL */}
        <div className="rounded-xl border border-white/8 bg-stone-900/40 px-4 py-3 flex items-center gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-stone-600 mb-0.5 uppercase tracking-wide">Your profile link</p>
            <p className="text-xs text-stone-400 truncate font-mono">{profileUrl}</p>
          </div>
          <button onClick={handleCopy} className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${copied ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/10 text-stone-400 hover:border-white/20"}`}>
            {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-60 transition-colors"
          >
            <Download size={15} /> {downloading ? "Downloading…" : "Download PNG"}
          </button>
          <button
            onClick={handleShare}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-400 hover:border-white/20 hover:text-stone-200 transition-colors"
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* Tips */}
        <div className="mt-6 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-3">Tips for using your QR card</p>
          {[
            { icon: "🎪", tip: "Print it A5 and display it prominently at your craft fair booth" },
            { icon: "📦", tip: "Include it in packaging with purchased works" },
            { icon: "🖼️", tip: "Add it to the back of your physical price tags in gallery shows" },
            { icon: "📮", tip: "Put it on business cards and thank-you notes" },
          ].map(({ icon, tip }) => (
            <div key={tip} className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-stone-900/30 p-3">
              <span className="text-base shrink-0">{icon}</span>
              <p className="text-xs text-stone-500 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
