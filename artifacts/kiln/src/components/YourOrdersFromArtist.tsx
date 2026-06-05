import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ArtistOrder {
  id: string;
  type: string;
  title: string;
  imageUrl: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  inquiry: "Inquiry sent",
  in_progress: "In progress",
  shipped: "Shipped",
  delivered: "Delivered",
  waitlisted: "Waitlisted",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

function formatPrice(amount: number, currency: string) {
  try {
    return amount.toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  } catch {
    return `$${amount.toLocaleString("en-US")}`;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

/**
 * "Your orders from this artist" — shows a logged-in buyer their past purchases
 * from the artist whose profile they are viewing. Hidden when the viewer isn't
 * authenticated or has no orders from this seller.
 */
export default function YourOrdersFromArtist({ sellerId }: { sellerId: string }) {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<ArtistOrder[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !sellerId) {
      setOrders([]);
      return;
    }
    const ac = new AbortController();
    setOrders([]);
    fetch(`/api/me/orders?sellerId=${encodeURIComponent(sellerId)}`, {
      credentials: "include",
      signal: ac.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.orders)) setOrders(data.orders);
      })
      .catch(() => {});
    return () => ac.abort();
  }, [isAuthenticated, sellerId]);

  if (!isAuthenticated || orders.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-500">
        <ShoppingBag size={12} className="text-amber-500" />
        Your orders from this artist
      </h2>
      <div className="flex flex-col gap-2">
        {orders.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`}>
            <div className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-stone-900/50 p-3 transition-colors hover:border-amber-500/20 hover:bg-stone-900/70 cursor-pointer">
              {o.imageUrl ? (
                <img src={o.imageUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-stone-800">
                  <ShoppingBag size={18} className="text-stone-600" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-amber-100">{o.title}</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {STATUS_LABELS[o.status] ?? o.status}
                  {o.createdAt && <span> &middot; {formatDate(o.createdAt)}</span>}
                </p>
              </div>
              <span className="flex-shrink-0 text-sm font-semibold text-stone-200">
                {formatPrice(o.amount, o.currency)}
              </span>
              <ChevronRight size={16} className="flex-shrink-0 text-stone-600 group-hover:text-amber-400 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
