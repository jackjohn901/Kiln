import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, Package, ArrowRight, Clock, AlertCircle, ShoppingBag } from "lucide-react";
import Nav from "@/components/Nav";
import { useCart } from "@/contexts/CartContext";

interface LineItem {
  name: string;
  quantity: number;
  amountTotal: number;
}

interface SessionData {
  status: string;
  customerEmail: string | null;
  amountTotal: number | null;
  manualPayout: boolean;
  lineItems: LineItem[];
}

export default function CartSuccess() {
  const [, navigate] = useLocation();
  const { clearCart } = useCart();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState<string>(() => "KLN-" + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);
  const [processingWindowDays, setProcessingWindowDays] = useState<number | null>(null);
  const [processingWindowLabel, setProcessingWindowLabel] = useState<string | null>(null);
  const orderCreated = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/cart");
      return;
    }

    clearCart();

    // Apply a cached hint immediately so the UI isn't blank while the API responds.
    // This is a best-effort early display only; the authoritative value comes from
    // the order record returned by /api/me/orders/bulk below.
    try {
      const cached = localStorage.getItem("kiln_processing_window");
      if (cached !== null) {
        const days = parseInt(cached, 10);
        if (!isNaN(days)) setProcessingWindowDays(days);
        localStorage.removeItem("kiln_processing_window");
      }
    } catch {}

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
            const d = await res.json() as { orderIds?: string[]; sellerIds?: string[]; processingWindowDays?: number | null; processingWindowLabel?: string | null };
            if (d.orderIds?.[0]) {
              setOrderId("KLN-" + d.orderIds[0].slice(0, 8).toUpperCase());
              setReceiptOrderId(d.orderIds[0]);
            }

            // Use the processing window stored on the order record — authoritative snapshot
            // taken at purchase time, reliable across page refreshes and localStorage clears.
            if (typeof d.processingWindowDays === "number") {
              setProcessingWindowDays(d.processingWindowDays);
            }
            if (typeof d.processingWindowLabel === "string" && d.processingWindowLabel.trim()) {
              setProcessingWindowLabel(d.processingWindowLabel.trim());
            }
          }
          // Clean up any stale pre-checkout data from localStorage.
          try { localStorage.removeItem("kiln_pre_checkout"); } catch {}
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

  const isManual = session?.manualPayout === true;

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

        {/* Manual payout expanded notice */}
        {isManual && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-5 text-sm text-left mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-200 font-semibold mb-1">Manual fulfillment in progress</p>
                <p className="text-stone-400 leading-relaxed">
                  This artist processes payments directly. Your order has been recorded and the artist has
                  been notified. Expect a reply within <span className="text-amber-300 font-medium">2–5 business days</span> with
                  payment instructions and shipping details.
                </p>
              </div>
            </div>
            {session?.customerEmail && (
              <p className="text-stone-500 text-xs border-t border-white/8 pt-3 mt-3">
                The artist will contact you at{" "}
                <span className="text-stone-300 font-medium">{session.customerEmail}</span>.
                Keep an eye on your inbox.
              </p>
            )}
          </div>
        )}

        {/* Itemised line items (shown for manual payout orders) */}
        {isManual && session?.lineItems && session.lineItems.length > 0 && (
          <div className="rounded-2xl border border-white/8 bg-stone-900/50 p-5 text-sm text-left mb-6">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag size={14} className="text-amber-400" />
              <span className="text-stone-300 font-medium">Order summary</span>
            </div>
            <ul className="space-y-2 divide-y divide-white/6">
              {session.lineItems.map((item, i) => (
                <li key={i} className="flex items-center justify-between pt-2 first:pt-0">
                  <span className="text-stone-300 flex-1 pr-4">
                    {item.name}
                    {item.quantity > 1 && (
                      <span className="text-stone-500 ml-1">× {item.quantity}</span>
                    )}
                  </span>
                  <span className="text-amber-300 font-medium tabular-nums shrink-0">
                    ${(item.amountTotal / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Standard fulfillment info box */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/50 p-5 text-sm text-stone-400 text-left space-y-2 mb-8">
          {(processingWindowLabel !== null || processingWindowDays !== null) && (
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-400 shrink-0" />
              <span>
                Delivery estimate:{" "}
                <span className="text-amber-300 font-medium">
                  {processingWindowLabel
                    ? processingWindowLabel
                    : processingWindowDays === 1
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

        <div className="flex gap-3 justify-center flex-wrap">
          {receiptOrderId ? (
            <Link href={`/orders/${receiptOrderId}`}>
              <button className="flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                View Receipt <ArrowRight size={14} />
              </button>
            </Link>
          ) : (
            <Link href="/orders">
              <button className="flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
                View Orders <ArrowRight size={14} />
              </button>
            </Link>
          )}
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
