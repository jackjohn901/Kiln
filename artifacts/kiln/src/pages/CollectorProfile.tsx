import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Star, MapPin, Shield, Grid3x3, Heart,
  MessageCircle, ExternalLink, Package, Users, DollarSign,
} from "lucide-react";
import { getCollectorById, COLLECTORS } from "@/data/collectors";
import Nav from "@/components/Nav";

const MEDIUM_COLORS: Record<string, string> = {
  "Studio Glass": "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "Glass Blowing": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Ceramics": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Flameworking": "bg-red-500/20 text-red-300 border-red-500/30",
  "Metal Forging": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "Fiber Arts": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Murrine": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "Kiln Forming": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Bronze Casting": "bg-yellow-700/20 text-yellow-400 border-yellow-700/30",
};

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return `$${n}`;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={11} className={i < rating ? "text-amber-400 fill-amber-400" : "text-stone-700 fill-stone-700"} />
      ))}
    </div>
  );
}

export default function CollectorProfile() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"collection" | "reviews" | "following">("collection");

  const collector = id ? getCollectorById(id) : undefined;

  if (!id || !collector) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-950 text-stone-200">
        <Nav />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-stone-400">Collector not found.</p>
            <Link href="/discover" className="mt-2 text-sm text-amber-400 hover:underline">Browse collectors →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 pb-24">
      <Nav />

      <div className="mx-auto max-w-lg px-4 pt-4">
        <Link href="/discover" className="mb-4 flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200 transition-colors">
          <ChevronLeft size={16} /> Back
        </Link>

        {/* Header */}
        <div className="relative mb-6">
          <div className="h-28 rounded-2xl bg-gradient-to-br from-stone-800 via-stone-900 to-stone-800" />
          <div className="px-4 -mt-10">
            <div className="flex items-end justify-between">
              <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-stone-950 shadow-xl">
                <img src={collector.avatarUrl} alt={collector.name} className="h-full w-full object-cover" />
              </div>
              <button
                onClick={() => navigate(`/messages/${collector.id}`)}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20 transition-colors">
                <MessageCircle size={14} /> Message
              </button>
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{collector.name}</h1>
                {collector.isVerifiedCollector && (
                  <span className="flex items-center gap-1 rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                    <Shield size={9} /> Verified Collector
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-stone-500">
                <MapPin size={11} /> {collector.location}
                <span className="mx-1 text-stone-700">·</span>
                <span>Member since {new Date(collector.memberSince).getFullYear()}</span>
              </div>
              <p className="mt-2 text-sm text-stone-400 leading-relaxed">{collector.bio}</p>
            </div>

            {/* Preferred mediums */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {collector.preferredMediums.map((m) => (
                <span key={m} className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${MEDIUM_COLORS[m] ?? "bg-stone-800 text-stone-400 border-stone-700"}`}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { icon: Package, label: "Pieces", value: String(collector.piecesOwned) },
            { icon: Users, label: "Artists", value: String(collector.artistsFollowed) },
            { icon: DollarSign, label: "Collected", value: fmt(collector.totalSpent) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl bg-stone-900 border border-white/5 p-3 text-center">
              <Icon size={16} className="mx-auto mb-1 text-amber-400" />
              <p className="text-base font-bold text-white">{value}</p>
              <p className="text-[10px] text-stone-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-stone-900 p-1">
          {(["collection", "reviews", "following"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all ${
                activeTab === tab ? "bg-amber-500 text-stone-950" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Collection tab */}
        {activeTab === "collection" && (
          <div className="space-y-4">
            {collector.collectedWorks.map((work, i) => (
              <motion.div
                key={work.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl bg-stone-900 border border-white/5"
              >
                <div className="h-44 overflow-hidden bg-stone-800">
                  <img
                    src={work.imageUrl}
                    alt={work.title}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=300&fit=crop&seed=${work.id}`; }}
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-white">{work.title}</h3>
                      <Link href={`/artists/${work.artistId}`} className="text-xs text-amber-400 hover:underline">
                        {work.artistName}
                      </Link>
                    </div>
                    {work.showPrice && work.acquisitionPrice && (
                      <span className="shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-300">
                        {fmt(work.acquisitionPrice)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{work.year} · {work.medium}</p>
                  {work.provenance && (
                    <p className="mt-2 text-xs text-stone-600 italic">{work.provenance}</p>
                  )}
                  <p className="mt-1 text-[10px] text-stone-700">
                    Acquired {new Date(work.acquiredDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </p>
                </div>
              </motion.div>
            ))}
            {collector.collectedWorks.length === 0 && (
              <p className="text-center text-sm text-stone-600 py-12">No public works listed.</p>
            )}
          </div>
        )}

        {/* Reviews tab */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
            {collector.reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-stone-900 border border-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <StarRow rating={review.rating} />
                    <p className="mt-1.5 text-sm text-stone-300 leading-relaxed">"{review.text}"</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
                  <Link href={`/artists/${review.artistId}`} className="text-xs font-medium text-amber-400 hover:underline">
                    {review.artistName}
                  </Link>
                  <span className="text-stone-700">·</span>
                  <span className="text-[10px] text-stone-600">
                    {new Date(review.date).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                </div>
              </motion.div>
            ))}
            {collector.reviews.length === 0 && (
              <p className="text-center text-sm text-stone-600 py-12">No reviews yet.</p>
            )}
          </div>
        )}

        {/* Following tab */}
        {activeTab === "following" && (
          <div className="grid grid-cols-2 gap-3">
            {collector.followedArtistIds.map((artistId, i) => (
              <motion.div
                key={artistId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/artists/${artistId}`}
                  className="flex items-center gap-2.5 rounded-xl bg-stone-900 border border-white/5 p-3 hover:border-amber-500/20 transition-all"
                >
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-stone-800">
                    <img
                      src={`https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=100&h=100&fit=crop&seed=${artistId}`}
                      alt={artistId}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-stone-200 capitalize">{artistId.replace(/-/g, " ")}</p>
                    <p className="text-[10px] text-stone-600 flex items-center gap-0.5">
                      <ExternalLink size={9} /> View profile
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Browse all collectors */}
      <div className="mx-auto max-w-lg px-4 pt-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-400">Other collectors on Kiln</h2>
        <div className="grid grid-cols-2 gap-3">
          {COLLECTORS.filter((c) => c.id !== collector.id).map((c) => (
            <Link
              key={c.id}
              href={`/collectors/${c.id}`}
              className="flex items-center gap-2.5 rounded-xl bg-stone-900 border border-white/5 p-3 hover:border-amber-500/20 transition-all"
            >
              <img src={c.avatarUrl} alt={c.name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-stone-200">{c.name}</p>
                <p className="text-[10px] text-stone-600">{c.piecesOwned} pieces</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
