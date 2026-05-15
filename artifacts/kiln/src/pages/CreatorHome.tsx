import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Flame, Plus, BarChart2, DollarSign, Users, Inbox,
  Clock, CheckCircle, Calendar, Package, Edit3, Radio,
  ChevronRight, TrendingUp, Sparkles, PenLine, MessageCircle,
  ArrowUpRight, AlertCircle, Star, Zap, ShoppingBag,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";
import { getWorkshopsByArtist } from "@/data/workshops";
import { getListingsByArtist } from "@/data/listings";
import { getReelsByArtist } from "@/data/reels";

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function fmt(n: number) {
  return n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1000
    ? (n / 1000).toFixed(1) + "k"
    : String(n);
}

export default function CreatorHome() {
  const { profile } = useProfile();
  const { receivedInquiries, unreadCount, unreadMessageCount, following } = useSocial();

  const artistId = profile?.id ?? "";
  const h = hash(artistId);

  const [apiProfile, setApiProfile] = useState<{ followerCount: number; postCount: number } | null>(null);
  const [apiPosts, setApiPosts] = useState<Array<{ id: string; likeCount: number; commentCount: number; saveCount: number }>>([]);

  useEffect(() => {
    fetch("/api/me/profile", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.userId) setApiProfile(data); })
      .catch(() => {});
    fetch("/api/me/posts", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data?.posts)) setApiPosts(data.posts); })
      .catch(() => {});
  }, []);

  // Derived stats
  const stats = useMemo(() => {
    const reels = getReelsByArtist(artistId);
    const listings = getListingsByArtist(artistId);
    const followers = apiProfile?.followerCount ?? (3000 + (h % 47000));
    const monthEarnings = 800 + (h % 8200);
    const totalEngagement = apiPosts.length > 0
      ? apiPosts.reduce((s, p) => s + p.likeCount + p.commentCount + p.saveCount, 0)
      : reels.reduce((s, r) => s + r.likes * 12, 0);
    const availListings = listings.filter((l) => l.available).length;
    const postCount = apiProfile?.postCount ?? (apiPosts.length || reels.length);
    return { followers, monthEarnings, views: totalEngagement, reels: postCount, availListings };
  }, [artistId, h, apiProfile, apiPosts]);

  const workshops = useMemo(() => getWorkshopsByArtist(artistId).slice(0, 3), [artistId]);
  const reels = useMemo(() => getReelsByArtist(artistId).slice(0, 4), [artistId]);

  const pendingInquiries = receivedInquiries.filter((i) => i.status === "pending");
  const acceptedInquiries = receivedInquiries.filter((i) => i.status === "accepted");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const STAT_CARDS = [
    { label: "Followers", value: fmt(stats.followers), icon: Users, color: "text-blue-400", change: "+2.4%" },
    { label: "Total engagement", value: fmt(stats.views), icon: TrendingUp, color: "text-purple-400", change: "+34%" },
    { label: "Posts published", value: String(stats.reels), icon: Package, color: "text-amber-400", change: "" },
    { label: "Active listings", value: String(stats.availListings), icon: ShoppingBag, color: "text-emerald-400", change: "" },
  ];

  const QUICK_ACTIONS = [
    { href: "/create", icon: Plus, label: "New Post", color: "bg-amber-500 text-stone-950" },
    { href: "/scheduler", icon: PenLine, label: "Schedule", color: "bg-stone-800 text-stone-200 border border-white/10" },
    { href: `/live/${artistId}`, icon: Radio, label: "Go Live", color: "bg-red-500/10 text-red-400 border border-red-500/20" },
    { href: "/inventory", icon: Package, label: "Inventory", color: "bg-stone-800 text-stone-200 border border-white/10" },
    { href: "/grants", icon: Sparkles, label: "Grant Writer", color: "bg-stone-800 text-stone-200 border border-white/10" },
    { href: "/analytics", icon: BarChart2, label: "Analytics", color: "bg-stone-800 text-stone-200 border border-white/10" },
  ];

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-32 text-center px-6 gap-4">
          <Flame size={40} className="text-amber-500" />
          <h2 className="font-serif text-2xl text-amber-100">Your creator home</h2>
          <p className="text-stone-500 max-w-xs">Set up your profile to access your creator dashboard.</p>
          <Link href="/setup">
            <button className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors">
              Set up profile
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-6">

        {/* Greeting */}
        <div className="mb-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {profile.avatarUrl && (
              <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-amber-500/30 shrink-0">
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div>
              <p className="text-sm text-stone-500">{greeting}</p>
              <h1 className="font-serif text-2xl text-amber-100">{profile.name}</h1>
            </div>
          </div>
          <Link href={`/artists/${profile.id}`}>
            <button className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-stone-400 hover:border-white/20 hover:text-stone-200 transition-colors">
              View profile <ArrowUpRight size={11} />
            </button>
          </Link>
        </div>

        {/* Alert strip: unread items */}
        {(unreadCount > 0 || unreadMessageCount > 0 || pendingInquiries.length > 0) && (
          <div className="mb-5 flex flex-wrap gap-2">
            {pendingInquiries.length > 0 && (
              <Link href="/inbox">
                <div className="flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/8 px-4 py-2 text-xs text-amber-300 hover:bg-amber-500/15 transition-colors cursor-pointer">
                  <AlertCircle size={12} /> {pendingInquiries.length} commission {pendingInquiries.length === 1 ? "inquiry" : "inquiries"} waiting
                </div>
              </Link>
            )}
            {unreadMessageCount > 0 && (
              <Link href="/messages">
                <div className="flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/8 px-4 py-2 text-xs text-blue-300 hover:bg-blue-500/15 transition-colors cursor-pointer">
                  <MessageCircle size={12} /> {unreadMessageCount} unread message{unreadMessageCount > 1 ? "s" : ""}
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          {STAT_CARDS.map(({ label, value, icon: Icon, color, change }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-white/8 bg-stone-900/60 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={15} className={color} />
                {change && <span className="text-[10px] font-semibold text-emerald-400">{change}</span>}
              </div>
              <p className="text-xl font-bold text-amber-100">{value}</p>
              <p className="text-xs text-stone-600 mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mb-7">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600 mb-3">Quick actions</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {QUICK_ACTIONS.map(({ href, icon: Icon, label, color }) => (
              <Link key={href} href={href}>
                <button className={`w-full flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-xs font-medium transition-all hover:scale-105 ${color}`}>
                  <Icon size={18} />
                  {label}
                </button>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pending commissions */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Inbox size={14} className="text-amber-400" />
                <span className="text-sm font-semibold text-stone-200">Commission inbox</span>
                {pendingInquiries.length > 0 && (
                  <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                    {pendingInquiries.length}
                  </span>
                )}
              </div>
              <Link href="/inbox" className="text-[10px] text-stone-500 hover:text-stone-300 transition-colors flex items-center gap-1">
                View all <ChevronRight size={10} />
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {receivedInquiries.slice(0, 3).map((inq) => (
                <div key={inq.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${inq.status === "pending" ? "bg-amber-400" : inq.status === "accepted" ? "bg-emerald-400" : "bg-stone-600"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-200 truncate">{inq.fromName}</p>
                    <p className="text-xs text-stone-600 truncate">{inq.description.slice(0, 60)}…</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-amber-300">{inq.budget}</p>
                    <p className={`text-[10px] capitalize ${inq.status === "pending" ? "text-amber-500" : inq.status === "accepted" ? "text-emerald-400" : "text-stone-500"}`}>{inq.status}</p>
                  </div>
                </div>
              ))}
              {receivedInquiries.length === 0 && (
                <div className="px-5 py-6 text-center text-xs text-stone-600">No commission inquiries yet</div>
              )}
            </div>
          </div>

          {/* Recent posts performance */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-purple-400" />
                <span className="text-sm font-semibold text-stone-200">Recent posts</span>
              </div>
              <Link href="/analytics" className="text-[10px] text-stone-500 hover:text-stone-300 transition-colors flex items-center gap-1">
                Analytics <ChevronRight size={10} />
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {reels.length > 0 ? reels.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-stone-800 shrink-0">
                    <img src={r.thumbnail} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${r.id}/80/80`; }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-300 line-clamp-1">{r.caption}</p>
                    <p className="text-xs text-stone-600">{r.technique}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs font-semibold text-stone-300">{fmt(r.likes)} likes</p>
                    <div className="flex items-center gap-1 justify-end">
                      {i === 0 && <Star size={9} className="text-amber-400 fill-amber-400" />}
                      <p className="text-[10px] text-stone-600">{fmt(r.likes * 12)} views</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-6 text-center">
                  <p className="text-xs text-stone-600 mb-3">No posts yet</p>
                  <Link href="/create">
                    <button className="rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/20 transition-colors">
                      Create your first post
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming workshops */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-blue-400" />
                <span className="text-sm font-semibold text-stone-200">Your workshops</span>
              </div>
              <Link href="/workshops" className="text-[10px] text-stone-500 hover:text-stone-300 transition-colors flex items-center gap-1">
                View all <ChevronRight size={10} />
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {workshops.length > 0 ? workshops.map((w) => (
                <div key={w.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <Calendar size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-200 line-clamp-1">{w.title}</p>
                    <p className="text-xs text-stone-600">{w.startDate} · {w.location}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-stone-300">{w.spotsLeft} spots left</p>
                    <p className="text-[10px] text-stone-600">${w.price}</p>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-6 text-center text-xs text-stone-600">No workshops scheduled</div>
              )}
            </div>
          </div>

          {/* Creator tools */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-400" />
                <span className="text-sm font-semibold text-stone-200">Creator tools</span>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {[
                { href: "/newsletter", icon: MessageCircle, label: "Send newsletter", desc: "Message all your subscribers", color: "text-emerald-400" },
                { href: "/scheduler", icon: PenLine, label: "Schedule posts", desc: "Plan your content calendar", color: "text-blue-400" },
                { href: "/grants", icon: Sparkles, label: "Grant writer", desc: "AI-powered grant applications", color: "text-amber-400" },
                { href: "/press-kit", icon: Edit3, label: "Press kit", desc: "Bio, photos, and media assets", color: "text-purple-400" },
              ].map(({ href, icon: Icon, label, desc, color }) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition-colors cursor-pointer">
                    <Icon size={15} className={color} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-200">{label}</p>
                      <p className="text-xs text-stone-600">{desc}</p>
                    </div>
                    <ChevronRight size={13} className="text-stone-700" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
