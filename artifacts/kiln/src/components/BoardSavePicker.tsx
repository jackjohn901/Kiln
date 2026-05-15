import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Bookmark, CheckCircle, Lock, Globe } from "lucide-react";

interface Board {
  id: string;
  name: string;
  isPrivate: boolean;
  itemCount: number;
  coverUrl?: string;
}

const BOARDS_KEY = "kiln_boards_v1";
const BOARD_ITEMS_KEY = "kiln_board_items_v1";

function loadBoards(): Board[] {
  try {
    return JSON.parse(localStorage.getItem(BOARDS_KEY) ?? "[]");
  } catch { return []; }
}

function loadBoardItems(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(BOARD_ITEMS_KEY) ?? "{}");
  } catch { return {}; }
}

function saveBoardItems(items: Record<string, string[]>) {
  localStorage.setItem(BOARD_ITEMS_KEY, JSON.stringify(items));
}

function saveBoards(boards: Board[]) {
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
}

interface Props {
  reelId: string;
  thumbnailUrl: string;
  onClose: () => void;
  onSaved: (boardName: string) => void;
}

export default function BoardSavePicker({ reelId, thumbnailUrl, onClose, onSaved }: Props) {
  const [boards, setBoards] = useState<Board[]>(() => {
    const stored = loadBoards();
    if (stored.length > 0) return stored;
    const defaults: Board[] = [
      { id: "board-inspiration", name: "Inspiration", isPrivate: false, itemCount: 0 },
      { id: "board-techniques", name: "Techniques to try", isPrivate: true, itemCount: 0 },
      { id: "board-wishlist", name: "Wishlist", isPrivate: false, itemCount: 0 },
    ];
    saveBoards(defaults);
    return defaults;
  });
  const [boardItems, setBoardItems] = useState<Record<string, string[]>>(loadBoardItems);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrivate, setNewPrivate] = useState(false);
  const [savedTo, setSavedTo] = useState<string | null>(null);

  const itemsOnBoard = (boardId: string) => (boardItems[boardId] ?? []).includes(reelId);

  function handleSave(board: Board) {
    const current = boardItems[board.id] ?? [];
    let updated: string[];
    if (current.includes(reelId)) {
      updated = current.filter((id) => id !== reelId);
    } else {
      updated = [reelId, ...current];
    }
    const newItems = { ...boardItems, [board.id]: updated };
    setBoardItems(newItems);
    saveBoardItems(newItems);

    const updatedBoards = boards.map((b) =>
      b.id === board.id ? { ...b, itemCount: updated.length, coverUrl: updated[0] ? thumbnailUrl : b.coverUrl } : b
    );
    setBoards(updatedBoards);
    saveBoards(updatedBoards);

    if (!current.includes(reelId)) {
      setSavedTo(board.name);
      onSaved(board.name);
      setTimeout(onClose, 1200);
    }
  }

  function handleCreateBoard() {
    if (!newName.trim()) return;
    const board: Board = {
      id: `board-${Date.now()}`,
      name: newName.trim(),
      isPrivate: newPrivate,
      itemCount: 1,
      coverUrl: thumbnailUrl,
    };
    const updated = [board, ...boards];
    setBoards(updated);
    saveBoards(updated);

    const newItems = { ...boardItems, [board.id]: [reelId] };
    setBoardItems(newItems);
    saveBoardItems(newItems);

    setSavedTo(board.name);
    onSaved(board.name);
    setCreatingNew(false);
    setNewName("");
    setTimeout(onClose, 1200);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-sm rounded-t-3xl bg-stone-900 border-t border-white/10 p-5 pb-8"
        >
          {/* Handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-700" />

          {savedTo ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <CheckCircle size={22} className="text-emerald-400" />
              </div>
              <p className="font-semibold text-white">Saved to "{savedTo}"</p>
            </motion.div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-stone-200">Save to board</h2>
                <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {boards.map((board) => {
                  const saved = itemsOnBoard(board.id);
                  return (
                    <button
                      key={board.id}
                      onClick={() => handleSave(board)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 transition-all ${
                        saved ? "border-amber-500/40 bg-amber-500/8" : "border-white/5 bg-stone-800 hover:border-white/10"
                      }`}
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-stone-700">
                        {board.coverUrl ? (
                          <img src={board.coverUrl} alt={board.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Bookmark size={14} className="text-stone-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="truncate text-sm font-medium text-stone-200">{board.name}</p>
                        <p className="text-[10px] text-stone-600 flex items-center gap-1">
                          {board.isPrivate ? <Lock size={9} /> : <Globe size={9} />}
                          {board.isPrivate ? "Private" : "Public"} · {board.itemCount} items
                        </p>
                      </div>
                      {saved && <CheckCircle size={16} className="text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {!creatingNew ? (
                <button
                  onClick={() => setCreatingNew(true)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-700 py-2.5 text-sm text-stone-400 hover:border-amber-500/30 hover:text-amber-400 transition-all"
                >
                  <Plus size={15} /> New board
                </button>
              ) : (
                <div className="mt-3 space-y-2 rounded-xl bg-stone-800 border border-white/5 p-3">
                  <input
                    type="text"
                    placeholder="Board name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg border border-white/10 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPrivate}
                      onChange={(e) => setNewPrivate(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span className="text-xs text-stone-400">Private board</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={handleCreateBoard} disabled={!newName.trim()} className="flex-1 rounded-lg bg-amber-500 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40">
                      Create & save
                    </button>
                    <button onClick={() => { setCreatingNew(false); setNewName(""); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
