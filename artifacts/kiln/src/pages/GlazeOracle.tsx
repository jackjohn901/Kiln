import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Send, Bot, User, Plus, Bookmark, Trash2, ChevronRight, Sparkles, FlaskConical, Copy, Check, Camera, X } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface SavedFormula {
  id: string;
  name: string;
  content: string;
  savedAt: string;
  contributorName: string;
}

const STORAGE_KEY = "kiln_glaze_oracle_v1";
const FORMULAS_KEY = "kiln_glaze_formulas_v1";

const STARTER_PROMPTS = [
  "I want a matte, iron-rust surface with flashing in reduction. What glaze do you recommend?",
  "Give me a reliable cone 6 glossy white base glaze recipe.",
  "What creates the oil-spot effect in tenmoku glazes?",
  "How do I get a celadon that stays stable in cone 10 reduction?",
  "What's a good starting recipe for a wood-fired ash glaze?",
  "I want a satin white with blue-purple breaks — how do I get there?",
];

const SEED_FORMULAS: SavedFormula[] = [
  {
    id: "f-001",
    name: "Maya's Reduction Celadon",
    content: `**Cone 10 Reduction Celadon**\nContributed by @maya-chen\n\n- Custer Feldspar: 25%\n- Silica 325: 27%\n- Whiting: 20%\n- EPK Kaolin: 15%\n- Dolomite: 8%\n- Talc: 5%\n\n**Colorant:** Add 1.5% iron oxide for classic jade celadon, 2% for deeper green.\n\n**Notes:** Fire to cone 10 in heavy reduction from cone 08 through cone 10. Slow cool for best results. This glaze pools beautifully in texture.`,
    savedAt: "2026-04-10T09:00:00Z",
    contributorName: "Maya Chen",
  },
  {
    id: "f-002",
    name: "Community Shino Base",
    content: `**Cone 10 Reduction Shino**\nCommunity verified recipe\n\n- Nepheline Syenite: 75%\n- EPK Kaolin: 20%\n- Soda Ash: 5%\n\n**Carbon trapping colorant:** Add 5–8% red iron oxide for toasty orange-brown tones, or leave uncolored for classic orange-white Shino with carbon flashing.\n\n**Notes:** Apply thick (3–4mm). Fast cooling creates more glassy surface; slow cool gives more matte. Best in anagama or noborigama with natural ash deposit.`,
    savedAt: "2026-03-22T14:00:00Z",
    contributorName: "Community",
  },
];

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

function readFormulas(): SavedFormula[] {
  try {
    const raw = localStorage.getItem(FORMULAS_KEY);
    return raw ? JSON.parse(raw) : SEED_FORMULAS;
  } catch { return SEED_FORMULAS; }
}

function saveFormulas(f: SavedFormula[]) {
  try { localStorage.setItem(FORMULAS_KEY, JSON.stringify(f)); } catch {}
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        const bold = line.replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong class="text-amber-300 font-semibold">${m}</strong>`);
        const withCode = bold.replace(/`(.+?)`/g, (_, m) => `<code class="bg-stone-800 rounded px-1 text-emerald-300 text-xs">${m}</code>`);
        if (line.startsWith("- ")) {
          return <div key={i} className="flex gap-2 text-sm text-stone-300"><span className="text-amber-500 shrink-0">·</span><span dangerouslySetInnerHTML={{ __html: withCode.slice(2) }} /></div>;
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-bold text-amber-300 text-sm" dangerouslySetInnerHTML={{ __html: bold }} />;
        }
        return <p key={i} className="text-sm text-stone-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: withCode }} />;
      })}
    </div>
  );
}

export default function GlazeOracle() {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"chat" | "formulas">("chat");
  const [formulas, setFormulas] = useState<SavedFormula[]>(readFormulas);
  const [copied, setCopied] = useState<string | null>(null);
  const [savePrompt, setSavePrompt] = useState<{ content: string } | null>(null);
  const [saveName, setSaveName] = useState("");
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [analyzeForm, setAnalyzeForm] = useState({ imageUrl: "", cone: "Cone 10 Reduction", colors: "", surface: "", issues: "" });
  const bottomRef = useRef<HTMLDivElement>(null);

  const CONES = ["Cone 06 (earthenware)", "Cone 6 (mid-fire)", "Cone 10 Reduction", "Cone 10 Oxidation", "Cone 10-12 Wood-fired", "Cone 12+"];

  function submitAnalysis() {
    const parts = [
      "Please analyze this fired glaze result:",
      analyzeForm.imageUrl && `Photo reference: ${analyzeForm.imageUrl}`,
      `Firing: ${analyzeForm.cone}`,
      analyzeForm.colors && `Appearance/color: ${analyzeForm.colors}`,
      analyzeForm.surface && `Surface texture: ${analyzeForm.surface}`,
      analyzeForm.issues && `Issues observed: ${analyzeForm.issues}`,
      "Please diagnose what caused this result, and what adjustments would produce different outcomes.",
    ].filter(Boolean).join("\n");
    setShowAnalyze(false);
    setAnalyzeForm({ imageUrl: "", cone: "Cone 10 Reduction", colors: "", surface: "", issues: "" });
    send(parts);
  }

  useEffect(() => { saveFormulas(formulas); }, [formulas]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(text?: string) {
    const userText = text ?? input.trim();
    if (!userText || loading) return;
    setInput("");
    const userMsg: Message = { id: genId(), role: "user", content: userText, createdAt: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/glaze-oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json() as { reply: string };
      const assistantMsg: Message = { id: genId(), role: "assistant", content: data.reply, createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, { id: genId(), role: "assistant", content: "The Oracle is temporarily unavailable. Please try again in a moment.", createdAt: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function saveFormula(content: string) {
    if (!saveName.trim()) return;
    const formula: SavedFormula = {
      id: genId(),
      name: saveName,
      content,
      savedAt: new Date().toISOString(),
      contributorName: profile?.name ?? "You",
    };
    setFormulas(prev => [formula, ...prev]);
    setSavePrompt(null);
    setSaveName("");
  }

  function deleteFormula(id: string) {
    setFormulas(prev => prev.filter(f => f.id !== id));
  }

  return (
    <div className="min-h-screen bg-[#12100e] flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 pt-10 pb-3 border-b border-white/8">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical size={20} className="text-amber-400" />
          <h1 className="text-xl font-bold text-amber-100">Glaze Oracle</h1>
          <span className="ml-auto rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">AI · Community</span>
        </div>
        <p className="text-[11px] text-stone-500">Ask about glaze chemistry, recipes, firing schedules, and material science.</p>
        <div className="flex gap-1 mt-3 rounded-xl bg-stone-900 border border-white/8 p-1">
          {(["chat", "formulas"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all ${tab === t ? "bg-amber-500 text-stone-950" : "text-stone-500"}`}>
              {t === "chat" ? "Oracle Chat" : `Saved Formulas (${formulas.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === "chat" && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-48 space-y-4">
            {messages.length === 0 && (
              <div className="pt-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                    <FlaskConical size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-100">The Glaze Oracle</p>
                    <p className="text-xs text-stone-500">Master glaze chemist · Community knowledge</p>
                  </div>
                </div>
                <p className="text-sm text-stone-400 mb-5 leading-relaxed">Ask me anything about glaze chemistry, firing schedules, material substitutions, or specific effects you're trying to achieve. I'll give you actual recipes with real percentages — not vague advice.</p>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-600 mb-2">Try asking:</p>
                  {STARTER_PROMPTS.map((p, i) => (
                    <button key={i} onClick={() => send(p)} className="w-full text-left rounded-2xl border border-white/8 bg-stone-900/60 px-4 py-3 text-xs text-stone-400 hover:border-amber-500/20 hover:text-stone-200 transition-colors">
                      {p}
                    </button>
                  ))}
                </div>

                <button onClick={() => setShowAnalyze(true)} className="mt-3 w-full flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 hover:border-amber-500/35 hover:bg-amber-500/8 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Camera size={15} className="text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-amber-200">Analyze a Fired Result</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">Describe your fired piece → get expert AI diagnosis</p>
                  </div>
                </button>
              </div>
            )}

            {messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center border text-xs font-bold ${msg.role === "assistant" ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : "bg-stone-800 border-white/10 text-stone-300"}`}>
                  {msg.role === "assistant" ? <FlaskConical size={14} /> : (profile?.name?.[0] ?? "Y")}
                </div>
                <div className={`flex-1 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`rounded-2xl px-4 py-3 ${msg.role === "assistant" ? "bg-stone-900/80 border border-white/8" : "bg-amber-500/15 border border-amber-500/20"}`}>
                    {msg.role === "assistant" ? <MarkdownText text={msg.content} /> : <p className="text-sm text-amber-100">{msg.content}</p>}
                  </div>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mt-1.5 px-1">
                      <button onClick={() => copyText(msg.content, msg.id)} className="flex items-center gap-1 text-[10px] text-stone-600 hover:text-stone-400 transition-colors">
                        {copied === msg.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        {copied === msg.id ? "Copied" : "Copy"}
                      </button>
                      <button onClick={() => { setSavePrompt({ content: msg.content }); setTab("chat"); }} className="flex items-center gap-1 text-[10px] text-stone-600 hover:text-amber-400 transition-colors">
                        <Bookmark size={10} /> Save formula
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                  <FlaskConical size={14} className="text-amber-400" />
                </div>
                <div className="rounded-2xl bg-stone-900/80 border border-white/8 px-4 py-3 flex items-center gap-2">
                  {[0, 0.2, 0.4].map(d => (
                    <motion.div key={d} className="h-1.5 w-1.5 rounded-full bg-amber-500"
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, delay: d, repeat: Infinity }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="fixed bottom-20 left-0 right-0 px-4 pb-2">
            <div className="flex gap-2 rounded-2xl bg-stone-900/95 border border-white/10 backdrop-blur-md p-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask about glazes, recipes, firing schedules…"
                className="flex-1 bg-transparent px-2 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none" />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-stone-950 disabled:opacity-40 transition-opacity shrink-0">
                <Send size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "formulas" && (
        <div className="flex-1 overflow-y-auto px-4 py-5 pb-32">
          <p className="text-xs text-stone-500 mb-4">Community-contributed and personally saved glaze formulas. Every recipe is attributed to its source.</p>
          {formulas.length === 0 && (
            <div className="py-12 text-center">
              <FlaskConical size={28} className="text-stone-700 mx-auto mb-3" />
              <p className="text-stone-500 text-sm">No saved formulas yet</p>
              <p className="text-stone-600 text-xs mt-1">Save formulas from your Oracle conversations to build your personal library.</p>
            </div>
          )}
          <div className="space-y-3">
            {formulas.map(formula => (
              <div key={formula.id} className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-amber-100 text-sm">{formula.name}</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">by <span className="text-stone-400">{formula.contributorName}</span> · {new Date(formula.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button onClick={() => copyText(formula.content, formula.id)} className={`p-1.5 rounded-lg transition-colors ${copied === formula.id ? "text-emerald-400" : "text-stone-600 hover:text-stone-300"}`}>
                        {copied === formula.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                      <button onClick={() => deleteFormula(formula.id)} className="p-1.5 rounded-lg text-stone-700 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <MarkdownText text={formula.content} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyze fired result modal */}
      <AnimatePresence>
        {showAnalyze && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAnalyze(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[61] max-h-[90vh] rounded-t-3xl bg-[#1a1714] border-t border-white/10 overflow-y-auto"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-amber-100">Analyze a Fired Result</h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">Get expert diagnosis from the Oracle</p>
                  </div>
                  <button onClick={() => setShowAnalyze(false)} className="rounded-full bg-stone-800 p-2 text-stone-400"><X size={14} /></button>
                </div>
                <div className="space-y-3">
                  <input value={analyzeForm.imageUrl} onChange={e => setAnalyzeForm(f => ({ ...f, imageUrl: e.target.value }))}
                    placeholder="Photo URL (optional — paste image link)"
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                  <div>
                    <p className="text-[10px] text-stone-500 mb-2">Firing temperature</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {CONES.map(c => (
                        <button key={c} onClick={() => setAnalyzeForm(f => ({ ...f, cone: c }))}
                          className={`rounded-full border px-3 py-1.5 text-[10px] font-medium whitespace-nowrap transition-colors ${analyzeForm.cone === c ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/10 text-stone-500"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input value={analyzeForm.colors} onChange={e => setAnalyzeForm(f => ({ ...f, colors: e.target.value }))}
                    placeholder="Colors & appearance (e.g. dark brown with iridescent sheen)"
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                  <input value={analyzeForm.surface} onChange={e => setAnalyzeForm(f => ({ ...f, surface: e.target.value }))}
                    placeholder="Surface texture (e.g. matte, crawled, pinholed)"
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40" />
                  <textarea value={analyzeForm.issues} onChange={e => setAnalyzeForm(f => ({ ...f, issues: e.target.value }))}
                    placeholder="Specific issues or questions…" rows={3}
                    className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 resize-none" />
                </div>
                <button onClick={submitAnalysis}
                  className="mt-4 w-full rounded-full bg-amber-500 py-3 text-sm font-bold text-stone-950">
                  Ask the Oracle →
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Save formula modal */}
      <AnimatePresence>
        {savePrompt && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSavePrompt(null)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl bg-[#1a1714] border-t border-white/10 p-6"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}>
              <h2 className="text-base font-bold text-amber-100 mb-4">Save Formula</h2>
              <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Formula name (e.g. Celadon Cone 10 Reduction)"
                className="w-full rounded-xl bg-stone-800/60 border border-white/10 px-4 py-3 text-sm text-amber-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/40 mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setSavePrompt(null)} className="flex-1 rounded-full border border-white/10 py-3 text-sm text-stone-400">Cancel</button>
                <button onClick={() => saveFormula(savePrompt.content)} className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950">Save to Library</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
