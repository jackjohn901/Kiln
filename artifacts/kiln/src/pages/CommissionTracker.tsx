import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, CheckCircle, Circle, Clock, MessageCircle,
  DollarSign, Image, Truck, Package, Star, ChevronRight,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";

interface Milestone {
  id: string;
  label: string;
  description: string;
  icon: typeof CheckCircle;
  completedAt?: string;
  status: "completed" | "active" | "pending";
}

const MILESTONE_TEMPLATES: Omit<Milestone, "status" | "completedAt">[] = [
  { id: "deposit", label: "Deposit paid", description: "Initial deposit received to begin the project", icon: DollarSign },
  { id: "design", label: "Design approved", description: "Final design, dimensions, and materials confirmed", icon: Image },
  { id: "production", label: "In production", description: "Work has begun in the studio", icon: Clock },
  { id: "progress", label: "Progress photos shared", description: "Mid-point studio photos sent to collector", icon: Image },
  { id: "complete", label: "Piece completed", description: "Final piece finished and photographed", icon: CheckCircle },
  { id: "shipped", label: "Shipped", description: "Piece packed and handed to carrier", icon: Truck },
  { id: "delivered", label: "Delivered", description: "Collector confirmed receipt", icon: Package },
  { id: "balance", label: "Final payment", description: "Remaining balance received", icon: DollarSign },
  { id: "review", label: "Review left", description: "Collector left a review", icon: Star },
];

function buildMilestones(progressIndex: number): Milestone[] {
  return MILESTONE_TEMPLATES.map((m, i) => ({
    ...m,
    status: i < progressIndex ? "completed" : i === progressIndex ? "active" : "pending",
    completedAt: i < progressIndex
      ? new Date(Date.now() - (progressIndex - i) * 4 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : undefined,
  }));
}

interface TrackerData {
  id: string;
  commissionTitle: string;
  collectorName: string;
  collectorAvatarUrl: string;
  artistName: string;
  artistAvatarUrl: string;
  description: string;
  totalAmount: number;
  depositAmount: number;
  startDate: string;
  expectedDelivery: string;
  progressIndex: number;
  isArtistView: boolean;
  notes: string[];
}

const SEED_TRACKERS: TrackerData[] = [
  {
    id: "track-001",
    commissionTitle: "Custom Amber Vessel",
    collectorName: "Rachel Osei",
    collectorAvatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80",
    artistName: "You",
    artistAvatarUrl: "",
    description: "Custom cast glass vessel in warm amber tones, approximately 18″ tall. For dining room installation.",
    totalAmount: 4200,
    depositAmount: 1260,
    startDate: "2026-05-08",
    expectedDelivery: "2026-08-15",
    progressIndex: 3,
    isArtistView: true,
    notes: [
      "Rachel confirmed she'd like the amber shifted slightly toward honey — less orange, more gold.",
      "Dimensions locked at 18\" H × 10\" W × 8\" D.",
    ],
  },
  {
    id: "track-002",
    commissionTitle: "Hotel Lobby Statement Piece",
    collectorName: "Mei Lin",
    collectorAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
    artistName: "You",
    artistAvatarUrl: "",
    description: "Large-scale hotel lobby installation. Warm earth tones, approximately 4′ in height. Natural light context.",
    totalAmount: 12000,
    depositAmount: 4800,
    startDate: "2026-04-20",
    expectedDelivery: "2026-10-01",
    progressIndex: 1,
    isArtistView: true,
    notes: [
      "Hotel opens November 2026 — delivery by October 1 is hard deadline.",
      "Will need site visit in September for final installation.",
    ],
  },
];

function ProgressRing({ progress }: { progress: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width="56" height="56" className="-rotate-90">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#292524" strokeWidth="4" />
      <circle
        cx="28" cy="28" r={r} fill="none"
        stroke="#f59e0b" strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

export default function CommissionTracker() {
  const { receivedInquiries } = useSocial();
  const [selected, setSelected] = useState<string | null>(SEED_TRACKERS[0]?.id ?? null);

  const tracker = SEED_TRACKERS.find((t) => t.id === selected);
  const milestones = tracker ? buildMilestones(tracker.progressIndex) : [];
  const progress = tracker ? Math.round((tracker.progressIndex / (MILESTONE_TEMPLATES.length - 1)) * 100) : 0;

  const accepted = receivedInquiries.filter((i) => i.status === "accepted");

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 pb-24">
      <Nav />
      <div className="mx-auto max-w-lg px-4 pt-4">
        <Link href="/inbox" className="mb-4 flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200 transition-colors">
          <ChevronLeft size={16} /> Commission Inbox
        </Link>

        <h1 className="mb-1 text-xl font-bold text-white">Commission Tracker</h1>
        <p className="mb-5 text-sm text-stone-500">Track progress on accepted commissions — shared with your collectors.</p>

        {/* Commission list */}
        <div className="mb-6 space-y-3">
          {SEED_TRACKERS.map((t) => {
            const prog = Math.round((t.progressIndex / (MILESTONE_TEMPLATES.length - 1)) * 100);
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  selected === t.id
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-white/5 bg-stone-900 hover:border-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ProgressRing progress={prog} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{t.commissionTitle}</p>
                    <p className="text-xs text-stone-400">For {t.collectorName}</p>
                    <p className="mt-1 text-[10px] text-stone-600">
                      {prog}% complete · Due {new Date(t.expectedDelivery).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-stone-700 shrink-0" />
                </div>
              </button>
            );
          })}

          {accepted.length > 0 && accepted.map((inq) => (
            <div key={inq.id} className="rounded-2xl border border-white/5 bg-stone-900 p-4 opacity-60">
              <p className="text-xs font-medium text-stone-400">From {inq.fromName}</p>
              <p className="text-sm text-white mt-0.5 truncate">{inq.description.slice(0, 60)}…</p>
              <p className="mt-1 text-[10px] text-stone-600">Tracker not yet started</p>
            </div>
          ))}

          {SEED_TRACKERS.length === 0 && accepted.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-800 p-8 text-center">
              <Clock size={28} className="mx-auto mb-2 text-stone-700" />
              <p className="text-sm text-stone-500">No active commissions yet.</p>
              <Link href="/inbox" className="mt-2 inline-block text-xs text-amber-400 hover:underline">View commission inbox →</Link>
            </div>
          )}
        </div>

        {/* Detail view */}
        {tracker && (
          <motion.div
            key={tracker.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Header card */}
            <div className="rounded-2xl bg-stone-900 border border-white/5 p-4">
              <div className="flex items-start gap-3">
                <img src={tracker.collectorAvatarUrl} alt={tracker.collectorName} className="h-10 w-10 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-white">{tracker.commissionTitle}</h2>
                  <p className="text-xs text-stone-400">Collector: {tracker.collectorName}</p>
                  <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">{tracker.description}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-4">
                <div>
                  <p className="text-[10px] text-stone-600">Total</p>
                  <p className="text-sm font-bold text-white">${tracker.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-600">Deposit</p>
                  <p className="text-sm font-bold text-emerald-400">${tracker.depositAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-600">Balance</p>
                  <p className="text-sm font-bold text-amber-400">${(tracker.totalAmount - tracker.depositAmount).toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                <div>
                  <p className="text-[10px] text-stone-600">Started</p>
                  <p className="text-xs text-stone-300">{new Date(tracker.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-stone-600">Expected delivery</p>
                  <p className="text-xs text-amber-300">{new Date(tracker.expectedDelivery).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>

              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-stone-800 py-2 text-xs font-medium text-stone-300 hover:bg-stone-700 transition-colors">
                <MessageCircle size={13} /> Message {tracker.collectorName}
              </button>
            </div>

            {/* Milestones */}
            <div className="rounded-2xl bg-stone-900 border border-white/5 p-4">
              <h3 className="mb-4 text-sm font-semibold text-stone-300">Milestones</h3>
              <div className="space-y-1">
                {milestones.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.id} className="flex gap-3">
                      {/* Line connector */}
                      <div className="flex flex-col items-center">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                          m.status === "completed" ? "border-amber-500 bg-amber-500/20" :
                          m.status === "active" ? "border-amber-400 bg-amber-500/10 ring-2 ring-amber-500/20" :
                          "border-stone-700 bg-stone-800"
                        }`}>
                          {m.status === "completed" ? (
                            <CheckCircle size={13} className="text-amber-400" />
                          ) : m.status === "active" ? (
                            <Icon size={13} className="text-amber-400 animate-pulse" />
                          ) : (
                            <Circle size={13} className="text-stone-600" />
                          )}
                        </div>
                        {i < milestones.length - 1 && (
                          <div className={`w-0.5 flex-1 my-0.5 min-h-[12px] ${m.status === "completed" ? "bg-amber-500/40" : "bg-stone-800"}`} />
                        )}
                      </div>
                      {/* Content */}
                      <div className={`pb-4 flex-1 min-w-0 ${i === milestones.length - 1 ? "pb-0" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium ${
                            m.status === "completed" ? "text-stone-300" :
                            m.status === "active" ? "text-white" : "text-stone-600"
                          }`}>{m.label}</p>
                          {m.completedAt && (
                            <span className="text-[10px] text-stone-600 shrink-0">{m.completedAt}</span>
                          )}
                          {m.status === "active" && (
                            <span className="shrink-0 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">Active</span>
                          )}
                        </div>
                        <p className={`text-[11px] leading-relaxed ${m.status === "pending" ? "text-stone-700" : "text-stone-500"}`}>
                          {m.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Advance milestone button */}
              {tracker.progressIndex < MILESTONE_TEMPLATES.length - 1 && (
                <button className="mt-4 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                  Mark next step complete →
                </button>
              )}
            </div>

            {/* Notes */}
            {tracker.notes.length > 0 && (
              <div className="rounded-2xl bg-stone-900 border border-white/5 p-4">
                <h3 className="mb-3 text-sm font-semibold text-stone-300">Project notes</h3>
                <ul className="space-y-2">
                  {tracker.notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-stone-400">
                      <span className="mt-0.5 shrink-0 h-1.5 w-1.5 rounded-full bg-amber-500/60" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
