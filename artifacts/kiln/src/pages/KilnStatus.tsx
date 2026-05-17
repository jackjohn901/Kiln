import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Flame, Clock, Box, CheckCircle, X, Plus, Thermometer, Wind } from "lucide-react";
import Nav from "@/components/Nav";
import {
  SEED_KILN_STATUSES, getUserKilnStatus, saveUserKilnStatus,
  getFiringProgress, getFiringETA, getHoursAgo,
  type KilnFiringStatus,
} from "@/data/kilnStatuses";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";

const CONE_OPTIONS = [
  "Cone 06 (Electric, 1828°F)",
  "Cone 6 (Mid-fire, 2232°F)",
  "Cone 10 Oxidation (2345°F)",
  "Cone 10 Reduction (2345°F)",
  "Cone 13 Anagama (2455°F)",
  "Raku (1830°F)",
  "Flameworked glass",
  "Metal / Forge (2200°F+)",
  "Torch / Studio",
  "Custom",
];

const FUEL_OPTIONS = ["Electric", "Gas", "Wood / Anagama", "Propane torch", "Oxygen-propane torch", "Coal", "Mixed"];

function extractTargetTemp(cone: string): number | null {
  const match = cone.match(/(\d{3,4})°F/);
  return match ? parseInt(match[1]!) : null;
}

function getLiveTemp(cone: string, progress: number): string {
  const targetTemp = extractTargetTemp(cone);
  if (!targetTemp) return "";
  if (progress >= 100) return `Peaked at ${targetTemp.toLocaleString()}°F`;
  const factor = Math.pow(Math.min(progress, 100) / 100, 0.58);
  const liveTemp = Math.round(72 + (targetTemp - 72) * factor);
  return `~${liveTemp.toLocaleString()}°F`;
}

function FiringCard({ status, isMine = false, onClear }: {
  status: KilnFiringStatus; isMine?: boolean; onClear?: () => void;
}) {
  const [progress, setProgress] = useState(getFiringProgress(status));
  const [eta, setEta] = useState(getFiringETA(status));

  useEffect(() => {
    const iv = setInterval(() => {
      setProgress(getFiringProgress(status));
      setEta(getFiringETA(status));
    }, 8_000);
    return () => clearInterval(iv);
  }, [status]);

  const hoursAgo = getHoursAgo(status.startedAt);
  const isComplete = progress >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 ${
        isMine
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-white/8 bg-stone-900/60"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
          isComplete ? "border-emerald-500/40 bg-emerald-500/15" : "border-amber-500/30 bg-amber-500/10"
        }`}>
          {isComplete
            ? <CheckCircle size={18} className="text-emerald-400" />
            : <Flame size={18} className={`text-amber-400 ${!isMine ? "animate-pulse" : ""}`} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {!isMine && (
                <Link href={`/artists/${status.artistId}`}>
                  <p className="text-sm font-semibold text-amber-100 hover:text-amber-300 transition-colors cursor-pointer">
                    {status.artistName}
                  </p>
                </Link>
              )}
              {isMine && <p className="text-sm font-semibold text-amber-200">Your firing</p>}
              <p className="text-xs text-stone-500 mt-0.5">{status.cone}</p>
            </div>
            {isMine && onClear && (
              <button
                onClick={onClear}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-stone-500 mb-1.5">
          <span className="flex items-center gap-1"><Clock size={9} /> {hoursAgo.toFixed(1)}h ago</span>
          <span className={isComplete ? "text-emerald-400 font-semibold" : "text-amber-400"}>{eta}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-stone-800 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isComplete ? "bg-emerald-500" : "bg-gradient-to-r from-amber-600 to-amber-400"}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        {getLiveTemp(status.cone, progress) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Thermometer size={10} className={isComplete ? "text-stone-500" : "text-amber-400"} />
            <span className={`text-xs font-semibold ${isComplete ? "text-stone-500" : "text-amber-300"}`}>
              {getLiveTemp(status.cone, progress)}
            </span>
            <span className="text-[9px] text-stone-700">{isComplete ? "cooled" : "est. live temp"}</span>
            {!isComplete && <span className="ml-auto text-[9px] text-stone-700">{progress}% complete</span>}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="flex items-center gap-1 rounded-full bg-stone-800 px-2.5 py-1 text-stone-400">
          <Wind size={9} className="text-amber-400/70" /> {status.fuel}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-stone-800 px-2.5 py-1 text-stone-400">
          <Box size={9} className="text-amber-400/70" /> {status.pieces} pieces
        </span>
        {status.notes && (
          <span className="text-stone-500 italic line-clamp-1 flex-1 min-w-0">"{status.notes}"</span>
        )}
      </div>
    </motion.div>
  );
}

interface ApiFiring {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  kilnName: string;
  cone: string;
  fuel: string;
  notes: string;
  isPublic: boolean;
  startedAt: string;
  estimatedHours: number;
  completedAt: string | null;
  clearedAt: string | null;
}

function apiFiringToStatus(f: ApiFiring): KilnFiringStatus {
  return {
    artistId: f.userId,
    artistName: f.userName,
    avatarUrl: f.userAvatarUrl ?? "",
    cone: f.cone,
    fuel: f.fuel,
    pieces: 0,
    notes: f.notes || undefined,
    startedAt: f.startedAt,
    estimatedHours: f.estimatedHours,
  };
}

export default function KilnStatus() {
  const { following } = useSocial();
  const { profile } = useProfile();
  const [myStatus, setMyStatus] = useState<KilnFiringStatus | null>(() => getUserKilnStatus());
  const [myFiringId, setMyFiringId] = useState<string | null>(null);
  const [apiFirings, setApiFirings] = useState<ApiFiring[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [cone, setCone] = useState(CONE_OPTIONS[1]!);
  const [fuel, setFuel] = useState("Electric");
  const [pieces, setPieces] = useState(12);
  const [notes, setNotes] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(8);

  useEffect(() => {
    fetch("/api/kiln-firings", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ community: ApiFiring[]; mine: ApiFiring[] }> : null)
      .then(data => {
        if (!data) return;
        setApiFirings(data.community);
        if (data.mine.length > 0) {
          const latest = data.mine[0]!;
          setMyFiringId(latest.id);
          setMyStatus(apiFiringToStatus(latest));
          saveUserKilnStatus(apiFiringToStatus(latest));
        }
      })
      .catch(() => {});
  }, []);

  const apiIds = new Set(apiFirings.map(f => f.userId));
  const followedFirings = [
    ...apiFirings.filter(f => following.includes(f.userId)).map(apiFiringToStatus),
    ...SEED_KILN_STATUSES.filter(s => following.includes(s.artistId) && !apiIds.has(s.artistId)),
  ];
  const otherFirings = [
    ...apiFirings.filter(f => !following.includes(f.userId) && f.userId !== (profile?.id ?? "")).map(apiFiringToStatus),
    ...SEED_KILN_STATUSES.filter(s => !following.includes(s.artistId) && !apiIds.has(s.artistId)),
  ];

  async function startFiring() {
    const status: KilnFiringStatus = {
      artistId: profile?.id ?? "__current_user__",
      artistName: profile?.name ?? "You",
      avatarUrl: profile?.avatarUrl ?? "",
      cone, fuel, pieces,
      notes: notes.trim() || undefined,
      startedAt: new Date().toISOString(),
      estimatedHours,
    };
    saveUserKilnStatus(status);
    setMyStatus(status);
    setShowForm(false);
    try {
      const res = await fetch("/api/kiln-firings", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cone, fuel, notes: notes.trim(), estimatedHours, kilnName: "Studio Kiln" }),
      });
      if (res.ok) {
        const saved = await res.json() as ApiFiring;
        setMyFiringId(saved.id);
      }
    } catch { /* optimistic */ }
  }

  async function clearStatus() {
    saveUserKilnStatus(null);
    setMyStatus(null);
    if (myFiringId) {
      fetch(`/api/kiln-firings/${myFiringId}`, { method: "DELETE", credentials: "include" }).catch(() => {});
      setMyFiringId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/creator-home">
            <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
              <ChevronLeft size={16} />
            </button>
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100 flex items-center gap-2">
              <Flame size={20} className="text-amber-500" />
              In the Kiln
            </h1>
            <p className="text-xs text-stone-500">Active firings from artists you follow</p>
          </div>
        </div>

        {/* My status */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">Your Firing</h2>
            {!myStatus && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors"
              >
                <Plus size={12} /> Start firing
              </button>
            )}
          </div>

          {myStatus && (
            <FiringCard status={myStatus} isMine onClear={clearStatus} />
          )}

          <AnimatePresence>
            {showForm && !myStatus && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
                    <Thermometer size={14} className="text-amber-400" /> New firing
                  </h3>
                  <button onClick={() => setShowForm(false)} className="text-stone-600 hover:text-stone-400 transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-400 block mb-1.5">Cone / Temperature</label>
                  <select
                    value={cone}
                    onChange={(e) => setCone(e.target.value)}
                    className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2.5 text-sm text-stone-200 outline-none focus:border-amber-500/50"
                  >
                    {CONE_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-400 block mb-1.5">Fuel type</label>
                  <div className="flex flex-wrap gap-2">
                    {FUEL_OPTIONS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFuel(f)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                          fuel === f ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-white/10 text-stone-500 hover:border-white/20"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-stone-400 block mb-1.5">Pieces in kiln</label>
                    <input
                      type="number"
                      min={1}
                      value={pieces}
                      onChange={(e) => setPieces(Number(e.target.value))}
                      className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2.5 text-sm text-stone-200 outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-400 block mb-1.5">Est. hours</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(Number(e.target.value))}
                      className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2.5 text-sm text-stone-200 outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-400 block mb-1.5">Notes for followers (optional)</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. New iron-red glaze test. Reduction at 8pm."
                    className="w-full rounded-xl bg-stone-800 border border-white/10 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 outline-none focus:border-amber-500/50"
                  />
                </div>

                <button
                  onClick={startFiring}
                  className="w-full rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Flame size={15} /> Light the kiln
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!myStatus && !showForm && (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
              <Flame size={24} className="mx-auto mb-2 text-stone-700" />
              <p className="text-sm text-stone-500">No active firing</p>
              <p className="text-xs text-stone-700 mt-0.5">Start a firing to let your followers know what's in the kiln</p>
            </div>
          )}
        </div>

        {/* Followed artists */}
        {followedFirings.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">🔥 Artists you follow — firing now</h2>
            <div className="space-y-3">
              {followedFirings.map((s) => <FiringCard key={s.artistId} status={s} />)}
            </div>
          </div>
        )}

        {/* Community firings */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Community — active firings</h2>
          <div className="space-y-3">
            {(followedFirings.length > 0 ? otherFirings : SEED_KILN_STATUSES).map((s) => (
              <FiringCard key={s.artistId} status={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
