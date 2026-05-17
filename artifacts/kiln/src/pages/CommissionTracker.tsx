import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, CheckCircle, Circle, Clock, MessageCircle, DollarSign, Image, Truck, Package, Star, Loader2, ChevronRight } from "lucide-react";
import Nav from "@/components/Nav";

interface Commission {
  id: string;
  artistId: string;
  artistName: string;
  clientId: string;
  clientName: string;
  workType: string | null;
  description: string;
  budgetRange: string | null;
  timeline: string | null;
  status: string;
  quotedPrice: number | null;
  depositPaid: boolean;
  depositAmount: number | null;
  finalPaid: boolean;
  artistNotes: string | null;
  milestone: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
}

const MILESTONE_TEMPLATES = [
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

const STATUS_COLORS: Record<string, string> = {
  pending: "text-stone-400 bg-stone-800 border-stone-700",
  accepted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  in_progress: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  completed: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  declined: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  cancelled: "text-stone-500 bg-stone-800 border-stone-700",
};

function getMilestoneIndex(commission: Commission): number {
  if (commission.status === "completed" || commission.finalPaid) return 8;
  if (commission.milestone === "delivered") return 7;
  if (commission.milestone === "shipped") return 6;
  if (commission.milestone === "complete") return 5;
  if (commission.milestone === "progress") return 4;
  if (commission.milestone === "production" || commission.status === "in_progress") return 3;
  if (commission.milestone === "design") return 2;
  if (commission.depositPaid) return 1;
  return 0;
}

function CommissionCard({ commission, isArtist, onUpdate }: { commission: Commission; isArtist: boolean; onUpdate: (id: string, updates: Partial<Commission>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const progressIndex = getMilestoneIndex(commission);

  async function handlePayDeposit() {
    if (!commission.quotedPrice) return;
    setUpdating(true);
    try {
      const depositAmount = Math.round(commission.quotedPrice * 0.3);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: [{
            name: `Deposit — ${commission.workType ?? "Custom Commission"}`,
            price: depositAmount,
            quantity: 1,
            artistName: commission.artistName,
          }],
          successPath: `/commission-tracker?deposit_paid=${commission.id}`,
          cancelPath: "/commission-tracker",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setUpdating(false);
      }
    } catch {
      setUpdating(false);
    }
  }

  const updateCommission = async (updates: Partial<Commission>) => {
    setUpdating(true);
    try {
      const r = await fetch(`/api/commissions/${commission.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (r.ok) { const data = await r.json(); onUpdate(commission.id, data); }
    } catch {}
    setUpdating(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-stone-900/50 overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-stone-100 truncate">
                {commission.workType ?? "Commission"} — {isArtist ? commission.clientName : commission.artistName}
              </p>
            </div>
            <p className="text-xs text-stone-500 line-clamp-1">{commission.description}</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[commission.status] ?? STATUS_COLORS.pending}`}>
              {commission.status.replace(/_/g, " ")}
            </span>
            <ChevronRight size={14} className={`text-stone-600 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-stone-600">
          {commission.quotedPrice && <span className="text-amber-400 font-semibold">${commission.quotedPrice.toLocaleString()}</span>}
          {commission.budgetRange && !commission.quotedPrice && <span>{commission.budgetRange}</span>}
          <span>{new Date(commission.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          {commission.estimatedDelivery && <span>Est. {new Date(commission.estimatedDelivery).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</span>}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          <p className="text-xs text-stone-400 leading-relaxed">{commission.description}</p>

          {commission.status !== "pending" && commission.status !== "declined" && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-600 mb-2">Progress</p>
              <div className="space-y-2">
                {MILESTONE_TEMPLATES.map((m, i) => {
                  const Icon = m.icon;
                  const status = i < progressIndex ? "completed" : i === progressIndex ? "active" : "pending";
                  return (
                    <div key={m.id} className={`flex items-center gap-3 text-xs ${status === "pending" ? "opacity-40" : ""}`}>
                      {status === "completed" ? <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" /> :
                        status === "active" ? <Circle size={14} className="text-amber-400 flex-shrink-0 animate-pulse" /> :
                          <Circle size={14} className="text-stone-700 flex-shrink-0" />}
                      <span className={status === "active" ? "text-amber-300 font-medium" : status === "completed" ? "text-stone-400 line-through" : "text-stone-600"}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {commission.artistNotes && (
            <div className="rounded-xl bg-stone-800/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-stone-600 mb-1">Notes</p>
              <p className="text-xs text-stone-400">{commission.artistNotes}</p>
            </div>
          )}

          {isArtist && commission.status === "pending" && (
            <div className="flex gap-2">
              <button onClick={() => updateCommission({ status: "accepted" })} disabled={updating}
                className="flex-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 py-2 hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                {updating ? "..." : "Accept"}
              </button>
              <button onClick={() => updateCommission({ status: "declined" })} disabled={updating}
                className="flex-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 py-2 hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                Decline
              </button>
            </div>
          )}

          {isArtist && commission.status === "accepted" && (
            <button onClick={() => updateCommission({ status: "in_progress", milestone: "production" })} disabled={updating}
              className="w-full rounded-full bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 py-2 hover:bg-amber-500/30 transition-colors disabled:opacity-50">
              {updating ? "..." : "Mark as In Progress"}
            </button>
          )}

          {isArtist && commission.status === "in_progress" && !commission.depositPaid && (
            <button onClick={() => updateCommission({ depositPaid: true, depositAmount: commission.quotedPrice ? Math.round(commission.quotedPrice * 0.3) : undefined })} disabled={updating}
              className="w-full rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 py-2 hover:bg-blue-500/20 transition-colors">
              {updating ? "..." : "Mark Deposit Received"}
            </button>
          )}

          {!isArtist && commission.status === "accepted" && !commission.depositPaid && !!commission.quotedPrice && (
            <button onClick={handlePayDeposit} disabled={updating}
              className="w-full rounded-full bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 py-2 hover:bg-amber-500/30 transition-colors disabled:opacity-50">
              {updating ? "Redirecting…" : `Pay Deposit (30% · $${Math.round(commission.quotedPrice * 0.3).toLocaleString()})`}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function CommissionTracker() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "active" | "received">("all");

  useEffect(() => {
    fetch("/api/me/commissions", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setCommissions(data.commissions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Handle return from Stripe deposit payment
    const params = new URLSearchParams(window.location.search);
    const depositPaidId = params.get("deposit_paid");
    if (depositPaidId) {
      setCommissions(prev => prev.map(c => c.id === depositPaidId ? { ...c, depositPaid: true } : c));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleUpdate = (id: string, updates: Partial<Commission>) => {
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const filtered = commissions.filter(c => {
    if (tab === "active") return !["completed", "declined", "cancelled"].includes(c.status);
    return true;
  });

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/commissions" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Commission Tracker</h1>
            <p className="mt-0.5 text-sm text-stone-500">Track all your commissions and projects.</p>
          </div>
        </div>

        <div className="mb-6 flex gap-1 rounded-xl bg-stone-900/50 p-1 border border-white/5">
          {([{ key: "all", label: "All" }, { key: "active", label: "Active" }] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${tab === t.key ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <MessageCircle size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">No commissions yet.</p>
            <Link href="/discover" className="mt-3 inline-flex items-center gap-1 rounded-full border border-amber-500/30 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
              Find artists to commission
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(commission => (
              <CommissionCard key={commission.id} commission={commission} isArtist={false} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
