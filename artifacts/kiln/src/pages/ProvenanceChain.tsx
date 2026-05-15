import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Plus, Shield, Clock, DollarSign, ChevronRight, Award, ArrowRight, Repeat, X, Check, Copy, ExternalLink } from "lucide-react";

interface ProvenancePiece {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  medium: string;
  year: string;
  imageUrl: string;
  royaltyPercent: number;
  registeredAt: string;
  chain: ProvenanceRecord[];
}

interface ProvenanceRecord {
  id: string;
  ownerName: string;
  ownerId: string;
  acquiredAt: string;
  acquiredFor?: string;
  note?: string;
  isArtist?: boolean;
}

const STORAGE_KEY = "kiln_provenance_v1";

const SEED_PIECES: ProvenancePiece[] = [
  {
    id: "piece-001",
    title: "Amber Column #7",
    artistName: "Alex Bernstein",
    artistId: "alex-bernstein",
    medium: "Cast & Carved Glass",
    year: "2023",
    imageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&q=80",
    royaltyPercent: 10,
    registeredAt: "2023-09-15T10:00:00Z",
    chain: [
      { id: "r-001", ownerName: "Alex Bernstein", ownerId: "alex-bernstein", acquiredAt: "2023-09-15T10:00:00Z", note: "Piece registered at creation", isArtist: true },
      { id: "r-002", ownerName: "Rachel Osei", ownerId: "rachel-osei", acquiredAt: "2023-11-03T14:20:00Z", acquiredFor: "$4,200", note: "Purchased at Habatat Gallery opening" },
    ],
  },
  {
    id: "piece-002",
    title: "Reduction Bowl Series #12",
    artistName: "Maya Chen",
    artistId: "maya-chen",
    medium: "Porcelain, Reduction Fired",
    year: "2024",
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80",
    royaltyPercent: 8,
    registeredAt: "2024-02-10T09:00:00Z",
    chain: [
      { id: "r-003", ownerName: "Maya Chen", ownerId: "maya-chen", acquiredAt: "2024-02-10T09:00:00Z", note: "Piece registered at creation", isArtist: true },
      { id: "r-004", ownerName: "James Whitfield", ownerId: "james-whitfield", acquiredAt: "2024-03-22T11:00:00Z", acquiredFor: "$1,800", note: "Acquired at Kiln Spring Drop" },
      { id: "r-005", ownerName: "Sophia Reyes", ownerId: "sophia-reyes", acquiredAt: "2025-01-10T15:00:00Z", acquiredFor: "$2,400", note: "Private sale, artist received $192 royalty" },
    ],
  },
];

function readPieces(): ProvenancePiece[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED_PIECES;
  } catch { return SEED_PIECES; }
}

function savePieces(pieces: ProvenancePiece[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pieces)); } catch {}
}

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function royaltyEarned(piece: ProvenancePiece): number {
  return piece.chain
    .filter((r) => !r.isArtist && r.acquiredFor)
    .slice(1)
    .reduce((sum, r) => {
      const price = parseFloat(r.acquiredFor!.replace(/[^0-9.]/g, ""));
      return sum + (price * piece.royaltyPercent) / 100;
    }, 0);
}

export default function ProvenanceChain() {
  const [pieces, setPieces] = useState<ProvenancePiece[]>(readPieces);
  const [selected, setSelected] = useState<ProvenancePiece | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState({ title: "", medium: "", year: new Date().getFullYear().toString(), royalty: "10", imageUrl: "" });
  const [transferForm, setTransferForm] = useState({ ownerName: "", acquiredFor: "", note: "" });

  useEffect(() => { savePieces(pieces); }, [pieces]);

  function registerPiece() {
    if (!form.title.trim()) return;
    const piece: ProvenancePiece = {
      id: genId(),
      title: form.title,
      artistName: "You",
      artistId: "__current_user__",
      medium: form.medium || "Mixed Media",
      year: form.year,
      imageUrl: form.imageUrl || `https://picsum.photos/seed/${genId()}/400/300`,
      royaltyPercent: parseFloat(form.royalty) || 10,
      registeredAt: new Date().toISOString(),
      chain: [{ id: genId(), ownerName: "You", ownerId: "__current_user__", acquiredAt: new Date().toISOString(), note: "Piece registered at creation", isArtist: true }],
    };
    setPieces((prev) => [piece, ...prev]);
    setForm({ title: "", medium: "", year: new Date().getFullYear().toString(), royalty: "10", imageUrl: "" });
    setShowRegister(false);
    setSelected(piece);
  }

  function addTransfer() {
    if (!selected || !transferForm.ownerName.trim()) return;
    const record: ProvenanceRecord = {
      id: genId(),
      ownerName: transferForm.ownerName,
      ownerId: transferForm.ownerName.toLowerCase().replace(/\s+/g, "-"),
      acquiredAt: new Date().toISOString(),
      acquiredFor: transferForm.acquiredFor || undefined,
      note: transferForm.note || undefined,
    };
    const updated = pieces.map((p) =>
      p.id === selected.id ? { ...p, chain: [...p.chain, record] } : p
    );
    setPieces(updated);
    setSelected(updated.find((p) => p.id === selected.id) ?? null);
    setTransferForm({ ownerName: "", acquiredFor: "", note: "" });
    setShowTransfer(false);
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(`kiln.art/provenance/${id}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const totalRoyalties = pieces.filter(p => p.artistId === "__current_user__").reduce((s, p) => s + royaltyEarned(p), 0);

  return (
    <div className="min-h-screen bg-[#12100e] pb-32 pt-2">
      <div className="mx-auto max-w-lg px-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-10 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-100">Provenance Chain</h1>
            <p className="text-xs text-stone-500 mt-0.5">Permanent ownership records for every piece</p>
          </div>
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-2 text-xs font-semibold text-stone-950"
          >
            <Plus size={13} /> Register
          </button>
        </div>

        {/* Stats bar */}
        {totalRoyalties > 0 && (
          <div className="mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-4">
            <DollarSign size={18} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-amber-300 font-semibold text-sm">${totalRoyalties.toFixed(0)} in resale royalties</p>
              <p className="text-stone-500 text-xs">Earned automatically when your pieces resell</p>
            </div>
          </div>
        )}

        {/* Pieces list */}
        <div className="space-y-3">
          {pieces.map((piece) => {
            const earned = royaltyEarned(piece);
            const currentOwner = piece.chain[piece.chain.length - 1];
            return (
              <motion.div
                key={piece.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelected(piece)}
                className="cursor-pointer rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden hover:border-amber-500/30 transition-colors"
              >
                <div className="flex gap-3 p-3">
                  <img src={piece.imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-amber-100 text-sm truncate">{piece.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{piece.medium} · {piece.year}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[10px] text-stone-500">
                        <Link2 size={10} /> {piece.chain.length} owner{piece.chain.length !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <Shield size={10} /> {piece.royaltyPercent}% royalty
                      </span>
                      {earned > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400">
                          <DollarSign size={10} /> ${earned.toFixed(0)} earned
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-stone-600 self-center shrink-0" />
                </div>
                <div className="border-t border-white/5 px-3 py-2 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {piece.chain.slice(-3).map((r) => (
                      <div key={r.id} className="h-5 w-5 rounded-full bg-stone-700 border border-stone-800 flex items-center justify-center text-[8px] font-bold text-stone-300">
                        {r.ownerName[0]}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-stone-500">Current: <span className="text-stone-300">{currentOwner.ownerName}</span></span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {pieces.length === 0 && (
          <div className="py-16 text-center">
            <Link2 size={32} className="text-stone-700 mx-auto mb-3" />
            <p className="text-stone-400 font-medium">No pieces registered yet</p>
            <p className="text-stone-600 text-sm mt-1">Register your first piece to start building its provenance chain.</p>
          </div>
        )}
      </div>

      {/* Register modal */}
      <AnimatePresence>
        {showRegister && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRegister(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <h2 className="text-lg font-bold text-amber-100 mb-4">Register a Piece</h2>
              <div className="space-y-3">
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Piece title *" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                <input value={form.medium} onChange={e => setForm(f => ({ ...f, medium: e.target.value }))} placeholder="Medium (e.g. Cast Glass, Porcelain)" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="Year" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                  <div className="relative">
                    <input value={form.royalty} onChange={e => setForm(f => ({ ...f, royalty: e.target.value }))} type="number" min="0" max="25" placeholder="Royalty %" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 pr-8 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500">%</span>
                  </div>
                </div>
                <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="Image URL (optional)" className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                <p className="text-[11px] text-stone-600">Royalty is automatically tracked when the piece resells through Kiln.</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowRegister(false)} className="flex-1 rounded-full border border-white/10 py-3 text-sm text-stone-400">Cancel</button>
                <button onClick={registerPiece} className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950">Register</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Piece detail sheet */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div className="fixed inset-0 z-[62] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[63] max-h-[90vh] rounded-t-3xl bg-[#1a1714] border-t border-white/10 overflow-y-auto"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <div className="p-5">
                <div className="flex items-start gap-4 mb-5">
                  <img src={selected.imageUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-amber-100">{selected.title}</h2>
                    <p className="text-xs text-stone-500">{selected.artistName} · {selected.medium} · {selected.year}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">{selected.royaltyPercent}% Royalty</span>
                      <button onClick={() => copyId(selected.id)} className="flex items-center gap-1 rounded-full bg-stone-800 px-2 py-0.5 text-[10px] text-stone-400 hover:text-stone-200">
                        {copied === selected.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />} Piece ID
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="rounded-full bg-stone-800 p-2 text-stone-400"><X size={14} /></button>
                </div>

                {/* Chain visualization */}
                <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Ownership Chain</h3>
                <div className="space-y-0">
                  {selected.chain.map((record, i) => (
                    <div key={record.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${record.isArtist ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-stone-800 text-stone-300 border border-white/10"}`}>
                          {record.isArtist ? <Award size={14} /> : record.ownerName[0]}
                        </div>
                        {i < selected.chain.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" style={{ minHeight: 16 }} />}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-amber-100">{record.ownerName}</span>
                          {record.isArtist && <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Creator</span>}
                          {record.acquiredFor && <span className="text-[10px] text-emerald-400 font-semibold">{record.acquiredFor}</span>}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">{formatDate(record.acquiredAt)}</p>
                        {record.note && <p className="text-xs text-stone-400 mt-0.5 italic">{record.note}</p>}
                        {!record.isArtist && i > 0 && record.acquiredFor && (
                          <p className="text-[10px] text-amber-500/70 mt-0.5">
                            Artist earned ${((parseFloat(record.acquiredFor.replace(/[^0-9.]/g, "")) * selected.royaltyPercent) / 100).toFixed(0)} ({selected.royaltyPercent}% royalty)
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Add transfer */}
                  {!showTransfer && (
                    <button onClick={() => setShowTransfer(true)} className="flex items-center gap-2 mt-2 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                      <ArrowRight size={12} /> Record ownership transfer
                    </button>
                  )}
                  {showTransfer && (
                    <div className="mt-3 rounded-2xl bg-stone-800/60 border border-white/10 p-4 space-y-3">
                      <p className="text-xs font-semibold text-stone-400">New owner</p>
                      <input value={transferForm.ownerName} onChange={e => setTransferForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="Owner name *" className="w-full rounded-xl bg-stone-900 border border-white/10 px-3 py-2.5 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                      <input value={transferForm.acquiredFor} onChange={e => setTransferForm(f => ({ ...f, acquiredFor: e.target.value }))} placeholder="Sale price (e.g. $2,500)" className="w-full rounded-xl bg-stone-900 border border-white/10 px-3 py-2.5 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                      <input value={transferForm.note} onChange={e => setTransferForm(f => ({ ...f, note: e.target.value }))} placeholder="Note (optional)" className="w-full rounded-xl bg-stone-900 border border-white/10 px-3 py-2.5 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowTransfer(false)} className="flex-1 rounded-full border border-white/10 py-2 text-xs text-stone-400">Cancel</button>
                        <button onClick={addTransfer} className="flex-1 rounded-full bg-amber-500 py-2 text-xs font-semibold text-stone-950">Record Transfer</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
