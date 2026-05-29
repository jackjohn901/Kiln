import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Plus, Target, Play, Square } from "lucide-react";

interface HourLog {
  id: string;
  date: string;
  hours: number;
  minutes: number;
  technique: string;
  note: string;
}

interface WeeklyGoal {
  hoursPerWeek: number;
  startedAt: string;
}

interface CraftHoursState {
  logs: HourLog[];
  goal: WeeklyGoal;
  longestStreak: number;
  totalHours: number;
}

const STORAGE_KEY = "kiln_craft_hours_v1";

const DEFAULT_GOAL: WeeklyGoal = { hoursPerWeek: 15, startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() };

const EMPTY_STATE: CraftHoursState = {
  goal: DEFAULT_GOAL,
  longestStreak: 0,
  totalHours: 0,
  logs: [],
};

const TECHNIQUES = ["Glass Blowing", "Flameworking", "Kiln Forming", "Cold Working", "Ceramics", "Raku", "Porcelain", "Wood-Fired", "Metal Forging", "Bronze Casting", "Blacksmithing", "Enamel", "Fiber Arts", "Textile", "Design / Sketching", "Teaching", "Studio Admin"];

function readState(): CraftHoursState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as CraftHoursState;
    return { ...EMPTY_STATE, ...parsed };
  } catch { return EMPTY_STATE; }
}

function saveState(s: CraftHoursState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

function hoursThisWeek(logs: HourLog[]): number {
  const weekStart = getWeekStart();
  return logs.filter(l => l.date >= weekStart).reduce((s, l) => s + l.hours + l.minutes / 60, 0);
}

function formatHours(decimal: number): string {
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

function Ring({ progress, size = 100, stroke = 8, color = "#f59e0b" }: { progress: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(progress, 1) * circ);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
}

export default function CraftHours() {
  const [state, setState] = useState<CraftHoursState>(readState);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [logForm, setLogForm] = useState({ hours: "", minutes: "0", technique: "Glass Blowing", note: "" });
  const [goalInput, setGoalInput] = useState(state.goal.hoursPerWeek.toString());
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerTechnique, setTimerTechnique] = useState("Glass Blowing");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from API on mount
  useEffect(() => {
    fetch("/api/craft-hours", { credentials: "include" })
      .then(r => r.ok ? r.json() as Promise<{ logs: HourLog[]; goal: { hoursPerWeek: number; startedAt: string } | null }> : null)
      .then(data => {
        if (!data) return;
        const logs = data.logs;
        const goal = data.goal ?? DEFAULT_GOAL;
        setState({ logs, goal, longestStreak: 0, totalHours: 0 });
        setGoalInput(goal.hoursPerWeek.toString());
        setApiLoaded(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  function formatTimer(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function stopTimer() {
    setTimerRunning(false);
    const h = Math.floor(timerSeconds / 3600);
    const m = Math.round((timerSeconds % 3600) / 60);
    setLogForm({ hours: h > 0 ? h.toString() : "0", minutes: m.toString(), technique: timerTechnique, note: "" });
    setTimerSeconds(0);
    setShowLog(true);
  }

  // Persist to localStorage as backup when not authed
  useEffect(() => { if (!apiLoaded) saveState(state); }, [state, apiLoaded]);

  const thisWeek = hoursThisWeek(state.logs);
  const totalHours = state.logs.reduce((s, l) => s + l.hours + l.minutes / 60, 0);
  const progress = thisWeek / state.goal.hoursPerWeek;
  const goalMet = progress >= 1;

  async function addLog() {
    const h = parseInt(logForm.hours) || 0;
    const m = parseInt(logForm.minutes) || 0;
    if (!h && !m) return;
    const tempId = genId();
    const log: HourLog = {
      id: tempId,
      date: new Date().toISOString().slice(0, 10),
      hours: h, minutes: m,
      technique: logForm.technique,
      note: logForm.note,
    };
    setState(prev => ({ ...prev, logs: [log, ...prev.logs], totalHours: prev.totalHours + h + m / 60 }));
    setLogForm({ hours: "", minutes: "0", technique: "Glass Blowing", note: "" });
    setShowLog(false);
    try {
      const res = await fetch("/api/craft-hours/logs", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: log.date, hours: h, minutes: m, technique: log.technique, note: log.note }),
      });
      if (res.ok) {
        const saved = await res.json() as HourLog;
        setState(prev => ({ ...prev, logs: prev.logs.map(l => l.id === tempId ? saved : l) }));
      }
    } catch { /* optimistic */ }
  }

  async function updateGoal() {
    const h = parseInt(goalInput) || 10;
    setState(prev => ({ ...prev, goal: { hoursPerWeek: h, startedAt: prev.goal.startedAt } }));
    setShowGoal(false);
    fetch("/api/craft-hours/goal", {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hoursPerWeek: h }),
    }).catch(() => {});
  }

  async function deleteLog(id: string) {
    setState(prev => ({ ...prev, logs: prev.logs.filter(l => l.id !== id) }));
    fetch(`/api/craft-hours/logs/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  }

  const recentLogs = state.logs.slice(0, 10);

  return (
    <div className="min-h-screen bg-[#12100e] pb-32 pt-2">
      <div className="mx-auto max-w-lg px-4">
        <div className="pt-10 pb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Timer size={20} className="text-amber-400" />
              <h1 className="text-2xl font-bold text-amber-100">Craft Hours</h1>
            </div>
            <p className="text-xs text-stone-500">Verified studio time — the only status that matters.</p>
          </div>
          <button onClick={() => setShowLog(true)} className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-2 text-xs font-semibold text-stone-950">
            <Plus size={13} /> Log
          </button>
        </div>

        {/* Live Session Timer */}
        <div className="mb-5 rounded-3xl bg-stone-900/60 border border-white/8 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-3">Live Session</p>
          <div className="flex items-center justify-between">
            <p className="text-4xl font-black font-mono text-amber-100 tabular-nums tracking-tight">{formatTimer(timerSeconds)}</p>
            {timerRunning ? (
              <button onClick={stopTimer} className="flex items-center gap-2 rounded-2xl bg-rose-500/20 border border-rose-500/30 px-4 py-2.5 text-sm font-bold text-rose-400 hover:bg-rose-500/30 transition-colors">
                <Square size={13} fill="currentColor" /> Stop & Log
              </button>
            ) : (
              <button onClick={() => setTimerRunning(true)} className="flex items-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 text-sm font-bold text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                <Play size={13} fill="currentColor" /> Start Session
              </button>
            )}
          </div>
          {timerRunning ? (
            <div className="mt-4">
              <p className="text-[10px] text-stone-500 mb-2">Technique</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {["Glass Blowing", "Flameworking", "Ceramics", "Raku", "Metal Forging", "Fiber Arts", "Design / Sketching"].map(t => (
                  <button key={t} onClick={() => setTimerTechnique(t)}
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold whitespace-nowrap transition-colors ${timerTechnique === t ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/10 text-stone-500"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-stone-600">Start a timer to automatically log your studio session when done.</p>
          )}
        </div>

        {/* Weekly ring */}
        <div className="mb-6 rounded-3xl bg-stone-900/60 border border-white/8 p-6 flex items-center gap-6">
          <div className="relative shrink-0">
            <Ring progress={progress} size={110} stroke={10} color={goalMet ? "#34d399" : "#f59e0b"} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-amber-100">{formatHours(thisWeek)}</span>
              <span className="text-[10px] text-stone-500">this week</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Target size={13} className={goalMet ? "text-emerald-400" : "text-amber-400"} />
              <span className={`text-sm font-bold ${goalMet ? "text-emerald-400" : "text-amber-100"}`}>
                {goalMet ? "Goal achieved! 🎉" : `${formatHours(Math.max(0, state.goal.hoursPerWeek - thisWeek))} to goal`}
              </span>
            </div>
            <p className="text-xs text-stone-500 mb-3">Weekly goal: <span className="text-stone-300">{state.goal.hoursPerWeek}h</span></p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-stone-800/60 p-2.5 text-center">
                <p className="text-base font-black text-amber-100">{formatHours(totalHours)}</p>
                <p className="text-[9px] text-stone-500">all time</p>
              </div>
              <div className="rounded-xl bg-stone-800/60 p-2.5 text-center">
                <p className="text-base font-black text-amber-100">{state.logs.length}</p>
                <p className="text-[9px] text-stone-500">sessions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Technique breakdown */}
        {state.logs.length > 0 && (() => {
          const breakdown: Record<string, number> = {};
          state.logs.forEach(l => { breakdown[l.technique] = (breakdown[l.technique] ?? 0) + l.hours + l.minutes / 60; });
          const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);
          const max = sorted[0]?.[1] ?? 1;
          return (
            <div className="mb-6 rounded-2xl border border-white/8 bg-stone-900/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Time by Technique</p>
              <div className="space-y-2.5">
                {sorted.map(([tech, hrs]) => (
                  <div key={tech}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-stone-300">{tech}</span>
                      <span className="text-xs text-amber-400 font-semibold">{formatHours(hrs)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-800">
                      <motion.div className="h-full rounded-full bg-amber-500" initial={{ width: 0 }} animate={{ width: `${(hrs / max) * 100}%` }} transition={{ duration: 0.5 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Recent logs */}
        {recentLogs.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Your Log</p>
            <div className="space-y-2">
              {recentLogs.map(log => (
                <div key={log.id} className="rounded-2xl border border-white/8 bg-stone-900/60 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-amber-100">{log.technique}</span>
                    <span className="text-xs font-bold text-amber-400">{formatHours(log.hours + log.minutes / 60)}</span>
                  </div>
                  {log.note && <p className="text-xs text-stone-400 leading-relaxed">{log.note}</p>}
                  <p className="text-[10px] text-stone-600 mt-1">{new Date(log.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-stone-900/30 p-6 text-center">
            <Timer size={22} className="mx-auto mb-2 text-stone-600" />
            <p className="text-sm font-semibold text-stone-300">No studio time logged yet</p>
            <p className="mt-1 text-xs text-stone-500">Start a live session or tap “Log” to record your first studio hours.</p>
          </div>
        )}

        {/* Change goal */}
        <button onClick={() => setShowGoal(true)} className="mt-6 w-full rounded-full border border-white/10 py-3 text-xs text-stone-500 hover:text-stone-300 transition-colors flex items-center justify-center gap-2">
          <Target size={12} /> Change weekly goal (currently {state.goal.hoursPerWeek}h)
        </button>
      </div>

      {/* Log sheet */}
      <AnimatePresence>
        {showLog && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLog(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <h2 className="text-lg font-bold text-amber-100 mb-4">Log Studio Time</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-500 mb-1.5 block">Hours</label>
                    <input type="number" min="0" max="24" value={logForm.hours} onChange={e => setLogForm(f => ({ ...f, hours: e.target.value }))} placeholder="0"
                      className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1.5 block">Minutes</label>
                    <select value={logForm.minutes} onChange={e => setLogForm(f => ({ ...f, minutes: e.target.value }))}
                      className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 focus:outline-none focus:border-amber-500/40">
                      {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m}m</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Technique</label>
                  <select value={logForm.technique} onChange={e => setLogForm(f => ({ ...f, technique: e.target.value }))}
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 focus:outline-none focus:border-amber-500/40">
                    {TECHNIQUES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <textarea value={logForm.note} onChange={e => setLogForm(f => ({ ...f, note: e.target.value }))} placeholder="What were you working on? (optional)" rows={2}
                  className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 resize-none" />
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowLog(false)} className="flex-1 rounded-full border border-white/10 py-3 text-sm text-stone-400">Cancel</button>
                <button onClick={addLog} className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950">Log Hours</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Goal sheet */}
      <AnimatePresence>
        {showGoal && (
          <>
            <motion.div className="fixed inset-0 z-[62] bg-black/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGoal(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[63] rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <h2 className="text-lg font-bold text-amber-100 mb-2">Set Weekly Goal</h2>
              <p className="text-xs text-stone-500 mb-5">How many hours do you want to spend in the studio each week?</p>
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setGoalInput(v => Math.max(1, parseInt(v) - 1).toString())} className="h-12 w-12 rounded-full bg-stone-800 border border-white/10 text-xl text-amber-100 hover:bg-stone-700">−</button>
                <div className="flex-1 text-center">
                  <span className="text-5xl font-black text-amber-100">{goalInput}</span>
                  <span className="text-lg text-stone-500 ml-2">hours</span>
                </div>
                <button onClick={() => setGoalInput(v => Math.min(80, parseInt(v) + 1).toString())} className="h-12 w-12 rounded-full bg-stone-800 border border-white/10 text-xl text-amber-100 hover:bg-stone-700">+</button>
              </div>
              <div className="flex gap-2 mb-5">
                {[5, 10, 15, 20, 30, 40].map(h => (
                  <button key={h} onClick={() => setGoalInput(h.toString())} className={`flex-1 rounded-full border py-2 text-xs font-semibold transition-colors ${parseInt(goalInput) === h ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/10 text-stone-500"}`}>{h}h</button>
                ))}
              </div>
              <button onClick={updateGoal} className="w-full rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950">Set Goal</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
