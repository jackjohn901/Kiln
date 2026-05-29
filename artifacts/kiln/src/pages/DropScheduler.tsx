import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Zap, Plus, X, Clock, Calendar, DollarSign, Trash2, Eye, Edit2, CheckCircle } from "lucide-react";
import Nav from "@/components/Nav";
import { toast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";

const DROP_STORAGE_KEY = "kiln_my_drops_v1";

interface MyDrop {
  id: string;
  title: string;
  description: string;
  pieces: number;
  priceFrom: number;
  priceTo: number;
  dropDate: string;
  dropTime: string;
  imageUrl?: string;
  status: "scheduled" | "live" | "ended";
  notifyFollowers: boolean;
  createdAt: string;
}

function getStoredDrops(): MyDrop[] {
  try {
    return JSON.parse(localStorage.getItem(DROP_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveDrops(drops: MyDrop[]) {
  localStorage.setItem(DROP_STORAGE_KEY, JSON.stringify(drops));
}

function getCountdown(dateStr: string, timeStr: string): string {
  const dropMs = new Date(`${dateStr}T${timeStr}:00`).getTime();
  const diff = dropMs - Date.now();
  if (diff <= 0) return "Live now";
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function DropPreviewCard({ drop }: { drop: MyDrop }) {
  const countdown = getCountdown(drop.dropDate, drop.dropTime);
  const isLive = countdown === "Live now";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-stone-900">
      <div className="relative aspect-[4/3] bg-stone-800">
        {drop.imageUrl ? (
          <img src={drop.imageUrl} alt={drop.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Zap size={40} className="text-stone-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          {isLive ? (
            <span className="flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />Live Now
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-stone-900/80 border border-amber-500/30 px-2.5 py-1 text-xs font-mono text-amber-300">
              <Clock size={10} /> {countdown}
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-serif text-lg text-white leading-tight">{drop.title}</p>
          <p className="text-xs text-stone-400 mt-0.5">{drop.pieces} pieces · ${drop.priceFrom.toLocaleString()}–${drop.priceTo.toLocaleString()}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{drop.description}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-stone-600">
          <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(`${drop.dropDate}T${drop.dropTime}:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          {drop.notifyFollowers && (
            <span className="flex items-center gap-1 text-amber-500/70">
              <CheckCircle size={10} /> Followers notified
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DropScheduler() {
  const { profile } = useProfile();
  const [drops, setDrops] = useState<MyDrop[]>(getStoredDrops);
  const [showForm, setShowForm] = useState(false);
  const [previewDrop, setPreviewDrop] = useState<MyDrop | null>(null);
  const [saving, setSaving] = useState(false);

  // Load my drops from server on mount
  useEffect(() => {
    fetch("/api/me/drops", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data?.drops?.length) {
          const apiDrops: MyDrop[] = data.drops.map((d: { id: string; title: string; description: string | null; imageUrl: string | null; price: number; edition: number; dropDate: string; status: string; createdAt: string }) => {
            const dt = new Date(d.dropDate);
            return {
              id: d.id,
              title: d.title,
              description: d.description ?? "",
              pieces: d.edition ?? 1,
              priceFrom: d.price,
              priceTo: Math.round(d.price * 1.5),
              dropDate: dt.toISOString().split("T")[0]!,
              dropTime: dt.toTimeString().substring(0, 5),
              imageUrl: d.imageUrl ?? undefined,
              status: d.status as MyDrop["status"],
              notifyFollowers: true,
              createdAt: d.createdAt,
            };
          });
          setDrops(apiDrops);
        }
      })
      .catch(() => {});
  }, []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pieces, setPieces] = useState(5);
  const [priceFrom, setPriceFrom] = useState(200);
  const [priceTo, setPriceTo] = useState(800);
  const [dropDate, setDropDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0]!;
  });
  const [dropTime, setDropTime] = useState("12:00");
  const [imageUrl, setImageUrl] = useState("");
  const [notifyFollowers, setNotifyFollowers] = useState(true);

  async function createDrop() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const dropDateIso = `${dropDate}T${dropTime}:00`;
    try {
      const r = await fetch("/api/drops", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          imageUrl: imageUrl.trim() || undefined,
          price: priceFrom,
          edition: pieces,
          dropDate: dropDateIso,
          isPatronEarlyAccess: false,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        const drop: MyDrop = {
          id: data.id,
          title: data.title,
          description: data.description ?? "",
          pieces,
          priceFrom,
          priceTo,
          dropDate,
          dropTime,
          imageUrl: imageUrl.trim() || undefined,
          status: "scheduled",
          notifyFollowers,
          createdAt: data.createdAt,
        };
        setDrops(prev => [drop, ...prev]);
      } else {
        // fallback local
        const drop: MyDrop = { id: Date.now().toString(), title: title.trim(), description: description.trim(), pieces, priceFrom, priceTo, dropDate, dropTime, imageUrl: imageUrl.trim() || undefined, status: "scheduled", notifyFollowers, createdAt: new Date().toISOString() };
        setDrops(prev => [drop, ...prev]);
      }
    } catch {
      const drop: MyDrop = { id: Date.now().toString(), title: title.trim(), description: description.trim(), pieces, priceFrom, priceTo, dropDate, dropTime, imageUrl: imageUrl.trim() || undefined, status: "scheduled", notifyFollowers, createdAt: new Date().toISOString() };
      setDrops(prev => [drop, ...prev]);
    }
    setSaving(false);
    setShowForm(false);
    setTitle(""); setDescription(""); setPieces(5); setPriceFrom(200); setPriceTo(800);
    setImageUrl(""); setNotifyFollowers(true);
  }

  async function deleteDrop(id: string) {
    const prevDrops = drops;
    setDrops(prev => prev.filter(d => d.id !== id));
    try {
      const r = await fetch(`/api/drops/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error();
    } catch {
      setDrops(prevDrops);
      toast({ title: "Couldn\u2019t delete drop", description: "Please try again.", variant: "destructive" });
    }
  }

  const draftDrop: MyDrop | null = title.trim() ? {
    id: "preview",
    title, description, pieces, priceFrom, priceTo,
    dropDate, dropTime,
    imageUrl: imageUrl || undefined,
    status: "scheduled",
    notifyFollowers,
    createdAt: new Date().toISOString(),
  } : null;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/drops">
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-amber-100 flex items-center gap-2">
              <Zap size={20} className="text-amber-500" />
              Schedule a Drop
            </h1>
            <p className="text-xs text-stone-500">Release new work at exactly the right moment</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors shrink-0"
            >
              <Plus size={14} /> New drop
            </button>
          )}
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-amber-200">New drop</h2>
                <button onClick={() => setShowForm(false)} className="text-stone-600 hover:text-stone-400 transition-colors"><X size={16} /></button>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-400 block mb-1.5">Drop title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Spring Vessel Series — 8 pieces"
                  className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-400 block mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell collectors what makes this release special…"
                  rows={3}
                  className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-400 block mb-1.5">Cover image URL (optional)</label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-400 block mb-1.5">Pieces</label>
                  <input type="number" min={1} value={pieces} onChange={(e) => setPieces(Number(e.target.value))}
                    className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2.5 text-sm text-stone-200 outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-400 block mb-1.5">Price from</label>
                  <div className="relative">
                    <DollarSign size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-600" />
                    <input type="number" min={0} value={priceFrom} onChange={(e) => setPriceFrom(Number(e.target.value))}
                      className="w-full rounded-xl bg-stone-800 border border-white/10 pl-6 pr-3 py-2.5 text-sm text-stone-200 outline-none focus:border-amber-500/50" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-400 block mb-1.5">Price to</label>
                  <div className="relative">
                    <DollarSign size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-600" />
                    <input type="number" min={0} value={priceTo} onChange={(e) => setPriceTo(Number(e.target.value))}
                      className="w-full rounded-xl bg-stone-800 border border-white/10 pl-6 pr-3 py-2.5 text-sm text-stone-200 outline-none focus:border-amber-500/50" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-400 block mb-1.5">Drop date</label>
                  <input type="date" value={dropDate} onChange={(e) => setDropDate(e.target.value)}
                    className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2.5 text-sm text-stone-200 outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-400 block mb-1.5">Drop time</label>
                  <input type="time" value={dropTime} onChange={(e) => setDropTime(e.target.value)}
                    className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2.5 text-sm text-stone-200 outline-none focus:border-amber-500/50" />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setNotifyFollowers((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${notifyFollowers ? "bg-amber-500" : "bg-stone-700"}`}
                >
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${notifyFollowers ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-stone-300">Notify followers when drop goes live</span>
              </label>

              {draftDrop && (
                <button
                  onClick={() => setPreviewDrop(draftDrop)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 py-2.5 text-xs font-medium text-stone-400 hover:text-stone-200 hover:border-white/20 transition-colors"
                >
                  <Eye size={13} /> Preview drop card
                </button>
              )}

              <button
                onClick={createDrop}
                disabled={!title.trim()}
                className="w-full rounded-full bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={14} /> Schedule drop
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview modal */}
        <AnimatePresence>
          {previewDrop && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewDrop(null)}
            >
              <motion.div
                className="w-full max-w-sm"
                initial={{ scale: 0.96, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 10 }}
                onClick={(e) => e.stopPropagation()}
              >
                <DropPreviewCard drop={previewDrop} />
                <button onClick={() => setPreviewDrop(null)} className="mt-3 w-full text-center text-xs text-stone-600 hover:text-stone-400 transition-colors">
                  Close preview
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My drops */}
        {drops.length > 0 ? (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4">My Scheduled Drops</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {drops.map((drop) => (
                <div key={drop.id} className="relative group">
                  <DropPreviewCard drop={drop} />
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setPreviewDrop(drop)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900/90 border border-white/10 text-stone-400 hover:text-stone-200 transition-colors"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={() => deleteDrop(drop.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-900/90 border border-white/10 text-stone-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !showForm ? (
          <div className="text-center py-16">
            <Zap size={36} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-500 text-sm mb-1">No drops scheduled yet</p>
            <p className="text-xs text-stone-700 mb-6">Create a timed release to build anticipation for new work</p>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
            >
              Schedule your first drop
            </button>
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-white/8 bg-stone-900/40 p-4">
          <p className="text-xs font-semibold text-stone-400 mb-1">How drops work on Kiln</p>
          <ul className="space-y-1.5 text-xs text-stone-600">
            <li>· Your drop appears on the <Link href="/drops"><span className="text-amber-500/70 hover:text-amber-400 cursor-pointer">Drops page</span></Link> as "upcoming" with a live countdown</li>
            <li>· Followers who've opted in get a notification at drop time</li>
            <li>· The pieces become purchasable simultaneously — no first-come favoritism in listing order</li>
            <li>· Artists with verified status get featured placement on the drops page</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
