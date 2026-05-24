import { useState, useEffect, useRef } from "react";
import { Check, X, Loader2, ChevronRight } from "lucide-react";

type ActionState =
  | "loading"
  | "idle"
  | "quoting"
  | "saving"
  | "accepted"
  | "quoted"
  | "declined"
  | "other"
  | "error";

interface Props {
  commissionId: string;
}

function statusToActionState(status: string): ActionState {
  if (status === "pending") return "idle";
  if (status === "quoted") return "quoted";
  if (status === "in_progress" || status === "revision" || status === "completed") return "accepted";
  if (status === "declined" || status === "cancelled") return "declined";
  return "other";
}

export default function CommissionInlineActions({ commissionId }: Props) {
  const [state, setState] = useState<ActionState>("loading");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/commissions/${commissionId}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setState(statusToActionState(data.status ?? "pending"));
      })
      .catch(() => {
        if (!cancelled) setState("idle");
      });
    return () => { cancelled = true; };
  }, [commissionId]);

  useEffect(() => {
    if (state === "quoting") {
      setTimeout(() => priceRef.current?.focus(), 50);
    }
  }, [state]);

  async function handleDecline() {
    setState("saving");
    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "declined" }),
      });
      setState(res.ok ? "declined" : "error");
    } catch {
      setState("error");
    }
  }

  async function handleQuoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setState("saving");
    const trimmedPrice = price.trim();
    const trimmedNotes = notes.trim();
    const body: Record<string, unknown> = trimmedPrice
      ? { status: "quoted", quotedPrice: parseFloat(trimmedPrice), ...(trimmedNotes && { artistNotes: trimmedNotes }) }
      : { status: "in_progress", ...(trimmedNotes && { artistNotes: trimmedNotes }) };
    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setState(trimmedPrice ? "quoted" : "accepted");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "loading" || state === "saving") {
    return (
      <div className="mt-2 flex items-center gap-1.5">
        <Loader2 size={12} className="animate-spin text-stone-500" />
        <span className="text-xs text-stone-500">{state === "loading" ? "Loading…" : "Updating…"}</span>
      </div>
    );
  }

  if (state === "quoted") {
    return (
      <div className="mt-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
          <Check size={10} /> Quote sent
        </span>
      </div>
    );
  }

  if (state === "accepted") {
    return (
      <div className="mt-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
          <Check size={10} /> Accepted
        </span>
      </div>
    );
  }

  if (state === "declined") {
    return (
      <div className="mt-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
          <X size={10} /> Declined
        </span>
      </div>
    );
  }

  if (state === "other") {
    return (
      <div className="mt-2">
        <span className="text-xs text-stone-500">Commission resolved</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mt-2">
        <span className="text-xs text-stone-500">Could not update — already resolved?</span>
      </div>
    );
  }

  if (state === "quoting") {
    return (
      <form
        onSubmit={handleQuoteSubmit}
        onClick={(e) => e.stopPropagation()}
        className="mt-3 space-y-2"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">$</span>
            <input
              ref={priceRef}
              type="number"
              min="0"
              step="0.01"
              placeholder="Quote price (optional)"
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
            {price.trim() ? (
              <>Send quote <ChevronRight size={10} /></>
            ) : (
              <>Accept <Check size={10} /></>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setState("idle"); }}
            className="rounded-full px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-stone-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setState("quoting"); }}
        className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors"
      >
        Accept
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleDecline(); }}
        className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors"
      >
        Decline
      </button>
    </div>
  );
}
