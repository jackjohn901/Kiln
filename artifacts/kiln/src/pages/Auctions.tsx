import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Gavel, Clock, TrendingUp, Plus, X, AlertCircle, CheckCircle, Trophy,
  ChevronDown, ChevronUp, Flame, Heart,
} from "lucide-react";
import Nav from "@/components/Nav";
import { listings } from "@/data/listings";
import { seedArtists } from "@/data/seedArtists";
import { artists } from "@/data/artists";

const ALL_ARTISTS = [...artists, ...seedArtists];
const AUCTION_KEY = "kiln_auctions_v1";

interface Bid {
  id: string;
  bidderName: string;
  amount: number;
  placedAt: string;
}

interface Auction {
  id: string;
  artistId: string;
  artistName: string;
  artworkUrl: string;
  title: string;
  description: string;
  medium: string;
  startingBid: number;
  reservePrice: number;
  currentBid: number;
  currentBidder: string;
  bids: Bid[];
  endsAt: string;
  status: "live" | "closed";
  winnerId?: string;
  winnerName?: string;
}

function genId() { return `auc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function buildSeedAuctions(): Auction[] {
  const now = Date.now();
  const usedListings = listings.filter((l) => l.available).slice(0, 6);
  return usedListings.map((l, i) => {
    const artist = ALL_ARTISTS.find((a) => a.id === l.artistId) ?? ALL_ARTISTS[i % ALL_ARTISTS.length];
    const base = Math.round(l.price * 0.6);
    const bid1 = base + Math.floor(Math.random() * 200);
    const bid2 = bid1 + Math.floor(Math.random() * 300);
    const hours = [6, 18, 4, 30, 2, 48][i];
    const closed = i >= 4;
    return {
      id: `seed-auc-${l.id}`,
      artistId: l.artistId,
      artistName: artist.name,
      artworkUrl: l.imageUrl ?? `https://picsum.photos/seed/${l.id}/600/600`,
      title: l.title,
      description: `${l.medium} · ${l.dimensions} · ${l.year}`,
      medium: l.medium,
      startingBid: base,
      reservePrice: Math.round(l.price * 0.85),
      currentBid: bid2,
      currentBidder: ["Sarah M.", "James K.", "Wei L.", "Priya T.", "Marcus R.", "Anna B."][i],
      bids: [
        { id: genId(), bidderName: ["Chris P.", "Dana S.", "Kyle W."][i % 3], amount: base, placedAt: new Date(now - hours * 3600000 - 3600000).toISOString() },
        { id: genId(), bidderName: ["Sarah M.", "James K.", "Wei L.", "Priya T.", "Marcus R.", "Anna B."][i], amount: bid1, placedAt: new Date(now - hours * 3600000 + 1800000).toISOString() },
        { id: genId(), bidderName: ["Sarah M.", "James K.", "Wei L.", "Priya T.", "Marcus R.", "Anna B."][i], amount: bid2, placedAt: new Date(now - 900000).toISOString() },
      ],
      endsAt: closed ? new Date(now - 3600000).toISOString() : new Date(now + hours * 3600000).toISOString(),
      status: closed ? "closed" : "live",
    };
  });
}

function getAuctions(): Auction[] {
  try {
    const stored: Auction[] = JSON.parse(localStorage.getItem(AUCTION_KEY) ?? "[]");
    const seed = buildSeedAuctions();
    const merged = [...stored, ...seed.filter((s) => !stored.find((st) => st.id === s.id))];
    const now = new Date().toISOString();
    return merged.map((a) => ({
      ...a,
      status: a.endsAt < now ? "closed" : "live",
    }));
  } catch { return buildSeedAuctions(); }
}

function saveAuctions(auctions: Auction[]) {
  const nonSeed = auctions.filter((a) => !a.id.startsWith("seed-auc-"));
  localStorage.setItem(AUCTION_KEY, JSON.stringify(nonSeed));
}

function formatTimeLeft(endsAt: string): { label: string; urgent: boolean } {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return { label: "Ended", urgent: false };
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 24) return { label: `${Math.floor(h / 24)}d ${h % 24}h`, urgent: false };
  if (h > 0) return { label: `${h}h ${m}m`, urgent: h < 2 };
  return { label: `${m}m ${s}s`, urgent: true };
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function CountdownBadge({ endsAt }: { endsAt: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const { label, urgent } = formatTimeLeft(endsAt);
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${urgent ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-stone-800 text-stone-400"}`}>
      <Clock size={10} /> {label}
    </span>
  );
}

// ─── Auction Card ─────────────────────────────────────────────────────────────

function AuctionCard({ auction, onClick }: { auction: Auction; onClick: () => void }) {
  const reserved = auction.currentBid >= auction.reservePrice;
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={auction.artworkUrl}
          alt={auction.title}
          className="h-full w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${auction.id}/600/450`; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {auction.status === "live" ? (
          <div className="absolute top-2 left-2">
            <CountdownBadge endsAt={auction.endsAt} />
          </div>
        ) : (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-1 rounded-full bg-stone-900/80 px-2.5 py-1 text-[11px] font-bold text-stone-400">
              <CheckCircle size={10} /> Closed
            </span>
          </div>
        )}
        {reserved && (
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
              <CheckCircle size={10} /> Reserve Met
            </span>
          </div>
        )}
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
          <div>
            <p className="text-[10px] text-white/60">{auction.bids.length} bid{auction.bids.length !== 1 ? "s" : ""}</p>
            <p className="text-lg font-bold text-white">{formatPrice(auction.currentBid)}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-1">
            <TrendingUp size={10} className="text-amber-400" />
            <span className="text-[10px] font-bold text-amber-300">+{Math.round(((auction.currentBid - auction.startingBid) / auction.startingBid) * 100)}%</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <p className="font-serif text-base font-bold text-amber-100 truncate">{auction.title}</p>
        <p className="text-xs text-stone-500 mt-0.5 truncate">{auction.artistName} · {auction.medium}</p>
      </div>
    </motion.button>
  );
}

// ─── Auction Detail Sheet ─────────────────────────────────────────────────────

function AuctionDetail({ auction, onClose, onBid }: { auction: Auction; onClose: () => void; onBid: (amount: number, name: string) => void }) {
  const [bidAmount, setBidAmount] = useState(auction.currentBid + 50);
  const [bidderName, setBidderName] = useState("");
  const [bidding, setBidding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [, setTick] = useState(0);
  const reserved = auction.currentBid >= auction.reservePrice;
  const minBid = auction.currentBid + 25;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  async function placeBid() {
    if (!bidderName.trim() || bidAmount < minBid || auction.status === "closed") return;
    setBidding(true);
    await new Promise((r) => setTimeout(r, 1200));
    onBid(bidAmount, bidderName.trim());
    setSuccess(true);
    setBidding(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#1a1614] border border-white/8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#1a1614] border-b border-white/8 px-5 py-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-amber-100">{auction.title}</h2>
          <button onClick={onClose} className="p-1 text-stone-500 hover:text-stone-300">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <img
            src={auction.artworkUrl}
            alt={auction.title}
            className="w-full rounded-xl aspect-[4/3] object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${auction.id}/600/450`; }}
          />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mb-0.5">Current Bid</p>
              <p className="text-2xl font-bold text-amber-400">{formatPrice(auction.currentBid)}</p>
              <p className="text-xs text-stone-500">{auction.bids.length} bids · by {auction.currentBidder}</p>
            </div>
            {auction.status === "live" ? <CountdownBadge endsAt={auction.endsAt} /> : (
              <span className="flex items-center gap-1.5 rounded-full bg-stone-800 px-3 py-1.5 text-sm font-bold text-stone-400">
                <Trophy size={13} className="text-amber-400" /> {auction.winnerName ?? auction.currentBidder} won
              </span>
            )}
          </div>

          <div className="flex gap-3 text-sm">
            <div className="flex-1 rounded-xl bg-stone-800/60 p-3 text-center">
              <p className="text-xs text-stone-500">Starting Bid</p>
              <p className="font-bold text-stone-300 mt-0.5">{formatPrice(auction.startingBid)}</p>
            </div>
            <div className={`flex-1 rounded-xl p-3 text-center ${reserved ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-stone-800/60"}`}>
              <p className="text-xs text-stone-500">Reserve</p>
              <p className={`font-bold mt-0.5 ${reserved ? "text-emerald-400" : "text-stone-500"}`}>{reserved ? "Met ✓" : "Not met"}</p>
            </div>
            <div className="flex-1 rounded-xl bg-stone-800/60 p-3 text-center">
              <p className="text-xs text-stone-500">Medium</p>
              <p className="font-bold text-stone-300 text-xs mt-0.5 truncate">{auction.medium}</p>
            </div>
          </div>

          <p className="text-sm text-stone-400 leading-relaxed">{auction.description}</p>

          {auction.status === "live" && !success && (
            <div className="space-y-3 rounded-xl border border-white/8 bg-stone-900/60 p-4">
              <p className="text-sm font-semibold text-stone-200">Place a Bid</p>
              <input
                type="text"
                value={bidderName}
                onChange={(e) => setBidderName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl bg-stone-800 px-3 py-2.5 text-sm text-white placeholder-stone-600 border border-white/8 focus:border-amber-500/50 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <span className="text-stone-400 text-sm font-bold">$</span>
                <input
                  type="number"
                  value={bidAmount}
                  min={minBid}
                  step={25}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  className="flex-1 rounded-xl bg-stone-800 px-3 py-2.5 text-sm text-white border border-white/8 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              {bidAmount < minBid && (
                <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={10} /> Minimum bid: {formatPrice(minBid)}</p>
              )}
              <div className="flex gap-2">
                {[50, 100, 250].map((inc) => (
                  <button key={inc} onClick={() => setBidAmount(auction.currentBid + inc)}
                    className="flex-1 rounded-lg bg-stone-800 py-1.5 text-xs font-medium text-stone-400 hover:text-white hover:bg-stone-700 transition-colors">
                    +${inc}
                  </button>
                ))}
              </div>
              <button
                onClick={placeBid}
                disabled={bidding || bidAmount < minBid || !bidderName.trim()}
                className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {bidding ? "Placing bid…" : `Bid ${formatPrice(bidAmount)}`}
              </button>
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
              <CheckCircle size={28} className="text-emerald-400 mx-auto mb-2" />
              <p className="font-bold text-emerald-300">Bid placed!</p>
              <p className="text-sm text-stone-400 mt-1">You're the highest bidder at {formatPrice(bidAmount)}</p>
            </div>
          )}

          {/* Bid history */}
          <div>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex w-full items-center justify-between py-2 text-sm font-semibold text-stone-400 hover:text-stone-200 transition-colors"
            >
              <span>Bid History ({auction.bids.length})</span>
              {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-2">
                    {[...auction.bids].reverse().map((bid) => (
                      <div key={bid.id} className="flex items-center justify-between rounded-lg bg-stone-800/40 px-3 py-2">
                        <div>
                          <p className="text-xs font-semibold text-stone-300">{bid.bidderName}</p>
                          <p className="text-[10px] text-stone-600">{new Date(bid.placedAt).toLocaleString()}</p>
                        </div>
                        <p className="text-sm font-bold text-amber-400">{formatPrice(bid.amount)}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── List Auction Form ────────────────────────────────────────────────────────

function ListAuctionForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (a: Auction) => void }) {
  const [form, setForm] = useState({ title: "", description: "", medium: "", startingBid: "200", reservePrice: "500", duration: "24" });
  const [submitting, setSubmitting] = useState(false);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    const now = Date.now();
    const auction: Auction = {
      id: genId(),
      artistId: "me",
      artistName: "My Studio",
      artworkUrl: `https://picsum.photos/seed/${now}/600/450`,
      title: form.title,
      description: form.description,
      medium: form.medium,
      startingBid: Number(form.startingBid),
      reservePrice: Number(form.reservePrice),
      currentBid: Number(form.startingBid),
      currentBidder: "—",
      bids: [],
      endsAt: new Date(now + Number(form.duration) * 3600000).toISOString(),
      status: "live",
    };
    onSubmit(auction);
    setSubmitting(false);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#1a1614] border border-white/8"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="sticky top-0 bg-[#1a1614] border-b border-white/8 px-5 py-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-amber-100">List a Work for Auction</h2>
          <button type="button" onClick={onClose} className="p-1 text-stone-500 hover:text-stone-300"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: "Artwork Title", key: "title", placeholder: "e.g. Cobalt Vessel No. 7" },
            { label: "Description", key: "description", placeholder: "Describe the piece — materials, process, dimensions..." },
            { label: "Medium", key: "medium", placeholder: "e.g. Blown glass, 14\" h × 8\" w" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">{label}</label>
              {key === "description" ? (
                <textarea rows={3} placeholder={placeholder} required value={form[key as keyof typeof form]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full rounded-xl bg-stone-800 px-3 py-2.5 text-sm text-white placeholder-stone-600 border border-white/8 focus:border-amber-500/50 focus:outline-none resize-none" />
              ) : (
                <input type="text" placeholder={placeholder} required value={form[key as keyof typeof form]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full rounded-xl bg-stone-800 px-3 py-2.5 text-sm text-white placeholder-stone-600 border border-white/8 focus:border-amber-500/50 focus:outline-none" />
              )}
            </div>
          ))}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Starting Bid ($)", key: "startingBid", min: 1 },
              { label: "Reserve Price ($)", key: "reservePrice", min: 1 },
              { label: "Duration (hours)", key: "duration", min: 1 },
            ].map(({ label, key, min }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-stone-400 mb-1.5">{label}</label>
                <input type="number" min={min} required value={form[key as keyof typeof form]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full rounded-xl bg-stone-800 px-3 py-2.5 text-sm text-white border border-white/8 focus:border-amber-500/50 focus:outline-none" />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            Kiln takes 8% of the final sale price. Auction closes automatically when the timer runs out. Reserve price is not shown to bidders.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Listing…" : "List Auction"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Auctions() {
  const [auctions, setAuctions] = useState<Auction[]>(getAuctions);
  const [tab, setTab] = useState<"live" | "closed">("live");
  const [selected, setSelected] = useState<Auction | null>(null);
  const [showForm, setShowForm] = useState(false);

  const live = auctions.filter((a) => a.status === "live");
  const closed = auctions.filter((a) => a.status === "closed");
  const displayed = tab === "live" ? live : closed;

  function handleBid(auctionId: string, amount: number, name: string) {
    setAuctions((prev) => {
      const updated = prev.map((a) => {
        if (a.id !== auctionId) return a;
        const newBid: Bid = { id: genId(), bidderName: name, amount, placedAt: new Date().toISOString() };
        return { ...a, currentBid: amount, currentBidder: name, bids: [...a.bids, newBid] };
      });
      saveAuctions(updated);
      return updated;
    });
    setSelected((prev) => {
      if (!prev || prev.id !== auctionId) return prev;
      const newBid: Bid = { id: genId(), bidderName: name, amount, placedAt: new Date().toISOString() };
      return { ...prev, currentBid: amount, currentBidder: name, bids: [...prev.bids, newBid] };
    });
  }

  function handleNewAuction(a: Auction) {
    setAuctions((prev) => {
      const updated = [a, ...prev];
      saveAuctions(updated);
      return updated;
    });
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Gavel size={20} className="text-amber-400" />
              <h1 className="font-serif text-2xl text-amber-100">Auction House</h1>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">Bid on unique one-of-a-kind works from craft masters</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            <Plus size={13} /> List Work
          </button>
        </div>

        {/* Stats banner */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: "Live Auctions", value: live.length, color: "text-amber-400" },
            { label: "Total Bids Today", value: auctions.reduce((s, a) => s + a.bids.length, 0), color: "text-sky-400" },
            { label: "Avg Sale", value: `$${Math.round(closed.reduce((s, a) => s + a.currentBid, 0) / Math.max(closed.length, 1)).toLocaleString()}`, color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-stone-900/60 p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-stone-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-stone-900/60 p-1">
          {(["live", "closed"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all ${tab === t ? "bg-amber-500 text-stone-950" : "text-stone-500 hover:text-stone-300"}`}>
              {t === "live" ? `Live (${live.length})` : `Closed (${closed.length})`}
            </button>
          ))}
        </div>

        {/* Grid */}
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Gavel size={36} className="text-stone-700 mb-3" />
            <p className="text-stone-400">No {tab} auctions</p>
            {tab === "live" && (
              <button onClick={() => setShowForm(true)} className="mt-4 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400">
                Be the first to list
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {displayed.map((a) => (
              <AuctionCard key={a.id} auction={a} onClick={() => setSelected(a)} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <AuctionDetail
            auction={selected}
            onClose={() => setSelected(null)}
            onBid={(amount, name) => handleBid(selected.id, amount, name)}
          />
        )}
        {showForm && (
          <ListAuctionForm
            onClose={() => setShowForm(false)}
            onSubmit={handleNewAuction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
