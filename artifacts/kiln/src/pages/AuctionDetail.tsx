import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  Gavel, Clock, TrendingUp, AlertCircle, CheckCircle, Trophy, CreditCard, Loader2, ChevronLeft,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import RelativeTime from "@/components/RelativeTime";
import { toast } from "@/hooks/use-toast";

interface Bid {
  id: string;
  bidderName: string;
  amount: number;
  createdAt: string;
}

interface Auction {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatarUrl: string | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  medium: string | null;
  dimensions: string | null;
  startingPrice: number;
  reservePrice: number | null;
  currentBid: number;
  currentBidderId: string | null;
  currentBidderName: string | null;
  bidCount: number;
  currency: string;
  status: string;
  startDate: string;
  endDate: string;
  bids?: Bid[];
  lastBidAt?: string;
}

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function getTimeLeft(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${h}h ${pad(m)}m ${pad(s)}s`;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export default function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useProfile();
  const { markLinkRead } = useSocial();
  const { subscribe } = useWebSocket();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [amount, setAmount] = useState(0);
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState("");
  const [paying, setPaying] = useState(false);
  const amountTouched = useRef(false);

  useEffect(() => {
    if (id) markLinkRead(`/auctions/${id}`);
  }, [id, markLinkRead]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/auctions/${id}`, { credentials: "include" })
      .then(r => {
        if (r.status === 404) { if (!cancelled) setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((data: Auction | null) => {
        if (cancelled || !data?.id) return;
        const lastBidAt = data.bids?.[0]?.createdAt ?? data.lastBidAt;
        setAuction({ ...data, lastBidAt });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // Live bid updates
  useEffect(() => {
    if (!id) return;
    return subscribe("bid", (event) => {
      const e = event as { auctionId: string; currentBid: number; bidCount: number; bidderName: string; bidAt?: string };
      if (e.auctionId !== id) return;
      const lastBidAt = e.bidAt ?? new Date().toISOString();
      setAuction(prev => prev ? { ...prev, currentBid: e.currentBid, bidCount: e.bidCount, currentBidderName: e.bidderName, lastBidAt } : prev);
    });
  }, [subscribe, id]);

  // Countdown
  useEffect(() => {
    if (!auction) return;
    setTimeLeft(getTimeLeft(auction.endDate));
    const iv = setInterval(() => setTimeLeft(getTimeLeft(auction.endDate)), 1000);
    return () => clearInterval(iv);
  }, [auction]);

  const minBid = auction ? (auction.currentBid > 0 ? auction.currentBid + 50 : auction.startingPrice) : 0;

  // Keep the bid input defaulted to the minimum until the user edits it.
  useEffect(() => {
    if (!amountTouched.current) setAmount(minBid);
  }, [minBid]);

  const isLive = !!auction && auction.status === "live" && new Date(auction.endDate) > new Date();
  const reserveMet = !!auction && (auction.reservePrice === null || auction.currentBid >= auction.reservePrice);
  const isEnded = !!auction && !isLive;
  const isWinner = isEnded && !!auction.currentBidderId && auction.currentBidderId === profile?.id;
  const isOwner = !!auction && !!profile && auction.artistId === profile.id;
  const alreadyPaid = auction?.status === "paid";
  const displayBid = auction ? (auction.currentBid > 0 ? auction.currentBid : auction.startingPrice) : 0;
  const endingSoon = !!auction && isLive && new Date(auction.endDate).getTime() - Date.now() <= 60000;

  const handleBid = async () => {
    if (!auction) return;
    if (amount < minBid) { setBidError(`Minimum bid is ${formatPrice(minBid)}`); return; }
    setBidding(true); setBidError("");
    try {
      const r = await fetch(`/api/auctions/${auction.id}/bid`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await r.json();
      if (!r.ok) { setBidError(data.error ?? "Failed to place bid"); setBidding(false); return; }
      const updated = data.auction as Auction;
      const lastBidAt = updated.bids?.[0]?.createdAt ?? updated.lastBidAt;
      setAuction(prev => prev ? { ...prev, ...updated, lastBidAt } : updated);
      amountTouched.current = false;
      toast({ title: "Bid placed!", description: `You bid ${formatPrice(amount)}.` });
    } catch {
      setBidError("Failed to place bid");
    }
    setBidding(false);
  };

  const handlePayNow = async () => {
    if (!auction) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/auctions/${auction.id}/checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) { window.location.href = data.url; return; }
      throw new Error();
    } catch {
      toast({ title: "Couldn\u2019t start checkout", description: "Please try again.", variant: "destructive" });
      setPaying(false);
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

  if (notFound || !auction) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <Gavel size={32} className="mx-auto mb-3 text-stone-700" />
          <p className="text-stone-400 text-sm mb-4">Auction not found.</p>
          <Link href="/auctions">
            <button className="rounded-full border border-white/10 px-5 py-2 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
              Back to Auctions
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e] text-stone-100">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-6">
        <Link href="/auctions" className="mb-5 inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-400 transition-colors">
          <ChevronLeft size={14} /> Back to Auctions
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-stone-900/60">
            {auction.imageUrl ? (
              <img src={auction.imageUrl} alt={auction.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-800">
                <Gavel size={40} className="text-stone-700" />
              </div>
            )}
            <div className="absolute top-3 left-3">
              {isLive ? (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-[10px] font-bold text-stone-950">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-950 animate-pulse" /> LIVE
                </span>
              ) : (
                <span className="rounded-full bg-stone-700/90 px-3 py-1 text-[10px] font-medium text-stone-400">Ended</span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <Link href={`/artists/${auction.artistId}`} className="mb-4 flex items-center gap-2.5 w-fit group">
              {auction.artistAvatarUrl ? (
                <img src={auction.artistAvatarUrl} alt={auction.artistName}
                  className="h-9 w-9 rounded-full object-cover border border-white/10 group-hover:border-amber-500/40 transition-colors" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 border border-white/10 text-xs text-stone-400">
                  {auction.artistName.charAt(0)}
                </div>
              )}
              <span className="text-sm font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">{auction.artistName}</span>
            </Link>

            <h1 className="font-serif text-3xl text-amber-100 leading-tight">{auction.title}</h1>
            {(auction.medium || auction.dimensions) && (
              <p className="mt-2 text-sm text-stone-500">
                {auction.medium}{auction.medium && auction.dimensions ? " · " : ""}{auction.dimensions}
              </p>
            )}

            {auction.description && (
              <p className="mt-4 text-sm text-stone-300 leading-relaxed whitespace-pre-line">{auction.description}</p>
            )}

            {/* Bid status */}
            <div className="mt-5 rounded-2xl border border-white/8 bg-stone-900/60 p-4 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-stone-500 uppercase tracking-wider">Current Bid</p>
                  <p className="text-2xl font-bold text-amber-300">{formatPrice(displayBid)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-stone-500">{auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}</p>
                  {isLive && <p className="text-[9px] uppercase tracking-wider text-stone-500 mt-1">Ends in</p>}
                  <p className={`font-mono text-xl font-bold tabular-nums flex items-center gap-1.5 justify-end ${
                    !isLive ? "text-stone-500" : endingSoon ? "text-red-500 animate-pulse" : "text-amber-300"
                  }`}>
                    <Clock size={14} /> {timeLeft}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                {reserveMet ? (
                  <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={10} /> Reserve met</span>
                ) : (
                  <span className="flex items-center gap-1 text-stone-500"><AlertCircle size={10} /> Reserve not met</span>
                )}
                <span className="text-stone-700">·</span>
                <span className="text-stone-500">Starts at {formatPrice(auction.startingPrice)}</span>
              </div>
              {isLive && auction.lastBidAt && (
                <p className="flex items-center gap-1 text-[10px] text-stone-500">
                  <TrendingUp size={9} className="text-amber-500/70" />
                  last bid <RelativeTime since={auction.lastBidAt} className="text-amber-400/80" intervalMs={10_000} />
                </p>
              )}
            </div>

            {/* CTA */}
            <div className="mt-6">
              {isLive && isOwner && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-1.5">
                  <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-300">
                    <Gavel size={14} /> This is your auction
                  </p>
                  <p className="text-xs text-stone-400">
                    {auction.bidCount > 0
                      ? `${auction.bidCount} bid${auction.bidCount !== 1 ? "s" : ""} so far · highest ${formatPrice(displayBid)}`
                      : "No bids yet — share it so collectors can find it."}
                  </p>
                  <p className="text-[11px] text-stone-500">You can't bid on your own piece.</p>
                </div>
              )}
              {isLive && !isOwner && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-stone-500 mb-1.5 block">Your bid amount (min {formatPrice(minBid)})</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-medium">$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={e => { amountTouched.current = true; setAmount(Number(e.target.value)); }}
                        min={minBid}
                        step={50}
                        className="w-full rounded-xl border border-white/10 bg-stone-800 py-3 pl-7 pr-4 text-stone-100 focus:border-amber-500/50 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[50, 100, 250, 500].map(inc => (
                      <button key={inc} onClick={() => { amountTouched.current = true; setAmount(minBid + inc); }}
                        className="flex-1 rounded-lg border border-white/8 py-1.5 text-xs text-stone-400 hover:border-amber-500/30 hover:text-amber-300 transition-colors">
                        +{inc}
                      </button>
                    ))}
                  </div>
                  {bidError && <p className="text-xs text-rose-400">{bidError}</p>}
                  <button onClick={handleBid} disabled={bidding}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-60">
                    {bidding ? <Loader2 size={15} className="animate-spin" /> : <Gavel size={15} />}
                    {bidding ? "Placing\u2026" : `Bid ${formatPrice(amount || minBid)}`}
                  </button>
                </div>
              )}
              {isWinner && !alreadyPaid && (
                <button onClick={handlePayNow} disabled={paying}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3 text-sm font-bold text-stone-950 hover:bg-emerald-400 transition-colors disabled:opacity-60">
                  {paying ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                  {paying ? "Redirecting\u2026" : `Pay ${formatPrice(auction.currentBid)} — You won!`}
                </button>
              )}
              {isWinner && alreadyPaid && (
                <div className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 py-3 text-xs text-emerald-400">
                  <CheckCircle size={14} /> Payment received — contact the artist to arrange delivery
                </div>
              )}
              {isEnded && !isWinner && (
                <div className="flex items-center justify-center gap-1.5 rounded-full bg-stone-800 py-3 text-xs text-stone-400">
                  <Trophy size={14} className="text-amber-500/60" />
                  {auction.currentBidderName ? `Won by ${auction.currentBidderName}` : "Auction ended"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bid history */}
        {auction.bids && auction.bids.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
            <h2 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" /> Bid history ({auction.bids.length})
            </h2>
            <div className="space-y-2">
              {auction.bids.map(bid => (
                <div key={bid.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-stone-900/50 px-4 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-stone-300">{bid.bidderName}</span>
                    <RelativeTime since={bid.createdAt} className="text-[10px] text-stone-600" />
                  </div>
                  <span className="text-sm font-semibold text-amber-400">{formatPrice(bid.amount)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
