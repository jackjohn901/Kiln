import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  ShoppingBag, Zap, MessageSquare, BookOpen, Package, CheckCircle2,
  Clock, Truck, AlertCircle, Loader2, ChevronLeft, MapPin, FileText,
  User, DollarSign,
} from "lucide-react";
import Nav from "@/components/Nav";

interface Sale {
  id: string;
  buyerId: string;
  type: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  amount: number;
  currency: string;
  status: string;
  shippingAddress: string | null;
  trackingNumber: string | null;
  notes: string | null;
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
  manualPayout: boolean;
  createdAt: string;
  updatedAt: string;
  buyerDisplayName: string | null;
  buyerHandle: string | null;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  drop:       { icon: Zap,           label: "Drop",       color: "text-amber-400 bg-amber-500/10" },
  listing:    { icon: ShoppingBag,   label: "Shop",       color: "text-blue-400 bg-blue-500/10" },
  commission: { icon: MessageSquare, label: "Commission", color: "text-purple-400 bg-purple-500/10" },
  workshop:   { icon: BookOpen,      label: "Workshop",   color: "text-emerald-400 bg-emerald-500/10" },
  inquiry:    { icon: MessageSquare, label: "Inquiry",    color: "text-stone-400 bg-stone-500/10" },
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  pending:     { icon: Clock,        label: "Pending",      color: "text-stone-300",   bg: "bg-stone-500/15 border-stone-500/20" },
  inquiry:     { icon: Clock,        label: "Inquiry sent", color: "text-stone-300",   bg: "bg-stone-500/15 border-stone-500/20" },
  in_progress: { icon: Package,      label: "In Progress",  color: "text-amber-300",   bg: "bg-amber-500/15 border-amber-500/20" },
  shipped:     { icon: Truck,        label: "Shipped",      color: "text-blue-300",    bg: "bg-blue-500/15 border-blue-500/20" },
  delivered:   { icon: CheckCircle2, label: "Delivered",    color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/20" },
  waitlisted:  { icon: AlertCircle,  label: "Waitlisted",   color: "text-amber-300",   bg: "bg-amber-500/15 border-amber-500/20" },
  confirmed:   { icon: CheckCircle2, label: "Confirmed",    color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/20" },
  cancelled:   { icon: AlertCircle,  label: "Cancelled",    color: "text-rose-300",    bg: "bg-rose-500/15 border-rose-500/20" },
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

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/me/sales/${encodeURIComponent(id)}`, { credentials: "include" })
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        if (!data?.sale) return;
        setSale(data.sale as Sale);
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

  if (notFound || !sale) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-stone-700" />
          <p className="text-stone-400 text-sm mb-4">Sale not found.</p>
          <Link href="/earnings">
            <button className="rounded-full border border-white/10 px-5 py-2 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
              Back to Earnings
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const typeConf = TYPE_CONFIG[sale.type] ?? TYPE_CONFIG.inquiry!;
  const statusConf = STATUS_CONFIG[sale.status] ?? STATUS_CONFIG.pending!;
  const StatusIcon = statusConf.icon;
  const TypeIcon = typeConf.icon;

  const buyerLabel = sale.buyerDisplayName?.trim()
    ? sale.buyerDisplayName
    : sale.buyerHandle
      ? `@${sale.buyerHandle}`
      : "Anonymous buyer";

  const hasWindow = sale.processingWindowDays !== null || sale.processingWindowLabel !== null;
  const deliveryEstimateText = sale.processingWindowLabel?.trim()
    ? sale.processingWindowLabel
    : sale.processingWindowDays !== null
      ? sale.processingWindowDays === 1
        ? "1 business day"
        : `${sale.processingWindowDays} business days`
      : null;
  const windowText = deliveryEstimateText ? `Ships within ${deliveryEstimateText}` : null;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-lg px-4 pb-28 pt-6 md:pb-8">

        <div className="mb-6 flex items-center gap-3">
          <Link href="/earnings">
            <button className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
              Earnings
            </button>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="font-serif text-2xl text-amber-100">Sale Detail</h1>
          <p className="mt-1 font-mono text-sm text-amber-400/70">{ordinalId(sale.id)}</p>
        </div>

        <div className={`mb-4 flex items-center gap-2.5 rounded-2xl border p-4 ${statusConf.bg}`}>
          <StatusIcon size={18} className={statusConf.color} />
          <div>
            <p className={`font-semibold text-sm ${statusConf.color}`}>{statusConf.label}</p>
            <p className="text-xs text-stone-500">
              Placed {formatDate(sale.createdAt)} at {formatTime(sale.createdAt)}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-stone-800">
              {sale.imageUrl ? (
                <img src={sale.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className={`h-full w-full flex items-center justify-center rounded-xl ${typeConf.color}`}>
                  <TypeIcon size={22} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-100 leading-snug">{sale.title}</p>
              {sale.description && (
                <p className="mt-0.5 text-xs text-stone-500 line-clamp-2">{sale.description}</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeConf.color}`}>{typeConf.label}</span>
                <span className="text-base font-bold text-emerald-400">+{formatPrice(sale.amount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Buyer</p>
          <div className="flex items-center gap-2">
            <User size={14} className="text-stone-500 shrink-0" />
            <p className="text-sm text-stone-300">{buyerLabel}</p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">Processing Window</p>
          {hasWindow ? (
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-amber-500/8 border border-amber-500/15">
              <Clock size={14} className="text-amber-400/80 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-300">{windowText}</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Stamped at time of purchase</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-stone-800/50 border border-white/6">
              <Clock size={14} className="text-stone-600 shrink-0" />
              <div>
                <p className="text-sm text-stone-500">Not stamped</p>
                <p className="text-[11px] text-stone-600 mt-0.5">
                  No processing window was set when this order was placed.{" "}
                  <Link href="/settings?section=payments" className="text-amber-500/70 hover:text-amber-400 transition-colors">
                    Configure one in Settings.
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>

        {sale.manualPayout && (
          <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/6 p-4">
            <div className="flex items-start gap-3">
              <DollarSign size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-200 font-semibold mb-1">Manual payout order</p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  This order was placed under manual payout mode. Process it directly with the buyer.
                </p>
              </div>
            </div>
          </div>
        )}

        {sale.trackingNumber && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Tracking</p>
            <div className="flex items-center gap-2">
              <Truck size={14} className="text-blue-400 shrink-0" />
              <p className="text-sm text-stone-300">
                Tracking number:{" "}
                <span className="font-mono text-stone-100">{sale.trackingNumber}</span>
              </p>
            </div>
          </div>
        )}

        {sale.shippingAddress && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Ship to</p>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-stone-500 shrink-0 mt-0.5" />
              <p className="text-sm text-stone-400 whitespace-pre-line">{sale.shippingAddress}</p>
            </div>
          </div>
        )}

        {sale.notes && !sale.notes.startsWith("stripe:") && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Notes</p>
            <div className="flex items-start gap-2">
              <FileText size={14} className="text-stone-500 shrink-0 mt-0.5" />
              <p className="text-sm text-stone-400">{sale.notes}</p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <Link href="/earnings">
            <button className="w-full rounded-full border border-white/10 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
              Back to Earnings
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
