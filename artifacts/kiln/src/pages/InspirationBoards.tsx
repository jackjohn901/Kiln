import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import {
  Grid3x3, Plus, X, Edit3, Heart, Bookmark, Lock, Globe,
  Trash2, Image, ChevronRight, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import BetaBanner from "@/components/BetaBanner";
import { listings } from "@/data/listings";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";

const ALL_ARTISTS = [...artists, ...seedArtists];

const BOARDS_KEY = "kiln_boards_v1";

interface BoardItem {
  id: string;
  imageUrl: string;
  title: string;
  artistName: string;
  artistId: string;
  sourceType: "listing" | "reel" | "post";
  sourceId: string;
  addedAt: string;
}

interface Board {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  coverUrl: string;
  items: BoardItem[];
  createdAt: string;
}

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function readBoards(): Board[] {
  try { return JSON.parse(localStorage.getItem(BOARDS_KEY) ?? "[]"); } catch { return []; }
}

function writeBoards(boards: Board[]) {
  try { localStorage.setItem(BOARDS_KEY, JSON.stringify(boards)); } catch {}
}

function buildSeedItems(): BoardItem[] {
  const items: BoardItem[] = [];
  const sample = listings.slice(0, 12);
  for (const l of sample) {
    const artist = ALL_ARTISTS.find((a) => a.id === l.artistId);
    if (!l.imageUrl) continue;
    items.push({
      id: genId(),
      imageUrl: l.imageUrl,
      title: l.title,
      artistName: artist?.name ?? "Unknown",
      artistId: l.artistId,
      sourceType: "listing",
      sourceId: l.id,
      addedAt: new Date().toISOString(),
    });
  }
  return items;
}

const SEED_BOARDS: Board[] = [
  {
    id: "board-seed-1",
    name: "Earthy Tones",
    description: "Wood-fired, shino, and reduction pieces in warm brown and amber glazes.",
    isPrivate: false,
    coverUrl: listings[0]?.imageUrl ?? "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=300&fit=crop&seed=earthy",
    items: buildSeedItems().slice(0, 6),
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: "board-seed-2",
    name: "Studio Glass Wishlist",
    description: "Glass work I dream about owning one day.",
    isPrivate: true,
    coverUrl: listings[3]?.imageUrl ?? "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=300&fit=crop&seed=glass-wish",
    items: buildSeedItems().slice(4, 9),
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

function initBoards(): Board[] {
  const stored = readBoards();
  if (stored.length) return stored;
  writeBoards(SEED_BOARDS);
  return SEED_BOARDS;
}

const DISCOVERY_ITEMS = buildSeedItems().slice(0, 24);

export default function InspirationBoards() {
  const { profile } = useProfile();
  const [boards, setBoards] = useState<Board[]>(initBoards);
  const [view, setView] = useState<"boards" | "discover" | "board-detail">("boards");

  useEffect(() => {
    fetch("/api/inspiration-boards", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ boards: Board[] }> : null)
      .then(data => { if (data?.boards?.length) { setBoards(data.boards); writeBoards(data.boards); } })
      .catch(() => {});
  }, []);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [newBoardPrivate, setNewBoardPrivate] = useState(false);
  const [showAddToBoard, setShowAddToBoard] = useState<BoardItem | null>(null);
  const [addedToBoards, setAddedToBoards] = useState<Set<string>>(new Set());
  const [editingBoard, setEditingBoard] = useState<string | null>(null);

  function saveBoards(updated: Board[]) {
    setBoards(updated);
    writeBoards(updated);
  }

  async function createBoard() {
    if (!newBoardName.trim()) return;
    const tempId = genId();
    const board: Board = {
      id: tempId,
      name: newBoardName.trim(),
      description: newBoardDesc.trim(),
      isPrivate: newBoardPrivate,
      coverUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=300&fit=crop&seed=" + tempId,
      items: [],
      createdAt: new Date().toISOString(),
    };
    saveBoards([board, ...boards]);
    setNewBoardName(""); setNewBoardDesc(""); setNewBoardPrivate(false);
    setShowCreateModal(false);
    try {
      const res = await fetch("/api/inspiration-boards", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: board.name, description: board.description, isPrivate: board.isPrivate }),
      });
      if (res.ok) {
        const saved = await res.json() as Board;
        setBoards(prev => prev.map(b => b.id === tempId ? { ...b, id: saved.id } : b));
      }
    } catch { /* keep optimistic */ }
  }

  async function deleteBoard(id: string) {
    saveBoards(boards.filter((b) => b.id !== id));
    if (activeBoard?.id === id) { setActiveBoard(null); setView("boards"); }
    fetch(`/api/inspiration-boards/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  }

  async function addItemToBoard(boardId: string, item: BoardItem) {
    const updated = boards.map((b) =>
      b.id === boardId
        ? { ...b, items: b.items.some((i) => i.sourceId === item.sourceId) ? b.items : [item, ...b.items], coverUrl: b.items.length === 0 ? item.imageUrl : b.coverUrl }
        : b
    );
    saveBoards(updated);
    setAddedToBoards((prev) => new Set(prev).add(boardId));
    setTimeout(() => { setShowAddToBoard(null); setAddedToBoards(new Set()); }, 1200);
    fetch(`/api/inspiration-boards/${boardId}/items`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: item.imageUrl, title: item.title, artistName: item.artistName, artistId: item.artistId, sourceType: item.sourceType, sourceId: item.sourceId }),
    }).catch(() => {});
  }

  async function removeItemFromBoard(boardId: string, itemId: string) {
    const updated = boards.map((b) =>
      b.id === boardId ? { ...b, items: b.items.filter((i) => i.id !== itemId) } : b
    );
    saveBoards(updated);
    if (activeBoard?.id === boardId) {
      setActiveBoard(updated.find((b) => b.id === boardId) ?? null);
    }
    fetch(`/api/inspiration-boards/${boardId}/items/${itemId}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 py-8 pb-24">

        <BetaBanner label="Inspiration Boards" />
        {/* Header */}
        <div className="mt-4 mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              {view !== "boards" && (
                <button onClick={() => { setView("boards"); setActiveBoard(null); }} className="text-stone-500 hover:text-stone-300 transition-colors text-sm">← Back</button>
              )}
              <h1 className="font-serif text-2xl font-bold text-amber-100">
                {view === "board-detail" && activeBoard ? activeBoard.name : "Inspiration Boards"}
              </h1>
              {view === "board-detail" && activeBoard?.isPrivate && (
                <span className="flex items-center gap-1 rounded-full border border-stone-700 px-2 py-0.5 text-[10px] text-stone-500"><Lock size={9} />Private</span>
              )}
            </div>
            {view === "board-detail" && activeBoard?.description && (
              <p className="text-sm text-stone-500">{activeBoard.description}</p>
            )}
            {view === "boards" && (
              <p className="text-sm text-stone-500">Curate work that inspires you into named collections.</p>
            )}
          </div>

          {view === "boards" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors"
            >
              <Plus size={14} /> New board
            </button>
          )}
        </div>

        {/* Tabs */}
        {view === "boards" && (
          <div className="flex gap-2 mb-6">
            {[{ id: "boards", label: "My Boards" }, { id: "discover", label: "Discover" }].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setView(id as "boards" | "discover")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${view === id ? "bg-stone-800 text-stone-200" : "text-stone-500 hover:text-stone-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Boards grid */}
        {view === "boards" && (
          <div>
            {boards.length === 0 ? (
              <div className="py-20 text-center">
                <Grid3x3 size={32} className="mx-auto mb-3 text-stone-700" />
                <p className="text-stone-500 mb-2">No boards yet.</p>
                <button onClick={() => setShowCreateModal(true)} className="text-xs text-amber-400 hover:text-amber-300">Create your first board →</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {boards.map((board) => (
                  <div key={board.id} className="group relative">
                    <button
                      onClick={() => { setActiveBoard(board); setView("board-detail"); }}
                      className="w-full text-left"
                    >
                      <div className="relative overflow-hidden rounded-2xl aspect-square bg-stone-800">
                        {board.items.length > 0 ? (
                          <div className="grid grid-cols-2 h-full gap-0.5">
                            {board.items.slice(0, 4).map((item, i) => (
                              <div key={item.id} className={`overflow-hidden ${board.items.length === 1 || (i === 0 && board.items.length === 3) ? "col-span-2" : ""}`}>
                                <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${item.id}`; }} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <Image size={28} className="text-stone-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        {board.isPrivate && (
                          <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/60">
                            <Lock size={9} className="text-stone-400" />
                          </div>
                        )}
                      </div>
                      <div className="mt-2 px-0.5">
                        <p className="text-sm font-semibold text-stone-200 group-hover:text-amber-100 transition-colors">{board.name}</p>
                        <p className="text-xs text-stone-600">{board.items.length} {board.items.length === 1 ? "item" : "items"}</p>
                      </div>
                    </button>
                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBoard(board.id); }}
                      className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-stone-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discover tab */}
        {view === "discover" && (
          <div>
            <p className="text-xs text-stone-600 mb-4">Save any piece to your boards by tapping the bookmark icon.</p>
            <div className="columns-2 sm:columns-3 gap-3 space-y-3">
              {DISCOVERY_ITEMS.map((item) => (
                <div key={item.id} className="group relative break-inside-avoid rounded-xl overflow-hidden bg-stone-900">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=300&h=400&fit=crop&seed=${item.id}`; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] font-semibold text-white truncate">{item.title}</p>
                    <p className="text-[10px] text-stone-400">{item.artistName}</p>
                  </div>
                  <button
                    onClick={() => setShowAddToBoard(item)}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500/80"
                  >
                    <Bookmark size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Board detail */}
        {view === "board-detail" && activeBoard && (
          <div>
            {activeBoard.items.length === 0 ? (
              <div className="py-20 text-center">
                <Image size={28} className="mx-auto mb-3 text-stone-700" />
                <p className="text-stone-500 text-sm mb-3">This board is empty.</p>
                <button onClick={() => setView("discover")} className="text-xs text-amber-400 hover:text-amber-300">Browse pieces to save →</button>
              </div>
            ) : (
              <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                {activeBoard.items.map((item) => (
                  <div key={item.id} className="group relative break-inside-avoid rounded-xl overflow-hidden bg-stone-900">
                    <img src={item.imageUrl} alt={item.title} className="w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=300&h=400&fit=crop&seed=${item.id}`; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[11px] font-semibold text-white truncate">{item.title}</p>
                      <Link href={`/artists/${item.artistId}`}><p className="text-[10px] text-amber-400 hover:text-amber-300">{item.artistName}</p></Link>
                    </div>
                    <button
                      onClick={() => removeItemFromBoard(activeBoard.id, item.id)}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-stone-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create board modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#1a1714] p-6"
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif text-lg text-amber-100">Create board</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-stone-600 hover:text-stone-300"><X size={18} /></button>
              </div>
              <div className="space-y-3 mb-5">
                <input
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Board name"
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
                <textarea
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-4 py-3 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-none"
                />
                <button
                  onClick={() => setNewBoardPrivate(!newBoardPrivate)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${newBoardPrivate ? "border-amber-500/30 bg-amber-500/5" : "border-white/8 bg-stone-900/40"}`}
                >
                  {newBoardPrivate ? <Lock size={15} className="text-amber-400" /> : <Globe size={15} className="text-stone-500" />}
                  <div className="text-left flex-1">
                    <p className="text-sm text-stone-300">{newBoardPrivate ? "Private" : "Public"}</p>
                    <p className="text-[11px] text-stone-600">{newBoardPrivate ? "Only visible to you" : "Others can see this board"}</p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border-2 ${newBoardPrivate ? "border-amber-500 bg-amber-500" : "border-stone-600"}`} />
                </button>
              </div>
              <button
                onClick={createBoard}
                disabled={!newBoardName.trim()}
                className="w-full rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
              >
                Create board
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add to board modal */}
      <AnimatePresence>
        {showAddToBoard && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAddToBoard(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#1a1714] p-5"
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-amber-100">Save to board</h3>
                <button onClick={() => setShowAddToBoard(null)} className="text-stone-600 hover:text-stone-300"><X size={18} /></button>
              </div>
              <div className="space-y-2 mb-4">
                {boards.map((board) => {
                  const alreadyIn = board.items.some((i) => i.sourceId === showAddToBoard.sourceId);
                  const justAdded = addedToBoards.has(board.id);
                  return (
                    <button
                      key={board.id}
                      onClick={() => !alreadyIn && addItemToBoard(board.id, showAddToBoard)}
                      disabled={alreadyIn}
                      className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${alreadyIn ? "border-emerald-500/20 bg-emerald-500/5 opacity-60" : justAdded ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/8 hover:border-amber-500/20 bg-stone-900/60"}`}
                    >
                      <div className="h-8 w-8 rounded-lg overflow-hidden bg-stone-800 shrink-0">
                        {board.items[0] ? (
                          <img src={board.items[0].imageUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=40&h=40&fit=crop&seed=board"; }} />
                        ) : <Grid3x3 size={14} className="m-auto mt-1.5 text-stone-700" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-200 truncate">{board.name}</p>
                        <p className="text-[10px] text-stone-600">{board.items.length} items</p>
                      </div>
                      {(alreadyIn || justAdded) && <Check size={14} className="text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => { setShowCreateModal(true); setShowAddToBoard(null); }}
                className="w-full flex items-center justify-center gap-2 rounded-full border border-stone-700 py-2.5 text-sm text-stone-400 hover:border-amber-500/30 hover:text-amber-400 transition-colors"
              >
                <Plus size={13} /> New board
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
