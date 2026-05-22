import { useState, useEffect, useCallback, useRef } from "react";
import { markFeatureVisited } from "@/lib/featureDiscovery";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Clock, TrendingUp, X, AlertCircle, CheckCircle, Trophy, ChevronDown, ChevronUp, CreditCard, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import RelativeTime from "@/components/RelativeTime";

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
}

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function getTimeLeft(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function AuctionCard({ auction, onBid, currentUserId }: { auction: Auction; onBid: (a: Auction) => void; currentUserId?: string }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(auction.endDate));
  const [paying, setPaying] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => setTimeLeft(getTimeLeft(auction.endDate)), 30000);
    return () => clearInterval(iv);
  }, [auction.endDate]);

  const isLive = auction.status === "live" && new Date(auction.endDate) > new Date();
  const reserveMet = auction.reservePrice === null || auction.currentBid >= auction.reservePrice;
  const displayBid = auction.currentBid > 0 ? auction.currentBid : auction.startingPrice;
  const isEnded = !isLive;
  const isWinner = isEnded && !!auction.currentBidderId && auction.currentBidderId === currentUserId;
  const alreadyPaid = auction.status === "paid";

  async function handlePayNow() {
    setPaying(true);
    try {
      const res = await fetch(`/api/auctions/${auction.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } catch { /* ignore */ } finally {
      setPaying(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-2xl border bg-stone-900/60 transition-all ${isLive ? "border-amber-500/20 hover:border-amber-500/40" : "border-white/8 opacity-75"}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-800">
        {auction.imageUrl ? (
          <img src={auction.imageUrl} alt={auction.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Gavel size={32} className="text-stone-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 to-transparent" />
        <div className="absolute top-3 left-3">
          {isLive ? (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold text-stone-950">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-950 animate-pulse" /> LIVE
            </span>
          ) : (
            <span className="rounded-full bg-stone-700/90 px-2.5 py-1 text-[10px] font-medium text-stone-400">Ended</span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-serif text-base font-medium text-white leading-tight">{auction.title}</p>
          <p className="text-xs text-stone-400">{auction.artistName}</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-stone-500 uppercase tracking-wider">Current Bid</p>
            <p className="text-xl font-bold text-amber-300">{formatPrice(displayBid)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-500">{auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}</p>
            <p className={`text-xs font-medium flex items-center gap-1 justify-end ${isLive ? "text-amber-400" : "text-stone-500"}`}>
              <Clock size={10} /> {timeLeft}
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

        {auction.medium && (
          <p className="text-[11px] text-stone-600">{auction.medium}{auction.dimensions ? ` · ${auction.dimensions}` : ""}</p>
        )}

        {isLive && (
          <button onClick={() => onBid(auction)}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
            <Gavel size={14} /> Place Bid
          </button>
        )}
        {isWinner && !alreadyPaid && (
          <button onClick={handlePayNow} disabled={paying}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-500 py-2.5 text-sm font-semibold text-stone-950 hover:bg-emerald-400 transition-colors disabled:opacity-60">
            {paying ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
            {paying ? "Redirecting…" : `Pay ${formatPrice(auction.currentBid)} — You won!`}
          </button>
        )}
        {isWinner && alreadyPaid && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 py-1">
            <CheckCircle size={12} /> Payment received — contact the artist to arrange delivery
          </div>
        )}
        {!isLive && !isWinner && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 py-1">
            <Trophy size={12} className="text-amber-500/60" />
            {auction.currentBidderName ? `Won by ${auction.currentBidderName}` : "Auction ended"}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BidModal({ auction, onClose, onBidPlaced }: { auction: Auction; onClose: () => void; onBidPlaced: (updated: Auction) => void }) {
  const minBid = auction.currentBid > 0 ? auction.currentBid + 50 : auction.startingPrice;
  const [amount, setAmount] = useState(minBid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleBid = async () => {
    if (amount < minBid) { setError(`Minimum bid is ${formatPrice(minBid)}`); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`/api/auctions/${auction.id}/bid`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Failed to place bid"); setLoading(false); return; }
      setSuccess(true);
      onBidPlaced(data.auction);
      setTimeout(onClose, 1500);
    } catch { setError("Failed to place bid"); }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          className="w-full max-w-sm rounded-3xl bg-stone-900 border border-white/10 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg text-amber-100">Place a Bid</h2>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/5 text-stone-500 hover:text-stone-300">
              <X size={16} />
            </button>
          </div>

          <div className="mb-4 rounded-xl bg-stone-800/60 p-3">
            <p className="text-xs text-stone-400 mb-0.5">{auction.title}</p>
            <p className="text-sm text-stone-500">Current: <span className="text-amber-300 font-semibold">{formatPrice(auction.currentBid > 0 ? auction.currentBid : auction.startingPrice)}</span></p>
            <p className="text-xs text-stone-600 mt-0.5">Min next bid: {formatPrice(minBid)}</p>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle size={32} className="text-emerald-400" />
              <p className="text-emerald-300 font-semibold">Bid placed!</p>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <label className="text-xs text-stone-500 mb-1.5 block">Your bid amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-medium">$</span>
                  <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={minBid} step={50}
                    className="w-full rounded-xl border border-white/10 bg-stone-800 py-3 pl-7 pr-4 text-stone-100 focus:border-amber-500/50 focus:outline-none" />
                </div>
              </div>
              {error && <p className="mb-3 text-xs text-rose-400">{error}</p>}
              <div className="mb-4 flex gap-2">
                {[50, 100, 250, 500].map(inc => (
                  <button key={inc} onClick={() => setAmount(minBid + inc)}
                    className="flex-1 rounded-lg border border-white/8 py-1.5 text-xs text-stone-400 hover:border-amber-500/30 hover:text-amber-300 transition-colors">
                    +{inc}
                  </button>
                ))}
              </div>
              <button onClick={handleBid} disabled={loading}
                className="w-full rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-60">
                {loading ? "Placing..." : `Bid ${formatPrice(amount)}`}
              </button>
            </>
          )}

          {auction.bids && auction.bids.length > 0 && (
            <div className="mt-4">
              <button onClick={() => setShowHistory(v => !v)}
                className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-400 transition-colors">
                {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Bid history ({auction.bids.length})
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1.5">
                  {auction.bids.slice(0, 5).map(bid => (
                    <div key={bid.id} className="flex items-center justify-between text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-stone-400">{bid.bidderName}</span>
                        <RelativeTime since={bid.createdAt} className="text-[10px] text-stone-600" />
                      </div>
                      <span className="text-amber-400 font-medium">{formatPrice(bid.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Auctions() {
  useEffect(() => { markFeatureVisited("auctions"); }, []);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [tab, setTab] = useState<"live" | "all" | "ended">("live");
  const { subscribe } = useWebSocket();
  const { profile } = useProfile();
  const selectedRef = useRef(selectedAuction);
  selectedRef.current = selectedAuction;

  useEffect(() => {
    fetch("/api/auctions", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setAuctions(data.auctions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return subscribe("bid", (event) => {
      const e = event as { auctionId: string; currentBid: number; bidCount: number; bidderName: string };
      setAuctions(prev => prev.map(a => a.id === e.auctionId
        ? { ...a, currentBid: e.currentBid, bidCount: e.bidCount, currentBidderName: e.bidderName }
        : a
      ));
      setSelectedAuction(prev => prev?.id === e.auctionId
        ? { ...prev, currentBid: e.currentBid, bidCount: e.bidCount, currentBidderName: e.bidderName }
        : prev
      );
    });
  }, [subscribe]);

  const handleOpenBid = async (auction: Auction) => {
    try {
      const r = await fetch(`/api/auctions/${auction.id}`, { credentials: "include" });
      const data = await r.json();
      setSelectedAuction(data);
    } catch { setSelectedAuction(auction); }
  };

  const handleBidPlaced = (updated: Auction) => {
    setAuctions(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
    if (selectedAuction?.id === updated.id) setSelectedAuction(prev => prev ? { ...prev, ...updated } : prev);
  };

  const now = new Date();
  const filtered = auctions.filter(a => {
    if (tab === "live") return a.status === "live" && new Date(a.endDate) > now;
    if (tab === "ended") return a.status !== "live" || new Date(a.endDate) <= now;
    return true;
  });

  const liveCount = auctions.filter(a => a.status === "live" && new Date(a.endDate) > now).length;

  return (
    <div className="min-h-screen bg-[#12100e] text-stone-100">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-6">
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2">
            <Gavel size={20} className="text-amber-400" />
            <h1 className="font-serif text-2xl text-amber-100">Auctions</h1>
            {liveCount > 0 && (
              <span className="ml-1 flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                <TrendingUp size={9} /> {liveCount} live
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500">Bid on one-of-a-kind works directly from the artists.</p>
        </div>

        <div className="mb-6 flex gap-1 rounded-xl bg-stone-900/50 p-1 border border-white/5">
          {([{ key: "live", label: `Live${liveCount ? ` (${liveCount})` : ""}` }, { key: "all", label: "All" }, { key: "ended", label: "Ended" }] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors ${tab === t.key ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <Gavel size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">No auctions in this category yet.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(auction => (
            <AuctionCard key={auction.id} auction={auction} onBid={handleOpenBid} currentUserId={profile?.id} />
          ))}
        </div>
      </div>

      {selectedAuction && (
        <BidModal auction={selectedAuction} onClose={() => setSelectedAuction(null)} onBidPlaced={handleBidPlaced} />
      )}
    </div>
  );
}
