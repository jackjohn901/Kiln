import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, TrendingUp, Flame, Hash, Search, ArrowUpRight } from "lucide-react";
import Nav from "@/components/Nav";

interface TrendingTag {
  tag: string;
  postCount: number;
  weeklyGrowth: number;
  topImageUrl: string;
  category: string;
}

const TRENDING_TAGS: TrendingTag[] = [
  { tag: "glassblow", postCount: 4821, weeklyGrowth: 18, topImageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80", category: "technique" },
  { tag: "reductionglaze", postCount: 2344, weeklyGrowth: 32, topImageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80", category: "technique" },
  { tag: "hotshop", postCount: 6102, weeklyGrowth: 9, topImageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", category: "place" },
  { tag: "handbuilt", postCount: 3567, weeklyGrowth: 14, topImageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80", category: "technique" },
  { tag: "woodfire", postCount: 1890, weeklyGrowth: 41, topImageUrl: "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=400&q=80", category: "technique" },
  { tag: "processwork", postCount: 9134, weeklyGrowth: 7, topImageUrl: "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?w=400&q=80", category: "content" },
  { tag: "wabisabi", postCount: 2701, weeklyGrowth: 22, topImageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80", category: "aesthetic" },
  { tag: "soda-fired", postCount: 1244, weeklyGrowth: 55, topImageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80", category: "technique" },
  { tag: "kilnforming", postCount: 3089, weeklyGrowth: 12, topImageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", category: "technique" },
  { tag: "nakedRaku", postCount: 987, weeklyGrowth: 68, topImageUrl: "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=400&q=80", category: "technique" },
  { tag: "studioglass", postCount: 5433, weeklyGrowth: 6, topImageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", category: "community" },
  { tag: "crystalglaze", postCount: 1678, weeklyGrowth: 29, topImageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80", category: "technique" },
  { tag: "soldout", postCount: 2145, weeklyGrowth: 15, topImageUrl: "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?w=400&q=80", category: "commerce" },
  { tag: "newwork", postCount: 11200, weeklyGrowth: 5, topImageUrl: "https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?w=400&q=80", category: "content" },
  { tag: "craftresidency", postCount: 1390, weeklyGrowth: 38, topImageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", category: "community" },
  { tag: "forgefire", postCount: 2233, weeklyGrowth: 20, topImageUrl: "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=400&q=80", category: "technique" },
  { tag: "opengathering", postCount: 778, weeklyGrowth: 88, topImageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", category: "technique" },
  { tag: "glazetest", postCount: 4320, weeklyGrowth: 11, topImageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80", category: "process" },
];

const CATEGORIES = ["all", "technique", "process", "community", "commerce", "aesthetic", "content", "place"];

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export default function Trending() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const sorted = [...TRENDING_TAGS]
    .filter(t => category === "all" || t.category === category)
    .filter(t => !query || t.tag.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.postCount - a.postCount);

  const rising = [...TRENDING_TAGS]
    .sort((a, b) => b.weeklyGrowth - a.weeklyGrowth)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">

        <div className="mb-6 flex items-start gap-3">
          <Link href="/" className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100">Trending</h1>
            <p className="text-sm text-stone-500 mt-0.5">What the craft community is talking about this week</p>
          </div>
        </div>

        {/* Rising fast */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={13} className="text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400">Rising fast this week</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {rising.map((t) => (
              <Link key={t.tag} href={`/tag/${t.tag}`}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="relative shrink-0 w-32 h-32 rounded-2xl overflow-hidden cursor-pointer"
                >
                  <img src={t.topImageUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-bold text-white">#{t.tag}</p>
                    <p className="text-[10px] text-orange-300">↑{t.weeklyGrowth}% this week</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tags..."
            className="w-full rounded-full border border-white/10 bg-stone-900/80 py-2.5 pl-9 pr-4 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
          />
        </div>

        {/* Category filters */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                category === cat
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-white/10 text-stone-500 hover:text-stone-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tag list */}
        <div className="flex flex-col gap-2">
          {sorted.map((t, i) => (
            <Link key={t.tag} href={`/tag/${t.tag}`}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                whileHover={{ x: 4 }}
                className="flex items-center gap-4 rounded-xl border border-white/8 bg-stone-900/50 px-4 py-3 cursor-pointer hover:border-white/15 transition-colors group"
              >
                <span className="w-5 text-xs font-bold text-stone-600 shrink-0">{i + 1}</span>
                <div className="h-10 w-10 rounded-lg overflow-hidden bg-stone-800 shrink-0">
                  <img src={t.topImageUrl} alt="" className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Hash size={11} className="text-amber-500 shrink-0" />
                    <p className="text-sm font-semibold text-stone-200">{t.tag}</p>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">{formatCount(t.postCount)} posts</p>
                </div>
                <div className="flex items-center gap-1 text-xs shrink-0">
                  {t.weeklyGrowth >= 30 ? (
                    <span className="flex items-center gap-0.5 text-orange-400 font-semibold">
                      <TrendingUp size={11} /> +{t.weeklyGrowth}%
                    </span>
                  ) : (
                    <span className="text-stone-600">+{t.weeklyGrowth}%</span>
                  )}
                </div>
                <ArrowUpRight size={13} className="text-stone-700 group-hover:text-stone-400 transition-colors shrink-0" />
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
