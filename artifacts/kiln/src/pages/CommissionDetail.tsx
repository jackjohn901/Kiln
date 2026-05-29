import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, CheckCircle, Circle, Clock, DollarSign,
  Image, Truck, Package, Star, Loader2,
} from "lucide-react";
import Nav from "@/components/Nav";
import RelativeTime from "@/components/RelativeTime";
import { useSocial } from "@/contexts/SocialContext";
import { useAuth } from "@/contexts/AuthContext";

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
  { id: "deposit", label: "Deposit paid", icon: DollarSign },
  { id: "design", label: "Design approved", icon: Image },
  { id: "production", label: "In production", icon: Clock },
  { id: "progress", label: "Progress photos shared", icon: Image },
  { id: "complete", label: "Piece completed", icon: CheckCircle },
  { id: "shipped", label: "Shipped", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Package },
  { id: "balance", label: "Final payment", icon: DollarSign },
  { id: "review", label: "Review left", icon: Star },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "text-stone-400 bg-stone-800 border-stone-700",
  quoted: "text-violet-400 bg-violet-500/10 border-violet-500/30",
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

export default function CommissionDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const { markCommissionPaymentRead, markLinkRead } = useSocial();
  const { user } = useAuth();
  const [commission, setCommission] = useState<Commission | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);

  async function handleAcceptQuote() {
    if (!commission) return;
    setAccepting(true);
    try {
      const r = await fetch(`/api/commissions/${commission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "accepted" }),
      });
      if (r.ok) {
        const updated = await r.json() as Commission;
        setCommission(updated);
      }
    } finally {
      setAccepting(false);
    }
  }

  useEffect(() => {
    markCommissionPaymentRead(id);
    markLinkRead(`/commissions/${id}`);
  }, [id, markCommissionPaymentRead, markLinkRead]);

  useEffect(() => {
    fetch(`/api/commissions/${id}`, { credentials: "include" })
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error("Failed to load");
        return r.json() as Promise<Commission>;
      })
      .then((data) => { if (data) setCommission(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const isArtist = commission?.artistId === user?.id;
  const progressIndex = commission ? getMilestoneIndex(commission) : 0;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-28 pt-6 md:pb-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/commissions"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors"
          >
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Commission Detail</h1>
            <p className="mt-0.5 text-sm text-stone-500">Review your commission request.</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        )}

        {!loading && notFound && (
          <div className="py-20 text-center">
            <p className="text-stone-500 text-sm">Commission not found.</p>
            <Link
              href="/commissions"
              className="mt-4 inline-flex items-center gap-1 rounded-full border border-amber-500/30 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              Back to commissions
            </Link>
          </div>
        )}

        {!loading && commission && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/8 bg-stone-900/50 overflow-hidden"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-stone-100 mb-1">
                    {commission.workType ?? "Commission"} —{" "}
                    {isArtist ? commission.clientName : commission.artistName}
                  </p>
                  <p className="text-sm text-stone-400 leading-relaxed">{commission.description}</p>
                </div>
                <span
                  className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[commission.status] ?? STATUS_COLORS.pending}`}
                >
                  {commission.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                {commission.quotedPrice && (
                  <span className="text-amber-400 font-semibold">
                    ${commission.quotedPrice.toLocaleString()}
                  </span>
                )}
                {commission.budgetRange && !commission.quotedPrice && (
                  <span>{commission.budgetRange}</span>
                )}
                {commission.timeline && <span>Timeline: {commission.timeline}</span>}
                <span>
                  Opened <RelativeTime since={commission.createdAt} className="text-xs text-stone-500" />
                </span>
                {commission.estimatedDelivery && (
                  <span>
                    Est.{" "}
                    {new Date(commission.estimatedDelivery).toLocaleDateString("en-US", {
                      month: "short",
                      year: "2-digit",
                    })}
                  </span>
                )}
              </div>

              {!isArtist && commission.status === "quoted" && (
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/8 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-wider text-violet-400/70">Quote received</p>
                    {commission.quotedPrice && (
                      <span className="text-xl font-bold text-violet-300">${commission.quotedPrice.toLocaleString()}</span>
                    )}
                  </div>
                  {commission.artistNotes && (
                    <p className="text-xs text-stone-300 leading-relaxed">{commission.artistNotes}</p>
                  )}
                  <button
                    onClick={handleAcceptQuote}
                    disabled={accepting}
                    className="w-full rounded-full bg-violet-500/20 border border-violet-500/40 text-xs text-violet-300 py-2.5 font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-50"
                  >
                    {accepting ? "Accepting…" : "Accept Quote"}
                  </button>
                </div>
              )}

              {commission.status !== "pending" && commission.status !== "declined" && commission.status !== "quoted" && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-600 mb-3">Progress</p>
                  <div className="space-y-2">
                    {MILESTONE_TEMPLATES.map((m, i) => {
                      const status =
                        i < progressIndex ? "completed" : i === progressIndex ? "active" : "pending";
                      return (
                        <div
                          key={m.id}
                          className={`flex items-center gap-3 text-xs ${status === "pending" ? "opacity-40" : ""}`}
                        >
                          {status === "completed" ? (
                            <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                          ) : status === "active" ? (
                            <Circle size={14} className="text-amber-400 flex-shrink-0 animate-pulse" />
                          ) : (
                            <Circle size={14} className="text-stone-700 flex-shrink-0" />
                          )}
                          <span
                            className={
                              status === "active"
                                ? "text-amber-300 font-medium"
                                : status === "completed"
                                ? "text-stone-400 line-through"
                                : "text-stone-600"
                            }
                          >
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {commission.artistNotes && !(commission.status === "quoted" && !isArtist) && (
                <div className="rounded-xl bg-stone-800/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-stone-600 mb-1">Artist notes</p>
                  <p className="text-xs text-stone-400">{commission.artistNotes}</p>
                </div>
              )}

              <div className="pt-2 border-t border-white/5">
                <Link
                  href="/commissions"
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <ChevronLeft size={12} /> All Commissions
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
