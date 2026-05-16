import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, TrendingUp, Flame, Hash, Search, ArrowUpRight, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";

interface TrendingTag {
  tag: string;
  postCount: number;
  weeklyGrowth: number;
  topImageUrl: string;
  category: string;
}

const STATIC_TAGS: TrendingTag[] = [
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

interface LiveTag { tag: string; count: number; }

export default function Trending() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [liveTags, setLiveTags] = useState<LiveTag[]>([]);

  useEffect(() => {
    fetch("/api/trending-posts?limit=100")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const posts: Array<{ tags: string[] }> = data.posts ?? [];
        const tagMap = new Map<string, number>();
        posts.forEach(p => (p.tags ?? []).forEach(t => tagMap.set(t, (tagMap.get(t) ?? 0) + 1)));
        const sorted = Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
        setLiveTags(sorted.map(([tag, count]) => ({ tag, count })));
      })
      .catch(() => {});
  }, []);

  const mergedTags: TrendingTag[] = [
    ...liveTags.map(lt => {
      const existing = STATIC_TAGS.find(s => s.tag.toLowerCase() === lt.tag.toLowerCase());
      return existing
        ? { ...existing, postCount: existing.postCount + lt.count }
        : { tag: lt.tag, postCount: lt.count, weeklyGrowth: Math.floor(Math.random() * 30) + 5, topImageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", category: "content" };
    }),
    ...STATIC_TAGS.filter(s => !liveTags.find(lt => lt.tag.toLowerCase() === s.tag.toLowerCase())),
  ];

  const sorted = [...mergedTags]
    .filter(t => category === "all" || t.category === category)
    .filter(t => !query || t.tag.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.postCount - a.postCount);

  const rising = [...mergedTags].sort((a, b) => b.weeklyGrowth - a.weeklyGrowth).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/discover" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Trending Tags</h1>
            <p className="mt-0.5 text-sm text-stone-500">What the craft community is posting about right now.</p>
          </div>
        </div>

        {rising.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Flame size={13} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-stone-300">Rising fast</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {rising.map(t => (
                <Link key={t.tag} href={`/tag/${encodeURIComponent(t.tag)}`}>
                  <div className="group relative overflow-hidden rounded-xl aspect-video cursor-pointer">
                    <img src={t.topImageUrl} alt={t.tag} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Hash size={10} className="text-amber-400" />
                        <span className="text-xs font-semibold text-white">{t.tag}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400">+{t.weeklyGrowth}% this week</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-stone-900/50 px-3 py-2">
            <Search size={14} className="text-stone-600 flex-shrink-0" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tags…"
              className="flex-1 bg-transparent text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none" />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-xs capitalize font-medium transition-colors ${category === c ? "bg-amber-500 text-stone-950" : "border border-white/10 text-stone-500 hover:text-stone-300"}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {sorted.map((t, i) => (
            <motion.div key={t.tag} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
              <Link href={`/tag/${encodeURIComponent(t.tag)}`}>
                <div className="group flex items-center gap-4 rounded-xl border border-white/5 bg-stone-900/40 p-3 hover:border-amber-500/20 hover:bg-stone-900/60 transition-all cursor-pointer">
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                    <img src={t.topImageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Hash size={11} className="text-stone-500 flex-shrink-0" />
                      <p className="text-sm font-semibold text-stone-200 truncate">{t.tag}</p>
                    </div>
                    <p className="text-xs text-stone-600">{formatCount(t.postCount)} posts</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {t.weeklyGrowth > 20 && (
                      <span className="text-[10px] font-bold text-emerald-400">+{t.weeklyGrowth}%</span>
                    )}
                    <TrendingUp size={14} className="text-stone-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="py-16 text-center">
            <Hash size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">No tags match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
