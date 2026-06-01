import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  Zap, Clock, CheckCircle2, ChevronLeft, Loader2, Users, Calendar,
} from "lucide-react";
import Nav from "@/components/Nav";
import { toast } from "@/hooks/use-toast";

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

function formatDropDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function DropsDetail() {
  const { id } = useParams<{ id: string }>();
  const [drop, setDrop] = useState<Drop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/drops/${id}`, { credentials: "include" })
      .then(r => {
        if (r.status === 404) { if (!cancelled) setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        if (cancelled || !data?.id) return;
        setDrop(data as Drop);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!drop || drop.status !== "upcoming") return;
    setCountdown(getTimeUntilDrop(drop.dropDate));
    const iv = setInterval(() => setCountdown(getTimeUntilDrop(drop.dropDate)), 10000);
    return () => clearInterval(iv);
  }, [drop]);

  const handleWaitlist = async () => {
    if (!drop) return;
    setToggling(true);
    try {
      const r = await fetch(`/api/drops/${drop.id}/waitlist`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setDrop(prev => prev ? {
        ...prev,
        isOnWaitlist: data.onWaitlist,
        waitlistCount: Math.max(0, (prev.waitlistCount ?? 0) + (data.onWaitlist ? 1 : -1)),
      } : prev);
    } catch {
      toast({ title: "Couldn\u2019t update waitlist", description: "Please try again.", variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const handleBuyNow = async () => {
    if (!drop) return;
    setBuyingNow(true);
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ name: drop.title, price: drop.price, quantity: 1, imageUrl: drop.imageUrl ?? undefined, artistName: drop.artistName }],
          successPath: `/drops/${drop.id}?purchased=1`,
          cancelPath: `/drops/${drop.id}`,
        }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (data.url) { window.location.href = data.url; return; }
      throw new Error();
    } catch {
      toast({ title: "Couldn\u2019t start checkout", description: "Please try again.", variant: "destructive" });
      setBuyingNow(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-stone-600" />
        </div>
      </div>
    );
  }

  if (notFound || !drop) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <Zap size={32} className="mx-auto mb-3 text-stone-700" />
          <p className="text-stone-400 text-sm mb-4">Drop not found.</p>
          <Link href="/drops">
            <button className="rounded-full border border-white/10 px-5 py-2 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
              Back to Drops
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const isSold = drop.status === "sold" || drop.editionSold >= drop.edition;
  const isLive = drop.status === "live" && !isSold;
  const isUpcoming = drop.status === "upcoming";
  const waitlistCount = drop.waitlistCount ?? 0;

  return (
    <div className="min-h-screen bg-[#12100e] text-stone-100">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-6">
        <Link href="/drops" className="mb-5 inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-400 transition-colors">
          <ChevronLeft size={14} /> Back to Drops
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-stone-900/60">
            {drop.imageUrl ? (
              <img src={drop.imageUrl} alt={drop.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-800">
                <Zap size={40} className="text-stone-700" />
              </div>
            )}
            <div className="absolute top-3 left-3 flex gap-2">
              {isLive && (
                <span className="flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live Now
                </span>
              )}
              {isUpcoming && (
                <span className="flex items-center gap-1 rounded-full bg-stone-900/80 px-2.5 py-1 text-xs font-mono font-medium text-amber-300 border border-amber-500/20">
                  <Clock size={10} className="text-amber-400" /> {countdown}
                </span>
              )}
              {isSold && (
                <span className="flex items-center gap-1.5 rounded-full bg-stone-700 px-3 py-1 text-xs font-medium text-stone-300">
                  <CheckCircle2 size={11} /> Sold Out
                </span>
              )}
            </div>
            {drop.isOnWaitlist && !isSold && (
              <div className="absolute top-3 right-3">
                <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-stone-950">On waitlist</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <Link href={`/artists/${drop.artistId}`} className="mb-4 flex items-center gap-2.5 w-fit group">
              {drop.artistAvatarUrl ? (
                <img src={drop.artistAvatarUrl} alt={drop.artistName}
                  className="h-9 w-9 rounded-full object-cover border border-white/10 group-hover:border-amber-500/40 transition-colors" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 border border-white/10 text-xs text-stone-400">
                  {drop.artistName.charAt(0)}
                </div>
              )}
              <span className="text-sm font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">{drop.artistName}</span>
            </Link>

            <h1 className="font-serif text-3xl text-amber-100 leading-tight">{drop.title}</h1>
            <p className="mt-2 text-sm text-stone-500">
              {drop.technique ?? "Studio work"} · Edition of {drop.edition}
              {drop.editionSold > 0 && ` · ${drop.editionSold} sold`}
            </p>

            <p className="mt-4 text-3xl font-semibold text-amber-300">{formatPrice(drop.price)}</p>

            {drop.description && (
              <p className="mt-4 text-sm text-stone-300 leading-relaxed whitespace-pre-line">{drop.description}</p>
            )}

            <div className="mt-5 space-y-2.5 rounded-2xl border border-white/8 bg-stone-900/60 p-4">
              <div className="flex items-center gap-2 text-sm text-stone-300">
                <Calendar size={14} className="text-amber-400 shrink-0" />
                <span>{isUpcoming ? "Drops" : "Dropped"} {formatDropDate(drop.dropDate)}</span>
              </div>
              {waitlistCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-stone-300">
                  <Users size={14} className="text-amber-400 shrink-0" />
                  <span>{waitlistCount} {waitlistCount === 1 ? "person" : "people"} on the waitlist</span>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="mt-6">
              {isSold && (
                <div className="rounded-full bg-stone-800 px-6 py-3 text-center text-sm font-medium text-stone-400">
                  This edition has sold out
                </div>
              )}
              {isLive && (
                <button onClick={handleBuyNow} disabled={buyingNow}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-60">
                  {buyingNow ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                  {buyingNow ? "Starting checkout\u2026" : "Buy Now"}
                </button>
              )}
              {isUpcoming && (
                <button onClick={handleWaitlist} disabled={toggling}
                  className={`flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    drop.isOnWaitlist
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                      : "border-stone-600 text-stone-300 hover:border-amber-500/40 hover:text-amber-300"
                  }`}>
                  {toggling ? <Loader2 size={15} className="animate-spin" />
                    : drop.isOnWaitlist ? <><CheckCircle2 size={15} /> On the waitlist</>
                    : <>+ Join the waitlist</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
