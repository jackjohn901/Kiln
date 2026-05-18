import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Download, FileText, BookOpen, FlaskConical, Camera, DollarSign,
  Star, Search, Filter, Check, ChevronRight, Lock, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

interface DigitalProduct {
  id: string;
  title: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  price: number;
  category: "recipe" | "guide" | "template" | "pattern" | "ebook" | "video";
  medium: string;
  description: string;
  pageCount?: number;
  previewPages?: number;
  downloads: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  isFree?: boolean;
  previewUrl: string;
}

const ICON_MAP: Record<DigitalProduct["category"], React.ElementType> = {
  recipe: FlaskConical,
  guide: BookOpen,
  template: FileText,
  pattern: Sparkles,
  ebook: BookOpen,
  video: Camera,
};

const LABEL_MAP: Record<DigitalProduct["category"], string> = {
  recipe: "Glaze Recipe",
  guide: "Guide",
  template: "Template",
  pattern: "Pattern",
  ebook: "eBook",
  video: "Video Guide",
};

const PRODUCTS: DigitalProduct[] = [
  {
    id: "dp-001",
    title: "The Reduction Firing Handbook",
    author: "Maya Chen",
    authorId: "maya-chen",
    authorAvatar: "https://picsum.photos/seed/maya-chen/80/80",
    price: 18,
    category: "ebook",
    medium: "Ceramics",
    description: "A comprehensive 64-page guide to reduction firing in gas kilns. Covers atmosphere control, reading flame colour, clay body compatibility, and 12 tested glaze recipes. Used by studio potters across North America.",
    pageCount: 64,
    previewPages: 8,
    downloads: 1847,
    rating: 4.9,
    reviewCount: 312,
    tags: ["reduction", "gas kiln", "glazes", "ceramics"],
    previewUrl: "https://picsum.photos/seed/reduction/400/560",
  },
  {
    id: "dp-002",
    title: "30 Production Pottery Templates",
    author: "Sarah Thornton",
    authorId: "sarah-thornton",
    authorAvatar: "https://picsum.photos/seed/sarah-thornton/80/80",
    price: 24,
    category: "template",
    medium: "Ceramics",
    description: "Printable templates for mugs, bowls, plates, vases, and lidded jars in multiple sizes. Includes cutting guides for slab work and reference proportions. SVG files included.",
    pageCount: 45,
    previewPages: 6,
    downloads: 923,
    rating: 4.7,
    reviewCount: 184,
    tags: ["templates", "slab", "production", "pottery"],
    previewUrl: "https://picsum.photos/seed/pottery-templates/400/560",
  },
  {
    id: "dp-003",
    title: "Iron Red Glaze — 5 Tested Recipes",
    author: "Marcus Williams",
    authorId: "marcus-williams",
    authorAvatar: "https://picsum.photos/seed/marcus-williams/80/80",
    price: 8,
    category: "recipe",
    medium: "Ceramics",
    description: "Five proven iron red glaze recipes with cone range, firing schedule, and detailed application notes. Each recipe tested in both electric and gas kiln. Includes iron saturation percentages and troubleshooting guide.",
    pageCount: 12,
    previewPages: 3,
    downloads: 4203,
    rating: 4.8,
    reviewCount: 891,
    tags: ["iron red", "glaze recipe", "cone 10", "reduction"],
    previewUrl: "https://picsum.photos/seed/iron-red/400/560",
  },
  {
    id: "dp-004",
    title: "Studio Glass Photography — Complete Workflow",
    author: "Alex Bernstein",
    authorId: "alex-bernstein",
    authorAvatar: "https://picsum.photos/seed/alex-bernstein/80/80",
    price: 32,
    category: "guide",
    medium: "Glass",
    description: "Learn exactly how to photograph glass work using natural and studio light. Covers camera settings, backgrounds, light diffusion, and post-processing in Lightroom. Includes shot-by-shot breakdown of 15 real pieces.",
    pageCount: 52,
    previewPages: 7,
    downloads: 2156,
    rating: 4.9,
    reviewCount: 456,
    tags: ["photography", "glass", "studio lighting", "Lightroom"],
    previewUrl: "https://picsum.photos/seed/glass-photo/400/560",
  },
  {
    id: "dp-005",
    title: "Raku Firing Safety & Setup Guide",
    author: "James Okafor",
    authorId: "james-okafor",
    authorAvatar: "https://picsum.photos/seed/james-okafor/80/80",
    price: 0,
    category: "guide",
    medium: "Ceramics",
    description: "Free essential safety guide for raku firing. Covers protective equipment, safe kiln placement, reduction chamber design, clay body requirements, and emergency procedures. Required reading before your first raku firing.",
    pageCount: 18,
    previewPages: 18,
    downloads: 8912,
    rating: 4.6,
    reviewCount: 734,
    tags: ["raku", "safety", "outdoor firing", "free"],
    isFree: true,
    previewUrl: "https://picsum.photos/seed/raku-safety/400/560",
  },
  {
    id: "dp-006",
    title: "Pricing Your Craft: A Working Artist's Spreadsheet",
    author: "Elena Vasquez",
    authorId: "elena-vasquez",
    authorAvatar: "https://picsum.photos/seed/elena-vasquez/80/80",
    price: 15,
    category: "template",
    medium: "All media",
    description: "A pre-built Google Sheets template for pricing your work. Calculates material cost, studio overhead, labor, gallery commissions, and target profit margin. Includes wholesale vs retail calculator and Etsy fee estimator.",
    pageCount: 1,
    previewPages: 1,
    downloads: 6741,
    rating: 4.8,
    reviewCount: 1203,
    tags: ["pricing", "business", "spreadsheet", "income"],
    previewUrl: "https://picsum.photos/seed/pricing/400/560",
  },
  {
    id: "dp-007",
    title: "Shino Glaze Variations — Historical & Contemporary",
    author: "Takeshi Mori",
    authorId: "takeshi-mori",
    authorAvatar: "https://picsum.photos/seed/takeshi-mori/80/80",
    price: 22,
    category: "recipe",
    medium: "Ceramics",
    description: "An in-depth study of shino glazes from Momoyama-period originals to modern variations. 8 recipes, firing schedules, and side-by-side test tile photography. Includes carbon trapping techniques.",
    pageCount: 38,
    previewPages: 5,
    downloads: 1394,
    rating: 4.9,
    reviewCount: 267,
    tags: ["shino", "wood fire", "carbon trap", "Japanese ceramics"],
    previewUrl: "https://picsum.photos/seed/shino/400/560",
  },
  {
    id: "dp-008",
    title: "Artist Statement Masterclass — 8 Frameworks",
    author: "Ingrid Larsson",
    authorId: "ingrid-larsson",
    authorAvatar: "https://picsum.photos/seed/ingrid-larsson/80/80",
    price: 12,
    category: "guide",
    medium: "All media",
    description: "Eight proven frameworks for writing an artist statement that actually works — for grant applications, gallery proposals, and Instagram bios. Includes 23 real examples from working artists.",
    pageCount: 44,
    previewPages: 6,
    downloads: 3821,
    rating: 4.7,
    reviewCount: 623,
    tags: ["writing", "grants", "artist statement", "career"],
    previewUrl: "https://picsum.photos/seed/artist-statement/400/560",
  },
];

const CATEGORIES = ["All", "Recipe", "Guide", "Template", "Pattern", "eBook"];

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={10} fill={rating >= s ? "currentColor" : "none"} className={rating >= s ? "text-amber-400" : "text-stone-700"} />
      ))}
    </div>
  );
}

export default function DigitalDownloads() {
  const { profile } = useProfile();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [purchasing, setPurchasing] = useState(false);
  const [justPurchased, setJustPurchased] = useState(false);

  const filtered = PRODUCTS.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.tags.some((t) => t.includes(search.toLowerCase()));
    const matchCat = category === "All" || LABEL_MAP[p.category] === category || p.category === category.toLowerCase();
    return matchSearch && matchCat;
  });

  // Handle return from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("downloaded");
    if (productId) {
      setPurchased(prev => new Set(prev).add(productId));
      window.history.replaceState({}, "", window.location.pathname);
      const product = PRODUCTS.find(p => p.id === productId);
      if (product) { setSelectedProduct(product); setJustPurchased(true); }
    }
  }, []);

  async function handlePurchase(product: DigitalProduct) {
    if (!profile) return;
    setPurchasing(true);
    try {
      if (product.isFree) {
        await fetch("/api/digital-downloads/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            productId: product.id,
            productTitle: product.title,
            amountCents: 0,
            downloadUrl: `https://kilnfire.replit.app/kiln/downloads/${product.id}`,
          }),
        });
        setPurchased(prev => new Set(prev).add(product.id));
        setJustPurchased(true);
        setTimeout(() => setJustPurchased(false), 5000);
      } else {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            items: [{ name: product.title, price: product.price ?? 0, quantity: 1, artistName: product.author }],
            successPath: `/digital-downloads?downloaded=${product.id}`,
            cancelPath: "/digital-downloads",
            metadata: {
              type: "digital",
              productId: product.id,
              productTitle: product.title,
              downloadUrl: `https://kilnfire.replit.app/kiln/downloads/${product.id}`,
            },
          }),
        });
        const data = await res.json() as { url?: string };
        if (data.url) window.location.href = data.url;
      }
    } catch { /* ignore */ } finally {
      setPurchasing(false);
    }
  }

  async function handleDownload(productId: string) {
    try {
      const res = await fetch(`/api/digital-downloads/${productId}/download-url`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json() as { url?: string };
      if (data.url) window.open(data.url, "_blank");
    } catch { /* ignore */ }
  }

  const hasPurchased = selectedProduct ? purchased.has(selectedProduct.id) : false;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/20">
              <Download size={18} className="text-amber-400" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-amber-100">Digital Downloads</h1>
          </div>
          <p className="text-sm text-stone-500">Glaze recipes, guides, templates, and tools from working craft artists.</p>
        </div>

        {/* Search + filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search downloads…"
              className="w-full rounded-xl border border-white/8 bg-stone-900/60 pl-9 pr-4 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-stone-600" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-white/8 bg-stone-900/60 px-3 py-2.5 text-sm text-stone-400 focus:outline-none"
              style={{ background: "hsl(20 8% 12%)" }}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Free picks banner */}
        <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-300">Free resources available</p>
            <p className="text-xs text-stone-500 mt-0.5">Quality guides shared freely by the Kiln community</p>
          </div>
          <button onClick={() => { setSearch("free"); setCategory("All"); }} className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors">
            Show free
          </button>
        </div>

        {/* Product grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((product) => {
            const Icon = ICON_MAP[product.category];
            const isOwned = purchased.has(product.id);
            return (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="group text-left rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden hover:border-amber-500/25 transition-all"
              >
                <div className="relative h-36 overflow-hidden bg-stone-800">
                  <img
                    src={product.previewUrl}
                    alt={product.title}
                    className="h-full w-full object-cover opacity-40 group-hover:opacity-50 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${product.id}/400/240`; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${product.isFree ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/15 bg-black/40 text-stone-400"}`}>
                      <Icon size={9} />
                      {product.isFree ? "Free" : LABEL_MAP[product.category]}
                    </span>
                    <span className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[10px] text-stone-500">{product.medium}</span>
                  </div>
                  {isOwned && (
                    <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3">
                    <p className="text-[10px] text-stone-500">{product.downloads.toLocaleString()} downloads</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-stone-200 leading-snug group-hover:text-amber-100 transition-colors">{product.title}</h3>
                    <span className="text-sm font-bold text-amber-400 shrink-0">
                      {product.isFree ? "Free" : `$${product.price}`}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mb-2">by {product.author}</p>
                  <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-3">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <StarDisplay rating={product.rating} />
                      <span className="text-[10px] text-stone-600">{product.rating} ({product.reviewCount})</span>
                    </div>
                    {product.pageCount && (
                      <span className="text-[10px] text-stone-700">{product.pageCount} pages</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <Download size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500">No downloads match your search.</p>
            <button onClick={() => { setSearch(""); setCategory("All"); }} className="mt-3 text-xs text-amber-400 hover:text-amber-300">Clear filters</button>
          </div>
        )}

        {/* Sell your own CTA */}
        <div className="mt-10 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-6 text-center">
          <p className="font-serif text-lg text-amber-100 mb-1">Sell your knowledge</p>
          <p className="text-sm text-stone-500 mb-4">Upload a PDF, spreadsheet, or video guide and sell it directly to other craft artists. Zero platform commission — peer-to-peer payments only.</p>
          <Link href="/create">
            <button className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
              Upload a download →
            </button>
          </Link>
        </div>
      </div>

      {/* Product detail modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setSelectedProduct(null); setJustPurchased(false); }}
          >
            <motion.div
              className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#1a1714] overflow-hidden max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-44 overflow-hidden bg-stone-800">
                <img
                  src={selectedProduct.previewUrl}
                  alt={selectedProduct.title}
                  className="h-full w-full object-cover opacity-50"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${selectedProduct.id}/600/300`; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1714] to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${selectedProduct.isFree ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/30 text-amber-400"}`}>
                      {selectedProduct.isFree ? "Free" : LABEL_MAP[selectedProduct.category]}
                    </span>
                    <span className="text-[10px] text-stone-500">{selectedProduct.medium}</span>
                  </div>
                  <h2 className="font-serif text-xl font-bold text-amber-100">{selectedProduct.title}</h2>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/8">
                  <img src={selectedProduct.authorAvatar} alt={selectedProduct.author} className="h-8 w-8 rounded-full object-cover border border-white/10" onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${selectedProduct.authorId}/80/80`; }} />
                  <div className="flex-1">
                    <Link href={`/artists/${selectedProduct.authorId}`} onClick={() => setSelectedProduct(null)}>
                      <p className="text-sm font-medium text-stone-300 hover:text-amber-300 transition-colors">{selectedProduct.author}</p>
                    </Link>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-300">{selectedProduct.isFree ? "Free" : `$${selectedProduct.price}`}</p>
                  </div>
                </div>

                <p className="text-sm text-stone-400 leading-relaxed mb-4">{selectedProduct.description}</p>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Downloads", value: selectedProduct.downloads.toLocaleString() },
                    { label: "Rating", value: `${selectedProduct.rating} ★` },
                    { label: "Pages", value: selectedProduct.pageCount ? `${selectedProduct.pageCount} pg` : "Digital" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-white/8 bg-stone-900/60 p-3 text-center">
                      <p className="text-xs font-bold text-stone-300">{value}</p>
                      <p className="text-[10px] text-stone-600">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {selectedProduct.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-stone-700 px-2.5 py-1 text-[10px] text-stone-500">#{tag}</span>
                  ))}
                </div>

                {justPurchased ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                    <Check size={20} className="text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-emerald-300">Download ready!</p>
                    <p className="text-xs text-stone-600 mt-1">Your purchase has been recorded.</p>
                    <button
                      onClick={() => handleDownload(selectedProduct.id)}
                      className="mt-3 flex items-center gap-2 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                      <Download size={13} /> Download now
                    </button>
                  </div>
                ) : hasPurchased ? (
                  <button
                    onClick={() => handleDownload(selectedProduct.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                    <Download size={15} /> Download again
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase(selectedProduct)}
                    disabled={purchasing}
                    className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-60 transition-colors"
                  >
                    {purchasing ? (
                      <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-stone-950/40 border-t-stone-950 animate-spin" />Processing…</span>
                    ) : selectedProduct.isFree ? (
                      <><Download size={15} /> Download free</>
                    ) : (
                      <><DollarSign size={15} /> Buy for ${selectedProduct.price}</>
                    )}
                  </button>
                )}

                {!selectedProduct.isFree && !hasPurchased && (
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    <Lock size={10} className="text-stone-700" />
                    <p className="text-[10px] text-stone-700">Payments go directly to the artist. No platform fee.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
