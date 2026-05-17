import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, Music2, Play, Pause, Search, Check, DollarSign,
  ShoppingBag, Award, Zap, TrendingUp, Users, Lock, ExternalLink,
  BarChart2, Radio, Star, X, AlertCircle,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { getCommunityBeats, type CommunityBeat } from "@/lib/communityBeats";
import {
  getLicenses, addLicense, hasLicense,
  getLicensesByLicensee, getLicensesByCreator, getTotalEarnings,
  randomId, type BeatLicense,
} from "@/lib/beatLicenses";
import { createBeatLooper } from "@/lib/beatSynth";

// ── Seed "platform beats" from fictional Kiln artists ─────────────────────────
// Shown when the community library has few beats, so the market feels alive.

function b(p: number[]): boolean[] { return p.map(Boolean); }

const SEED_BEATS: CommunityBeat[] = [
  {
    id: "seed-1", title: "Clay Session", artistHandle: "wheelwright", artistName: "The Wheelwright",
    bpm: 95, license: "community", price: 1, createdAt: "2026-04-10T08:00:00Z", usedCount: 34,
    genre: "Jazz", steps: 16,
    pattern: [
      b([1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,1]),
      b([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
      b([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
      b([1,0,1,0, 1,1,1,0, 1,0,1,0, 1,1,1,0]),
      b([0,0,0,0, 0,1,0,0, 0,0,0,0, 0,1,0,0]),
      b([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
      b([0,0,1,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
      b([1,0,0,0, 0,1,0,0, 1,0,0,1, 0,0,1,0]),
      b([1,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0]),
      b([0,0,0,1, 0,0,1,0, 0,1,0,0, 0,0,0,1]),
    ],
  },
  {
    id: "seed-2", title: "Kiln Fire", artistHandle: "ceramist", artistName: "Ceramist",
    bpm: 128, license: "free", price: 0, createdAt: "2026-04-05T12:00:00Z", usedCount: 87,
    genre: "House", steps: 16,
    pattern: [
      b([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]),
      b([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
      b([0,0,0,1, 0,0,0,1, 0,0,0,1, 0,0,0,1]),
      b([1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]),
      b([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1]),
      b([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]),
      b([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1]),
      b([1,0,0,0, 0,0,1,0, 1,0,0,0, 0,1,0,0]),
      b([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]),
      b([0,0,1,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
    ],
  },
  {
    id: "seed-3", title: "Glaze Waves", artistHandle: "potterella", artistName: "Potterella",
    bpm: 78, license: "free", price: 0, createdAt: "2026-03-28T09:00:00Z", usedCount: 62,
    genre: "Lo-Fi", steps: 16,
    pattern: [
      b([1,0,0,0, 0,0,0,1, 1,0,0,0, 0,0,0,0]),
      b([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
      b([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
      b([1,0,1,0, 0,1,1,0, 1,1,0,0, 0,1,1,0]),
      b([0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0]),
      b([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
      b([0,0,1,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
      b([1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0]),
      b([1,0,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
      b([0,0,0,1, 0,0,0,0, 0,0,1,0, 0,0,0,1]),
    ],
  },
  {
    id: "seed-4", title: "Throwing Session", artistHandle: "thrownpot", artistName: "Thrown Pot",
    bpm: 105, license: "community", price: 1, createdAt: "2026-04-18T14:00:00Z", usedCount: 28,
    genre: "Original", steps: 16,
    pattern: [
      b([1,0,0,1, 0,0,1,0, 1,0,0,0, 0,1,0,0]),
      b([0,0,1,0, 0,0,0,1, 0,0,1,0, 0,0,1,0]),
      b([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
      b([1,1,0,1, 1,0,1,1, 0,1,1,0, 1,1,0,1]),
      b([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0]),
      b([1,0,1,0, 0,1,0,1, 1,0,1,0, 0,1,0,1]),
      b([0,0,0,1, 0,0,0,0, 0,0,0,0, 0,0,0,1]),
      b([1,0,0,0, 0,1,0,0, 1,0,0,0, 0,0,0,1]),
      b([0,1,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
      b([0,0,0,1, 0,1,0,0, 1,0,0,0, 0,0,1,0]),
    ],
  },
  {
    id: "seed-5", title: "Studio Night", artistHandle: "slipcast", artistName: "Slipcast",
    bpm: 92, license: "premium", price: 5, createdAt: "2026-05-01T20:00:00Z", usedCount: 19,
    genre: "Hip-Hop", steps: 16,
    pattern: [
      b([1,0,0,0, 0,0,1,0, 1,0,0,1, 0,0,0,0]),
      b([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
      b([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
      b([1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,1]),
      b([0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,0,0]),
      b([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1]),
      b([0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,1]),
      b([1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,1]),
      b([0,0,0,0, 1,0,0,0, 0,0,0,0, 0,1,0,0]),
      b([0,0,1,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
    ],
  },
  {
    id: "seed-6", title: "Electric Kiln", artistHandle: "wireform", artistName: "Wireform",
    bpm: 135, license: "community", price: 1, createdAt: "2026-05-10T11:00:00Z", usedCount: 41,
    genre: "Techno", steps: 16,
    pattern: [
      b([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]),
      b([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
      b([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1]),
      b([1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,1]),
      b([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,0]),
      b([0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]),
      b([0,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0]),
      b([1,0,1,0, 0,0,0,0, 1,0,1,0, 0,0,0,0]),
      b([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
      b([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
    ],
  },
  {
    id: "seed-7", title: "Centering", artistHandle: "muddyhands", artistName: "Muddy Hands",
    bpm: 115, license: "free", price: 0, createdAt: "2026-04-22T16:00:00Z", usedCount: 55,
    genre: "World", steps: 16,
    pattern: [
      b([1,0,0,0, 0,1,0,1, 0,0,1,0, 0,0,0,1]),
      b([0,0,1,0, 0,0,0,0, 0,1,0,0, 0,0,1,0]),
      b([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
      b([1,0,1,0, 1,0,1,0, 1,1,0,1, 1,0,1,0]),
      b([0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0]),
      b([1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1]),
      b([0,1,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
      b([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
      b([0,1,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
      b([0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0]),
    ],
  },
  {
    id: "seed-8", title: "Late Trim", artistHandle: "bisquefire", artistName: "Bisque & Fire",
    bpm: 140, license: "premium", price: 5, createdAt: "2026-05-14T23:00:00Z", usedCount: 12,
    genre: "Trap", steps: 16,
    pattern: [
      b([1,0,0,0, 0,0,0,0, 1,0,0,1, 0,0,0,0]),
      b([0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]),
      b([0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]),
      b([1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]),
      b([0,0,0,0, 0,0,1,0, 0,0,0,0, 0,1,0,0]),
      b([0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1]),
      b([0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,0,1]),
      b([1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]),
      b([0,1,0,0, 0,0,0,0, 0,1,0,0, 0,0,0,0]),
      b([0,0,0,1, 0,0,0,0, 0,0,0,0, 0,0,0,1]),
    ],
  },
];

// ── Track colors for mini grid ─────────────────────────────────────────────────

const TRACK_DOTS = [
  "bg-amber-500","bg-orange-500","bg-red-500","bg-yellow-400",
  "bg-lime-500","bg-green-400","bg-cyan-500","bg-teal-500","bg-blue-500","bg-sky-500",
];

function MiniGrid({ pattern }: { pattern: boolean[][] }) {
  const rows = pattern.slice(0, 10);
  const cols = rows[0]?.length ?? 16;
  return (
    <div className="flex flex-col gap-[2px]">
      {rows.map((row, ti) => (
        <div key={ti} className="flex gap-[2px]">
          {row.map((on, si) => (
            <div key={si} className={`rounded-[2px] ${cols <= 16 ? "h-1.5 w-[7px]" : "h-1.5 w-[4px]"} ${on ? TRACK_DOTS[ti] : "bg-stone-700"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── License badge ──────────────────────────────────────────────────────────────

function LicenseBadge({ license }: { license: CommunityBeat["license"] }) {
  const label = license === "free" ? "Free" : license === "community" ? "$1" : "$5";
  const cls   = license === "free"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
    : license === "community"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
      : "border-purple-500/40 bg-purple-500/10 text-purple-400";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>;
}

// ── License confirmation modal ─────────────────────────────────────────────────

interface LicenseModalProps {
  beat: CommunityBeat;
  onConfirm: () => void;
  onCancel: () => void;
}

function LicenseModal({ beat, onConfirm, onCancel }: LicenseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-lg rounded-t-3xl bg-stone-900 border-t border-white/10 p-6 pb-10 space-y-5"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-stone-100">License this beat</h2>
            <p className="text-sm text-stone-400 mt-0.5">{beat.title} by {beat.artistName}</p>
          </div>
          <button onClick={onCancel} className="text-stone-500 hover:text-stone-300 transition-colors mt-0.5">
            <X size={20} />
          </button>
        </div>

        {/* Beat preview */}
        <div className="rounded-2xl border border-white/8 bg-stone-800/60 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-700">
              <Music2 size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-100">{beat.title}</p>
              <p className="text-xs text-stone-500">@{beat.artistHandle} · {beat.bpm} BPM</p>
            </div>
            <LicenseBadge license={beat.license} />
          </div>
          <MiniGrid pattern={beat.pattern.slice(0, 10)} />
        </div>

        {/* License terms */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">License Terms</span>
          </div>
          <ul className="space-y-1.5 text-xs text-stone-400 leading-relaxed">
            <li className="flex items-start gap-2"><Check size={11} className="mt-0.5 text-emerald-400 shrink-0" />You may use this beat in your Kiln posts indefinitely.</li>
            <li className="flex items-start gap-2"><Check size={11} className="mt-0.5 text-emerald-400 shrink-0" />@{beat.artistHandle} retains full copyright and ownership. You are licensing usage rights only.</li>
            <li className="flex items-start gap-2"><Check size={11} className="mt-0.5 text-emerald-400 shrink-0" />This is a non-exclusive, non-transferable license — other creators may also license the same beat.</li>
            <li className="flex items-start gap-2"><Check size={11} className="mt-0.5 text-emerald-400 shrink-0" />You may not redistribute, resell, or re-license this beat to others.</li>
          </ul>
        </div>

        {/* Price + confirm */}
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-2xl border border-white/8 bg-stone-800/40 px-4 py-3">
            <p className="text-xs text-stone-500">One-time lease fee</p>
            <p className="text-2xl font-black text-stone-100">
              {beat.price === 0 ? "Free" : `$${beat.price.toFixed(2)}`}
            </p>
          </div>
          <button onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-stone-950 hover:from-amber-400 hover:to-orange-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20">
            <Check size={16} />
            Confirm{beat.price > 0 ? ` ($${beat.price.toFixed(2)})` : " (Free)"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Beat card ─────────────────────────────────────────────────────────────────

interface BeatCardProps {
  beat: CommunityBeat;
  isLicensed: boolean;
  isOwn: boolean;
  previewId: string | null;
  onPreview: (beat: CommunityBeat) => void;
  onLicense: (beat: CommunityBeat) => void;
  onUseInPost: (beat: CommunityBeat) => void;
}

function BeatCard({ beat, isLicensed, isOwn, previewId, onPreview, onLicense, onUseInPost }: BeatCardProps) {
  const isPreviewing = previewId === beat.id;
  const canUse = isOwn || isLicensed || beat.license === "free";

  return (
    <div className={`rounded-2xl border p-4 transition-all ${canUse ? "border-stone-700/60 bg-stone-900/60" : "border-stone-800 bg-stone-900/30"}`}>
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <button onClick={() => onPreview(beat)}
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all ${
            isPreviewing ? "border-amber-400 bg-amber-400/20 text-amber-400" : "border-stone-700 bg-stone-800 text-stone-400 hover:border-amber-500/50 hover:text-amber-300"
          }`}>
          {isPreviewing ? (
            <span className="flex gap-[2px] items-end h-4">
              {[4,7,5,8,4].map((h, i) => (
                <span key={i} className="w-[2px] rounded-full bg-amber-400 origin-bottom"
                  style={{ height: `${h * 2}px`, animation: `waveBar 0.5s ease-in-out ${i * 0.09}s infinite alternate` }} />
              ))}
            </span>
          ) : <Play size={14} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-stone-100 truncate">{beat.title}</p>
            <LicenseBadge license={beat.license} />
            {isOwn && <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-medium text-sky-400">Yours</span>}
            {isLicensed && !isOwn && <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">Licensed ✓</span>}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            @{beat.artistHandle} · {beat.bpm} BPM{beat.genre ? ` · ${beat.genre}` : ""}
          </p>
          <p className="text-[10px] text-stone-600 mt-0.5">
            {beat.usedCount} use{beat.usedCount !== 1 ? "s" : ""}
            {beat.steps ? ` · ${beat.steps} steps` : ""}
          </p>
        </div>
      </div>

      {/* Mini grid */}
      <div className="mb-3 pl-[52px]">
        <MiniGrid pattern={beat.pattern.slice(0, 10)} />
      </div>

      {/* Action row */}
      <div className="flex gap-2 pl-[52px]">
        {canUse ? (
          <button onClick={() => onUseInPost(beat)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-amber-500 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 active:scale-95 transition-all">
            <Radio size={11} /> Use in Post
          </button>
        ) : (
          <button onClick={() => onLicense(beat)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors">
            <Lock size={11} />
            {beat.license === "community" ? "License for $1" : "License for $5"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────

type PriceFilter = "all" | "free" | "community" | "premium";
type BpmFilter  = "all" | "slow" | "mid" | "fast";

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SoundMarket() {
  const [, setLocation] = useLocation();
  const { profile } = useProfile();

  const [tab,          setTab]         = useState<"browse" | "licensed" | "earnings">("browse");
  const [query,        setQuery]       = useState("");
  const [priceFilter,  setPriceFilter] = useState<PriceFilter>("all");
  const [bpmFilter,    setBpmFilter]   = useState<BpmFilter>("all");
  const [previewId,    setPreviewId]   = useState<string | null>(null);
  const [licenseModal, setLicenseModal]= useState<CommunityBeat | null>(null);
  const [licenses,     setLicenses]    = useState<BeatLicense[]>([]);
  const [successId,    setSuccessId]   = useState<string | null>(null);

  const stopperRef = useRef<{ stop: () => void } | null>(null);

  const myHandle = profile?.handle ?? "me";

  // Combine seed beats + user's community beats (other creators)
  const allBeats = (() => {
    const userBeats = getCommunityBeats().filter((b) => b.artistHandle !== myHandle);
    const seedIds   = new Set(userBeats.map((b) => b.id));
    const seeds     = SEED_BEATS.filter((s) => !seedIds.has(s.id));
    return [...userBeats, ...seeds].sort((a, b) => b.usedCount - a.usedCount);
  })();

  // Load licenses — try API first, fall back to localStorage
  useEffect(() => {
    fetch("/api/beats/licenses", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ licenses: Array<{ beatId: string; licenseType: string; beatTitle: string; creatorHandle: string; createdAt: string }> }> : null)
      .then(data => {
        if (data?.licenses?.length) {
          const apiLicenses: BeatLicense[] = data.licenses.map(l => ({
            id: l.beatId,
            beatId: l.beatId,
            beatTitle: l.beatTitle,
            creatorHandle: l.creatorHandle,
            creatorName: l.creatorHandle,
            licenseType: l.licenseType as BeatLicense["licenseType"],
            price: 0,
            licenseeHandle: myHandle,
            licenseeName: profile?.name ?? "You",
            licensedAt: l.createdAt,
            postCount: 0,
          }));
          setLicenses(apiLicenses);
        } else {
          setLicenses(getLicenses());
        }
      })
      .catch(() => setLicenses(getLicenses()));
  }, [myHandle, profile?.name]);

  // Reload licenses when modal closes
  useEffect(() => {
    if (!licenseModal) {
      fetch("/api/beats/licenses", { credentials: "include" })
        .then(r => r.ok ? r.json() as Promise<{ licenses: Array<{ beatId: string; licenseType: string; beatTitle: string; creatorHandle: string; createdAt: string }> }> : null)
        .then(data => { if (!data?.licenses?.length) setLicenses(getLicenses()); })
        .catch(() => setLicenses(getLicenses()));
    }
  }, [licenseModal]);

  const stopPreview = useCallback(() => {
    stopperRef.current?.stop();
    stopperRef.current = null;
    setPreviewId(null);
  }, []);

  useEffect(() => () => stopPreview(), [stopPreview]);

  function togglePreview(beat: CommunityBeat) {
    if (previewId === beat.id) { stopPreview(); return; }
    stopPreview();
    setPreviewId(beat.id);
    stopperRef.current = createBeatLooper(beat);
    setTimeout(stopPreview, 10_000); // auto-stop after 10s
  }

  function handleLicense(beat: CommunityBeat) {
    if (beat.license === "free" || hasLicense(beat.id, myHandle)) {
      // Already accessible — just navigate to create
      setLocation("/create");
      return;
    }
    setLicenseModal(beat);
  }

  function confirmLicense() {
    if (!licenseModal) return;
    const beat = licenseModal;
    const license: BeatLicense = {
      id: randomId(),
      beatId:         beat.id,
      beatTitle:      beat.title,
      creatorHandle:  beat.artistHandle,
      creatorName:    beat.artistName,
      licenseType:    beat.license,
      price:          beat.price,
      licenseeHandle: myHandle,
      licenseeName:   profile?.name ?? "You",
      licensedAt:     new Date().toISOString(),
      postCount:      0,
    };
    // Optimistic: save locally first
    addLicense(license);
    setLicenses(getLicenses());
    setSuccessId(beat.id);
    setLicenseModal(null);
    setTimeout(() => setSuccessId(null), 3000);
    // Persist to API
    fetch(`/api/beats/${beat.id}/license`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseType: beat.license, pricePaid: beat.price }),
    }).catch(() => {});
  }

  function useInPost(beat: CommunityBeat) {
    stopPreview();
    // Store intent in sessionStorage so Create page picks it up
    sessionStorage.setItem("kiln_pending_beat", JSON.stringify({
      id: `beat-${beat.id}`,
      title: beat.title,
      artist: beat.artistName,
      url: `beat://${beat.id}`,
      license: beat.license === "free" ? "Free" : beat.license === "community" ? "$1" : "$5",
      bpm: beat.bpm,
    }));
    setLocation("/create");
  }

  // Filtered browse list
  const filteredBeats = allBeats.filter((beat) => {
    if (priceFilter !== "all" && beat.license !== priceFilter) return false;
    if (bpmFilter === "slow"  && beat.bpm >= 100) return false;
    if (bpmFilter === "mid"   && (beat.bpm < 100 || beat.bpm >= 130)) return false;
    if (bpmFilter === "fast"  && beat.bpm < 130) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!beat.title.toLowerCase().includes(q) && !beat.artistName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // My licenses (exclude own beats)
  const myLicensed  = licenses.filter((l) => l.licenseeHandle === myHandle);
  const myLicensedBeats = myLicensed.map((l) => {
    return allBeats.find((b) => b.id === l.beatId) ?? null;
  }).filter(Boolean) as CommunityBeat[];

  // My earnings (where I'm the creator)
  const myEarnings    = licenses.filter((l) => l.creatorHandle === myHandle);
  const totalEarnings = getTotalEarnings(myHandle);
  const myOwnBeats    = getCommunityBeats().filter((b) => b.artistHandle === myHandle);

  return (
    <div className="min-h-screen bg-stone-950 pb-32">
      <style>{`@keyframes waveBar { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }`}</style>

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 border-b border-white/5 bg-stone-950/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setLocation(-1 as never)} className="text-stone-400 hover:text-stone-200 transition-colors">
            <ChevronLeft size={22} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShoppingBag size={18} className="text-amber-400" />
            <h1 className="text-base font-bold text-stone-100">Sound Market</h1>
          </div>
          <button onClick={() => setLocation("/music-studio")}
            className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors">
            <Music2 size={11} /> Create
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-white/5">
          {[
            { id: "browse",   label: "Browse",         icon: Search      },
            { id: "licensed", label: `My Licenses${myLicensed.length > 0 ? ` (${myLicensed.length})` : ""}`, icon: Check },
            { id: "earnings", label: "My Earnings",    icon: DollarSign  },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as typeof tab)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === id ? "border-amber-400 text-amber-300" : "border-transparent text-stone-500 hover:text-stone-300"
              }`}>
              <Icon size={11} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════ BROWSE TAB ══════════ */}
      {tab === "browse" && (
        <div className="px-4 pt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input type="text" placeholder="Search beats or creators…" value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-stone-900 py-2.5 pl-9 pr-4 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none" />
          </div>

          {/* Price filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {([
              { id: "all",       label: "All" },
              { id: "free",      label: "Free" },
              { id: "community", label: "$1 Lease" },
              { id: "premium",   label: "$5 Premium" },
            ] as { id: PriceFilter; label: string }[]).map(({ id, label }) => (
              <button key={id} onClick={() => setPriceFilter(id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  priceFilter === id ? "bg-amber-500 text-stone-950" : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* BPM filters */}
          <div className="flex gap-1.5">
            {([
              { id: "all",  label: "Any BPM"  },
              { id: "slow", label: "< 100"    },
              { id: "mid",  label: "100–129"  },
              { id: "fast", label: "130+"     },
            ] as { id: BpmFilter; label: string }[]).map(({ id, label }) => (
              <button key={id} onClick={() => setBpmFilter(id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  bpmFilter === id ? "bg-stone-600 text-stone-100" : "bg-stone-800 text-stone-500 hover:bg-stone-700 hover:text-stone-300"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Music2,     val: allBeats.length,                         label: "beats" },
              { icon: Users,      val: new Set(allBeats.map((b) => b.artistHandle)).size, label: "creators" },
              { icon: TrendingUp, val: allBeats.reduce((s, b) => s + b.usedCount, 0), label: "total uses" },
            ].map(({ icon: Icon, val, label }) => (
              <div key={label} className="rounded-xl border border-white/5 bg-stone-900/60 px-3 py-2 text-center">
                <Icon size={12} className="text-stone-500 mx-auto mb-0.5" />
                <p className="text-sm font-bold text-stone-200">{val}</p>
                <p className="text-[10px] text-stone-600">{label}</p>
              </div>
            ))}
          </div>

          {/* Success toast */}
          {successId && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <Check size={14} className="text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300">Beat licensed! Go to Create to add it to a post.</p>
            </div>
          )}

          {/* Beat list */}
          {filteredBeats.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle size={28} className="text-stone-600" />
              <p className="text-sm text-stone-500">No beats match your filters.</p>
              <button onClick={() => { setQuery(""); setPriceFilter("all"); setBpmFilter("all"); }}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBeats.map((beat) => (
                <BeatCard key={beat.id} beat={beat}
                  isLicensed={hasLicense(beat.id, myHandle)}
                  isOwn={beat.artistHandle === myHandle}
                  previewId={previewId}
                  onPreview={togglePreview}
                  onLicense={handleLicense}
                  onUseInPost={useInPost}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ MY LICENSES TAB ══════════ */}
      {tab === "licensed" && (
        <div className="px-4 pt-4 space-y-4">
          {myLicensed.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-900 text-stone-700">
                <Award size={26} />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-400">No licenses yet</p>
                <p className="mt-1 text-xs text-stone-600 max-w-[240px]">
                  Browse the Sound Market and license beats from other Kiln creators to use in your posts.
                </p>
              </div>
              <button onClick={() => setTab("browse")}
                className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                Browse Beats
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-stone-500">
                {myLicensed.length} license{myLicensed.length !== 1 ? "s" : ""} · you can use these beats in your posts
              </p>
              <div className="space-y-3">
                {myLicensed.map((lic) => {
                  const beat = allBeats.find((b) => b.id === lic.beatId);
                  return (
                    <div key={lic.id} className="rounded-2xl border border-stone-700/60 bg-stone-900/60 p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-800">
                          <Music2 size={14} className="text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-stone-100 truncate">{lic.beatTitle}</p>
                            <LicenseBadge license={lic.licenseType} />
                          </div>
                          <p className="text-xs text-stone-500">@{lic.creatorHandle}</p>
                          <p className="text-[10px] text-stone-600 mt-0.5">
                            Licensed {new Date(lic.licensedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {lic.price > 0 ? ` · $${lic.price.toFixed(2)} paid` : " · Free"}
                          </p>
                        </div>
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-400 shrink-0">
                          Active
                        </span>
                      </div>
                      {beat && (
                        <div className="mb-3 pl-[52px]">
                          <MiniGrid pattern={beat.pattern.slice(0, 10)} />
                        </div>
                      )}
                      <div className="flex gap-2 pl-[52px]">
                        {beat && (
                          <button onClick={() => togglePreview(beat)}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                              previewId === beat.id ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-stone-700 text-stone-500 hover:border-amber-500/40 hover:text-amber-300"
                            }`}>
                            {previewId === beat.id ? <Pause size={10} /> : <Play size={10} />}
                            Preview
                          </button>
                        )}
                        <button onClick={() => beat && useInPost(beat)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-amber-500 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                          <Radio size={10} /> Use in Post
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ MY EARNINGS TAB ══════════ */}
      {tab === "earnings" && (
        <div className="px-4 pt-4 space-y-4">
          {/* Earnings summary */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-amber-400" />
              <h2 className="text-sm font-bold text-stone-100">Sound Royalties</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-black text-amber-300">${totalEarnings.toFixed(2)}</p>
                <p className="text-[10px] text-stone-500 mt-0.5">Total earned</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-stone-200">{myEarnings.length}</p>
                <p className="text-[10px] text-stone-500 mt-0.5">Licenses sold</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-stone-200">{myOwnBeats.length}</p>
                <p className="text-[10px] text-stone-500 mt-0.5">Beats listed</p>
              </div>
            </div>
          </div>

          {/* Tip card */}
          {myOwnBeats.length === 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <Zap size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-stone-200">Start earning from your beats</p>
                  <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                    Create beats in Music Studio, set a Community ($1) or Premium ($5) license, and other Kiln creators can lease the rights to use them in their posts. You keep full ownership.
                  </p>
                  <button onClick={() => setLocation("/music-studio")}
                    className="mt-3 flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors">
                    <Music2 size={11} /> Open Music Studio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* My beats with earnings */}
          {myOwnBeats.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500">Your beats in the market</p>
              {myOwnBeats.map((beat) => {
                const beatLicenses = myEarnings.filter((l) => l.beatId === beat.id);
                const earned = beatLicenses.reduce((s, l) => s + l.price, 0);
                return (
                  <div key={beat.id} className="rounded-2xl border border-stone-700/60 bg-stone-900/60 p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-800">
                        <Music2 size={13} className="text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-stone-100 truncate">{beat.title}</p>
                          <LicenseBadge license={beat.license} />
                        </div>
                        <p className="text-xs text-stone-500">{beat.bpm} BPM · {beat.usedCount} total uses</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-emerald-300">${earned.toFixed(2)}</p>
                        <p className="text-[10px] text-stone-600">{beatLicenses.length} license{beatLicenses.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <MiniGrid pattern={beat.pattern.slice(0, 10)} />
                    </div>
                    {beatLicenses.length > 0 && (
                      <div className="border-t border-white/5 pt-3 space-y-1.5">
                        <p className="text-[10px] text-stone-600 mb-2">Recent license activity</p>
                        {beatLicenses.slice(0, 3).map((lic) => (
                          <div key={lic.id} className="flex items-center justify-between text-xs">
                            <span className="text-stone-400">@{lic.licenseeHandle}</span>
                            <span className="flex items-center gap-2 text-stone-500">
                              <span>{new Date(lic.licensedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                              <span className={lic.price > 0 ? "text-emerald-400 font-medium" : "text-stone-600"}>{lic.price > 0 ? `+$${lic.price.toFixed(2)}` : "Free"}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {beatLicenses.length === 0 && beat.license !== "free" && (
                      <p className="text-[10px] text-stone-600 text-center pt-1">No licenses yet — share your beat to get discovered</p>
                    )}
                  </div>
                );
              })}

              {/* Upsell */}
              <div className="rounded-2xl border border-stone-800 bg-stone-900/30 p-4 text-center">
                <Star size={18} className="text-stone-600 mx-auto mb-2" />
                <p className="text-xs text-stone-500 mb-2">Create more beats to grow your Sound Royalties</p>
                <button onClick={() => setLocation("/music-studio")}
                  className="rounded-full border border-stone-700 px-4 py-2 text-xs text-stone-400 hover:border-amber-500/30 hover:text-amber-300 transition-colors">
                  <ExternalLink size={10} className="inline mr-1.5" />Open Music Studio
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── License modal ── */}
      {licenseModal && (
        <LicenseModal beat={licenseModal} onConfirm={confirmLicense} onCancel={() => setLicenseModal(null)} />
      )}
    </div>
  );
}
