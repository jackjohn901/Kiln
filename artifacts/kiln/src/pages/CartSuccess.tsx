import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import Nav from "@/components/Nav";
import { useCart } from "@/contexts/CartContext";

interface SessionData {
  status: string;
  customerEmail: string | null;
  amountTotal: number | null;
}

export default function CartSuccess() {
  const [, navigate] = useLocation();
  const { clearCart } = useCart();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/cart");
      return;
    }

    clearCart();

    fetch(`/api/stripe/session/${sessionId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setSession(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  const orderId = "KLN-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
          <CheckCircle size={36} className="text-emerald-400" />
        </div>

        <h1 className="font-serif text-3xl text-amber-100 mb-2">Order Complete!</h1>
        <p className="text-stone-400 mb-1">Reference <span className="font-mono text-amber-300">{orderId}</span></p>
        {session?.customerEmail && (
          <p className="text-sm text-stone-500 mb-6">
            Confirmation sent to <span className="text-stone-300">{session.customerEmail}</span>
          </p>
        )}
        {session?.amountTotal && (
          <p className="text-stone-500 mb-8">
            Total paid:{" "}
            <span className="text-amber-300 font-semibold">
              ${(session.amountTotal / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </p>
        )}

        <div className="rounded-2xl border border-white/8 bg-stone-900/50 p-5 text-sm text-stone-400 text-left space-y-2 mb-8">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-amber-400 shrink-0" />
            <span>The artist will be notified and will reach out within 2–3 business days with shipping details.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
            <span>Estimated delivery: 5–10 business days after shipment.</span>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <Link href="/shop">
            <button className="flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
              Continue Shopping <ArrowRight size={14} />
            </button>
          </Link>
          <Link href="/">
            <button className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
              Back to Feed
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
