import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ShoppingBag, Zap, MessageSquare, BookOpen, Package, CheckCircle2, Clock, Truck, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import Nav from "@/components/Nav";

interface Order {
  id: string;
  type: string;
  title: string;
  description: string | null;
  sellerId: string;
  amount: number;
  status: string;
  imageUrl: string | null;
  trackingNumber: string | null;
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
  manualPayout: boolean;
  createdAt: string;
}

interface SellerProcessingWindow {
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  drop:       { icon: Zap,          label: "Drop",        color: "text-amber-400 bg-amber-500/10" },
  listing:    { icon: ShoppingBag,  label: "Shop",        color: "text-blue-400 bg-blue-500/10" },
  commission: { icon: MessageSquare,label: "Commission",  color: "text-purple-400 bg-purple-500/10" },
  workshop:   { icon: BookOpen,     label: "Workshop",    color: "text-emerald-400 bg-emerald-500/10" },
  inquiry:    { icon: MessageSquare,label: "Inquiry",     color: "text-stone-400 bg-stone-500/10" },
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  pending:     { icon: Clock,        label: "Pending",     color: "text-stone-400" },
  inquiry:     { icon: Clock,        label: "Inquiry sent",color: "text-stone-400" },
  in_progress: { icon: Package,      label: "In Progress", color: "text-amber-400" },
  shipped:     { icon: Truck,        label: "Shipped",     color: "text-blue-400" },
  delivered:   { icon: CheckCircle2, label: "Delivered",   color: "text-emerald-400" },
  waitlisted:  { icon: AlertCircle,  label: "Waitlisted",  color: "text-amber-400" },
  confirmed:   { icon: CheckCircle2, label: "Confirmed",   color: "text-emerald-400" },
  cancelled:   { icon: AlertCircle,  label: "Cancelled",   color: "text-rose-400" },
};

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ManualReceiptSection({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 border-t border-white/6 pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[11px] text-amber-400/80 hover:text-amber-300 transition-colors"
      >
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {open ? "Hide receipt" : "View receipt"}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/6 p-3 text-[11px]">
            <div className="flex items-start gap-2">
              <AlertCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-200 font-semibold mb-0.5">Manual fulfillment in progress</p>
                <p className="text-stone-400 leading-relaxed">
                  This artist processes payments directly. Your order has been recorded and the artist
                  has been notified. Expect a reply within{" "}
                  <span className="text-amber-300 font-medium">2–5 business days</span> with payment
                  instructions and shipping details.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/6 bg-stone-900/60 p-3 text-[11px]">
            <div className="flex items-center gap-1.5 mb-2">
              <ShoppingBag size={11} className="text-amber-400" />
              <span className="text-stone-300 font-medium">Order summary</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-300 flex-1 pr-3">{order.title}</span>
              <span className="text-amber-300 font-medium tabular-nums shrink-0">
                {formatPrice(order.amount)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "active" | "completed">("all");
  const [sellerWindows, setSellerWindows] = useState<Record<string, SellerProcessingWindow>>({});

  useEffect(() => {
    fetch("/api/me/orders", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(async (data) => {
        const loaded: Order[] = data.orders ?? [];
        setOrders(loaded);
        const missingSellerIds = [
          ...new Set(
            loaded
              .filter(o => o.processingWindowDays === null && o.processingWindowLabel === null && o.sellerId)
              .map(o => o.sellerId)
          ),
        ];
        if (missingSellerIds.length === 0) return;
        const results = await Promise.allSettled(
          missingSellerIds.map(sid =>
            fetch(`/api/users/${sid}/payment-settings`)
              .then(r => r.ok ? r.json() : Promise.reject())
              .then(ps => ({
                sellerId: sid,
                processingWindowDays: typeof ps.processingWindow === "number" ? ps.processingWindow : null,
                processingWindowLabel: typeof ps.processingWindowLabel === "string" && ps.processingWindowLabel.trim()
                  ? ps.processingWindowLabel.trim()
                  : null,
              }))
          )
        );
        const map: Record<string, SellerProcessingWindow> = {};
        for (const r of results) {
          if (r.status === "fulfilled") {
            map[r.value.sellerId] = {
              processingWindowDays: r.value.processingWindowDays,
              processingWindowLabel: r.value.processingWindowLabel,
            };
          }
        }
        setSellerWindows(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => {
    if (tab === "active") return ["pending", "inquiry", "in_progress", "shipped", "confirmed", "waitlisted"].includes(o.status);
    if (tab === "completed") return ["delivered", "cancelled"].includes(o.status);
    return true;
  });

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        <div className="mb-6">
          <h1 className="font-serif text-2xl text-amber-100">Your Orders</h1>
          <p className="mt-1 text-sm text-stone-500">Track all your purchases and inquiries.</p>
        </div>

        <div className="mb-6 flex gap-1 rounded-xl bg-stone-900/50 p-1 border border-white/5">
          {(["all", "active", "completed"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium capitalize transition-colors ${tab === t ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}>
              {t}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <ShoppingBag size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">No orders yet.</p>
            {tab === "all" && (
              <Link href="/shop" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
                Browse the shop
              </Link>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {filtered.map(order => {
            const typeConf = TYPE_CONFIG[order.type] ?? TYPE_CONFIG.inquiry!;
            const statusConf = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending!;
            const TypeIcon = typeConf.icon;
            const StatusIcon = statusConf.icon;
            return (
              <div key={order.id} className="rounded-2xl border border-white/8 bg-stone-900/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-stone-800">
                    {order.imageUrl ? (
                      <img src={order.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className={`h-full w-full flex items-center justify-center rounded-xl ${typeConf.color}`}>
                        <TypeIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-100 leading-tight">{order.title}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{formatDate(order.createdAt)}</p>
                      </div>
                      <span className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium ${statusConf.color}`}>
                        <StatusIcon size={11} />
                        {statusConf.label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-amber-300">{formatPrice(order.amount)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeConf.color}`}>{typeConf.label}</span>
                    </div>
                    {!["delivered", "cancelled"].includes(order.status) && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-stone-500">
                        <Clock size={10} className="text-amber-500/70 flex-shrink-0" />
                        Processing window:{" "}
                        {(() => {
                          const label = order.processingWindowLabel ?? sellerWindows[order.sellerId]?.processingWindowLabel ?? null;
                          const days = order.processingWindowDays ?? sellerWindows[order.sellerId]?.processingWindowDays ?? null;
                          if (label != null || days != null) {
                            return (
                              <span className="text-amber-400/80">
                                {label ? label : days === 1 ? "1 business day" : `${days} business days`}
                              </span>
                            );
                          }
                          return <span className="text-stone-600">Not specified</span>;
                        })()}
                      </p>
                    )}
                    {order.trackingNumber && (
                      <p className="mt-1.5 text-[11px] text-stone-600">
                        Tracking: <span className="text-stone-400 font-mono">{order.trackingNumber}</span>
                      </p>
                    )}
                  </div>
                </div>
                {order.manualPayout && <ManualReceiptSection order={order} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
