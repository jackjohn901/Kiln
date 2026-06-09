import { useState, useEffect } from "react";
import { markFeatureVisited } from "@/lib/featureDiscovery";
import { Zap, Clock, CheckCircle2, ChevronRight, Loader2, Plus } from "lucide-react";
import { Link } from "wouter";
import Nav from "@/components/Nav";
import CheckoutErrorNotice from "@/components/CheckoutErrorNotice";

interface Drop {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatarUrl: string | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  currency: string;
  edition: number;
  editionSold: number;
  status: string;
  dropDate: string;
  technique: string | null;
  isOnWaitlist: boolean;
  waitlistCount?: number;
}

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function getTimeUntilDrop(dropDate: string): string {
  const diff = new Date(dropDate).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function CountdownBadge({ dropDate }: { dropDate: string }) {
  const [time, setTime] = useState(getTimeUntilDrop(dropDate));
  useEffect(() => {
    const iv = setInterval(() => setTime(getTimeUntilDrop(dropDate)), 10000);
    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      setTime(getTimeUntilDrop(dropDate));
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [dropDate]);
  return (
    <span className="flex items-center gap-1 rounded-full bg-stone-900/80 px-2.5 py-1 text-xs font-mono font-medium text-amber-300 border border-amber-500/20">
      <Clock size={10} className="text-amber-400" />
      {time}
    </span>
  );
}

function DropCard({ drop, onWaitlistToggle }: { drop: Drop; onWaitlistToggle: (id: string, val: boolean) => void }) {
  const [toggling, setToggling] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const handleWaitlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setToggling(true);
    try {
      const r = await fetch(`/api/drops/${drop.id}/waitlist`, { method: "POST", credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        onWaitlistToggle(drop.id, data.onWaitlist);
      }
    } catch {}
    setToggling(false);
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBuyingNow(true);
    setCheckoutError("");
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ name: drop.title, price: drop.price, quantity: 1, imageUrl: drop.imageUrl ?? undefined, artistName: drop.artistName }],
          successPath: "/drops?purchased=1",
          cancelPath: "/drops",
        }),
      });
      const data = await r.json().catch(() => ({} as { url?: string; error?: string }));
      if (r.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError(
        data.error ?? "We couldn't complete your checkout. This work may no longer be available. Please try again or contact support.",
      );
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
    }
    setBuyingNow(false);
  };

  const isSold = drop.status === "sold" || drop.editionSold >= drop.edition;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-stone-900/60 transition-all duration-200 ${!isSold ? "cursor-pointer hover:border-amber-500/30 hover:bg-stone-900/80" : "opacity-60"}`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        {drop.imageUrl ? (
          <img src={drop.imageUrl} alt={drop.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-stone-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />
        <div className="absolute top-3 left-3">
          {drop.status === "live" && !isSold && (
            <span className="flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live Now
            </span>
          )}
          {drop.status === "upcoming" && <CountdownBadge dropDate={drop.dropDate} />}
          {isSold && (
            <span className="flex items-center gap-1.5 rounded-full bg-stone-700 px-3 py-1 text-xs font-medium text-stone-400">
              <CheckCircle2 size={10} /> Sold Out
            </span>
          )}
        </div>
        {drop.isOnWaitlist && !isSold && (
          <div className="absolute top-3 right-3">
            <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-stone-950">On waitlist</span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-serif text-lg font-medium text-white leading-tight">{drop.title}</p>
          <p className="text-sm text-stone-400">{drop.artistName}</p>
        </div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-amber-300">{formatPrice(drop.price)}</p>
          <p className="text-xs text-stone-500">{drop.technique ?? "Studio work"} · Ed. {drop.edition}</p>
          {drop.status === "upcoming" && (drop.waitlistCount ?? 0) > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-400/80">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              {drop.waitlistCount} {drop.waitlistCount === 1 ? "person" : "people"} waiting
            </p>
          )}
        </div>
        {!isSold && drop.status === "live" && (
          <button onClick={handleBuyNow} disabled={buyingNow}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-60">
            {buyingNow ? <Loader2 size={10} className="animate-spin" /> : "Buy Now"}
          </button>
        )}
        {!isSold && drop.status === "upcoming" && (
          <button onClick={handleWaitlist} disabled={toggling}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              drop.isOnWaitlist
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-stone-600 text-stone-400 hover:border-amber-500/40 hover:text-amber-300"
            }`}>
            {toggling ? <Loader2 size={10} className="animate-spin" /> : drop.isOnWaitlist ? <><CheckCircle2 size={11} /> Waitlisted</> : <>+ Waitlist</>}
          </button>
        )}
      </div>
      {checkoutError && (
        <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
          <CheckoutErrorNotice message={checkoutError} />
        </div>
      )}
    </div>
  );
}

export default function Drops() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "live" | "upcoming" | "sold">("all");

  useEffect(() => { markFeatureVisited("drops"); }, []);

  useEffect(() => {
    fetch("/api/drops", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setDrops(data.drops ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleWaitlistToggle = (dropId: string, val: boolean) => {
    setDrops(prev => prev.map(d => d.id === dropId ? { ...d, isOnWaitlist: val } : d));
  };

  const filtered = drops.filter(d => {
    const isSold = d.status === "sold" || d.editionSold >= d.edition;
    if (tab === "live") return d.status === "live" && !isSold;
    if (tab === "upcoming") return d.status === "upcoming";
    if (tab === "sold") return isSold;
    return true;
  });

  const live = drops.filter(d => d.status === "live" && d.editionSold < d.edition);
  const upcoming = drops.filter(d => d.status === "upcoming");

  return (
    <div className="min-h-screen bg-[#12100e] text-stone-100">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Zap size={18} className="text-amber-400" />
              <h1 className="font-serif text-2xl text-amber-100">Drops</h1>
            </div>
            <p className="text-sm text-stone-500">Limited-edition releases from craft artists.</p>
          </div>
          {live.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/30 px-3 py-1 text-xs font-semibold text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              {live.length} Live
            </span>
          )}
        </div>

        <div className="mb-6 flex gap-1 rounded-xl bg-stone-900/50 p-1 border border-white/5">
          {([
            { key: "all", label: "All" },
            { key: "live", label: `Live${live.length ? ` (${live.length})` : ""}` },
            { key: "upcoming", label: `Upcoming${upcoming.length ? ` (${upcoming.length})` : ""}` },
            { key: "sold", label: "Sold Out" },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg py-2 text-center text-xs font-medium transition-colors ${tab === t.key ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}>
              {t.label}
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
            <Zap size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">No drops in this category yet.</p>
            <Link href="/create" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors">
              <Plus size={12} /> Create a drop
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(drop => (
            <DropCard key={drop.id} drop={drop} onWaitlistToggle={handleWaitlistToggle} />
          ))}
        </div>
      </div>
    </div>
  );
}
