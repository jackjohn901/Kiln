import { useState } from "react";
import { Link } from "wouter";
import { ShoppingBag, Zap, MessageSquare, BookOpen, Package, CheckCircle2, Clock, Truck, AlertCircle } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

export interface Order {
  id: string;
  type: "drop" | "listing" | "commission" | "workshop";
  itemName: string;
  artistName: string;
  artistId: string;
  amount: number;
  status: "pending" | "in_progress" | "shipped" | "delivered" | "waitlisted";
  imageUrl: string;
  createdAt: string;
  trackingNumber?: string;
}

const SEED_ORDERS: Order[] = [
  {
    id: "ord-001",
    type: "drop",
    itemName: "Cobalt Gather Vessel No. 5",
    artistName: "Alex Bernstein",
    artistId: "alex-bernstein",
    amount: 2800,
    status: "delivered",
    imageUrl: "https://picsum.photos/seed/vessel5/200/200",
    createdAt: "2026-04-10T12:00:00Z",
    trackingNumber: "1Z999AA10123456784",
  },
  {
    id: "ord-002",
    type: "listing",
    itemName: "Forged Steel Garden Form",
    artistName: "James Okafor",
    artistId: "james-okafor",
    amount: 1450,
    status: "shipped",
    imageUrl: "https://picsum.photos/seed/steel-garden/200/200",
    createdAt: "2026-04-22T10:00:00Z",
    trackingNumber: "9400111200883152609217",
  },
  {
    id: "ord-003",
    type: "commission",
    itemName: "Custom Amber Vessel Commission",
    artistName: "Laura Donefer",
    artistId: "laura-donefer",
    amount: 4200,
    status: "in_progress",
    imageUrl: "https://picsum.photos/seed/amber-vessel/200/200",
    createdAt: "2026-05-01T09:00:00Z",
  },
  {
    id: "ord-004",
    type: "workshop",
    itemName: "Flameworking Fundamentals — June 7",
    artistName: "Caleb Siemon",
    artistId: "caleb-siemon",
    amount: 320,
    status: "pending",
    imageUrl: "https://picsum.photos/seed/workshop-flame/200/200",
    createdAt: "2026-05-12T15:30:00Z",
  },
  {
    id: "ord-005",
    type: "listing",
    itemName: "Raku Tea Bowl — Ceremony Set",
    artistName: "Maya Chen",
    artistId: "maya-chen",
    amount: 680,
    status: "delivered",
    imageUrl: "https://picsum.photos/seed/tea-bowl/200/200",
    createdAt: "2026-02-14T14:00:00Z",
    trackingNumber: "420901619505500020247732",
  },
];

const TYPE_CFG = {
  drop:       { icon: Zap,          label: "Drop",       color: "text-orange-400",  bg: "bg-orange-500/15" },
  listing:    { icon: ShoppingBag,  label: "Shop",       color: "text-blue-400",    bg: "bg-blue-500/15" },
  commission: { icon: MessageSquare,label: "Commission", color: "text-purple-400",  bg: "bg-purple-500/15" },
  workshop:   { icon: BookOpen,     label: "Workshop",   color: "text-emerald-400", bg: "bg-emerald-500/15" },
};

const STATUS_CFG = {
  pending:     { icon: Clock,         label: "Pending",     color: "text-amber-400",   bg: "bg-amber-500/10" },
  in_progress: { icon: AlertCircle,   label: "In progress", color: "text-blue-400",    bg: "bg-blue-500/10" },
  shipped:     { icon: Truck,         label: "Shipped",     color: "text-sky-400",     bg: "bg-sky-500/10" },
  delivered:   { icon: CheckCircle2,  label: "Delivered",   color: "text-emerald-400", bg: "bg-emerald-500/10" },
  waitlisted:  { icon: Clock,         label: "Waitlisted",  color: "text-stone-400",   bg: "bg-stone-500/10" },
};

const ALL_FILTERS = ["All", "Drop", "Shop", "Commission", "Workshop"] as const;
type FilterType = typeof ALL_FILTERS[number];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Orders() {
  const { profile } = useProfile();
  const [filter, setFilter] = useState<FilterType>("All");

  const filtered = SEED_ORDERS.filter((o) => {
    if (filter === "All") return true;
    const map: Record<FilterType, Order["type"] | null> = { All: null, Drop: "drop", Shop: "listing", Commission: "commission", Workshop: "workshop" };
    return o.type === map[filter];
  });

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <p className="mb-4 text-stone-400">Sign in to view your orders.</p>
          <Link href="/setup" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950">Set up profile</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15">
            <Package size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-amber-100">Orders</h1>
            <p className="text-sm text-stone-500">{SEED_ORDERS.length} total orders</p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {ALL_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                  : "border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Orders list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={36} className="mx-auto mb-3 text-stone-700" />
              <p className="text-stone-500">No orders found</p>
            </div>
          ) : (
            filtered.map((order) => {
              const typeCfg = TYPE_CFG[order.type];
              const statusCfg = STATUS_CFG[order.status];
              const TypeIcon = typeCfg.icon;
              const StatusIcon = statusCfg.icon;

              return (
                <div key={order.id} className="rounded-2xl border border-white/8 bg-stone-900/40 p-4">
                  <div className="flex gap-4">
                    <img src={order.imageUrl} alt={order.itemName} className="h-16 w-16 flex-shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-stone-200 leading-tight">{order.itemName}</p>
                        <p className="flex-shrink-0 font-bold text-stone-200">${order.amount.toLocaleString()}</p>
                      </div>
                      <Link href={`/artists/${order.artistId}`} className="text-xs text-amber-400/80 hover:text-amber-300">
                        {order.artistName}
                      </Link>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${typeCfg.bg} ${typeCfg.color}`}>
                          <TypeIcon size={8} />
                          {typeCfg.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                          <StatusIcon size={8} />
                          {statusCfg.label}
                        </span>
                        <span className="text-[10px] text-stone-600">{formatDate(order.createdAt)}</span>
                      </div>
                      {order.trackingNumber && (
                        <p className="mt-1.5 text-[10px] text-stone-600 font-mono">
                          Tracking: {order.trackingNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
