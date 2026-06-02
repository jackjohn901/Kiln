import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, Package, ArrowRight, Clock, AlertCircle, ShoppingBag, Printer, Download, Link2, Copy, Check, Loader2, LogIn } from "lucide-react";
import Nav from "@/components/Nav";
import { useCart } from "@/contexts/CartContext";
import { formatProcessingWindowLabel } from "@/utils/paymentSettings";
import { buildReceiptHtml, sessionReceiptId } from "@/lib/receiptHtml";

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
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [processingWindowDays, setProcessingWindowDays] = useState<number | null>(null);
  const [processingWindowLabel, setProcessingWindowLabel] = useState<string | null>(null);
  const [perSellerWindows, setPerSellerWindows] = useState<{ sellerName: string; days: number | null; label: string | null }[]>([]);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const orderCreated = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/cart");
      return;
    }

    setSessionKey(sessionId);

    clearCart();

    // Apply a cached hint immediately so the UI isn't blank while the API responds.
    // This is a best-effort early display only; the authoritative value comes from
    // the order record returned by /api/me/orders/bulk below.
    // Both manual-payout and Connect orders now persist this before the Stripe redirect.
    try {
      const cached = localStorage.getItem("kiln_processing_window");
      if (cached !== null) {
        const days = parseInt(cached, 10);
        if (!isNaN(days)) setProcessingWindowDays(days);
        localStorage.removeItem("kiln_processing_window");
      }
      const cachedLabel = localStorage.getItem("kiln_processing_window_label");
      if (cachedLabel !== null) {
        setProcessingWindowLabel(cachedLabel);
        localStorage.removeItem("kiln_processing_window_label");
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
            const d = await res.json() as { orderIds?: string[]; sellerIds?: string[]; processingWindowDays?: number | null; processingWindowLabel?: string | null; perSellerWindows?: { sellerName: string; days: number | null; label: string | null }[] };
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
            if (Array.isArray(d.perSellerWindows) && d.perSellerWindows.length > 0) {
              setPerSellerWindows(d.perSellerWindows);
            }
          } else if (res.status === 401) {
            // Session expired during the Stripe redirect — payment was processed but the
            // user is no longer authenticated. Order rows were created by the webhook and
            // will be visible once they sign in again. Show a friendly prompt instead of
            // an alarming error.
            setSessionExpired(true);
          } else {
            let message = "We couldn't complete your order because one or more items are no longer available. Please contact support.";
            try {
              const body = await res.json() as { error?: string };
              if (typeof body.error === "string" && body.error.trim()) {
                message = body.error.trim();
              }
            } catch {}
            setOrderError(message);
          }
          // Clean up any stale pre-checkout data from localStorage.
          try { localStorage.removeItem("kiln_pre_checkout"); } catch {}
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handlePrint() {
    const items = session?.lineItems ?? [];
    const isCart = items.length > 1;
    const totalDollars = session?.amountTotal != null ? session.amountTotal / 100 : 0;
    const refNum = sessionKey ? sessionReceiptId(sessionKey) : orderId;
    const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const processingWindowText = processingWindowLabel
      ? `Ships ${processingWindowLabel}`
      : processingWindowDays !== null
        ? `Ships within ${processingWindowDays} business day${processingWindowDays === 1 ? "" : "s"}`
        : null;

    const html = buildReceiptHtml({
      refNum,
      receiptTitle: isCart ? "Cart Receipt" : "Order Receipt",
      dateStr,
      lines: items.map(item => ({
        title: item.name,
        amount: item.amountTotal / 100,
        quantity: item.quantity > 1 ? item.quantity : null,
      })),
      total: totalDollars,
      buyerEmail: session?.customerEmail ?? null,
      processingWindow: processingWindowText,
    });

    openReceiptWindow(html, `Receipt_${refNum}`, false);
  }

  async function handleDownloadPDF() {
    const pdfOrderId = receiptOrderId;
    if (!pdfOrderId) return;
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/me/orders/${encodeURIComponent(pdfOrderId)}/receipt.pdf`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `Kiln_Receipt_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(href);
    } catch {
      // silently ignore — the print fallback still works via handlePrint
    } finally {
      setPdfLoading(false);
    }
  }

  function openReceiptWindow(html: string, title: string, autoPrint: boolean) {
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.document.title = title;
    win.focus();
    if (autoPrint) {
      setTimeout(() => win.print(), 300);
    } else {
      win.print();
    }
  }

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
            Receipt emailed to <span className="text-stone-300">{session.customerEmail}</span>
          </p>
        )}
        {session?.amountTotal && (
          <p className="text-stone-500 mb-6">
            Total paid:{" "}
            <span className="text-amber-300 font-semibold">
              ${(session.amountTotal / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </p>
        )}

        {sessionKey && (
          <div className="rounded-2xl border border-white/8 bg-stone-900/50 p-4 text-sm text-left mb-8">
            <div className="flex items-center gap-2 mb-2.5">
              <Link2 size={13} className="text-amber-400 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Shareable receipt link</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/orders/cart/${sessionKey}`}>
                <span className="flex-1 font-mono text-xs text-amber-300 hover:text-amber-200 truncate cursor-pointer underline underline-offset-2 decoration-amber-500/40">
                  {`${window.location.origin}/kiln/orders/cart/${sessionKey}`}
                </span>
              </Link>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}/kiln/orders/cart/${sessionKey}`).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-stone-300 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {sessionExpired && (
          <div className="rounded-2xl border border-stone-600/40 bg-stone-800/50 p-5 text-sm text-left mb-6">
            <div className="flex items-start gap-3">
              <LogIn size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-stone-200 font-semibold mb-1">Sign in to view your order details</p>
                <p className="text-stone-400 leading-relaxed">
                  Your payment went through. Sign in to see your full order history and track this purchase.
                </p>
                <a
                  href="/api/login?returnTo=/kiln/orders"
                  className="inline-flex items-center gap-1.5 mt-3 text-amber-400 hover:text-amber-300 text-xs font-medium underline underline-offset-2 decoration-amber-500/40 transition-colors"
                >
                  Sign in to view order history
                </a>
              </div>
            </div>
          </div>
        )}

        {orderError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-left mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-semibold mb-1">Order could not be recorded</p>
                <p className="text-stone-400 leading-relaxed">
                  {orderError}
                </p>
                <p className="text-stone-500 text-xs mt-3">
                  Your payment was processed by Stripe. If you were charged, please{" "}
                  <Link href="/messages">
                    <span className="text-amber-400 underline cursor-pointer">contact support</span>
                  </Link>{" "}
                  with your session reference and we will make it right.
                </p>
              </div>
            </div>
          </div>
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
        <div className="rounded-2xl border border-white/8 bg-stone-900/50 p-5 text-sm text-stone-400 text-left space-y-3 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Fulfillment</p>
          {perSellerWindows.length > 1 ? (
            /* Multi-seller: show per-artist processing windows */
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-300 mb-2">Processing time by artist</p>
                <ul className="space-y-1.5">
                  {perSellerWindows.map((w, i) => (
                    <li key={i} className="flex items-center justify-between text-xs">
                      <span className="text-stone-300 font-medium">{w.sellerName}</span>
                      <span className="text-stone-400 tabular-nums">
                        {formatProcessingWindowLabel(w.days, w.label) ?? "Not specified"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (processingWindowLabel !== null || processingWindowDays !== null) ? (
            /* Single seller: show the existing single-value display */
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  Ships{" "}
                  {formatProcessingWindowLabel(processingWindowDays, processingWindowLabel) ?? `within ${processingWindowDays} business days`}
                </p>
                <p className="text-xs text-stone-600 mt-0.5">
                  The artist will prepare your order within this time.
                </p>
              </div>
            </div>
          ) : null}
          <div className="flex items-start gap-2.5">
            <Package size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <p>The artist will be notified and will reach out within 2–3 business days with shipping details.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <p>Estimated delivery: 5–10 business days after shipment.</p>
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
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-full border border-white/10 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors"
          >
            <Printer size={14} />
            Print receipt
          </button>
          <button
            onClick={() => { void handleDownloadPDF(); }}
            disabled={pdfLoading || !receiptOrderId}
            className="flex items-center gap-2 rounded-full border border-white/10 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors disabled:opacity-60"
          >
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {pdfLoading ? "Generating…" : "Download PDF"}
          </button>
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
