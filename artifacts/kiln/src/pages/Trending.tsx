import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, TrendingUp, Flame, Hash, Search, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";

interface TrendingTag {
  tag: string;
  count: number;
  weeklyGrowth: number;
  imageUrl: string | null;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function TagThumb({ tag, imageUrl, className }: { tag: string; imageUrl: string | null; className?: string }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={tag} className={className} />;
  }
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900 ${className ?? ""}`}>
      <Hash size={16} className="text-stone-600" />
    </div>
  );
}

export default function Trending() {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/trending-posts?limit=100")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const apiTags: TrendingTag[] = (data.trendingTags ?? []).map((t: TrendingTag) => ({
          tag: t.tag,
          count: t.count ?? 0,
          weeklyGrowth: t.weeklyGrowth ?? 0,
          imageUrl: t.imageUrl ?? null,
        }));
        setTags(apiTags);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const filtered = tags
    .filter(t => !query || t.tag.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.count - a.count);

  const rising = [...tags]
    .filter(t => t.weeklyGrowth > 0)
    .sort((a, b) => b.weeklyGrowth - a.weeklyGrowth)
    .slice(0, 6);

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

        {loading && (
          <div className="py-20 flex justify-center">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        )}

        {!loading && error && (
          <div className="py-16 text-center">
            <Hash size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm">Couldn't load trending tags. Please try again.</p>
          </div>
        )}

        {!loading && !error && tags.length === 0 && (
          <div className="py-16 text-center">
            <Hash size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-400 text-sm">No trending tags yet.</p>
            <p className="text-stone-600 text-xs mt-1">Tags appear here as artists add them to their posts.</p>
          </div>
        )}

        {!loading && !error && tags.length > 0 && (
          <>
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
                        <TagThumb tag={t.tag} imageUrl={t.imageUrl} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
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

            <div className="space-y-2">
              {filtered.map((t, i) => (
                <motion.div key={t.tag} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                  <Link href={`/tag/${encodeURIComponent(t.tag)}`}>
                    <div className="group flex items-center gap-4 rounded-xl border border-white/5 bg-stone-900/40 p-3 hover:border-amber-500/20 hover:bg-stone-900/60 transition-all cursor-pointer">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                        <TagThumb tag={t.tag} imageUrl={t.imageUrl} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Hash size={11} className="text-stone-500 flex-shrink-0" />
                          <p className="text-sm font-semibold text-stone-200 truncate">{t.tag}</p>
                        </div>
                        <p className="text-xs text-stone-600">{formatCount(t.count)} {t.count === 1 ? "post" : "posts"}</p>
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

            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <Hash size={32} className="mx-auto mb-3 text-stone-700" />
                <p className="text-stone-500 text-sm">No tags match your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
