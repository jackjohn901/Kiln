import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  ShoppingBag, Zap, MessageSquare, BookOpen, Package, CheckCircle2,
  Clock, Truck, AlertCircle, Loader2, ChevronLeft, MapPin, FileText,
  Printer,
} from "lucide-react";
import Nav from "@/components/Nav";

interface Order {
  id: string;
  type: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  amount: number;
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

function sessionReceiptId(notes: string | null): string {
  if (notes && notes.startsWith("stripe:")) {
    const raw = notes.slice(7);
    return "KLN-CART-" + raw.slice(-6).toUpperCase();
  }
  return "";
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [siblingOrders, setSiblingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/me/orders/${encodeURIComponent(id)}`, { credentials: "include" })
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        if (!data?.order) return;
        setOrder(data.order as Order);
        const siblings: Order[] = data.siblingOrders ?? [];
        setSiblingOrders(siblings.length > 1 ? siblings : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
  const deliveryEstimateText = order.processingWindowLabel
    ? order.processingWindowLabel
    : order.processingWindowDays === 1
      ? "1 business day"
      : `${order.processingWindowDays} business days`;
  const shipsWithinText = `Ships within ${deliveryEstimateText}`;

  const isActive = !["delivered", "cancelled"].includes(order.status);

  const isCartOrder = siblingOrders.length > 1;
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

    const lineItems = items.map(item => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e7e3dc;font-size:13px;color:#2c2621;">${esc(item.title)}${item.description ? `<br><span style="font-size:11px;color:#8a7e74;">${esc(item.description)}</span>` : ""}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e7e3dc;text-align:right;font-size:13px;font-weight:600;color:#2c2621;white-space:nowrap;">${formatPrice(item.amount)}</td>
      </tr>
    `).join("");

    const shippingRow = order.shippingAddress ? `
      <div style="margin-top:24px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8a7e74;margin:0 0 6px;">Ship to</p>
        <p style="font-size:13px;color:#2c2621;white-space:pre-line;margin:0;">${esc(order.shippingAddress)}</p>
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

  ${shippingRow}${trackingRow}${notesRow}

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e7e3dc;text-align:center;">
    <p style="font-size:11px;color:#8a7e74;">Thank you for your purchase. Questions? Visit kilnfire.replit.app/kiln/messages</p>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
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

        <div className={`mb-4 flex items-center gap-2.5 rounded-2xl border p-4 ${statusConf.bg}`}>
          <StatusIcon size={18} className={statusConf.color} />
          <div>
            <p className={`font-semibold text-sm ${statusConf.color}`}>{statusConf.label}</p>
            <p className="text-xs text-stone-500">
              Placed {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
            </p>
          </div>
        </div>

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
                  return (
                    <div key={item.id} className={idx > 0 ? "pt-3 border-t border-white/6" : ""}>
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
                          <p className="text-sm text-stone-100 leading-snug truncate">{item.title}</p>
                          {item.description && (
                            <p className="text-[11px] text-stone-500 truncate">{item.description}</p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-amber-300 tabular-nums shrink-0">
                          {formatPrice(item.amount)}
                        </span>
                      </div>
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
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeConf.color}`}>{typeConf.label}</span>
                  <span className="text-base font-bold text-amber-300">{formatPrice(order.amount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {(isActive || hasDeliveryEstimate) && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Fulfillment</p>
            {hasDeliveryEstimate && (
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
            )}
            {!hasDeliveryEstimate && isActive && (
              <div className="flex items-start gap-2.5">
                <Clock size={15} className="text-stone-600 shrink-0 mt-0.5" />
                <p className="text-sm text-stone-500">No delivery estimate provided.</p>
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
        )}

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

        {order.trackingNumber && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Tracking</p>
            <div className="flex items-center gap-2">
              <Truck size={14} className="text-blue-400 shrink-0" />
              <p className="text-sm text-stone-300">
                Tracking number:{" "}
                <span className="font-mono text-stone-100">{order.trackingNumber}</span>
              </p>
            </div>
          </div>
        )}

        {order.shippingAddress && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Ship to</p>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-stone-500 shrink-0 mt-0.5" />
              <p className="text-sm text-stone-400 whitespace-pre-line">{order.shippingAddress}</p>
            </div>
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

        <div className="mt-6 space-y-3">
          <button
            onClick={() => {
              const prefill = encodeURIComponent(`Re: ${order.title} (${ordinalId(order.id)})`);
              navigate(`/messages/${order.sellerId}?prefill=${prefill}`);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-stone-800 border border-white/10 py-2.5 text-sm text-stone-200 hover:border-amber-500/40 hover:text-amber-200 transition-colors"
          >
            <MessageSquare size={15} />
            Message artist
          </button>
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 rounded-full border border-white/10 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 hover:text-amber-200 transition-colors"
          >
            <Printer size={15} />
            Print / Download receipt
          </button>
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
