import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Users, DollarSign, MessageCircle, Heart, Crown,
  Briefcase, Star, TrendingUp, Mail,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useSocial } from "@/contexts/SocialContext";
import { seedArtists } from "@/data/seedArtists";
import { artists } from "@/data/artists";

const ALL_ARTISTS = [...artists, ...seedArtists];

function findArtist(id: string) {
  return ALL_ARTISTS.find((a) => a.id === id);
}

type Tab = "all" | "patrons" | "collectors" | "followers";

// Seed collector data to make the page feel populated
const SEED_COLLECTORS = [
  { id: "rachel-osei", name: "Rachel Osei", handle: "rachel-osei", type: "commission" as const, spend: 4200, lastActive: "2026-05-14", avatar: "https://picsum.photos/seed/rachel/80/80", note: "Dining room commission — amber tones" },
  { id: "james-whitfield", name: "James Whitfield Gallery", handle: "whitfield-gallery", type: "commission" as const, spend: 0, lastActive: "2026-05-13", avatar: "https://picsum.photos/seed/whitfield/80/80", note: "Group show inquiry — October 2026" },
  { id: "mei-lin", name: "Mei Lin Design Studio", handle: "mei-lin", type: "commission" as const, spend: 11000, lastActive: "2026-05-08", avatar: "https://picsum.photos/seed/meilin/80/80", note: "Hotel lobby statement piece" },
  { id: "patron-001", name: "Clara Hoffman", handle: "clarahoff", type: "patron" as const, spend: 25, lastActive: "2026-05-10", avatar: "https://picsum.photos/seed/clara/80/80", note: "Monthly Studio Supporter" },
  { id: "patron-002", name: "Erik Larsson", handle: "erikl", type: "patron" as const, spend: 15, lastActive: "2026-05-09", avatar: "https://picsum.photos/seed/erik/80/80", note: "Monthly Studio Supporter" },
  { id: "patron-003", name: "Mia Torres", handle: "miat", type: "patron" as const, spend: 50, lastActive: "2026-05-12", avatar: "https://picsum.photos/seed/mia/80/80", note: "Quarterly Studio Supporter" },
];

const TYPE_LABELS: Record<string, string> = {
  commission: "Commission Client",
  patron: "Patron",
  follower: "Follower",
  tip: "Tipper",
};

const TYPE_COLORS: Record<string, string> = {
  commission: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  patron: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  follower: "text-stone-400 bg-stone-500/10 border-stone-500/20",
  tip: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

export default function Audience() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const { following, tips, subscriptions } = useSocial();

  const patrons = useMemo(() => {
    const fromSubs = SEED_COLLECTORS.filter((c) => c.type === "patron");
    const fromTips = tips.map((t) => ({
      id: t.toArtistId,
      name: t.toArtistName,
      handle: t.toArtistId,
      type: "tip" as const,
      spend: t.amount,
      lastActive: t.createdAt.slice(0, 10),
      avatar: `https://picsum.photos/seed/${t.toArtistId}/80/80`,
      note: t.message ?? "",
    }));
    const fromSubsState = subscriptions.map((id) => {
      const a = findArtist(id);
      return {
        id,
        name: a?.name ?? id,
        handle: id,
        type: "patron" as const,
        spend: 15,
        lastActive: "2026-05-01",
        avatar: a?.images?.[0]?.url ?? `https://picsum.photos/seed/${id}/80/80`,
        note: "Studio Supporter",
      };
    });
    return [...fromSubs, ...fromTips, ...fromSubsState];
  }, [tips, subscriptions]);

  const collectors = useMemo(() => {
    return SEED_COLLECTORS.filter((c) => c.type === "commission");
  }, []);

  const followers = useMemo(() => {
    return following.map((id) => {
      const a = findArtist(id);
      return {
        id,
        name: a?.name ?? id,
        handle: id,
        type: "follower" as const,
        spend: 0,
        lastActive: "2026-05-01",
        avatar: a?.images?.[0]?.url ?? `https://picsum.photos/seed/${id}/80/80`,
        note: "",
      };
    });
  }, [following]);

  const allContacts = useMemo(() => {
    const seen = new Set<string>();
    const combined = [...patrons, ...collectors, ...followers];
    return combined.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [patrons, collectors, followers]);

  const display = useMemo(() => {
    let list = tab === "all" ? allContacts : tab === "patrons" ? patrons : tab === "collectors" ? collectors : followers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q));
    }
    return list;
  }, [tab, search, allContacts, patrons, collectors, followers]);

  const totalRevenue = [...patrons, ...collectors].reduce((s, c) => s + c.spend, 0);
  const commissionPipeline = collectors.reduce((s, c) => s + c.spend, 0);

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
              <Users size={20} className="text-blue-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-amber-100">Your Audience</h1>
              <p className="text-sm text-stone-500">Patrons, collectors, and followers in one place</p>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
            { label: "Commission Pipeline", value: `$${commissionPipeline.toLocaleString()}`, icon: Briefcase, color: "text-blue-400" },
            { label: "Followers", value: following.length.toString(), icon: Heart, color: "text-rose-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-stone-900/60 p-4">
              <Icon size={16} className={`mb-2 ${color}`} />
              <p className="text-lg font-bold text-stone-100">{value}</p>
              <p className="text-xs text-stone-600">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-xl bg-stone-900 p-1">
            {(["all", "patrons", "collectors", "followers"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  tab === t ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-52 rounded-xl border border-white/10 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
          />
        </div>

        {/* List */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/40 overflow-hidden">
          {display.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto mb-3 text-stone-700" />
              <p className="text-stone-500">
                {tab === "followers" && following.length === 0
                  ? "Follow artists to see them here"
                  : "No contacts found"}
              </p>
              {tab === "followers" && following.length === 0 && (
                <Link href="/discover" className="mt-3 inline-block text-sm text-amber-400 hover:text-amber-300">
                  Discover artists →
                </Link>
              )}
            </div>
          ) : (
            display.map((contact, i) => (
              <div
                key={`${contact.id}-${i}`}
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/3 ${i < display.length - 1 ? "border-b border-white/5" : ""}`}
              >
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="h-10 w-10 rounded-full object-cover border border-white/10 shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${contact.id}/80/80`; }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-200">{contact.name}</p>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[contact.type]}`}>
                      {TYPE_LABELS[contact.type]}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 truncate">
                    @{contact.handle}
                    {contact.note && ` · ${contact.note}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {contact.spend > 0 && (
                    <div className="flex items-center gap-1">
                      <DollarSign size={11} className="text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-300">{contact.spend.toLocaleString()}</span>
                    </div>
                  )}
                  <Link
                    href="/messages"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:border-blue-400/30 hover:text-blue-400 transition-colors"
                    title="Message"
                  >
                    <MessageCircle size={13} />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Insights banner */}
        {allContacts.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/8 p-4">
            <div className="flex items-start gap-3">
              <TrendingUp size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-200">Audience insight</p>
                <p className="mt-0.5 text-xs text-amber-300/70">
                  You have {patrons.length} patron{patrons.length !== 1 ? "s" : ""} contributing monthly support and {collectors.length} active commission clients.
                  Your most engaged followers are from the collector community — consider opening a dedicated commission window.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
