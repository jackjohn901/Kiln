import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import {
  Users, DollarSign, MessageCircle, Heart, Crown,
  Briefcase, Loader2, Download,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

type ContactType = "patron" | "commission" | "follower" | "tip";
type Tab = "all" | "patrons" | "collectors" | "followers";

interface Contact {
  id: string;
  name: string;
  handle: string;
  type: ContactType;
  spend: number;
  lastActive: string;
  avatar: string;
  note: string;
}

const TYPE_LABELS: Record<ContactType, string> = {
  commission: "Commission Client",
  patron: "Patron",
  follower: "Follower",
  tip: "Tipper",
};

const TYPE_COLORS: Record<ContactType, string> = {
  commission: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  patron: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  follower: "text-stone-400 bg-stone-500/10 border-stone-500/20",
  tip: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

export default function Audience() {
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [patrons, setPatrons] = useState<Contact[]>([]);
  const [collectors, setCollectors] = useState<Contact[]>([]);
  const [followers, setFollowers] = useState<Contact[]>([]);

  useEffect(() => {
    if (!profile) return;

    Promise.all([
      fetch("/api/me/patrons", { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch("/api/me/commissions/received", { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch("/api/me/followers", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([patronData, commData, followerData]) => {
      if (patronData?.patrons) {
        setPatrons(patronData.patrons.map((s: any) => ({
          id: s.subscriberId,
          name: s.subscriberName ?? "Patron",
          handle: s.subscriberId,
          type: "patron" as ContactType,
          spend: s.amount / 100,
          lastActive: s.startedAt,
          avatar: s.subscriberAvatarUrl ?? `https://picsum.photos/seed/${s.subscriberId}/80/80`,
          note: `${s.tierName ?? "Supporter"} · $${(s.amount / 100).toFixed(0)}/mo`,
        })));
      }
      if (commData?.commissions) {
        const seen = new Set<string>();
        const clients: Contact[] = [];
        for (const c of commData.commissions) {
          if (seen.has(c.clientId)) continue;
          seen.add(c.clientId);
          clients.push({
            id: c.clientId,
            name: c.clientName,
            handle: c.clientId,
            type: "commission" as ContactType,
            spend: c.quotedPrice ?? 0,
            lastActive: c.createdAt,
            avatar: `https://picsum.photos/seed/${c.clientId}/80/80`,
            note: c.workType ?? c.description?.slice(0, 60),
          });
        }
        setCollectors(clients);
      }
      if (followerData?.followers) {
        setFollowers(followerData.followers.map((f: any) => ({
          id: f.followerId,
          name: f.followerName ?? f.followerId,
          handle: f.followerId,
          type: "follower" as ContactType,
          spend: 0,
          lastActive: f.createdAt,
          avatar: f.followerAvatarUrl ?? `https://picsum.photos/seed/${f.followerId}/80/80`,
          note: "",
        })));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [profile]);

  const allContacts = useMemo(() => {
    const seen = new Set<string>();
    return [...patrons, ...collectors, ...followers].filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [patrons, collectors, followers]);

  const display = useMemo(() => {
    const list = tab === "all" ? allContacts : tab === "patrons" ? patrons : tab === "collectors" ? collectors : followers;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q));
  }, [tab, search, allContacts, patrons, collectors, followers]);

  const totalRevenue = [...patrons, ...collectors].reduce((s, c) => s + c.spend, 0);
  const commissionPipeline = collectors.reduce((s, c) => s + c.spend, 0);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <p className="text-stone-400 mb-4">Sign in to view your audience.</p>
          <Link href="/setup" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950">Set up profile</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 py-8">
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

        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
            { label: "Commission Pipeline", value: `$${commissionPipeline.toLocaleString()}`, icon: Briefcase, color: "text-blue-400" },
            { label: "Followers", value: followers.length.toString(), icon: Heart, color: "text-rose-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-stone-900/60 p-4">
              <Icon size={16} className={`mb-2 ${color}`} />
              <p className="text-lg font-bold text-stone-100">{value}</p>
              <p className="text-xs text-stone-600">{label}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-xl bg-stone-900 p-1">
            {(["all", "patrons", "collectors", "followers"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${tab === t ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}>
                {t === "collectors" ? "Commission Clients" : t}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-52 rounded-xl border border-white/10 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none" />
        </div>

        <div className="rounded-2xl border border-white/8 bg-stone-900/40 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-stone-600">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading your audience…</span>
            </div>
          ) : display.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto mb-3 text-stone-700" />
              <p className="text-stone-500">
                {tab === "followers" ? "No followers yet — share your work to grow your audience" :
                  tab === "patrons" ? "No patrons yet — set up patron tiers to accept support" :
                  tab === "collectors" ? "No commission clients yet" : "No contacts yet"}
              </p>
              {tab === "patrons" && (
                <Link href="/creator-home" className="mt-3 inline-block text-sm text-amber-400 hover:text-amber-300">
                  Set up patron tiers →
                </Link>
              )}
            </div>
          ) : (
            display.map((contact, i) => (
              <div key={`${contact.id}-${i}`}
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/3 ${i < display.length - 1 ? "border-b border-white/5" : ""}`}>
                <img src={contact.avatar} alt={contact.name}
                  className="h-10 w-10 rounded-full object-cover border border-white/10 shrink-0"
                  onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${contact.id}/80/80`; }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-200">{contact.name}</p>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[contact.type]}`}>
                      {TYPE_LABELS[contact.type]}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 truncate">{contact.note || `@${contact.handle}`}</p>
                </div>
                <div className="text-right shrink-0">
                  {contact.spend > 0 && <p className="text-sm font-semibold text-amber-300">${contact.spend.toLocaleString()}</p>}
                  <Link href={`/messages/${contact.id}`}>
                    <button className="mt-1 flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-stone-500 hover:border-amber-500/30 hover:text-amber-400 transition-colors">
                      <MessageCircle size={9} /> Message
                    </button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {display.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                const header = "Name,Handle,Type,Spend,Last Active,Note";
                const rows = display.map(c =>
                  [c.name, c.handle, c.type, c.spend.toFixed(2), c.lastActive ? new Date(c.lastActive).toLocaleDateString() : "", c.note ?? ""]
                    .map(v => `"${String(v).replace(/"/g, '""')}"`)
                    .join(",")
                );
                const csv = [header, ...rows].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "kiln-audience.csv"; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-400 transition-colors"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
