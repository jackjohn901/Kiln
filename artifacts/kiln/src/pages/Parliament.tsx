import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Vote, CheckCircle2, Clock, Flame, ChevronRight, Users, Trophy, Zap, X, Plus, Trash2 } from "lucide-react";
import { useSocial } from "@/contexts/SocialContext";

interface Proposal {
  id: string;
  title: string;
  description: string;
  category: "feature" | "challenge" | "technique" | "grant" | "community";
  options: { id: string; label: string; votes: number }[];
  endsAt: string;
  totalVoices: number;
  proposedBy: string;
  proposedByAvatar: string;
}

interface ParliamentState {
  myVotes: Record<string, string>;
  myTokens: number;
  pastProposals: { proposalId: string; winningOption: string; settledAt: string }[];
}

const STORAGE_KEY = "kiln_parliament_v1";

const SEED_PROPOSALS: Proposal[] = [
  {
    id: "prop-001",
    title: "Next Monthly Technique Spotlight",
    description: "Which technique should Kiln feature in the June spotlight — with a dedicated week of curated reels, a master Q&A, and a beginner challenge?",
    category: "technique",
    options: [
      { id: "raku", label: "Raku Firing", votes: 412 },
      { id: "flamework", label: "Flameworking", votes: 387 },
      { id: "anagama", label: "Wood-Fired / Anagama", votes: 291 },
      { id: "bronze", label: "Bronze Casting", votes: 203 },
    ],
    endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    totalVoices: 1293,
    proposedBy: "Kiln Team",
    proposedByAvatar: "https://picsum.photos/seed/kiln/60/60",
  },
  {
    id: "prop-002",
    title: "Summer Challenge Theme",
    description: "The July community challenge draws hundreds of participants. You decide the theme — artists will have 30 days to create and share work around the winning concept.",
    category: "challenge",
    options: [
      { id: "found", label: "Found Materials", votes: 534 },
      { id: "origin", label: "Honoring Your Origin", votes: 489 },
      { id: "constraint", label: "One Tool, One Day", votes: 378 },
      { id: "collab", label: "Cross-Craft Collaboration", votes: 312 },
    ],
    endsAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    totalVoices: 1713,
    proposedBy: "Community Council",
    proposedByAvatar: "https://picsum.photos/seed/council/60/60",
  },
  {
    id: "prop-003",
    title: "Grant Spotlight Partner — Q3",
    description: "Kiln will promote one grant-writing partner for Q3, featuring their opportunities to all artists. Which type of funding organization should we prioritize?",
    category: "grant",
    options: [
      { id: "state", label: "State Arts Councils", votes: 621 },
      { id: "private", label: "Private Foundations", votes: 445 },
      { id: "international", label: "International Residencies", votes: 388 },
      { id: "craft", label: "Craft-Specific Endowments", votes: 512 },
    ],
    endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    totalVoices: 1966,
    proposedBy: "Artist Advisory Board",
    proposedByAvatar: "https://picsum.photos/seed/advisory/60/60",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  technique: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  challenge: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  grant: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  feature: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  community: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  technique: "Technique",
  challenge: "Challenge",
  grant: "Grant",
  feature: "Feature",
  community: "Community",
};

function timeLeft(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function readState(): ParliamentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { myVotes: {}, myTokens: 12, pastProposals: [] };
  } catch { return { myVotes: {}, myTokens: 12, pastProposals: [] }; }
}

function saveState(s: ParliamentState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export default function Parliament() {
  const { following, subscriptions, reelLikes, reelSaves, streak } = useSocial();
  const [state, setState] = useState<ParliamentState>(readState);
  const [proposals, setProposals] = useState<Proposal[]>(SEED_PROPOSALS);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [showPropose, setShowPropose] = useState(false);
  const [proposeTitle, setProposeTitle] = useState("");
  const [proposeDesc, setProposeDesc] = useState("");
  const [proposeCategory, setProposeCategory] = useState<Proposal["category"]>("community");
  const [proposeOptions, setProposeOptions] = useState(["", ""]);

  const voiceTokens = Math.max(
    state.myTokens,
    following.length * 3 +
    subscriptions.length * 5 +
    Object.values(reelLikes).filter(Boolean).length +
    Object.values(reelSaves).filter(Boolean).length * 2 +
    streak.current * 4 + 8
  );

  useEffect(() => { saveState(state); }, [state]);

  function submitProposal() {
    const opts = proposeOptions.map(o => o.trim()).filter(Boolean);
    if (!proposeTitle.trim() || opts.length < 2) return;
    const newProposal: Proposal = {
      id: `prop-user-${Date.now()}`,
      title: proposeTitle.trim(),
      description: proposeDesc.trim() || "A community proposal.",
      category: proposeCategory,
      options: opts.map((label, i) => ({ id: `opt-${i}`, label, votes: 0 })),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      totalVoices: 0,
      proposedBy: "You",
      proposedByAvatar: "",
    };
    setProposals(prev => [newProposal, ...prev]);
    setProposeTitle("");
    setProposeDesc("");
    setProposeOptions(["", ""]);
    setShowPropose(false);
  }

  function castVote(proposalId: string, optionId: string) {
    if (state.myVotes[proposalId]) return;
    setProposals(prev => prev.map(p => p.id !== proposalId ? p : {
      ...p,
      totalVoices: p.totalVoices + 1,
      options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o),
    }));
    setState(prev => {
      const next = { ...prev, myVotes: { ...prev.myVotes, [proposalId]: optionId } };
      saveState(next);
      return next;
    });
    setVotingFor(null);
    setSelected(prev => prev?.id === proposalId ? {
      ...prev,
      totalVoices: prev.totalVoices + 1,
      options: prev.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o),
    } : prev);
  }

  return (
    <div className="min-h-screen bg-[#12100e] pb-32 pt-2">
      <div className="mx-auto max-w-lg px-4">
        {/* Header */}
        <div className="pt-10 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Vote size={20} className="text-amber-400" />
            <h1 className="text-2xl font-bold text-amber-100">Kiln Parliament</h1>
          </div>
          <p className="text-xs text-stone-500">Community governance — your voice shapes the platform.</p>
        </div>

        {/* Token card */}
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-700/5 border border-amber-500/25 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={15} className="text-amber-400" />
                <span className="text-sm font-bold text-amber-300">Your Voice Tokens</span>
              </div>
              <p className="text-3xl font-black text-amber-100">{voiceTokens}</p>
              <p className="text-[10px] text-amber-600 mt-1">Earned from: follows, subscriptions, posts, saves</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500">{Object.keys(state.myVotes).length} votes cast</p>
              <p className="text-xs text-stone-500">{proposals.length - Object.keys(state.myVotes).length} open</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Follows", val: following.length * 3 },
              { label: "Patrons", val: subscriptions.length * 5 },
              { label: "Saves", val: Object.values(reelSaves).filter(Boolean).length * 2 },
              { label: "Streak", val: streak.current * 4 },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-xl bg-black/20 p-2">
                <p className="text-amber-300 font-bold text-sm">{val}</p>
                <p className="text-[9px] text-amber-700">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active proposals */}
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Active Votes ({proposals.length})</p>
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const myVote = state.myVotes[proposal.id];
            const topOption = [...proposal.options].sort((a, b) => b.votes - a.votes)[0];
            const hasVoted = !!myVote;
            return (
              <motion.div key={proposal.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${CATEGORY_COLORS[proposal.category]}`}>
                          {CATEGORY_LABELS[proposal.category]}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-stone-500">
                          <Clock size={9} /> {timeLeft(proposal.endsAt)}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-amber-100 leading-snug">{proposal.title}</h3>
                    </div>
                    {hasVoted && <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />}
                  </div>

                  {/* Options with bars */}
                  <div className="space-y-2">
                    {proposal.options.map((opt) => {
                      const pct = proposal.totalVoices > 0 ? Math.round((opt.votes / proposal.totalVoices) * 100) : 0;
                      const isMyVote = myVote === opt.id;
                      const isLeading = opt.id === topOption.id;
                      return (
                        <div key={opt.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs ${isMyVote ? "text-amber-300 font-semibold" : "text-stone-400"}`}>{opt.label}</span>
                            <div className="flex items-center gap-1.5">
                              {isLeading && hasVoted && <Trophy size={10} className="text-amber-400" />}
                              {hasVoted && <span className="text-[10px] text-stone-500">{pct}%</span>}
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${isMyVote ? "bg-amber-500" : isLeading ? "bg-amber-500/50" : "bg-stone-600"}`}
                              initial={{ width: 0 }}
                              animate={{ width: hasVoted ? `${pct}%` : "0%" }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!hasVoted && (
                    <button onClick={() => setSelected(proposal)}
                      className="mt-4 w-full rounded-full bg-amber-500 py-2.5 text-xs font-bold text-stone-950 flex items-center justify-center gap-2">
                      <Zap size={12} /> Cast Your Vote ({voiceTokens} tokens)
                    </button>
                  )}

                  {hasVoted && (() => {
                    const topPct = proposal.totalVoices > 0 ? Math.round((topOption.votes / proposal.totalVoices) * 100) : 0;
                    const myVoteLabel = proposal.options.find(o => o.id === myVote)?.label;
                    return (
                      <div className="mt-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Trophy size={12} className="text-amber-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-600">Community is trending toward</p>
                            <p className="text-xs font-bold text-amber-100 truncate">{topOption.label} <span className="text-amber-400 font-normal">({topPct}%)</span></p>
                          </div>
                        </div>
                        {myVoteLabel && myVote !== topOption.id && (
                          <p className="text-[10px] text-stone-500 mt-1">Your vote: {myVoteLabel}</p>
                        )}
                        {topPct >= 50 && (
                          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1">
                            <CheckCircle2 size={10} className="text-emerald-400" />
                            <p className="text-[10px] text-emerald-300 font-medium">Majority reached — outcome will be implemented</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between mt-3">
                    <span className="flex items-center gap-1 text-[10px] text-stone-600">
                      <Users size={9} /> {proposal.totalVoices.toLocaleString()} voices cast
                    </span>
                    <span className="text-[10px] text-stone-600">by {proposal.proposedBy}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Submit proposal CTA */}
        <button
          onClick={() => setShowPropose(true)}
          className="mt-6 w-full rounded-2xl border border-dashed border-amber-500/25 py-4 flex items-center justify-center gap-2 text-sm text-amber-500/60 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
        >
          <Plus size={14} /> Submit a proposal to the community
        </button>

        {/* How it works */}
        <div className="mt-4 rounded-2xl bg-stone-900/40 border border-white/8 p-4">
          <p className="text-xs font-semibold text-stone-400 mb-3">How Voice Tokens Work</p>
          <div className="space-y-2 text-[11px] text-stone-500">
            <p>• Every follow earns <span className="text-amber-400">+3 tokens</span></p>
            <p>• Every patronship earns <span className="text-amber-400">+5 tokens</span></p>
            <p>• Every saved reel earns <span className="text-amber-400">+2 tokens</span></p>
            <p>• Each streak day earns <span className="text-amber-400">+4 tokens</span></p>
            <p className="text-stone-600 pt-1">Tokens represent your stake in the community — not money. The more you contribute, the more your voice weighs in decisions that shape Kiln.</p>
          </div>
        </div>
      </div>

      {/* Submit proposal modal */}
      <AnimatePresence>
        {showPropose && (
          <>
            <motion.div className="fixed inset-0 z-[62] bg-black/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPropose(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[63] max-h-[90vh] overflow-y-auto rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-amber-100">Submit a Proposal</h2>
                <button onClick={() => setShowPropose(false)} className="rounded-full bg-stone-800 p-2 text-stone-400"><X size={14} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Proposal title *</label>
                  <input value={proposeTitle} onChange={e => setProposeTitle(e.target.value)}
                    placeholder="e.g. Next guest teacher for the masterclass series"
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Description (optional)</label>
                  <textarea value={proposeDesc} onChange={e => setProposeDesc(e.target.value)}
                    placeholder="Give the community context for what they're voting on..."
                    rows={2} className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 resize-none" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {(["technique", "challenge", "grant", "feature", "community"] as const).map(cat => (
                      <button key={cat} onClick={() => setProposeCategory(cat)}
                        className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${proposeCategory === cat ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/10 text-stone-500 hover:border-white/20"}`}>
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Options (at least 2, up to 4) *</label>
                  <div className="space-y-2">
                    {proposeOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={opt} onChange={e => setProposeOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 rounded-xl bg-stone-800/60 border border-white/10 px-4 py-2.5 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                        {proposeOptions.length > 2 && (
                          <button onClick={() => setProposeOptions(prev => prev.filter((_, j) => j !== i))}
                            className="rounded-xl border border-white/10 px-3 text-stone-500 hover:text-red-400 hover:border-red-500/30 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                    {proposeOptions.length < 4 && (
                      <button onClick={() => setProposeOptions(prev => [...prev, ""])}
                        className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-400 transition-colors">
                        <Plus size={11} /> Add option
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowPropose(false)} className="flex-1 rounded-full border border-white/10 py-3 text-sm text-stone-400">Cancel</button>
                <button
                  onClick={submitProposal}
                  disabled={!proposeTitle.trim() || proposeOptions.filter(o => o.trim()).length < 2}
                  className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950 disabled:opacity-40"
                >
                  Submit Proposal
                </button>
              </div>
              <p className="mt-3 text-center text-[10px] text-stone-700">Proposals open for 7 days. Community votes shape Kiln's future.</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Vote modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/75" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-amber-100">{selected.title}</h2>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{selected.description}</p>
                </div>
                <button onClick={() => setSelected(null)} className="ml-3 rounded-full bg-stone-800 p-2 text-stone-400 shrink-0"><X size={14} /></button>
              </div>
              <div className="space-y-2.5">
                {selected.options.map((opt) => (
                  <button key={opt.id}
                    onClick={() => { setVotingFor(opt.id); castVote(selected.id, opt.id); setSelected(null); }}
                    className="w-full rounded-2xl border border-white/10 bg-stone-900 p-4 flex items-center justify-between hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors text-left">
                    <span className="text-sm text-amber-100">{opt.label}</span>
                    <ChevronRight size={14} className="text-stone-500" />
                  </button>
                ))}
              </div>
              <p className="mt-4 text-center text-[10px] text-stone-600">Your vote uses 1 of your {voiceTokens} voice tokens. Votes are anonymous but permanent.</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
