import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, ChevronDown, ChevronUp, Flame, Lock } from "lucide-react";

interface QAItem {
  id: string;
  question: string;
  askerName: string;
  askerHandle: string;
  answer?: string;
  answeredAt?: string;
  likes: number;
  createdAt: string;
}

const QA_STORAGE_KEY = "kiln_qa_v2";

function loadQA(artistId: string): QAItem[] {
  try {
    const all = JSON.parse(localStorage.getItem(QA_STORAGE_KEY) ?? "{}");
    return all[artistId] ?? [];
  } catch { return []; }
}

function saveQA(artistId: string, items: QAItem[]) {
  try {
    const all = JSON.parse(localStorage.getItem(QA_STORAGE_KEY) ?? "{}");
    localStorage.setItem(QA_STORAGE_KEY, JSON.stringify({ ...all, [artistId]: items }));
  } catch {}
}


interface Props {
  artistId: string;
  artistName: string;
  isOwner?: boolean;
}

export default function QABlock({ artistId, artistName, isOwner = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [askerName, setAskerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [localQA, setLocalQA] = useState<QAItem[]>(() => {
    const stored = loadQA(artistId);
    if (stored.length > 0) return stored;
    return [];
  });

  const answered = localQA.filter((q) => q.answer);
  const pending = localQA.filter((q) => !q.answer);

  function handleSubmit() {
    if (!question.trim()) return;
    const newItem: QAItem = {
      id: `qa-${Date.now()}`,
      question: question.trim(),
      askerName: askerName.trim() || "Anonymous",
      askerHandle: "anonymous",
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...localQA];
    setLocalQA(updated);
    saveQA(artistId, updated);
    setQuestion("");
    setAskerName("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  function handleLike(id: string) {
    if (likedIds.has(id)) return;
    setLikedIds((prev) => new Set([...prev, id]));
    const updated = localQA.map((q) => q.id === id ? { ...q, likes: q.likes + 1 } : q);
    setLocalQA(updated);
    saveQA(artistId, updated);
  }

  function handleAnswer(id: string, answer: string) {
    const updated = localQA.map((q) =>
      q.id === id ? { ...q, answer, answeredAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } : q
    );
    setLocalQA(updated);
    saveQA(artistId, updated);
  }

  return (
    <div className="rounded-2xl bg-stone-900 border border-white/5 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-amber-400" />
          <span className="font-semibold text-stone-200">Q&amp;A with {artistName}</span>
          {answered.length > 0 && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              {answered.length} answered
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} className="text-stone-500" /> : <ChevronDown size={16} className="text-stone-500" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 p-4 space-y-4">
              {/* Ask form */}
              <div className="space-y-2">
                <p className="text-xs text-stone-500">Ask {artistName} a question about their work, process, or materials.</p>
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={askerName}
                  onChange={(e) => setAskerName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                />
                <textarea
                  rows={2}
                  placeholder={`Ask ${artistName} anything…`}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
                />
                {submitted ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <Flame size={12} className="text-emerald-400" />
                    Question submitted! {artistName} will answer soon.
                  </div>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!question.trim()}
                    className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40"
                  >
                    <Send size={11} /> Submit question
                  </button>
                )}
              </div>

              {/* Answered questions */}
              {answered.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold tracking-widest text-stone-600">ANSWERED</p>
                  {answered.map((item) => (
                    <div key={item.id} className="rounded-xl bg-stone-800/50 border border-white/5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-stone-300 leading-relaxed flex-1">{item.question}</p>
                        <button
                          onClick={() => handleLike(item.id)}
                          className={`shrink-0 flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 border transition-colors ${
                            likedIds.has(item.id) ? "border-amber-500/40 text-amber-400 bg-amber-500/10" : "border-white/10 text-stone-600 hover:text-stone-400"
                          }`}
                        >
                          ▲ {item.likes + (likedIds.has(item.id) ? 1 : 0)}
                        </button>
                      </div>
                      <p className="mt-0.5 text-[10px] text-stone-600">— {item.askerName}</p>

                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="mt-2 flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        {expandedId === item.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        {expandedId === item.id ? "Hide answer" : "See answer"}
                      </button>

                      <AnimatePresence>
                        {expandedId === item.id && item.answer && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 border-t border-amber-500/20 pt-3">
                              <div className="flex items-center gap-1 mb-1">
                                <Flame size={10} className="text-amber-400" />
                                <p className="text-[10px] font-bold text-amber-400">{artistName}</p>
                                {item.answeredAt && <span className="text-[10px] text-stone-700 ml-1">· {item.answeredAt}</span>}
                              </div>
                              <p className="text-sm text-stone-300 leading-relaxed">{item.answer}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending / unanswered */}
              {isOwner && pending.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold tracking-widest text-stone-600">AWAITING YOUR ANSWER ({pending.length})</p>
                  {pending.map((item) => (
                    <PendingQA key={item.id} item={item} onAnswer={(ans) => handleAnswer(item.id, ans)} />
                  ))}
                </div>
              )}

              {!isOwner && pending.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-stone-800/40 border border-white/5 p-3">
                  <Lock size={12} className="text-stone-600 shrink-0" />
                  <p className="text-xs text-stone-600">{pending.length} question{pending.length !== 1 ? "s" : ""} awaiting answer from {artistName}.</p>
                </div>
              )}

              {localQA.length === 0 && (
                <p className="text-xs text-stone-600 text-center py-2">No questions yet. Be the first to ask!</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PendingQA({ item, onAnswer }: { item: QAItem; onAnswer: (answer: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [answer, setAnswer] = useState("");

  function handleSubmit() {
    if (!answer.trim()) return;
    onAnswer(answer.trim());
    setExpanded(false);
    setAnswer("");
  }

  return (
    <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3">
      <p className="text-sm text-stone-300">{item.question}</p>
      <p className="mt-0.5 text-[10px] text-stone-600">— {item.askerName}</p>
      {!expanded ? (
        <button onClick={() => setExpanded(true)} className="mt-2 text-xs text-amber-400 hover:text-amber-300">Answer this →</button>
      ) : (
        <div className="mt-2 space-y-2">
          <textarea
            rows={3}
            placeholder="Your answer…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!answer.trim()} className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-40">
              Publish answer
            </button>
            <button onClick={() => { setExpanded(false); setAnswer(""); }} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
