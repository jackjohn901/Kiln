import { useState, useEffect, useRef } from "react";
import { Check, X, Loader2, ChevronRight, Clock, Wrench, RotateCcw, CheckCircle, MinusCircle, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type ActionState =
  | "loading"
  | "idle"
  | "quoting"
  | "saving"
  | "resolved"
  | "error";

type DbStatus =
  | "pending"
  | "quoted"
  | "accepted"
  | "in_progress"
  | "revision"
  | "completed"
  | "declined"
  | "cancelled"
  | string;

interface StatusBadgeProps {
  status: DbStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-stone-700/60 px-2 py-0.5 text-xs font-medium text-stone-400">
        <Clock size={10} /> Pending
      </span>
    );
  }
  if (status === "quoted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
        <Check size={10} /> Quote Sent
      </span>
    );
  }
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
        <Check size={10} /> Accepted
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
        <Wrench size={10} /> In Progress
      </span>
    );
  }
  if (status === "revision") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
        <RotateCcw size={10} /> Revision
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
        <CheckCircle size={10} /> Completed
      </span>
    );
  }
  if (status === "declined") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
        <X size={10} /> Declined
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-stone-600/40 px-2 py-0.5 text-xs font-medium text-stone-500">
        <MinusCircle size={10} /> Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-700/60 px-2 py-0.5 text-xs font-medium text-stone-500">
      Resolved
    </span>
  );
}

interface Props {
  commissionId: string;
  initialStatus?: DbStatus;
  onStatusChange?: (newStatus: string) => void;
}

export default function CommissionInlineActions({ commissionId, initialStatus, onStatusChange }: Props) {
  const { user } = useAuth();
  const [actionState, setActionState] = useState<ActionState>(initialStatus ? (initialStatus === "pending" ? "idle" : "resolved") : "loading");
  const [dbStatus, setDbStatus] = useState<DbStatus>(initialStatus ?? "pending");
  const [role, setRole] = useState<"artist" | "buyer" | null>(null);
  const [quotedPrice, setQuotedPrice] = useState<number | null>(null);
  const [artistNotes, setArtistNotes] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialStatus !== undefined) return;
    let cancelled = false;
    fetch(`/api/commissions/${commissionId}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const status: DbStatus = data.status ?? "pending";
        setDbStatus(status);
        if (data.quotedPrice != null) setQuotedPrice(Number(data.quotedPrice));
        if (typeof data.artistNotes === "string" && data.artistNotes.trim()) {
          setArtistNotes(data.artistNotes.trim());
        }
        const detectedRole: "artist" | "buyer" = user?.id === data.clientId ? "buyer" : "artist";
        setRole(detectedRole);
        if (status === "pending" && detectedRole === "artist") {
          setActionState("idle");
        } else if (status === "quoted" && detectedRole === "buyer") {
          setActionState("idle");
        } else {
          setActionState("resolved");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDbStatus("pending");
          setActionState("idle");
        }
      });
    return () => { cancelled = true; };
  }, [commissionId, initialStatus, user?.id]);

  useEffect(() => {
    if (actionState === "quoting") {
      setTimeout(() => priceRef.current?.focus(), 50);
    }
  }, [actionState]);

  async function handleDecline() {
    setActionState("saving");
    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "declined" }),
      });
      if (res.ok) {
        setDbStatus("declined");
        setActionState("resolved");
        onStatusChange?.("declined");
      } else {
        setActionState("error");
      }
    } catch {
      setActionState("error");
    }
  }

  async function handleCancel() {
    setActionState("saving");
    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        setDbStatus("cancelled");
        setActionState("resolved");
        onStatusChange?.("cancelled");
      } else {
        setActionState("error");
      }
    } catch {
      setActionState("error");
    }
  }

  async function handleAccept() {
    setActionState("saving");
    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "accepted" }),
      });
      if (res.ok) {
        setDbStatus("accepted");
        setActionState("resolved");
        onStatusChange?.("accepted");
      } else {
        setActionState("error");
      }
    } catch {
      setActionState("error");
    }
  }

  async function handleQuoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActionState("saving");
    const trimmedPrice = price.trim();
    const trimmedNotes = notes.trim();
    const body: Record<string, unknown> = {
      status: "quoted",
      ...(trimmedPrice && { quotedPrice: parseFloat(trimmedPrice) }),
      ...(trimmedNotes && { artistNotes: trimmedNotes }),
    };
    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDbStatus("quoted");
        setActionState("resolved");
        onStatusChange?.("quoted");
      } else {
        setActionState("error");
      }
    } catch {
      setActionState("error");
    }
  }

  if (actionState === "loading" || actionState === "saving") {
    return (
      <div className="mt-2 flex items-center gap-1.5">
        <Loader2 size={12} className="animate-spin text-stone-500" />
        <span className="text-xs text-stone-500">{actionState === "loading" ? "Loading…" : "Updating…"}</span>
      </div>
    );
  }

  if (actionState === "resolved") {
    return (
      <div className="mt-2">
        <StatusBadge status={dbStatus} />
      </div>
    );
  }

  if (actionState === "error") {
    return (
      <div className="mt-2">
        <span className="text-xs text-stone-500">Could not update — already resolved?</span>
      </div>
    );
  }

  if (actionState === "quoting") {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs text-stone-400">
          Send the buyer a price to confirm before work begins.
        </p>
        <form
          onSubmit={handleQuoteSubmit}
          onClick={(e) => e.stopPropagation()}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">$</span>
              <input
                ref={priceRef}
                type="number"
                min="0"
                step="0.01"
                placeholder="Price (optional)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg bg-stone-800 pl-6 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 border border-stone-700 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>
          <textarea
            rows={2}
            placeholder="Notes to buyer (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 border border-stone-700 focus:outline-none focus:border-amber-500/60 resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/30 transition-colors"
            >
              Send Quote <ChevronRight size={10} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActionState("idle"); }}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-stone-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (role === "buyer" && dbStatus === "quoted") {
    return (
      <div className="mt-2 space-y-2">
        {quotedPrice != null && (
          <div className="flex items-center gap-1.5">
            <DollarSign size={12} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">
              ${quotedPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-stone-500">quoted</span>
          </div>
        )}
        {artistNotes && (
          <p className="text-xs text-stone-400 whitespace-pre-wrap leading-relaxed">
            {artistNotes}
          </p>
        )}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleAccept(); }}
            className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors"
          >
            <Check size={10} /> Accept quote
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleCancel(); }}
            className="flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <X size={10} /> Decline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <StatusBadge status={dbStatus} />
      <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleAccept(); }}
          className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors"
        >
          <Check size={10} /> Accept
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setActionState("quoting"); }}
          className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/30 transition-colors"
        >
          <DollarSign size={10} /> Send Quote
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDecline(); }}
          className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
