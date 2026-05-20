import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Plus, Bell, BellOff, CheckCircle, Clock, BookOpen,
  X, ChevronRight, Camera, Send, Loader2,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";

interface Pledge {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatarUrl: string | null;
  title: string;
  description: string | null;
  pieceCount: number | null;
  intervalLabel: string | null;
  targetPostCount: number;
  currentPostCount: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  subscriberCount: number;
  isSubscribed: boolean;
}

interface PledgeUpdate {
  id: string;
  pledgeId: string;
  caption: string | null;
  imageUrl: string | null;
  hoursInvested: number | null;
  updateNumber: number;
  createdAt: string;
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-stone-500 mb-1">
        <span>{current}/{target} updates posted</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-stone-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function ProcessPledge() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"community" | "mine">("community");
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [myPledges, setMyPledges] = useState<Pledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPledge, setSelectedPledge] = useState<Pledge | null>(null);
  const [updates, setUpdates] = useState<PledgeUpdate[]>([]);
  const [showUpdate, setShowUpdate] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    title: "", description: "", pieceCount: "", intervalLabel: "", targetPostCount: "10",
  });
  const [updateForm, setUpdateForm] = useState({ caption: "", imageUrl: "", hoursInvested: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/process-pledges", { credentials: "include" })
        .then((r) => r.ok ? r.json() as Promise<{ pledges: Pledge[] }> : { pledges: [] }),
      user
        ? fetch("/api/me/process-pledges", { credentials: "include" })
            .then((r) => r.ok ? r.json() as Promise<{ pledges: Pledge[] }> : { pledges: [] })
        : Promise.resolve({ pledges: [] }),
    ])
      .then(([community, mine]) => {
        setPledges(community.pledges);
        setMyPledges(mine.pledges);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function loadUpdates(pledgeId: string) {
    const res = await fetch(`/api/process-pledges/${pledgeId}/updates`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json() as { updates: PledgeUpdate[] };
      setUpdates(data.updates);
    }
  }

  function openPledge(p: Pledge) {
    setSelectedPledge(p);
    loadUpdates(p.id).catch(() => {});
  }

  async function toggleSubscribe(pledgeId: string) {
    if (!user) return;
    setToggling(pledgeId);
    try {
      const res = await fetch(`/api/process-pledges/${pledgeId}/subscribe`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        const { subscribed } = await res.json() as { subscribed: boolean };
        const updateFn = (p: Pledge) =>
          p.id === pledgeId
            ? { ...p, isSubscribed: subscribed, subscriberCount: p.subscriberCount + (subscribed ? 1 : -1) }
            : p;
        setPledges((prev) => prev.map(updateFn));
        setMyPledges((prev) => prev.map(updateFn));
        if (selectedPledge?.id === pledgeId) setSelectedPledge((p) => p ? updateFn(p) : p);
      }
    } finally {
      setToggling(null);
    }
  }

  async function createPledge() {
    if (!createForm.title.trim()) return;
    const res = await fetch("/api/me/process-pledges", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: createForm.title,
        description: createForm.description || undefined,
        pieceCount: createForm.pieceCount ? parseInt(createForm.pieceCount) : undefined,
        intervalLabel: createForm.intervalLabel || undefined,
        targetPostCount: parseInt(createForm.targetPostCount) || 10,
      }),
    });
    if (res.ok) {
      const pledge = await res.json() as Pledge;
      setMyPledges((prev) => [pledge, ...prev]);
      setPledges((prev) => [pledge, ...prev]);
      setCreateForm({ title: "", description: "", pieceCount: "", intervalLabel: "", targetPostCount: "10" });
      setShowCreate(false);
      setTab("mine");
    }
  }

  async function postUpdate() {
    if (!selectedPledge || !updateForm.caption.trim()) return;
    const res = await fetch(`/api/me/process-pledges/${selectedPledge.id}/update`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: updateForm.caption,
        imageUrl: updateForm.imageUrl || undefined,
        hoursInvested: updateForm.hoursInvested ? parseInt(updateForm.hoursInvested) : undefined,
      }),
    });
    if (res.ok) {
      const update = await res.json() as PledgeUpdate;
      setUpdates((prev) => [update, ...prev]);
      const newCount = selectedPledge.currentPostCount + 1;
      const updated = { ...selectedPledge, currentPostCount: newCount };
      setSelectedPledge(updated);
      setMyPledges((prev) => prev.map((p) => p.id === selectedPledge.id ? updated : p));
      setPledges((prev) => prev.map((p) => p.id === selectedPledge.id ? updated : p));
      setUpdateForm({ caption: "", imageUrl: "", hoursInvested: "" });
      setShowUpdate(false);
    }
  }

  const displayList = tab === "community" ? pledges : myPledges;
  const isMyPledge = (p: Pledge) => user?.id === p.artistId;

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/creator-home">
              <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
                <ChevronLeft size={16} />
              </button>
            </Link>
            <div>
              <h1 className="font-serif text-2xl text-amber-100 flex items-center gap-2">
                <BookOpen size={20} className="text-amber-500" />
                Process Pledges
              </h1>
              <p className="text-xs text-stone-500">Artists commit to posting the full journey of a piece</p>
            </div>
          </div>
          {user && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors"
            >
              <Plus size={12} /> Pledge
            </button>
          )}
        </div>

        <div className="flex gap-1 mb-5 rounded-full bg-stone-900 p-1">
          {(["community", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-2 text-xs font-semibold transition-all ${tab === t ? "bg-amber-500 text-stone-950" : "text-stone-500 hover:text-stone-300"}`}
            >
              {t === "community" ? "Community" : "My Pledges"}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-amber-500" size={24} />
          </div>
        )}

        {!loading && displayList.length === 0 && (
          <div className="py-16 text-center">
            <BookOpen size={32} className="mx-auto mb-3 text-stone-700" />
            <p className="text-stone-400 font-medium">
              {tab === "mine" ? "You haven't made any pledges yet" : "No active pledges yet"}
            </p>
            <p className="text-stone-600 text-sm mt-1 max-w-xs mx-auto">
              {tab === "mine"
                ? "Make a pledge to commit to posting your full making process for a piece."
                : "Artists who make pledges will appear here."}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {displayList.map((pledge) => (
            <motion.div
              key={pledge.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openPledge(pledge)}
              className="cursor-pointer rounded-2xl border border-white/8 bg-stone-900/60 p-4 hover:border-amber-500/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-stone-800 flex items-center justify-center text-sm font-bold text-amber-300 border border-white/10">
                  {pledge.artistName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-amber-100 text-sm line-clamp-1">{pledge.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{pledge.artistName}</p>
                    </div>
                    {pledge.status === "complete" && (
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        <CheckCircle size={10} /> Done
                      </span>
                    )}
                  </div>
                  {pledge.description && (
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">{pledge.description}</p>
                  )}
                  <ProgressBar current={pledge.currentPostCount} target={pledge.targetPostCount} />
                  <div className="flex items-center gap-3 mt-2">
                    {pledge.intervalLabel && (
                      <span className="flex items-center gap-1 text-[10px] text-stone-500">
                        <Clock size={9} /> {pledge.intervalLabel}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] text-stone-500">
                      <Bell size={9} /> {pledge.subscriberCount} following
                    </span>
                    {!isMyPledge(pledge) && user && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSubscribe(pledge.id); }}
                        disabled={toggling === pledge.id}
                        className={`ml-auto flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all ${
                          pledge.isSubscribed
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                            : "border-white/10 text-stone-500 hover:border-white/20"
                        }`}
                      >
                        {pledge.isSubscribed ? <BellOff size={9} /> : <Bell size={9} />}
                        {pledge.isSubscribed ? "Unfollow" : "Follow"}
                      </button>
                    )}
                    <ChevronRight size={12} className="text-stone-700 ml-auto" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pledge detail sheet */}
      <AnimatePresence>
        {selectedPledge && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSelectedPledge(null); setUpdates([]); setShowUpdate(false); }} />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[61] max-h-[88vh] rounded-t-3xl bg-[#1a1714] border-t border-white/10 overflow-y-auto"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-amber-100">{selectedPledge.title}</h2>
                    <p className="text-xs text-stone-500">by {selectedPledge.artistName}</p>
                    {selectedPledge.description && <p className="text-sm text-stone-400 mt-1">{selectedPledge.description}</p>}
                  </div>
                  <button onClick={() => { setSelectedPledge(null); setUpdates([]); }} className="rounded-full bg-stone-800 p-2 text-stone-400">
                    <X size={14} />
                  </button>
                </div>

                <ProgressBar current={selectedPledge.currentPostCount} target={selectedPledge.targetPostCount} />

                <div className="flex gap-2 mt-3">
                  {!isMyPledge(selectedPledge) && user && (
                    <button
                      onClick={() => toggleSubscribe(selectedPledge.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                        selectedPledge.isSubscribed
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : "border-white/10 text-stone-400 hover:border-white/20"
                      }`}
                    >
                      {selectedPledge.isSubscribed ? <><BellOff size={12} /> Unfollow</> : <><Bell size={12} /> Follow journey</>}
                    </button>
                  )}
                  {isMyPledge(selectedPledge) && selectedPledge.status === "active" && (
                    <button
                      onClick={() => setShowUpdate(true)}
                      className="flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950"
                    >
                      <Camera size={12} /> Post update #{selectedPledge.currentPostCount + 1}
                    </button>
                  )}
                </div>

                {showUpdate && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3"
                  >
                    <p className="text-xs font-semibold text-amber-300">Update #{selectedPledge.currentPostCount + 1}</p>
                    <textarea
                      value={updateForm.caption}
                      onChange={(e) => setUpdateForm((f) => ({ ...f, caption: e.target.value }))}
                      placeholder="What happened since the last update? *"
                      rows={3}
                      className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 resize-none"
                    />
                    <input
                      value={updateForm.imageUrl}
                      onChange={(e) => setUpdateForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="Image URL (optional)"
                      className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                    />
                    <input
                      value={updateForm.hoursInvested}
                      onChange={(e) => setUpdateForm((f) => ({ ...f, hoursInvested: e.target.value }))}
                      placeholder="Hours invested so far (optional)"
                      type="number"
                      className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowUpdate(false)} className="flex-1 rounded-full border border-white/10 py-2.5 text-xs text-stone-400">Cancel</button>
                      <button onClick={postUpdate} className="flex-1 rounded-full bg-amber-500 py-2.5 text-xs font-bold text-stone-950 flex items-center justify-center gap-1.5">
                        <Send size={11} /> Post update
                      </button>
                    </div>
                  </motion.div>
                )}

                {updates.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Journey so far</h3>
                    <div className="space-y-3">
                      {updates.map((u) => (
                        <div key={u.id} className="rounded-2xl border border-white/8 bg-stone-900/40 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="rounded-full bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">Update #{u.updateNumber}</span>
                            {u.hoursInvested && <span className="text-[10px] text-stone-500">{u.hoursInvested}h invested</span>}
                            <span className="ml-auto text-[10px] text-stone-600">{new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          </div>
                          {u.imageUrl && <img src={u.imageUrl} alt="" className="w-full rounded-xl object-cover max-h-40 mb-2" />}
                          {u.caption && <p className="text-sm text-stone-300">{u.caption}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create pledge sheet */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div className="fixed inset-0 z-[62] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[63] rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-amber-100">Make a Pledge</h2>
                <button onClick={() => setShowCreate(false)} className="rounded-full bg-stone-800 p-2 text-stone-400"><X size={14} /></button>
              </div>
              <p className="text-xs text-stone-500 mb-4">Commit to posting the full journey of a piece — from start to finish. Followers get notified at every update.</p>
              <div className="space-y-3">
                <input
                  value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="What are you making? * (e.g. 100-bowl challenge)"
                  className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                />
                <textarea
                  value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the journey (optional)"
                  rows={2}
                  className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 resize-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={createForm.intervalLabel} onChange={(e) => setCreateForm((f) => ({ ...f, intervalLabel: e.target.value }))}
                    placeholder="Update interval (e.g. every week)"
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                  />
                  <input
                    value={createForm.targetPostCount} onChange={(e) => setCreateForm((f) => ({ ...f, targetPostCount: e.target.value }))}
                    placeholder="# of updates planned"
                    type="number" min={1}
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowCreate(false)} className="flex-1 rounded-full border border-white/10 py-3 text-sm text-stone-400">Cancel</button>
                <button onClick={createPledge} className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950">
                  Make Pledge
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
