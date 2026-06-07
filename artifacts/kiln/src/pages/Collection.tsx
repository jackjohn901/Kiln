import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Package, Zap, Clock, CheckCircle2, ShoppingBag, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";
import { getLiveDrops, getUpcomingDrops, type Drop } from "@/data/drops";
import RelativeTime, { relativeLabel } from "@/components/RelativeTime";

interface PurchasedItem {
  id: string;
  name: string;
  artistName: string;
  artistId: string;
  imageUrl: string;
  price: number;
  acquiredAt: string;
  type: "drop" | "shop";
}

interface ApiOrder {
  id: string;
  type: string;
  title: string;
  imageUrl: string | null;
  amount: number;
  status: string;
  sellerId: string;
  createdAt: string;
  sellerDisplayName?: string | null;
  sellerHandle?: string | null;
}

const OWNED_TYPES = new Set(["listing", "drop", "auction"]);
const EXCLUDED_STATUS = new Set(["cancelled", "canceled", "refunded"]);

function orderToPurchased(o: ApiOrder): PurchasedItem {
  return {
    id: o.id,
    name: o.title,
    artistName: o.sellerDisplayName ?? o.sellerHandle ?? "Artist",
    artistId: o.sellerId,
    imageUrl: o.imageUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${o.id}`,
    price: o.amount,
    acquiredAt: o.createdAt,
    type: o.type === "drop" ? "drop" : "shop",
  };
}

const TABS = ["Owned", "Waitlisted"] as const;
type TabType = typeof TABS[number];


export default function Collection() {
  const [tab, setTab] = useState<TabType>("Owned");
  const { dropsWaitlisted, isOnDropWaitlist, leaveDropWaitlist } = useSocial();
  const [owned, setOwned] = useState<PurchasedItem[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/orders", { credentials: "include" })
      .then(r => (r.ok ? (r.json() as Promise<{ orders: ApiOrder[] }>) : null))
      .then(data => {
        if (data?.orders) {
          setOwned(
            data.orders
              .filter(o => OWNED_TYPES.has(o.type) && !EXCLUDED_STATUS.has(o.status))
              .map(orderToPurchased)
          );
        }
      })
      .catch(() => {})
      .finally(() => setOwnedLoading(false));
  }, []);

  const waitlistedDropIds = Object.entries(dropsWaitlisted).filter(([, v]) => v).map(([id]) => id);
  const allDrops = [...getLiveDrops(), ...getUpcomingDrops()];
  const waitlistedDrops = allDrops.filter((d) => isOnDropWaitlist(d.id));

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/15">
            <Package size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-amber-100">My Collection</h1>
            <p className="text-sm text-stone-500">{owned.length} owned · {waitlistedDrops.length} waitlisted</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-stone-900/50 p-1 border border-white/5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === t ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {t} {t === "Owned" ? `(${owned.length})` : `(${waitlistedDrops.length})`}
            </button>
          ))}
        </div>

        {/* Owned */}
        {tab === "Owned" && (
          <div className="space-y-3">
            {ownedLoading ? (
              <div className="flex items-center justify-center gap-3 py-20 text-stone-600">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading your collection…</span>
              </div>
            ) : owned.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <ShoppingBag size={36} className="mb-3 text-stone-700" />
                <p className="text-stone-500">Nothing in your collection yet</p>
                <Link href="/shop" className="mt-4 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400">Browse Shop</Link>
              </div>
            ) : (
              owned.map((item) => (
                <div key={item.id} className="flex gap-4 rounded-2xl border border-white/8 bg-stone-900/40 p-4">
                  <img src={item.imageUrl} alt={item.name} className="h-20 w-20 rounded-xl object-cover flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-200 leading-tight">{item.name}</p>
                    <Link href={`/artists/${item.artistId}`} className="text-sm text-amber-400/80 hover:text-amber-300">
                      {item.artistName}
                    </Link>
                    <div className="mt-2 flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        item.type === "drop" ? "bg-orange-500/15 text-orange-400" : "bg-blue-500/15 text-blue-400"
                      }`}>
                        {item.type === "drop" ? <Zap size={8} /> : <ShoppingBag size={8} />}
                        {item.type === "drop" ? "Drop" : "Shop"}
                      </span>
                      <RelativeTime since={item.acquiredAt} className="text-xs text-stone-600" />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-stone-200">${item.price.toLocaleString()}</p>
                    <div className="mt-1 flex items-center gap-1 text-emerald-400 justify-end">
                      <CheckCircle2 size={12} />
                      <span className="text-xs">Owned</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Waitlisted */}
        {tab === "Waitlisted" && (
          <div className="space-y-3">
            {waitlistedDrops.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <Zap size={36} className="mb-3 text-stone-700" />
                <p className="text-stone-500">No drops waitlisted</p>
                <Link href="/drops" className="mt-4 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400">Browse Drops</Link>
              </div>
            ) : (
              waitlistedDrops.map((drop) => (
                <div key={drop.id} className="flex gap-4 rounded-2xl border border-white/8 bg-stone-900/40 p-4">
                  <img src={drop.imageUrl} alt={drop.title} className="h-20 w-20 rounded-xl object-cover flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-200 leading-tight">{drop.title}</p>
                    <p className="text-sm text-stone-500">{drop.artistName}</p>
                    <div className="mt-1.5 flex items-center gap-1 text-amber-400 text-xs">
                      <Clock size={11} />
                      <span>{drop.status === "live" ? "Live now" : `Dropping ${new Date(drop.dropDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between flex-shrink-0">
                    <p className="font-bold text-amber-300">${drop.price.toLocaleString()}</p>
                    <button
                      onClick={() => leaveDropWaitlist(drop.id)}
                      className="text-xs text-stone-600 hover:text-rose-400 transition-colors"
                    >
                      Leave list
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
