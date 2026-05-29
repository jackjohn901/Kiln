import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import {
  ShoppingBag, Zap, MessageSquare, BookOpen, Package, CheckCircle2,
  Clock, Truck, AlertCircle, Loader2, ChevronLeft, MapPin, FileText,
  Printer, Star, Mail, Link2, Check, Download, Pencil, X,
} from "lucide-react";
import Nav from "@/components/Nav";
import RelativeTime from "@/components/RelativeTime";
import { formatProcessingWindowLabel } from "@/utils/paymentSettings";
import { useSocial } from "@/contexts/SocialContext";

interface Order {
  id: string;
  type: string;
  refId: string | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  amount: number;
  quantity: number;
  currency: string;
  status: string;
  sellerId: string;
  shippingAddress: string | null;
  trackingNumber: string | null;
  notes: string | null;
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
  manualPayout: boolean;
  createdAt: string;
  updatedAt: string;
}

function itemDetailHref(type: string, refId: string | null): string | null {
  if (!refId) return null;
  if (type === "listing") return `/listings/${refId}`;
  if (type === "drop") return `/drops`;
  if (type === "workshop") return `/workshops`;
  return null;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  drop:       { icon: Zap,           label: "Drop",       color: "text-amber-400 bg-amber-500/10" },
  listing:    { icon: ShoppingBag,   label: "Shop",       color: "text-blue-400 bg-blue-500/10" },
  commission: { icon: MessageSquare, label: "Commission", color: "text-purple-400 bg-purple-500/10" },
  workshop:   { icon: BookOpen,      label: "Workshop",   color: "text-emerald-400 bg-emerald-500/10" },
  inquiry:    { icon: MessageSquare, label: "Inquiry",    color: "text-stone-400 bg-stone-500/10" },
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  pending:     { icon: Clock,        label: "Pending",      color: "text-stone-300",  bg: "bg-stone-500/15 border-stone-500/20" },
  inquiry:     { icon: Clock,        label: "Inquiry sent", color: "text-stone-300",  bg: "bg-stone-500/15 border-stone-500/20" },
  in_progress: { icon: Package,      label: "In Progress",  color: "text-amber-300",  bg: "bg-amber-500/15 border-amber-500/20" },
  shipped:     { icon: Truck,        label: "Shipped",      color: "text-blue-300",   bg: "bg-blue-500/15 border-blue-500/20" },
  delivered:   { icon: CheckCircle2, label: "Delivered",    color: "text-emerald-300",bg: "bg-emerald-500/15 border-emerald-500/20" },
  waitlisted:  { icon: AlertCircle,  label: "Waitlisted",   color: "text-amber-300",  bg: "bg-amber-500/15 border-amber-500/20" },
  confirmed:   { icon: CheckCircle2, label: "Confirmed",    color: "text-emerald-300",bg: "bg-emerald-500/15 border-emerald-500/20" },
  cancelled:   { icon: AlertCircle,  label: "Cancelled",    color: "text-rose-300",   bg: "bg-rose-500/15 border-rose-500/20" },
};

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function ordinalId(id: string) {
  return "KLN-" + id.slice(0, 8).toUpperCase();
}

function ReviewForm({ order }: { order: Order }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return;
    setSubmitting(true);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetId: order.sellerId, targetType: "artist", rating, body }),
      });
      setSubmitted(true);
    } catch { /* ignore */ }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="mt-4 mb-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 flex items-center gap-3">
        <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-300">Review submitted</p>
          <p className="text-xs text-stone-500 mt-0.5">Thank you — your feedback helps the community.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 mb-2 rounded-2xl border border-white/8 bg-stone-900/60 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Leave a review</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n} type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={22}
              className={n <= (hovered || rating) ? "text-amber-400 fill-amber-400" : "text-stone-700"}
            />
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="How was the piece? Describe the quality, packaging, and communication…"
        className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
      />
      <button
        type="submit"
        disabled={rating < 1 || submitting}
        className="w-full rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
        Submit review
      </button>
    </form>
  );
}

function sessionReceiptId(notes: string | null): string {
  if (notes && notes.startsWith("stripe:")) {
    const raw = notes.slice(7);
    return "KLN-CART-" + raw.slice(-6).toUpperCase();
  }
  return "";
}

interface BuyerProfile {
  displayName: string | null;
  location: string | null;
}

interface SellerProfile {
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
}

export default function OrderDetail() {
  const { id, sessionKey } = useParams<{ id?: string; sessionKey?: string }>();
  const [, navigate] = useLocation();
  const { markLinkRead } = useSocial();
  const search = useSearch();
  const highlightParam = new URLSearchParams(search).get("highlight");
  const [order, setOrder] = useState<Order | null>(null);
  const [siblingOrders, setSiblingOrders] = useState<Order[]>([]);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [buyerEmail, setBuyerEmail] = useState<string | null>(null);
  const [perSellerWindows, setPerSellerWindows] = useState<{ sellerName: string; days: number | null; label: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState("");
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(
    highlightParam === "shipped" || highlightParam === "delivered",
  );
  const [statusHighlighted, setStatusHighlighted] = useState(
    highlightParam === "shipped" || highlightParam === "delivered",
  );

  useEffect(() => {
    if (id) markLinkRead(`/orders/${id}`);
  }, [id, markLinkRead]);

  useEffect(() => {
    if (!showUpdateBanner) return;
    const bannerTimer = setTimeout(() => setShowUpdateBanner(false), 6000);
    const highlightTimer = setTimeout(() => setStatusHighlighted(false), 3000);
    return () => {
      clearTimeout(bannerTimer);
      clearTimeout(highlightTimer);
    };
  }, [showUpdateBanner]);

  useEffect(() => {
    const fetchUrl = sessionKey
      ? `/api/me/orders/cart/${encodeURIComponent(sessionKey)}`
      : id
        ? `/api/me/orders/${encodeURIComponent(id)}`
        : null;

    if (!fetchUrl) return;

    async function load() {
      try {
        let r = await fetch(fetchUrl!, { credentials: "include" });

        // If unauthenticated and this is a cart receipt (has sessionKey),
        // fall back to the public endpoint so shared/gift links still work.
        if (r.status === 401 && sessionKey) {
          r = await fetch(`/api/orders/cart/${encodeURIComponent(sessionKey)}`);
        }

        if (r.status === 404) { setNotFound(true); return; }
        if (!r.ok) return;

        const data = await r.json();
        if (!data?.order) return;
        setOrder(data.order as Order);
        const siblings: Order[] = data.siblingOrders ?? [];
        setSiblingOrders(siblings.length > 1 ? siblings : []);
        if (data.buyerProfile) setBuyerProfile(data.buyerProfile as BuyerProfile);
        if (data.sellerProfile) setSellerProfile(data.sellerProfile as SellerProfile);
        if (data.buyerEmail) setBuyerEmail(data.buyerEmail as string);
        if (Array.isArray(data.perSellerWindows) && data.perSellerWindows.length > 0) {
          setPerSellerWindows(data.perSellerWindows as { sellerName: string; days: number | null; label: string | null }[]);
        }
      } catch {
        // network error — leave as not found
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, sessionKey]);

  const handleCopyLink = useCallback((rawNotes: string | null) => {
    const key = rawNotes?.startsWith("stripe:") ? rawNotes.slice(7) : null;
    if (!key) return;
    const url = `${window.location.origin}/kiln/orders/cart/${key}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-stone-600" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-stone-700" />
          <p className="text-stone-400 text-sm mb-4">Order not found.</p>
          <Link href="/orders">
            <button className="rounded-full border border-white/10 px-5 py-2 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
              Back to Orders
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const typeConf = TYPE_CONFIG[order.type] ?? TYPE_CONFIG.inquiry!;
  const statusConf = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending!;
  const StatusIcon = statusConf.icon;
  const TypeIcon = typeConf.icon;

  const hasDeliveryEstimate = order.processingWindowLabel !== null || order.processingWindowDays !== null;
  const deliveryEstimateText = formatProcessingWindowLabel(order.processingWindowDays, order.processingWindowLabel) ?? "";
  const shipsWithinText = `Ships ${deliveryEstimateText}`;

  const isActive = !["delivered", "cancelled"].includes(order.status);
  const canEditAddress = ["pending", "in_progress", "confirmed"].includes(order.status) && !sessionKey;

  const isCartOrder = siblingOrders.length > 1;

  async function handleSaveAddress() {
    if (!order || !id) return;
    const trimmed = addressDraft.trim();
    if (!trimmed) { setAddressError("Address cannot be empty."); return; }
    setAddressSaving(true);
    setAddressError(null);
    try {
      const r = await fetch(`/api/me/orders/${encodeURIComponent(id)}/shipping-address`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ address: trimmed }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({})) as { error?: string };
        setAddressError(data.error ?? "Failed to save address.");
      } else {
        setOrder((prev) => prev ? { ...prev, shippingAddress: trimmed } : prev);
        setEditingAddress(false);
      }
    } catch {
      setAddressError("Network error — please try again.");
    } finally {
      setAddressSaving(false);
    }
  }
  const cartTotal = isCartOrder ? siblingOrders.reduce((sum, o) => sum + o.amount, 0) : order.amount;

  function handlePrint() {
    if (!order) return;

    function esc(text: string | null | undefined): string {
      if (text == null) return "";
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    const items = isCartOrder ? siblingOrders : [order];
    const total = isCartOrder ? cartTotal : order.amount;

    const lineItems = items.map(item => {
      const qty = (item as Order).quantity ?? 1;
      const unitPrice = qty > 1 ? item.amount / qty : item.amount;
      const qtyNote = qty > 1 ? `<br><span style="font-size:11px;color:#8a7e74;">Qty: ${qty} &times; ${formatPrice(unitPrice)}</span>` : "";
      return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e7e3dc;font-size:13px;color:#2c2621;">${esc(item.title)}${item.description ? `<br><span style="font-size:11px;color:#8a7e74;">${esc(item.description)}</span>` : ""}${qtyNote}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e7e3dc;text-align:right;font-size:13px;font-weight:600;color:#2c2621;white-space:nowrap;">${formatPrice(item.amount)}</td>
      </tr>
    `;
    }).join("");

    const buyerName = buyerProfile?.displayName ?? null;
    const addressText = order.shippingAddress ?? buyerProfile?.location ?? null;

    const buyerRow = (buyerName || addressText) ? `
      <div style="margin-top:24px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Billed to</p>
        ${buyerName ? `<p style="font-size:13px;font-weight:600;color:#2c2621;margin:0 0 2px;">${esc(buyerName)}</p>` : ""}
        ${addressText ? `<p style="font-size:12px;color:#8a7e74;white-space:pre-line;margin:0;">${esc(addressText)}</p>` : ""}
      </div>
    ` : "";


    const trackingRow = order.trackingNumber ? `
      <div style="margin-top:16px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Tracking</p>
        <p style="font-size:13px;color:#2c2621;margin:0;font-family:monospace;">${esc(order.trackingNumber)}</p>
      </div>
    ` : "";

    const notesRow = order.notes && !order.notes.startsWith("stripe:") ? `
      <div style="margin-top:16px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Notes</p>
        <p style="font-size:13px;color:#2c2621;margin:0;">${esc(order.notes)}</p>
      </div>
    ` : "";

    const processingWindowRow = hasDeliveryEstimate ? `
      <div style="margin-top:16px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Processing time</p>
        <p style="font-size:13px;color:#2c2621;margin:0;">${esc(shipsWithinText)}</p>
      </div>
    ` : "";

    const emailRow = buyerEmail ? `
      <div style="margin-top:16px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Receipt emailed to</p>
        <p style="font-size:13px;color:#2c2621;margin:0;">${esc(buyerEmail)}</p>
      </div>
    ` : "";

    const statusLabel = esc(STATUS_CONFIG[order.status]?.label ?? order.status);
    const typeLabel = esc(TYPE_CONFIG[order.type]?.label ?? order.type);
    const refNum = esc(isCartOrder ? sessionReceiptId(order.notes) : ordinalId(order.id));
    const receiptTitle = isCartOrder ? "Cart Receipt" : "Order Receipt";
    const dateStr = esc(formatDate(order.createdAt));

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt ${refNum}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; color: #2c2621; padding: 48px; max-width: 600px; margin: 0 auto; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #2c2621;padding-bottom:20px;margin-bottom:28px;">
    <div>
      <p style="font-size:22px;font-weight:700;letter-spacing:-.01em;">Kiln</p>
      <p style="font-size:11px;color:#8a7e74;margin-top:2px;">kilnfire.replit.app</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:18px;font-weight:700;font-family:monospace;">${refNum}</p>
      <p style="font-size:11px;color:#8a7e74;margin-top:2px;">${receiptTitle}</p>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:28px;gap:24px;">
    <div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Date</p>
      <p style="font-size:13px;">${dateStr}</p>
    </div>
    <div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Status</p>
      <p style="font-size:13px;">${statusLabel}</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Order type</p>
      <p style="font-size:13px;">${typeLabel}</p>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <thead>
      <tr>
        <th style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;padding-bottom:8px;border-bottom:1px solid #e7e3dc;text-align:left;">Item</th>
        <th style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;padding-bottom:8px;border-bottom:1px solid #e7e3dc;text-align:right;">Price</th>
      </tr>
    </thead>
    <tbody>${lineItems}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;padding-top:12px;border-top:2px solid #2c2621;margin-top:4px;">
    <div style="text-align:right;">
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin-bottom:4px;">Total</p>
      <p style="font-size:20px;font-weight:700;">${formatPrice(total)}</p>
    </div>
  </div>

  ${buyerRow}${processingWindowRow}${trackingRow}${notesRow}${emailRow}

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e7e3dc;text-align:center;">
    <p style="font-size:11px;color:#8a7e74;">Thank you for your purchase. Questions? Visit kilnfire.replit.app/kiln/messages</p>
  </div>
</body>
</html>`;

    openReceiptWindow(html, `Receipt_${refNum}`, false);
  }

  async function handleDownloadPDF() {
    if (!order) return;
    setPdfLoading(true);
    try {
      const url = sessionKey
        ? `/api/me/orders/cart/${encodeURIComponent(sessionKey)}/receipt.pdf`
        : `/api/me/orders/${encodeURIComponent(order.id)}/receipt.pdf`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      const refNum = isCartOrder ? sessionReceiptId(order.notes) : ordinalId(order.id);
      a.download = `Kiln_Receipt_${refNum}.pdf`;
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

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-lg px-4 pb-28 pt-6 md:pb-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/orders">
            <button className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
              Orders
            </button>
          </Link>
        </div>

        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-2xl text-amber-100">
                {isCartOrder ? "Cart Receipt" : "Order Receipt"}
              </h1>
              <p className="mt-1 font-mono text-sm text-amber-400/70">
                {isCartOrder ? sessionReceiptId(order.notes) : ordinalId(order.id)}
              </p>
              {isCartOrder && (
                <p className="mt-1 text-xs text-stone-500">
                  {siblingOrders.length} items · grouped checkout
                </p>
              )}
            </div>
            {isCartOrder && (
              <button
                onClick={() => handleCopyLink(order.notes)}
                title="Copy shareable link"
                className="mt-1 flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-stone-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors shrink-0"
              >
                {linkCopied ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Link2 size={12} />
                    Share
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {showUpdateBanner && (
          <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">
                {highlightParam === "shipped" ? "Your order has shipped!" : "Your order has been delivered!"}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {highlightParam === "shipped"
                  ? "The artist has marked this order as shipped."
                  : "This order has been marked as delivered."}
              </p>
            </div>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="shrink-0 text-stone-500 hover:text-stone-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div
          className={`mb-4 flex items-center gap-2.5 rounded-2xl border p-4 transition-all duration-700 ${statusConf.bg} ${
            statusHighlighted ? "ring-2 ring-amber-400/50 shadow-[0_0_16px_rgba(251,191,36,0.15)]" : ""
          }`}
        >
          <StatusIcon size={18} className={statusConf.color} />
          <div>
            <p className={`font-semibold text-sm ${statusConf.color}`}>{statusConf.label}</p>
            <p className="text-xs text-stone-500">
              Placed <RelativeTime since={order.createdAt} className="text-xs text-stone-500" />
            </p>
          </div>
        </div>

        {buyerEmail && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-white/8 bg-stone-900/50 px-4 py-3">
            <Mail size={14} className="text-stone-500 shrink-0" />
            <p className="text-xs text-stone-400">
              Receipt emailed to <span className="text-stone-300 font-medium">{buyerEmail}</span>
            </p>
          </div>
        )}

        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
          {isCartOrder ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
                Items ({siblingOrders.length})
              </p>
              <div className="space-y-3">
                {siblingOrders.map((item, idx) => {
                  const itemTypeConf = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.inquiry!;
                  const ItemIcon = itemTypeConf.icon;
                  const href = itemDetailHref(item.type, item.refId);
                  const inner = (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-stone-800">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className={`h-full w-full flex items-center justify-center rounded-lg ${itemTypeConf.color}`}>
                            <ItemIcon size={14} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug truncate ${href ? "text-stone-100 group-hover:text-amber-300 transition-colors" : "text-stone-100"}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-[11px] text-stone-500 truncate">{item.description}</p>
                        )}
                        {(item.quantity ?? 1) > 1 && (
                          <p className="text-[11px] text-stone-500">
                            Qty: {item.quantity} &times; {formatPrice(item.amount / item.quantity)}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-amber-300 tabular-nums shrink-0">
                        {formatPrice(item.amount)}
                      </span>
                    </div>
                  );
                  return (
                    <div key={item.id} className={idx > 0 ? "pt-3 border-t border-white/6" : ""}>
                      {href ? (
                        <Link href={href} className="group block">
                          {inner}
                        </Link>
                      ) : inner}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between">
                <span className="text-xs text-stone-400 font-medium">Total</span>
                <span className="text-base font-bold text-amber-300">{formatPrice(cartTotal)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-stone-800">
                {order.imageUrl ? (
                  <img src={order.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className={`h-full w-full flex items-center justify-center rounded-xl ${typeConf.color}`}>
                    <TypeIcon size={22} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-100 leading-snug">{order.title}</p>
                {order.description && (
                  <p className="mt-0.5 text-xs text-stone-500 line-clamp-2">{order.description}</p>
                )}
                {(order.quantity ?? 1) > 1 && (
                  <p className="mt-0.5 text-xs text-stone-500">
                    Qty: {order.quantity} &times; {formatPrice(order.amount / order.quantity)}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeConf.color}`}>{typeConf.label}</span>
                  <span className="text-base font-bold text-amber-300">{formatPrice(order.amount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {(() => {
          const sellerLabel = sellerProfile?.displayName?.trim()
            ? sellerProfile.displayName
            : sellerProfile?.handle
              ? `@${sellerProfile.handle}`
              : null;
          const sellerInitial = (sellerLabel ?? order.sellerId ?? "?")[0].toUpperCase();
          const sellerHref = sellerProfile?.handle
            ? `/artists/${sellerProfile.handle}`
            : order.sellerId
              ? `/artists/${order.sellerId}`
              : null;
          return (
            <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Artist</p>
              <div className="flex items-center gap-3">
                {sellerProfile?.avatarUrl ? (
                  <img
                    src={sellerProfile.avatarUrl}
                    alt={sellerLabel ?? "Artist"}
                    className="h-8 w-8 flex-shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold text-stone-300 ring-1 ring-white/10">
                    {sellerInitial}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  {sellerHref ? (
                    <Link href={sellerHref}>
                      <span className="text-sm text-stone-300 hover:text-amber-300 transition-colors cursor-pointer">
                        {sellerLabel ?? "View artist profile"}
                      </span>
                    </Link>
                  ) : (
                    <p className="text-sm text-stone-300">{sellerLabel ?? "Artist"}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Fulfillment</p>
          {perSellerWindows.length > 1 ? (
            <div className="flex items-start gap-2.5">
              <Clock size={15} className={`shrink-0 mt-0.5 ${isActive ? "text-amber-400" : "text-stone-600"}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold mb-2 ${isActive ? "text-amber-300" : "text-stone-500"}`}>
                  Processing time by artist
                </p>
                <ul className="space-y-1.5">
                  {perSellerWindows.map((w, i) => (
                    <li key={i} className="flex items-center justify-between text-xs">
                      <span className="text-stone-300 font-medium">{w.sellerName}</span>
                      <span className="text-stone-400 tabular-nums">
                        {w.label
                          ? w.label
                          : w.days === null
                            ? "Not specified"
                            : w.days === 1
                              ? "1 business day"
                              : `${w.days} business days`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : hasDeliveryEstimate ? (
            <div className="flex items-start gap-2.5">
              <Clock size={15} className={`shrink-0 mt-0.5 ${isActive ? "text-amber-400" : "text-stone-600"}`} />
              <div>
                <p className={`text-sm font-semibold ${isActive ? "text-amber-300" : "text-stone-500"}`}>
                  {shipsWithinText}
                </p>
                {isActive && (
                  <p className="text-xs text-stone-600 mt-0.5">
                    The artist will prepare your order within this time.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-stone-600 shrink-0 mt-0.5" />
              <p className="text-sm text-stone-500">No processing window set.</p>
            </div>
          )}
          {isActive && (
            <div className="flex items-start gap-2.5">
              <Package size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-stone-400">
                The artist will reach out within 2–3 business days with shipping details.
              </p>
            </div>
          )}
        </div>

        {order.manualPayout && (
          <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/6 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-200 font-semibold mb-1">Manual fulfillment in progress</p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  This artist processes payments directly. Your order has been recorded and the artist
                  has been notified. Expect a reply within{" "}
                  <span className="text-amber-300 font-medium">2–5 business days</span> with payment
                  instructions and shipping details.
                </p>
              </div>
            </div>
          </div>
        )}

        {order.trackingNumber && (() => {
          const tn = order.trackingNumber.replace(/\s/g, "");
          const carrier = /^1Z/i.test(tn) ? "UPS"
            : /^(94|93|92|94|95)\d{18,}/.test(tn) || /^\d{22}$/.test(tn) || /^[A-Z]{2}\d{9}US$/i.test(tn) ? "USPS"
            : /^\d{12}$/.test(tn) || /^\d{15}$/.test(tn) || /^\d{20}$/.test(tn) ? "FedEx"
            : /^JD\d{18}$/i.test(tn) || /^\d{10}$/.test(tn) ? "DHL"
            : null;
          const trackingUrl = carrier === "UPS" ? `https://www.ups.com/track?tracknum=${tn}`
            : carrier === "USPS" ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
            : carrier === "FedEx" ? `https://www.fedex.com/fedextrack/?trknbr=${tn}`
            : carrier === "DHL" ? `https://www.dhl.com/en/express/tracking.html?AWB=${tn}`
            : null;
          return (
            <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Tracking</p>
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  {carrier && <p className="text-[10px] font-semibold text-stone-500 uppercase mb-0.5">{carrier}</p>}
                  {trackingUrl ? (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all transition-colors"
                    >
                      {order.trackingNumber}
                    </a>
                  ) : (
                    <span className="font-mono text-sm text-stone-100 break-all">{order.trackingNumber}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {(order.shippingAddress || canEditAddress) && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Ship to</p>
              {canEditAddress && !editingAddress && (
                <button
                  onClick={() => {
                    setAddressDraft(order.shippingAddress ?? "");
                    setAddressError(null);
                    setEditingAddress(true);
                  }}
                  className="flex items-center gap-1 text-xs text-stone-500 hover:text-amber-300 transition-colors"
                >
                  <Pencil size={11} />
                  Edit
                </button>
              )}
            </div>
            {editingAddress ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={addressDraft}
                  onChange={(e) => setAddressDraft(e.target.value)}
                  placeholder={"123 Main St\nPortland, OR 97201\nUS"}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
                />
                {addressError && (
                  <p className="text-xs text-rose-400">{addressError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAddress}
                    disabled={addressSaving}
                    className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
                  >
                    {addressSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Save
                  </button>
                  <button
                    onClick={() => { setEditingAddress(false); setAddressError(null); }}
                    disabled={addressSaving}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    <X size={11} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : order.shippingAddress ? (
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-stone-500 shrink-0 mt-0.5" />
                <p className="text-sm text-stone-400 whitespace-pre-line">{order.shippingAddress}</p>
              </div>
            ) : (
              <p className="text-sm text-stone-600 italic">No address on file — click Edit to add one.</p>
            )}
          </div>
        )}

        {order.notes && !order.notes.startsWith("stripe:") && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Notes</p>
            <div className="flex items-start gap-2">
              <FileText size={14} className="text-stone-500 shrink-0 mt-0.5" />
              <p className="text-sm text-stone-400">{order.notes}</p>
            </div>
          </div>
        )}

        {/* ── Review prompt — only for delivered orders ── */}
        {order.status === "delivered" && <ReviewForm order={order} />}

        <div className="mt-6 space-y-3">
          <button
            onClick={() => {
              const prefill = encodeURIComponent(`Re: ${order.title} (${ordinalId(order.id)})`);
              const sellerRef = sellerProfile?.handle ?? order.sellerId;
              navigate(`/messages/${sellerRef}?prefill=${prefill}&orderId=${order.id}`);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-stone-800 border border-white/10 py-2.5 text-sm text-stone-200 hover:border-amber-500/40 hover:text-amber-200 transition-colors"
          >
            <MessageSquare size={15} />
            Message artist
          </button>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 rounded-full border border-white/10 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 hover:text-amber-200 transition-colors"
            >
              <Printer size={15} />
              Print receipt
            </button>
            <button
              onClick={() => { void handleDownloadPDF(); }}
              disabled={pdfLoading}
              className="flex-1 flex items-center justify-center gap-2 rounded-full border border-white/10 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 hover:text-amber-200 transition-colors disabled:opacity-60"
            >
              {pdfLoading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {pdfLoading ? "Generating…" : "Download PDF"}
            </button>
          </div>
          <div className="flex gap-3">
            <Link href="/orders" className="flex-1">
              <button className="w-full rounded-full border border-white/10 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
                Back to Orders
              </button>
            </Link>
            <Link href="/shop" className="flex-1">
              <button className="w-full rounded-full bg-amber-500/15 border border-amber-500/30 py-2.5 text-sm text-amber-300 hover:bg-amber-500/25 transition-colors">
                Continue Shopping
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
