import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import Nav from "@/components/Nav";
import { Link, useLocation } from "wouter";
import { Plus, Trash2, Globe, Eye, Save, Loader2, Link as LinkIcon, ShoppingBag, BookOpen, Megaphone, Star, MoveUp, MoveDown } from "lucide-react";

interface Block { type: "link" | "shop" | "workshop" | "campaign" | "text"; label: string; url: string; icon?: string; }

const BLOCK_TYPES = [
  { type: "link" as const, label: "Custom Link", icon: "🔗" },
  { type: "shop" as const, label: "Shop", icon: "🛍️" },
  { type: "workshop" as const, label: "Workshops", icon: "🎓" },
  { type: "campaign" as const, label: "Campaign", icon: "🎯" },
  { type: "text" as const, label: "Text Block", icon: "✍️" },
];

const THEMES = [
  { id: "dark", label: "Dark Amber", bg: "bg-stone-950", accent: "bg-amber-500" },
  { id: "light", label: "Cream", bg: "bg-amber-50", accent: "bg-stone-950" },
  { id: "forest", label: "Forest", bg: "bg-emerald-950", accent: "bg-amber-400" },
  { id: "slate", label: "Slate", bg: "bg-slate-900", accent: "bg-indigo-400" },
];

export default function LinkInBio() {
  const { profile } = useProfile();
  const [, navigate] = useLocation();
  const [page, setPage] = useState<{ pageTitle: string; bio: string; theme: string; blocks: Block[]; isPublished: boolean; customSlug: string; } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingType, setAddingType] = useState<Block["type"] | null>(null);
  const [newBlock, setNewBlock] = useState({ label: "", url: "" });

  useEffect(() => {
    if (!profile) return;
    fetch("/api/link-in-bio/me", { credentials: "include" }).then(r => r.json()).then(d => {
      if (d.page) {
        setPage({ ...d.page, blocks: JSON.parse(d.page.blocks ?? "[]"), customSlug: d.page.customSlug ?? "" });
      } else {
        setPage({ pageTitle: profile.name ?? "My Page", bio: "", theme: "dark", blocks: [], isPublished: false, customSlug: "" });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [profile?.id]);

  if (!profile) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">
      <div className="text-center"><p>Sign in to build your Link in Bio page</p><Link href="/setup" className="text-amber-400 mt-2 block">Sign In</Link></div>
    </div>
  );

  async function save() {
    if (!page) return;
    setSaving(true);
    const res = await fetch("/api/link-in-bio", {
      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...page, blocks: page.blocks, customSlug: page.customSlug || null }),
    });
    const data = await res.json();
    if (data.page) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }

  function addBlock() {
    if (!page || !addingType || !newBlock.label) return;
    setPage(p => p ? { ...p, blocks: [...p.blocks, { type: addingType, label: newBlock.label, url: newBlock.url, icon: BLOCK_TYPES.find(b => b.type === addingType)?.icon }] } : p);
    setNewBlock({ label: "", url: "" }); setAddingType(null);
  }
  function removeBlock(i: number) { setPage(p => p ? { ...p, blocks: p.blocks.filter((_, j) => j !== i) } : p); }
  function moveBlock(i: number, dir: -1 | 1) {
    if (!page) return;
    const b = [...page.blocks];
    const j = i + dir;
    if (j < 0 || j >= b.length) return;
    [b[i], b[j]] = [b[j], b[i]];
    setPage(p => p ? { ...p, blocks: b } : p);
  }

  if (loading || !page) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>;

  const slug = page.customSlug || profile.id;
  const previewUrl = `/link/${slug}`;
  const inputClass = "w-full bg-stone-900 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-600 outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-amber-100 font-serif">Link in Bio</h1>
            <p className="text-stone-400 text-sm mt-1">Your personal landing page for social profiles</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={previewUrl} target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-stone-300 text-sm hover:border-amber-500/30 hover:text-amber-300 transition-colors">
              <Eye size={14} /> Preview
            </Link>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400 transition-colors disabled:bg-stone-700 disabled:text-stone-500">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving</> : saved ? "Saved ✓" : <><Save size={14} /> Save</>}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="rounded-2xl bg-stone-900 border border-white/8 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-stone-300">Page Info</h2>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Page Title</label>
                <input value={page.pageTitle ?? ""} onChange={e => setPage(p => p ? { ...p, pageTitle: e.target.value } : p)} placeholder="Your name or brand" className={inputClass} />
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Bio</label>
                <textarea value={page.bio ?? ""} onChange={e => setPage(p => p ? { ...p, bio: e.target.value } : p)} rows={3} placeholder="Ceramicist · Portland, OR · Open for commissions" className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Custom URL slug (optional)</label>
                <div className="flex items-center gap-2">
                  <span className="text-stone-500 text-xs whitespace-nowrap">/link/</span>
                  <input value={page.customSlug ?? ""} onChange={e => setPage(p => p ? { ...p, customSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") } : p)} placeholder="your-name" className={inputClass} />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={page.isPublished} onChange={e => setPage(p => p ? { ...p, isPublished: e.target.checked } : p)} className="w-4 h-4 rounded accent-amber-500" />
                <div>
                  <span className="text-sm text-stone-200">Published</span>
                  <p className="text-xs text-stone-500">Make your page publicly accessible</p>
                </div>
              </label>
            </div>

            <div className="rounded-2xl bg-stone-900 border border-white/8 p-5">
              <h2 className="text-sm font-semibold text-stone-300 mb-3">Theme</h2>
              <div className="grid grid-cols-4 gap-2">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => setPage(p => p ? { ...p, theme: t.id } : p)}
                    className={`rounded-xl p-2 text-center border transition-colors ${page.theme === t.id ? "border-amber-500" : "border-white/5 hover:border-white/20"}`}>
                    <div className={`w-full h-8 rounded-lg mb-1 ${t.bg} flex items-end justify-center pb-1`}>
                      <div className={`w-6 h-1.5 rounded-full ${t.accent}`} />
                    </div>
                    <span className="text-[9px] text-stone-400">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-stone-900 border border-white/8 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-stone-300">Blocks</h2>
              </div>
              <div className="space-y-2 mb-3">
                {page.blocks.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl bg-stone-800 border border-white/5 px-3 py-2">
                    <span className="text-base">{b.icon ?? "🔗"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-200 truncate">{b.label}</p>
                      {b.url && <p className="text-xs text-stone-500 truncate">{b.url}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="p-1 text-stone-600 hover:text-stone-300 disabled:opacity-30"><MoveUp size={12} /></button>
                      <button onClick={() => moveBlock(i, 1)} disabled={i === page.blocks.length - 1} className="p-1 text-stone-600 hover:text-stone-300 disabled:opacity-30"><MoveDown size={12} /></button>
                      <button onClick={() => removeBlock(i)} className="p-1 text-stone-600 hover:text-rose-400"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
              {addingType ? (
                <div className="rounded-xl bg-stone-800 border border-amber-500/20 p-3 space-y-2">
                  <p className="text-xs text-amber-400 font-medium">Add {BLOCK_TYPES.find(b => b.type === addingType)?.label}</p>
                  <input value={newBlock.label} onChange={e => setNewBlock(b => ({ ...b, label: e.target.value }))} placeholder="Button label" className={inputClass} />
                  {addingType !== "text" && <input value={newBlock.url} onChange={e => setNewBlock(b => ({ ...b, url: e.target.value }))} placeholder="URL (optional)" className={inputClass} />}
                  <div className="flex gap-2">
                    <button onClick={addBlock} disabled={!newBlock.label} className="flex-1 py-2 rounded-xl bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 text-sm font-medium hover:bg-amber-400 transition-colors">Add</button>
                    <button onClick={() => setAddingType(null)} className="flex-1 py-2 rounded-xl bg-stone-700 text-stone-300 text-sm hover:bg-stone-600 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {BLOCK_TYPES.map(bt => (
                    <button key={bt.type} onClick={() => setAddingType(bt.type)} className="flex items-center gap-1.5 px-2 py-2 rounded-xl bg-stone-800 border border-white/5 text-stone-300 text-xs hover:border-amber-500/30 hover:text-amber-300 transition-colors">
                      <span>{bt.icon}</span> {bt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live preview */}
          <div>
            <p className="text-xs text-stone-500 mb-3 uppercase tracking-wider font-medium">Preview</p>
            <div className={`rounded-2xl overflow-hidden border border-white/8 min-h-96 ${THEMES.find(t => t.id === page.theme)?.bg ?? "bg-stone-950"} p-8`}>
              <div className="max-w-xs mx-auto text-center space-y-4">
                <img src={profile.avatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${profile.id}`} alt="" className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-white/20" />
                <div>
                  <h2 className={`font-bold text-lg ${page.theme === "light" ? "text-stone-900" : "text-white"}`}>{page.pageTitle || "Your Name"}</h2>
                  {page.bio && <p className={`text-xs mt-1 ${page.theme === "light" ? "text-stone-600" : "text-white/60"}`}>{page.bio}</p>}
                </div>
                <div className="space-y-2">
                  {page.blocks.map((b, i) => (
                    <div key={i} className={`w-full px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${THEMES.find(t => t.id === page.theme)?.accent ?? "bg-amber-500"} ${page.theme === "light" ? "text-white" : "text-stone-950"}`}>
                      <span>{b.icon}</span> {b.label}
                    </div>
                  ))}
                  {page.blocks.length === 0 && <p className={`text-xs ${page.theme === "light" ? "text-stone-400" : "text-white/30"}`}>Add blocks to see them here</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
