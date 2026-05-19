import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, Package, ArrowRight, Clock } from "lucide-react";
import Nav from "@/components/Nav";
import { useCart } from "@/contexts/CartContext";

interface SessionData {
  status: string;
  customerEmail: string | null;
  amountTotal: number | null;
}

interface PaymentSettings {
  processingWindow?: number;
}

export default function CartSuccess() {
  const [, navigate] = useLocation();
  const { clearCart } = useCart();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState<string>(() => "KLN-" + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [processingWindowDays, setProcessingWindowDays] = useState<number | null>(null);
  const orderCreated = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/cart");
      return;
    }

    clearCart();

    // Read seller IDs from kiln_pre_checkout before it is cleaned up below.
    // This lets us re-fetch payment settings (including processingWindow) from the API.
    let sellerIds: string[] = [];
    try {
      const preCheckout = JSON.parse(localStorage.getItem("kiln_pre_checkout") ?? "null") as {
        items?: Array<{ sellerId?: string }>;
      } | null;
      sellerIds = [
        ...new Set(
          (preCheckout?.items ?? [])
            .map((i) => i.sellerId)
            .filter((id): id is string => !!id)
        ),
      ];
    } catch {}

    // Apply a cached hint immediately so the UI isn't blank during the API fetch.
    try {
      const cached = localStorage.getItem("kiln_processing_window");
      if (cached !== null) {
        const days = parseInt(cached, 10);
        if (!isNaN(days)) setProcessingWindowDays(days);
        localStorage.removeItem("kiln_processing_window");
      }
    } catch {}

    // Fetch processing windows from seller payment settings (authoritative source).
    if (sellerIds.length > 0) {
      Promise.all(
        sellerIds.map((id) =>
          fetch(`/api/users/${id}/payment-settings`, { credentials: "include" })
            .then((r) => r.ok ? (r.json() as Promise<PaymentSettings>) : null)
            .catch(() => null)
        )
      ).then((results) => {
        const windows = results
          .filter(Boolean)
          .map((r) => r!.processingWindow)
          .filter((w): w is number => typeof w === "number");
        if (windows.length > 0) {
          // Use the longest window so buyers get the most conservative estimate.
          setProcessingWindowDays(Math.max(...windows));
        }
      });
    }

    fetch(`/api/stripe/session/${sessionId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then(async (data: SessionData | null) => {
        setSession(data);

        if (orderCreated.current) return;
        orderCreated.current = true;

        try {
          // Server derives all order data from Stripe session metadata + DB lookups.
          // We only need to supply the session ID.
          const res = await fetch("/api/me/orders/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ stripeSessionId: sessionId }),
          });
          if (res.ok) {
            const d = await res.json() as { orderIds?: string[]; sellerIds?: string[] };
            if (d.orderIds?.[0]) setOrderId("KLN-" + d.orderIds[0].slice(0, 8).toUpperCase());

            // Use order-backed seller IDs as the authoritative source for processing window.
            // This works even on page refresh since orders are persisted in the DB.
            const orderSellerIds = d.sellerIds ?? [];
            if (orderSellerIds.length > 0) {
              Promise.all(
                orderSellerIds.map((id) =>
                  fetch(`/api/users/${id}/payment-settings`, { credentials: "include" })
                    .then((r) => r.ok ? (r.json() as Promise<PaymentSettings>) : null)
                    .catch(() => null)
                )
              ).then((results) => {
                const windows = results
                  .filter(Boolean)
                  .map((r) => r!.processingWindow)
                  .filter((w): w is number => typeof w === "number");
                if (windows.length > 0) {
                  setProcessingWindowDays(Math.max(...windows));
                }
              });
            }
          }
          // Clean up any stale pre-checkout data from localStorage.
          localStorage.removeItem("kiln_pre_checkout");
        } catch {}
      })
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
          {processingWindowDays !== null && (
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-400 shrink-0" />
              <span>
                Processing window:{" "}
                <span className="text-amber-300 font-medium">
                  {processingWindowDays === 1
                    ? "1 business day"
                    : `${processingWindowDays} business days`}
                </span>
                {" "}— the artist will prepare your order within this time.
              </span>
            </div>
          )}
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
          <Link href="/orders">
            <button className="flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
              View Orders <ArrowRight size={14} />
            </button>
          </Link>
          <Link href="/shop">
            <button className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
              Continue Shopping
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
