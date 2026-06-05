import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import {
  ShoppingBag, Zap, MessageSquare, BookOpen, Package, CheckCircle2,
  Clock, Truck, AlertCircle, Loader2, ChevronLeft, MapPin, FileText,
  Printer, Star, Mail, Link2, Check, Download, Pencil, X, Send, LogIn, Lock, Copy,
} from "lucide-react";
import Nav from "@/components/Nav";
import RelativeTime from "@/components/RelativeTime";
import { formatProcessingWindowLabel } from "@/utils/paymentSettings";
import { useSocial } from "@/contexts/SocialContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { buildReceiptHtml, ordinalId } from "@/lib/receiptHtml";

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
  sellerName?: string | null;
  sellerHandle?: string | null;
  shippingAddress: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  notes: string | null;
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
  shippingCost?: number | null;
  manualPayout: boolean;
  addressLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

function itemDetailHref(type: string, refId: string | null): string | null {
  if (!refId) return null;
  if (type === "listing") return `/listings/${refId}`;
  if (type === "drop") return `/drops/${refId}`;
  if (type === "workshop") return `/workshops/${refId}`;
  if (type === "commission") return `/commissions/${refId}`;
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

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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

interface OrderThreadMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  text: string;
  attachmentUrl: string | null;
  createdAt: string;
}

interface OrderThreadInfo {
  threadId: string | null;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  otherUserHandle: string | null;
  latestMessage: OrderThreadMessage | null;
}

interface OrderEvent {
  id: string;
  type: string;
  trackingNumber: string | null;
  carrier: string | null;
  previousTrackingNumber: string | null;
  note: string | null;
  createdAt: string;
}

export default function OrderDetail() {
  const { id, sessionKey } = useParams<{ id?: string; sessionKey?: string }>();
  const [, navigate] = useLocation();
  const { markLinkRead } = useSocial();
  const { settings } = useSettings();
  const { login } = useAuth();
  const search = useSearch();
  const highlightParam = new URLSearchParams(search).get("highlight");
  const [order, setOrder] = useState<Order | null>(null);
  const [siblingOrders, setSiblingOrders] = useState<Order[]>([]);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [buyerEmail, setBuyerEmail] = useState<string | null>(null);
  const [perSellerWindows, setPerSellerWindows] = useState<{ sellerName: string; days: number | null; label: string | null }[]>([]);
  const [isPublicView, setIsPublicView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [trackingCopied, setTrackingCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState("");
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [savedDefaultAddress, setSavedDefaultAddress] = useState<string | null>(null);
  const [savedAddressLoaded, setSavedAddressLoaded] = useState(false);
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);
  const [orderThread, setOrderThread] = useState<OrderThreadInfo | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const paramBannerType: "shipped" | "delivered" | null =
    highlightParam === "shipped" || highlightParam === "delivered" ? highlightParam : null;

  // Persisted, per-order banner state so a shipped/delivered update stays visible
  // until the buyer actually reads it (taps X or lingers for 10s+), and never
  // re-appears on later visits. localStorage value is the update type while the
  // banner is still pending, or "seen" once it has been dismissed/read.
  const [banner, setBanner] = useState<{ show: boolean; type: "shipped" | "delivered" }>(() => {
    let stored: string | null = null;
    if (id) {
      try { stored = localStorage.getItem(`kiln:order-update-banner:${id}`); } catch { /* ignore */ }
    }
    if (stored === "seen") return { show: false, type: paramBannerType ?? "shipped" };
    if (paramBannerType) return { show: true, type: paramBannerType };
    if (stored === "shipped" || stored === "delivered") return { show: true, type: stored };
    return { show: false, type: "shipped" };
  });
  const [statusHighlighted, setStatusHighlighted] = useState(() => {
    let stored: string | null = null;
    if (id) {
      try { stored = localStorage.getItem(`kiln:order-update-banner:${id}`); } catch { /* ignore */ }
    }
    if (stored === "seen") return false;
    return paramBannerType !== null || stored === "shipped" || stored === "delivered";
  });

  const dismissBanner = useCallback(() => {
    setBanner((prev) => ({ ...prev, show: false }));
    if (id) {
      try { localStorage.setItem(`kiln:order-update-banner:${id}`, "seen"); } catch { /* ignore */ }
    }
  }, [id]);

  useEffect(() => {
    if (id) markLinkRead(`/orders/${id}`);
  }, [id, markLinkRead]);

  // While the banner is pending, persist its type so a slow load or accidental
  // refresh keeps it visible instead of losing it after the first paint.
  useEffect(() => {
    if (!id || !banner.show) return;
    try {
      if (localStorage.getItem(`kiln:order-update-banner:${id}`) !== "seen") {
        localStorage.setItem(`kiln:order-update-banner:${id}`, banner.type);
      }
    } catch { /* ignore */ }
  }, [id, banner.show, banner.type]);

  useEffect(() => {
    if (!banner.show) return;
    const bannerTimer = setTimeout(dismissBanner, 10000);
    const highlightTimer = setTimeout(() => setStatusHighlighted(false), settings.earnings_flash_ms);
    return () => {
      clearTimeout(bannerTimer);
      clearTimeout(highlightTimer);
    };
  }, [banner.show, dismissBanner, settings.earnings_flash_ms]);

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
        setIsPublicView(data.isPublicView === true);
        if (Array.isArray(data.events)) setOrderEvents(data.events as OrderEvent[]);
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

  // Fetch the buyer's saved default address once when they open the edit form.
  useEffect(() => {
    if (!editingAddress || savedAddressLoaded) return;
    let cancelled = false;
    async function loadSavedAddress() {
      try {
        const r = await fetch("/api/me/settings", { credentials: "include" });
        if (!r.ok || cancelled) return;
        const data = await r.json() as { defaultShippingAddress?: { street?: string; city?: string; state?: string; zip?: string; country?: string } | null };
        if (cancelled) return;
        const addr = data.defaultShippingAddress;
        if (addr) {
          const parts = [
            addr.street,
            addr.city && addr.state
              ? `${addr.city}, ${addr.state}${addr.zip ? " " + addr.zip : ""}`
              : addr.city || (addr.state ? (addr.zip ? `${addr.state} ${addr.zip}` : addr.state) : null),
            addr.country,
          ].filter(Boolean);
          setSavedDefaultAddress(parts.join("\n"));
        }
      } catch {
        // ignore — button just won't appear
      } finally {
        if (!cancelled) setSavedAddressLoaded(true);
      }
    }
    void loadSavedAddress();
    return () => { cancelled = true; };
  }, [editingAddress, savedAddressLoaded]);

  // Load the order's message thread (latest artist message) so the buyer can
  // glance at it and reply inline. Only for authenticated single-order views.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function loadThread() {
      try {
        const r = await fetch(`/api/messages/thread-by-order/${encodeURIComponent(id!)}`, {
          credentials: "include",
        });
        if (!r.ok) return;
        const data = await r.json() as OrderThreadInfo;
        if (!cancelled) setOrderThread(data);
      } catch {
        // ignore — quick-reply just won't render
      }
    }
    void loadThread();
    return () => { cancelled = true; };
  }, [id]);

  const handleCopyTracking = useCallback((trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber).then(() => {
      setTrackingCopied(true);
      setTimeout(() => setTrackingCopied(false), 2000);
    }).catch(() => {});
  }, []);

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
  const canEditAddress = ["pending", "in_progress", "confirmed"].includes(order.status) && !sessionKey && !order.addressLocked;

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
  async function handleSendReply() {
    if (!order) return;
    const text = replyDraft.trim();
    if (!text) return;
    const recipientId = orderThread?.otherUserId ?? order.sellerId;
    if (!recipientId) return;
    setReplySending(true);
    setReplyError(null);
    try {
      const r = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId, text, orderId: order.id }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({})) as { error?: string };
        setReplyError(data.error ?? "Couldn't send your reply. Please try again.");
        toast({
          title: "Couldn't send your reply",
          description: "Please try again.",
          variant: "destructive",
        });
        return;
      }
      setReplyDraft("");
      // Open the full thread so the buyer can continue the conversation.
      navigate(`/messages/${recipientId}?orderId=${order.id}`);
    } catch {
      setReplyError("Network error — please try again.");
      toast({
        title: "Couldn't send your reply",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setReplySending(false);
    }
  }

  const cartTotal = isCartOrder ? siblingOrders.reduce((sum, o) => sum + o.amount, 0) : order.amount;

  function handlePrint() {
    if (!order) return;

    const items = isCartOrder ? siblingOrders : [order];
    const total = isCartOrder ? cartTotal : order.amount;
    const refNum = isCartOrder ? sessionReceiptId(order.notes) : ordinalId(order.id);

    const html = buildReceiptHtml({
      refNum,
      receiptTitle: isCartOrder ? "Cart Receipt" : "Order Receipt",
      dateStr: formatDate(order.createdAt),
      statusLabel: STATUS_CONFIG[order.status]?.label ?? order.status,
      typeLabel: TYPE_CONFIG[order.type]?.label ?? order.type,
      lines: items.map(item => ({
        title: item.title,
        description: item.description ?? null,
        amount: item.amount,
        quantity: (item as Order).quantity ?? 1,
      })),
      total,
      formatPrice,
      buyerName: buyerProfile?.displayName ?? null,
      buyerAddress: order.shippingAddress ?? buyerProfile?.location ?? null,
      buyerEmail: buyerEmail ?? null,
      trackingNumber: order.trackingNumber ?? null,
      processingWindow: hasDeliveryEstimate ? shipsWithinText : null,
      notes: order.notes && !order.notes.startsWith("stripe:") ? order.notes : null,
    });

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

        {isPublicView && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-stone-900/50 px-4 py-3">
            <LogIn size={15} className="text-amber-400 shrink-0" />
            <p className="flex-1 text-xs text-stone-400 leading-relaxed">
              <button
                onClick={login}
                className="font-medium text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
              >
                Sign in
              </button>{" "}
              to see your full receipt details, including billing name, email, and address.
            </p>
          </div>
        )}

        {banner.show && (
          <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">
                {banner.type === "shipped" ? "Your order has shipped!" : "Your order has been delivered!"}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {banner.type === "shipped"
                  ? "The artist has marked this order as shipped."
                  : "This order has been marked as delivered."}
              </p>
              {banner.type === "shipped" && order.trackingNumber && (
                <button
                  onClick={() => handleCopyTracking(order.trackingNumber!)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1.5 font-mono text-xs text-amber-200 hover:bg-amber-500/25 transition-colors max-w-full"
                  title="Copy tracking number"
                >
                  {trackingCopied ? (
                    <Check size={11} className="shrink-0 text-emerald-400" />
                  ) : (
                    <Copy size={11} className="shrink-0" />
                  )}
                  <span className="break-all">{order.trackingNumber}</span>
                </button>
              )}
            </div>
            <button
              onClick={dismissBanner}
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
            {new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime() > 1000 && (
              <p className="text-xs text-stone-500">
                Last updated <RelativeTime since={order.updatedAt} className="text-xs text-stone-500" />
              </p>
            )}
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
              {(() => {
                // Build per-seller shipping lines, deduped by sellerId.
                // shippingCost is only stamped on the first order row per artist in the DB,
                // so raw summing of all sibling rows would be correct — but we dedupe here
                // too as a belt-and-suspenders guard, and to drive both display and total
                // from the same derived list.
                const seenShippingSellers = new Set<string>();
                const sellerShippingLines = siblingOrders
                  .filter((o) => (o.shippingCost ?? 0) > 0 && !seenShippingSellers.has(o.sellerId) && !!(seenShippingSellers.add(o.sellerId) || true))
                  .map((o) => ({
                    sellerName: o.sellerName?.trim() || (o.sellerHandle ? `@${o.sellerHandle}` : "Artist"),
                    cents: o.shippingCost!,
                  }));

                const shippingTotalCents = sellerShippingLines.reduce((sum, l) => sum + l.cents, 0);
                const hasShipping = shippingTotalCents > 0;

                return (
                  <div className="mt-3 pt-3 border-t border-white/8 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-500">Items</span>
                      <span className="text-sm text-stone-300 tabular-nums">{formatPrice(cartTotal)}</span>
                    </div>
                    {hasShipping && sellerShippingLines.length > 1 ? (
                      sellerShippingLines.map((line, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-xs text-stone-500 truncate mr-2">
                            Shipping · <span className="text-stone-400">{line.sellerName}</span>
                          </span>
                          <span className="text-sm text-stone-300 tabular-nums shrink-0">{formatCents(line.cents)}</span>
                        </div>
                      ))
                    ) : hasShipping ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-500">Shipping</span>
                        <span className="text-sm text-stone-300 tabular-nums">{formatCents(shippingTotalCents)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between pt-1.5 border-t border-white/8">
                      <span className="text-xs text-stone-400 font-medium">Total</span>
                      <span className="text-base font-bold text-amber-300">
                        {hasShipping
                          ? formatCents(Math.round(cartTotal * 100) + shippingTotalCents)
                          : formatPrice(cartTotal)}
                      </span>
                    </div>
                  </div>
                );
              })()}
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
                {(order.shippingCost ?? 0) > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/8 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-500">Item</span>
                      <span className="text-sm text-stone-300 tabular-nums">{formatPrice(order.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-500">Shipping</span>
                      <span className="text-sm text-stone-300 tabular-nums">{formatCents(order.shippingCost!)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-white/6">
                      <span className="text-xs text-stone-400 font-medium">Total</span>
                      <span className="text-sm font-bold text-amber-300">
                        {formatCents(Math.round(order.amount * 100) + order.shippingCost!)}
                      </span>
                    </div>
                  </div>
                )}
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
                        {formatProcessingWindowLabel(w.days, w.label) ?? "Not specified"}
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
          const CARRIER_LABELS: Record<string, string> = {
            usps: "USPS", ups: "UPS", fedex: "FedEx", dhl: "DHL",
          };
          const carrierKey = order.carrier?.toLowerCase().trim() ?? "";
          const carrierLabel = CARRIER_LABELS[carrierKey] ?? null;
          const tn = encodeURIComponent(order.trackingNumber);
          const trackingUrl = carrierKey === "usps"
            ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
            : carrierKey === "ups"
              ? `https://www.ups.com/track?tracknum=${tn}`
              : carrierKey === "fedex"
                ? `https://www.fedex.com/fedextrack/?tracknumbers=${tn}`
                : carrierKey === "dhl"
                  ? `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${tn}`
                  : null;
          return (
            <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Tracking</p>
              <div className="flex items-start gap-2">
                <Truck size={14} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  {carrierLabel && (
                    <p className="text-[10px] font-semibold text-stone-500 uppercase">{carrierLabel}</p>
                  )}
                  <p className="font-mono text-sm text-stone-100 break-all">{order.trackingNumber}</p>
                  {trackingUrl && (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Track your package →
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {orderEvents.length > 0 && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">Order timeline</p>
            <ul className="space-y-3">
              {orderEvents.map((ev, i) => {
                const isTrackingAdded = ev.type === "tracking_added";
                const title = isTrackingAdded ? "Tracking added" : ev.type === "tracking_updated" ? "Tracking updated" : "Order updated";
                return (
                  <li key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/15 ring-1 ring-blue-500/30">
                        <Truck size={12} className="text-blue-400" />
                      </span>
                      {i < orderEvents.length - 1 && <span className="mt-1 w-px flex-1 bg-white/10" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-stone-200">{title}</p>
                        <span className="text-[11px] text-stone-500 shrink-0">{formatDate(ev.createdAt)}</span>
                      </div>
                      {ev.trackingNumber && (
                        <p className="mt-1 font-mono text-xs text-stone-300 break-all">{ev.trackingNumber}</p>
                      )}
                      {ev.previousTrackingNumber && (
                        <p className="mt-0.5 text-[11px] text-stone-600">
                          Previously: <span className="font-mono break-all line-through">{ev.previousTrackingNumber}</span>
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-stone-600">{formatTime(ev.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {(order.shippingAddress || canEditAddress) && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Ship to</p>
              {order.addressLocked ? (
                <span className="flex items-center gap-1 text-xs text-amber-500/80">
                  <Lock size={10} />
                  Locked by seller
                </span>
              ) : canEditAddress && !editingAddress ? (
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
              ) : null}
            </div>
            {editingAddress ? (
              <div className="space-y-2">
                {savedDefaultAddress && (
                  <button
                    type="button"
                    onClick={() => setAddressDraft(savedDefaultAddress)}
                    className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/8 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/15 transition-colors"
                  >
                    <MapPin size={11} />
                    Use my saved address
                  </button>
                )}
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

        {orderThread?.latestMessage && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Message from the artist
              </p>
              {orderThread.threadId && (
                <button
                  onClick={() => navigate(`/messages/${orderThread.otherUserId}?orderId=${order.id}`)}
                  className="text-xs text-stone-500 hover:text-amber-300 transition-colors"
                >
                  View thread
                </button>
              )}
            </div>
            <div className="flex items-start gap-3">
              {orderThread.latestMessage.senderAvatarUrl ?? orderThread.otherUserAvatar ? (
                <img
                  src={orderThread.latestMessage.senderAvatarUrl ?? orderThread.otherUserAvatar ?? ""}
                  alt={orderThread.otherUserName}
                  className="h-8 w-8 flex-shrink-0 rounded-full object-cover ring-1 ring-white/10"
                />
              ) : (
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold text-stone-300 ring-1 ring-white/10">
                  {(orderThread.otherUserName || "?")[0].toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl rounded-tl-sm bg-stone-800 px-3.5 py-2.5">
                  {orderThread.latestMessage.text && (
                    <p className="text-sm text-stone-200 whitespace-pre-line break-words">
                      {orderThread.latestMessage.text}
                    </p>
                  )}
                  {orderThread.latestMessage.attachmentUrl && (
                    <p className="text-xs text-stone-500 mt-1">📎 Sent an image</p>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-stone-600">
                  {orderThread.otherUserName} ·{" "}
                  <RelativeTime since={orderThread.latestMessage.createdAt} className="text-[11px] text-stone-600" />
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={replyDraft}
                onChange={(e) => { setReplyDraft(e.target.value); if (replyError) setReplyError(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendReply();
                  }
                }}
                disabled={replySending}
                placeholder="Write a reply…"
                className="flex-1 rounded-xl border border-white/10 bg-stone-800 px-3.5 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={() => { void handleSendReply(); }}
                disabled={replySending || replyDraft.trim().length === 0}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
              >
                {replySending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            {replyError && <p className="mt-2 text-xs text-rose-400">{replyError}</p>}
          </div>
        )}

        {/* ── Review prompt — only for delivered orders ── */}
        {order.status === "delivered" && <ReviewForm order={order} />}

        <div className="mt-6 space-y-3">
          {isCartOrder ? (() => {
            const seen = new Set<string>();
            const uniqueSellers = siblingOrders.filter(s => {
              if (seen.has(s.sellerId)) return false;
              seen.add(s.sellerId);
              return true;
            });
            return (
              <div className="space-y-2">
                {uniqueSellers.map(seller => {
                  const label = seller.sellerName?.trim() || seller.sellerId;
                  const ref = seller.sellerHandle ?? seller.sellerId;
                  const prefill = encodeURIComponent(`Re: order ${sessionReceiptId(order.notes)} — ${label}`);
                  return (
                    <button
                      key={seller.sellerId}
                      onClick={() => navigate(`/messages/${ref}?prefill=${prefill}&orderId=${order.id}`)}
                      className="w-full flex items-center justify-center gap-2 rounded-full bg-stone-800 border border-white/10 py-2.5 text-sm text-stone-200 hover:border-amber-500/40 hover:text-amber-200 transition-colors"
                    >
                      <MessageSquare size={15} />
                      Message {label}
                    </button>
                  );
                })}
              </div>
            );
          })() : (
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
          )}
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
