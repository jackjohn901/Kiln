import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Search, Tag, MapPin, Clock, MessageCircle, Heart, Filter, X, Star } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

type ListingType = "sell" | "trade" | "free" | "wanted";
type Category = "clay" | "glass" | "fiber" | "metal" | "wood" | "pigment" | "tools" | "other";

interface MaterialListing {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: ListingType;
  category: Category;
  title: string;
  description: string;
  price?: number;
  tradeFor?: string;
  quantity: string;
  location: string;
  imageUrl?: string;
  postedAt: number;
  likes: number;
  liked?: boolean;
  condition: "new" | "like-new" | "good" | "used";
}

const SEED: MaterialListing[] = [
  {
    id: "ml-1", userId: "u1", userName: "Maya Chen", userAvatar: "https://i.pravatar.cc/40?img=5",
    type: "sell", category: "clay", title: "25 lbs Laguna B-Mix 5 Cone Stoneware",
    description: "Opened but barely used — moved studio, no room. Great for throwing and hand-building. Stays moist.",
    price: 35, quantity: "25 lbs", location: "Portland, OR",
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80",
    postedAt: Date.now() - 86400000 * 2, likes: 4, condition: "like-new",
  },
  {
    id: "ml-2", userId: "u2", userName: "James Okafor", userAvatar: "https://i.pravatar.cc/40?img=12",
    type: "trade", category: "glass",
    title: "Spectrum 96 COE Sheet Glass — 6 colors",
    description: "~3 lbs each of amber, cobalt, forest green, opalescent white, red, and clear. Happy to trade for fusible frit or glass powder.",
    tradeFor: "Glass frit, kiln wash, or fiber tools",
    quantity: "~18 lbs total", location: "Chicago, IL",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    postedAt: Date.now() - 86400000 * 5, likes: 11, condition: "good",
  },
  {
    id: "ml-3", userId: "u3", userName: "Sofia Reyes", userAvatar: "https://i.pravatar.cc/40?img=47",
    type: "free", category: "fiber",
    title: "Weaving warp threads — natural cotton",
    description: "Leftover from a series. Several spools of 8/2 natural cotton warp. Great for rigid heddle or floor loom. Free to a good home!",
    quantity: "5 spools, ~250 yds each", location: "Brooklyn, NY",
    postedAt: Date.now() - 3600000 * 6, likes: 17, condition: "good",
  },
  {
    id: "ml-4", userId: "u4", userName: "Wei Liang", userAvatar: "https://i.pravatar.cc/40?img=3",
    type: "wanted", category: "tools",
    title: "Looking for: Skutt KM-818 kiln parts",
    description: "Need replacement elements and a new thermocouple for a Skutt KM-818 (10-amp). Happy to pay fair market price.",
    quantity: "2 elements + thermocouple", location: "Austin, TX",
    postedAt: Date.now() - 86400000 * 1, likes: 2, condition: "used",
  },
  {
    id: "ml-5", userId: "u5", userName: "Anna Björk", userAvatar: "https://i.pravatar.cc/40?img=9",
    type: "sell", category: "pigment",
    title: "Sennelier Artist-grade dry pigments — 12 colors",
    description: "Full set of Sennelier dry pigments in original tins. Used lightly for oil painting experiments. Includes ultramarine, burnt sienna, yellow ochre, and more.",
    price: 80, quantity: "12 tins × 100g", location: "Seattle, WA",
    imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80",
    postedAt: Date.now() - 86400000 * 8, likes: 6, condition: "like-new",
  },
  {
    id: "ml-6", userId: "u6", userName: "Marcus Rivera", userAvatar: "https://i.pravatar.cc/40?img=15",
    type: "sell", category: "wood",
    title: "Cherry wood turning blanks — 6 pieces",
    description: "Air-dried cherry, 4–6\" diameter, 12\" long. Cut from a local orchard. Excellent for bowls and spindles.",
    price: 55, quantity: "6 blanks", location: "Asheville, NC",
    imageUrl: "https://images.unsplash.com/photo-1587486936739-78c3e7d71a72?w=400&q=80",
    postedAt: Date.now() - 86400000 * 3, likes: 9, condition: "good",
  },
];

const TYPE_LABELS: Record<ListingType, string> = {
  sell: "For Sale", trade: "Trade", free: "Free", wanted: "Wanted",
};
const TYPE_COLORS: Record<ListingType, string> = {
  sell: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  trade: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  free: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  wanted: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};
const CONDITION_LABELS = { "new": "New", "like-new": "Like New", "good": "Good", "used": "Used" };
const CATEGORIES: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "clay", label: "Clay & Ceramics" },
  { value: "glass", label: "Glass" },
  { value: "fiber", label: "Fiber & Textiles" },
  { value: "metal", label: "Metalwork" },
  { value: "wood", label: "Wood" },
  { value: "pigment", label: "Pigments & Dyes" },
  { value: "tools", label: "Tools & Equipment" },
  { value: "other", label: "Other" },
];

function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function MaterialExchange() {
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const [listings, setListings] = useState<MaterialListing[]>(SEED);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<Category | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ListingType | "all">("all");

  useEffect(() => {
    fetch("/api/material-exchange")
      .then(r => r.ok ? r.json() as Promise<{ listings: MaterialListing[] }> : null)
      .then(data => { if (data?.listings?.length) setListings([...data.listings, ...SEED]); })
      .catch(() => {});
  }, []);
  const [showPost, setShowPost] = useState(false);
  const [form, setForm] = useState({
    type: "sell" as ListingType, category: "clay" as Category,
    title: "", description: "", price: "", tradeFor: "", quantity: "", location: "",
    condition: "good" as MaterialListing["condition"],
  });

  const filtered = listings.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);
    const matchCat = catFilter === "all" || l.category === catFilter;
    const matchType = typeFilter === "all" || l.type === typeFilter;
    return matchSearch && matchCat && matchType;
  });

  function toggleLike(id: string) {
    setListings((prev) => prev.map((l) =>
      l.id === id ? { ...l, liked: !l.liked, likes: l.liked ? l.likes - 1 : l.likes + 1 } : l
    ));
    fetch(`/api/material-exchange/${id}/like`, { method: "POST", credentials: "include" }).catch(() => {});
  }

  async function handlePost() {
    if (!form.title || !form.description || !form.quantity || !form.location) return;
    const newListing: MaterialListing = {
      id: `ml-${Date.now()}`,
      userId: "me",
      userName: profile?.name || "You",
      userAvatar: profile?.avatarUrl || "https://i.pravatar.cc/40?img=1",
      type: form.type,
      category: form.category,
      title: form.title,
      description: form.description,
      price: form.type === "sell" && form.price ? parseFloat(form.price) : undefined,
      tradeFor: form.type === "trade" ? form.tradeFor : undefined,
      quantity: form.quantity,
      location: form.location,
      condition: form.condition,
      postedAt: Date.now(),
      likes: 0,
    };
    setListings(prev => [newListing, ...prev]);
    setShowPost(false);
    setForm({ type: "sell", category: "clay", title: "", description: "", price: "", tradeFor: "", quantity: "", location: "", condition: "good" });
    try {
      const res = await fetch("/api/material-exchange", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type, category: form.category, title: form.title,
          description: form.description,
          price: form.type === "sell" && form.price ? Math.round(parseFloat(form.price) * 100) : null,
          tradeFor: form.type === "trade" ? form.tradeFor : null,
          quantity: form.quantity, location: form.location, condition: form.condition,
        }),
      });
      if (res.ok) {
        const saved = await res.json() as MaterialListing;
        setListings(prev => prev.map(l => l.id === newListing.id ? { ...saved, liked: false, likes: 0, postedAt: Date.now() } : l));
      }
    } catch { /* optimistic update remains */ }
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Material Exchange</h1>
            <p className="text-sm text-stone-500 mt-0.5">Buy, sell, trade, or give away craft materials with other artists</p>
          </div>
          <button
            onClick={() => setShowPost(true)}
            className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            <Plus size={14} /> Post listing
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search materials, tools, supplies…"
              className="w-full rounded-xl border border-white/8 bg-stone-900/60 pl-9 pr-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "sell", "trade", "free", "wanted"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  typeFilter === t ? "bg-amber-500 text-stone-950 border-amber-500" : "border-white/10 text-stone-400 hover:border-white/20"
                }`}
              >
                {t === "all" ? "All types" : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCatFilter(c.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  catFilter === c.value ? "bg-stone-700 text-stone-200 border-stone-600" : "border-white/8 text-stone-500 hover:border-white/15"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Listings grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-2 text-center py-20 text-stone-600">
              <Package size={32} className="mx-auto mb-3 opacity-40" />
              <p>No listings match your filters.</p>
            </div>
          ) : filtered.map((l) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden hover:border-white/15 transition-colors"
            >
              {l.imageUrl && (
                <div className="h-36 overflow-hidden">
                  <img src={l.imageUrl} alt={l.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TYPE_COLORS[l.type]}`}>
                        {TYPE_LABELS[l.type]}
                      </span>
                      <span className="text-[10px] text-stone-600">{CONDITION_LABELS[l.condition]}</span>
                    </div>
                    <p className="text-sm font-semibold text-stone-200 line-clamp-1">{l.title}</p>
                  </div>
                  {l.type === "sell" && l.price && (
                    <p className="text-base font-bold text-amber-300 shrink-0">${l.price}</p>
                  )}
                </div>

                <p className="text-xs text-stone-500 line-clamp-2">{l.description}</p>

                {l.type === "trade" && l.tradeFor && (
                  <p className="text-xs text-indigo-400 flex items-center gap-1">
                    <Tag size={10} /> Trade for: {l.tradeFor}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-stone-600">
                  <span className="flex items-center gap-1"><Package size={9} /> {l.quantity}</span>
                  <span className="flex items-center gap-1"><MapPin size={9} /> {l.location}</span>
                  <span className="flex items-center gap-1"><Clock size={9} /> {timeAgo(l.postedAt)}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <img src={l.userAvatar} alt={l.userName} className="h-5 w-5 rounded-full object-cover" />
                  <p className="text-xs text-stone-500 flex-1">{l.userName}</p>
                  <button
                    onClick={() => toggleLike(l.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${l.liked ? "text-rose-400" : "text-stone-600 hover:text-stone-400"}`}
                  >
                    <Heart size={11} className={l.liked ? "fill-current" : ""} /> {l.likes}
                  </button>
                  <button
                    onClick={() => navigate(`/messages/${l.userId}`)}
                    className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-400 transition-colors">
                    <MessageCircle size={11} /> Message
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Post listing modal */}
      <AnimatePresence>
        {showPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowPost(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-lg bg-[#1a1714] border border-white/10 rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-amber-100">Post a Listing</h2>
                <button onClick={() => setShowPost(false)} className="text-stone-500 hover:text-stone-300">
                  <X size={18} />
                </button>
              </div>

              {/* Type */}
              <div className="grid grid-cols-4 gap-2">
                {(["sell", "trade", "free", "wanted"] as ListingType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      form.type === t ? TYPE_COLORS[t].replace("bg-", "bg-") : "border-white/8 text-stone-500"
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                  className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
                >
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <MField label="Title *" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
              <MTextArea label="Description *" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />

              <div className="grid grid-cols-2 gap-3">
                <MField label="Quantity / amount *" value={form.quantity} onChange={(v) => setForm((f) => ({ ...f, quantity: v }))} />
                <MField label="Your location *" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
              </div>

              {form.type === "sell" && (
                <MField label="Price (USD)" type="number" value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} />
              )}
              {form.type === "trade" && (
                <MField label="Will trade for" value={form.tradeFor} onChange={(v) => setForm((f) => ({ ...f, tradeFor: v }))} />
              )}

              {/* Condition */}
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Condition</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["new", "like-new", "good", "used"] as MaterialListing["condition"][]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, condition: c }))}
                      className={`py-1.5 rounded-lg text-xs border transition-colors ${
                        form.condition === c ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-white/8 text-stone-500"
                      }`}
                    >
                      {CONDITION_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={!form.title || !form.description || !form.quantity || !form.location}
                onClick={handlePost}
                className="w-full py-3 rounded-full bg-amber-500 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Post listing
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-stone-500 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none"
      />
    </div>
  );
}

function MTextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-stone-500 mb-1 block">{label}</label>
      <textarea
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/50 focus:outline-none resize-none"
      />
    </div>
  );
}
