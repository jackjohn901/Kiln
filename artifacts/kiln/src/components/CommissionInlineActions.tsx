import { useState, useEffect } from "react";
import { Check, X, Loader2 } from "lucide-react";

type ActionState = "loading" | "idle" | "saving" | "accepted" | "declined" | "other" | "error";

interface Props {
  commissionId: string;
}

function statusToActionState(status: string): ActionState {
  if (status === "pending") return "idle";
  if (status === "in_progress" || status === "quoted" || status === "revision" || status === "completed") return "accepted";
  if (status === "declined" || status === "cancelled") return "declined";
  return "other";
}

export default function CommissionInlineActions({ commissionId }: Props) {
  const [state, setState] = useState<ActionState>("loading");

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

  async function handleAction(action: "accepted" | "declined") {
    setState("saving");
    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: action === "accepted" ? "in_progress" : "declined" }),
      });
      if (res.ok) {
        setState(action);
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

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleAction("accepted"); }}
        className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors"
      >
        Accept
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); handleAction("declined"); }}
        className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors"
      >
        Decline
      </button>
    </div>
  );
}
