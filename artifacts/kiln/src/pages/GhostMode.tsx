import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ghost, Plus, Heart, Clock, Home, Camera, MessageSquare, Award, X, ChevronRight, Bell, BellOff } from "lucide-react";

interface GhostPiece {
  id: string;
  title: string;
  artistName: string;
  medium: string;
  soldTo: string;
  soldAt: string;
  imageUrl: string;
  updates: GhostUpdate[];
  subscriberCount: number;
  ownerSubscribed: boolean;
}

interface GhostUpdate {
  id: string;
  type: "photo" | "note" | "exhibition" | "anniversary" | "context";
  content: string;
  imageUrl?: string;
  postedAt: string;
  likedBy: number;
}

const STORAGE_KEY = "kiln_ghost_mode_v1";

const UPDATE_ICONS = {
  photo: Camera,
  note: MessageSquare,
  exhibition: Award,
  anniversary: Heart,
  context: Ghost,
};

const UPDATE_COLORS = {
  photo: "text-blue-400",
  note: "text-amber-400",
  exhibition: "text-purple-400",
  anniversary: "text-rose-400",
  context: "text-emerald-400",
};

const SEED_PIECES: GhostPiece[] = [
  {
    id: "ghost-001",
    title: "Amber Column #7",
    artistName: "You",
    medium: "Cast & Carved Glass",
    soldTo: "Rachel Osei",
    soldAt: "2023-11-03T14:20:00Z",
    imageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&q=80",
    subscriberCount: 14,
    ownerSubscribed: true,
    updates: [
      {
        id: "gu-001",
        type: "note",
        content: "Just looked back at the photos from making this piece. I was working through some difficult ideas about transparency at the time — both literally and otherwise. The amber color was an accident on the third pour that turned into the whole reason it works.",
        postedAt: "2024-01-15T10:30:00Z",
        likedBy: 8,
      },
      {
        id: "gu-002",
        type: "photo",
        content: "Rachel sent me this — the piece in its new home. The afternoon light through her west-facing window hits it in a way I couldn't have planned. It looks like it was made for that exact spot.",
        imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80",
        postedAt: "2024-02-10T14:00:00Z",
        likedBy: 23,
      },
      {
        id: "gu-003",
        type: "anniversary",
        content: "One year since this piece left the studio. I think about it often — that's what I hope for with each piece, that they go somewhere where they keep having a life.",
        postedAt: "2024-11-03T09:00:00Z",
        likedBy: 31,
      },
    ],
  },
  {
    id: "ghost-002",
    title: "Raku Fragment Vessel",
    artistName: "Maya Chen",
    medium: "Raku Ceramics",
    soldTo: "You",
    soldAt: "2025-03-15T11:00:00Z",
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80",
    subscriberCount: 7,
    ownerSubscribed: true,
    updates: [
      {
        id: "gu-004",
        type: "context",
        content: "This piece was from a series I made after returning from a residency in Mashiko, Japan. The crackle pattern in the glaze was intentionally induced by the post-firing reduction — I wanted the vessel to look like it had survived something, like it carried a history even though it was newly made.",
        postedAt: "2025-04-02T12:00:00Z",
        likedBy: 12,
      },
      {
        id: "gu-005",
        type: "exhibition",
        content: "A piece from the same series was just included in 'Earth & Fire: Contemporary Ceramics' at the Portland Art Museum. I'll be giving a talk there in June — if you're nearby and want to join, DM me.",
        postedAt: "2025-05-01T09:00:00Z",
        likedBy: 19,
      },
    ],
  },
];

function readPieces(): GhostPiece[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED_PIECES;
  } catch { return SEED_PIECES; }
}

function savePieces(p: GhostPiece[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function GhostMode() {
  const [pieces, setPieces] = useState<GhostPiece[]>(readPieces);
  const [selected, setSelected] = useState<GhostPiece | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<{ type: GhostUpdate["type"]; content: string; imageUrl: string }>({ type: "note", content: "", imageUrl: "" });
  const [showNewPiece, setShowNewPiece] = useState(false);
  const [newPieceForm, setNewPieceForm] = useState({ title: "", medium: "", soldTo: "", imageUrl: "" });

  useEffect(() => { savePieces(pieces); }, [pieces]);

  function addUpdate() {
    if (!selected || !addForm.content.trim()) return;
    const update: GhostUpdate = {
      id: genId(),
      type: addForm.type,
      content: addForm.content,
      imageUrl: addForm.imageUrl || undefined,
      postedAt: new Date().toISOString(),
      likedBy: 0,
    };
    const updated = pieces.map(p => p.id === selected.id ? { ...p, updates: [update, ...p.updates] } : p);
    setPieces(updated);
    setSelected(updated.find(p => p.id === selected.id) ?? null);
    setAddForm({ type: "note", content: "", imageUrl: "" });
    setShowAdd(false);
  }

  function registerPiece() {
    if (!newPieceForm.title.trim()) return;
    const piece: GhostPiece = {
      id: genId(),
      title: newPieceForm.title,
      artistName: "You",
      medium: newPieceForm.medium || "Mixed Media",
      soldTo: newPieceForm.soldTo || "Collector",
      soldAt: new Date().toISOString(),
      imageUrl: newPieceForm.imageUrl || `https://picsum.photos/seed/${genId()}/400/300`,
      subscriberCount: 0,
      ownerSubscribed: false,
      updates: [],
    };
    setPieces(prev => [piece, ...prev]);
    setNewPieceForm({ title: "", medium: "", soldTo: "", imageUrl: "" });
    setShowNewPiece(false);
  }

  function toggleSubscribe(pieceId: string) {
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, ownerSubscribed: !p.ownerSubscribed } : p));
    if (selected?.id === pieceId) {
      setSelected(prev => prev ? { ...prev, ownerSubscribed: !prev.ownerSubscribed } : prev);
    }
  }

  const myPieces = pieces.filter(p => p.artistName === "You");
  const subscribedPieces = pieces.filter(p => p.artistName !== "You" && p.ownerSubscribed);

  return (
    <div className="min-h-screen bg-[#12100e] pb-32 pt-2">
      <div className="mx-auto max-w-lg px-4">
        <div className="pt-10 pb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Ghost size={20} className="text-amber-400" />
              <h1 className="text-2xl font-bold text-amber-100">Studio Ghost</h1>
            </div>
            <p className="text-xs text-stone-500">Pieces keep living after they leave your studio.</p>
          </div>
          <button onClick={() => setShowNewPiece(true)} className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-2 text-xs font-semibold text-stone-950">
            <Plus size={13} /> Add Piece
          </button>
        </div>

        {myPieces.length > 0 && (
          <section className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Your Sold Pieces ({myPieces.length})</p>
            <div className="space-y-3">
              {myPieces.map((piece) => (
                <button key={piece.id} onClick={() => setSelected(piece)} className="w-full rounded-2xl border border-white/8 bg-stone-900/60 p-3 flex gap-3 hover:border-amber-500/20 transition-colors text-left">
                  <img src={piece.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-amber-100 text-sm truncate">{piece.title}</p>
                    <p className="text-xs text-stone-500">{piece.medium}</p>
                    <p className="text-xs text-stone-500 mt-0.5">Owned by <span className="text-stone-300">{piece.soldTo}</span></p>
                  </div>
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <span className="flex items-center gap-1 text-[10px] text-stone-500">
                      <Bell size={9} /> {piece.subscriberCount}
                    </span>
                    <span className="text-[10px] text-amber-500">{piece.updates.length} updates</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {subscribedPieces.length > 0 && (
          <section className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Pieces You Follow ({subscribedPieces.length})</p>
            <div className="space-y-3">
              {subscribedPieces.map((piece) => (
                <button key={piece.id} onClick={() => setSelected(piece)} className="w-full rounded-2xl border border-white/8 bg-stone-900/60 p-3 flex gap-3 hover:border-amber-500/20 transition-colors text-left">
                  <img src={piece.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-amber-100 text-sm truncate">{piece.title}</p>
                    <p className="text-xs text-stone-500">{piece.medium}</p>
                    <p className="text-xs text-stone-500 mt-0.5">by <span className="text-amber-300">{piece.artistName}</span></p>
                  </div>
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <Bell size={12} className="text-amber-400" />
                    <span className="text-[10px] text-stone-500">{piece.updates.length} updates</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {pieces.length === 0 && (
          <div className="py-16 text-center">
            <Ghost size={32} className="text-stone-700 mx-auto mb-3" />
            <p className="text-stone-400 font-medium">No ghost pieces yet</p>
            <p className="text-stone-600 text-sm mt-1">Register a sold piece to start its post-studio story.</p>
          </div>
        )}

        {/* What is this */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-4">
          <p className="text-xs font-semibold text-stone-400 mb-2">What is Studio Ghost?</p>
          <p className="text-[11px] text-stone-500 leading-relaxed">After a piece leaves your studio, its story isn't over. Studio Ghost lets you keep adding to a piece's narrative — context about how it was made, photos of it in its new home, exhibition news, anniversary reflections. Collectors who own your work can subscribe to receive these updates. Your work keeps living, and the connection between you and the collector deepens over time.</p>
        </div>
      </div>

      {/* Piece detail */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[61] max-h-[90vh] rounded-t-3xl bg-[#1a1714] border-t border-white/10 overflow-y-auto"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <div className="p-5">
                <div className="flex items-start gap-3 mb-5">
                  <img src={selected.imageUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-amber-100">{selected.title}</h2>
                    <p className="text-xs text-stone-500">{selected.medium}</p>
                    <p className="text-xs text-stone-500">Owned by <span className="text-stone-300">{selected.soldTo}</span></p>
                  </div>
                  <button onClick={() => setSelected(null)} className="rounded-full bg-stone-800 p-2 text-stone-400"><X size={14} /></button>
                </div>

                <div className="flex gap-3 mb-5">
                  {selected.artistName === "You" && (
                    <button onClick={() => setShowAdd(true)} className="flex-1 rounded-full bg-amber-500 py-2.5 text-xs font-semibold text-stone-950 flex items-center justify-center gap-1.5">
                      <Plus size={12} /> Add Update
                    </button>
                  )}
                  {selected.soldTo === "You" && selected.artistName !== "You" && (
                    <button
                      onClick={() => { setAddForm(f => ({ ...f, type: "photo", content: "" })); setShowAdd(true); }}
                      className="flex-1 rounded-full bg-blue-500/20 border border-blue-500/30 py-2.5 text-xs font-semibold text-blue-300 flex items-center justify-center gap-1.5 hover:bg-blue-500/30 transition-colors"
                    >
                      <Camera size={12} /> In the Wild
                    </button>
                  )}
                  <button onClick={() => toggleSubscribe(selected.id)} className={`flex-1 rounded-full border py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${selected.ownerSubscribed ? "border-amber-500/30 text-amber-400 bg-amber-500/10" : "border-white/15 text-stone-400"}`}>
                    {selected.ownerSubscribed ? <><Bell size={12} /> Following</> : <><BellOff size={12} /> Follow Updates</>}
                  </button>
                </div>

                {selected.updates.length === 0 && (
                  <p className="text-center text-stone-500 text-sm py-8">No updates yet. The story is still being written.</p>
                )}

                <div className="space-y-4">
                  {selected.updates.map((update) => {
                    const Icon = UPDATE_ICONS[update.type];
                    const colorClass = UPDATE_COLORS[update.type];
                    return (
                      <div key={update.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`h-7 w-7 rounded-full bg-stone-800 border border-white/10 flex items-center justify-center shrink-0 ${colorClass}`}>
                            <Icon size={12} />
                          </div>
                          <div className="w-px flex-1 bg-white/8 my-1" />
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-[10px] text-stone-500 mb-1.5">{formatDate(update.postedAt)} · {update.type}</p>
                          {update.imageUrl && <img src={update.imageUrl} alt="" className="w-full rounded-xl object-cover mb-2 max-h-48" />}
                          <p className="text-sm text-stone-300 leading-relaxed">{update.content}</p>
                          <div className="flex items-center gap-1 mt-2">
                            <Heart size={11} className="text-stone-600" />
                            <span className="text-[10px] text-stone-600">{update.likedBy}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add update form */}
              <AnimatePresence>
                {showAdd && (
                  <motion.div className="border-t border-white/10 p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="text-xs font-semibold text-stone-400 mb-3">Add a Ghost Update</p>
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                      {(Object.keys(UPDATE_ICONS) as GhostUpdate["type"][]).map((t) => {
                        const Icon = UPDATE_ICONS[t];
                        return (
                          <button key={t} onClick={() => setAddForm(f => ({ ...f, type: t }))}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap transition-colors capitalize ${addForm.type === t ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/10 text-stone-500"}`}>
                            <Icon size={10} /> {t}
                          </button>
                        );
                      })}
                    </div>
                    <textarea value={addForm.content} onChange={e => setAddForm(f => ({ ...f, content: e.target.value }))}
                      placeholder="Share a thought, reflection, or update about this piece…" rows={4}
                      className="w-full rounded-xl bg-stone-900 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 resize-none mb-3" />
                    <input value={addForm.imageUrl} onChange={e => setAddForm(f => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="Image URL (optional)" className="w-full rounded-xl bg-stone-900 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 mb-3" />
                    <div className="flex gap-3">
                      <button onClick={() => setShowAdd(false)} className="flex-1 rounded-full border border-white/10 py-2.5 text-sm text-stone-400">Cancel</button>
                      <button onClick={addUpdate} className="flex-1 rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-stone-950">Post Update</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New piece sheet */}
      <AnimatePresence>
        {showNewPiece && (
          <>
            <motion.div className="fixed inset-0 z-[62] bg-black/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewPiece(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[63] rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <h2 className="text-lg font-bold text-amber-100 mb-4">Register a Sold Piece</h2>
              <div className="space-y-3">
                <input value={newPieceForm.title} onChange={e => setNewPieceForm(f => ({ ...f, title: e.target.value }))} placeholder="Piece title *" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                <input value={newPieceForm.medium} onChange={e => setNewPieceForm(f => ({ ...f, medium: e.target.value }))} placeholder="Medium" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                <input value={newPieceForm.soldTo} onChange={e => setNewPieceForm(f => ({ ...f, soldTo: e.target.value }))} placeholder="Collector's name" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                <input value={newPieceForm.imageUrl} onChange={e => setNewPieceForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="Image URL (optional)" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowNewPiece(false)} className="flex-1 rounded-full border border-white/10 py-3 text-sm text-stone-400">Cancel</button>
                <button onClick={registerPiece} className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950">Register</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
