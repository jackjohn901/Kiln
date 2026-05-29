import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Send, Users, Crown, Star, Mail, Check,
  Clock, Eye, ChevronDown, ChevronUp, Sparkles, X,
} from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

const STORAGE_KEY = "kiln_newsletters_v1";

interface SentNewsletter {
  id: string;
  subject: string;
  body: string;
  audience: string;
  sentAt: string;
  recipientCount: number;
  openRate: number;
}

function readSent(): SentNewsletter[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function writeSent(items: SentNewsletter[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}


type Audience = "all" | "patrons" | "supporters" | "followers";

const AUDIENCE_OPTIONS: { key: Audience; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { key: "all", label: "All subscribers", desc: "Everyone who has subscribed or follows you", icon: Users, color: "text-stone-400" },
  { key: "patrons", label: "Patrons only", desc: "Your paid tier subscribers", icon: Crown, color: "text-amber-400" },
  { key: "supporters", label: "Supporters", desc: "Mid-tier and above", icon: Star, color: "text-yellow-400" },
  { key: "followers", label: "Followers", desc: "Everyone following your profile", icon: Users, color: "text-blue-400" },
];

const AI_TEMPLATES = [
  { label: "New work drop", text: "After weeks in the studio, I'm thrilled to share something new. {project description}. Available in the shop this {day} — limited pieces, first come first served." },
  { label: "Workshop announcement", text: "Exciting news — I'm opening registration for my upcoming {workshop name} workshop. Small group, hands-on, and designed for {skill level}. Details and booking in the link below." },
  { label: "Process update", text: "I wanted to take you behind the scenes of what I've been working on lately. {project details}. Here's a look at where things stand and what's coming next." },
  { label: "Studio news", text: "Some big changes happening in the studio this season. {news}. I couldn't wait to share it with you — you're always the first to know." },
];

export default function Newsletter() {
  const { profile } = useProfile();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<SentNewsletter[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendError, setSendError] = useState("");

  const canSend = subject.trim().length > 0 && body.trim().length > 10;
  const wordCount = body.split(/\s+/).filter(Boolean).length;

  // Load real sent newsletters from server
  useEffect(() => {
    fetch("/api/me/newsletters", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data?.newsletters) setHistory(data.newsletters);
      })
      .catch(() => {});
  }, []);

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setSendError("");
    try {
      const r = await fetch("/api/newsletters", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, audience }),
      });
      if (!r.ok) throw new Error("send failed");
      const data = await r.json();
      const newsletter: SentNewsletter = {
        id: data.id, subject: data.subject, body: data.body, audience: data.audience,
        sentAt: data.sentAt, recipientCount: data.recipientCount ?? 0, openRate: 0,
      };
      setHistory(prev => [newsletter, ...prev.filter(n => n.id !== newsletter.id)]);
      setSent(true);
      setSubject("");
      setBody("");
      setTimeout(() => setSent(false), 4000);
    } catch {
      setSendError("Couldn't send your newsletter. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function applyTemplate(text: string) {
    setBody(text);
    setShowTemplates(false);
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">

        <div className="mb-6 flex items-center gap-3">
          <Link href="/creator-home" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100 flex items-center gap-2">
              <Mail size={20} className="text-amber-400" /> Newsletter
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">Send an update to your subscribers</p>
          </div>
        </div>

        {/* Success banner */}
        <AnimatePresence>
          {sent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3"
            >
              <Check size={16} className="text-emerald-400" />
              <p className="text-sm text-emerald-300">Newsletter sent!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {sendError && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3">
            <X size={16} className="text-rose-400" />
            <p className="text-sm text-rose-300">{sendError}</p>
          </div>
        )}

        {/* Compose card */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden mb-4">
          {/* Audience selector */}
          <div className="border-b border-white/8 p-4">
            <p className="text-xs text-stone-500 mb-2 font-semibold uppercase tracking-wide">Send to</p>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCE_OPTIONS.map(({ key, label, desc, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => setAudience(key)}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                    audience === key
                      ? "border-amber-500/40 bg-amber-500/8"
                      : "border-white/8 bg-stone-900/40 hover:border-white/15"
                  }`}
                >
                  <Icon size={14} className={`${color} mt-0.5 shrink-0`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${audience === key ? "text-amber-200" : "text-stone-300"}`}>{label}</p>
                    <p className="text-[10px] text-stone-600 leading-snug">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="border-b border-white/8 px-5 py-3">
            <label className="text-xs text-stone-600 block mb-1">Subject line</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this update about?"
              maxLength={120}
              className="w-full bg-transparent text-sm text-stone-200 placeholder-stone-700 focus:outline-none"
            />
          </div>

          {/* Body */}
          <div className="px-5 py-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-stone-600">Message</label>
              <button
                onClick={() => setShowTemplates((v) => !v)}
                className="flex items-center gap-1 text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors"
              >
                <Sparkles size={10} /> Templates
              </button>
            </div>

            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-3"
                >
                  <div className="grid grid-cols-2 gap-1.5 pb-2">
                    {AI_TEMPLATES.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => applyTemplate(t.text)}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-left text-[10px] text-amber-400/80 hover:bg-amber-500/10 transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your update here. Be personal — your subscribers signed up because they love your work."
              rows={8}
              className="w-full bg-transparent text-sm text-stone-200 placeholder-stone-700 focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2 text-[10px] text-stone-700">
              <span>{wordCount} words</span>
              <span>{body.length}/2000</span>
            </div>
          </div>

          {/* Preview / Send */}
          <div className="border-t border-white/8 flex items-center gap-2 p-4">
            <button
              onClick={() => setPreviewing((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-stone-400 hover:border-white/20 hover:text-stone-200 transition-colors"
            >
              <Eye size={12} /> Preview
            </button>
            <div className="flex-1" />
            <button
              onClick={handleSend}
              disabled={!canSend || sending}
              className="flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-950 border-t-transparent" /> Sending…</>
              ) : (
                <><Send size={13} /> Send now</>
              )}
            </button>
          </div>
        </div>

        {/* Preview panel */}
        <AnimatePresence>
          {previewing && (subject || body) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-4 rounded-2xl border border-white/8 bg-stone-950/80 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Preview</p>
                <button onClick={() => setPreviewing(false)} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                  <X size={14} className="text-stone-600" />
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  {profile?.avatarUrl && <img src={profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover border border-white/10" />}
                  <div>
                    <p className="text-xs font-semibold text-stone-200">{profile?.name ?? "You"}</p>
                    <p className="text-[10px] text-stone-600">via Kiln</p>
                  </div>
                </div>
                {subject && <p className="text-base font-semibold text-amber-100 mb-3">{subject}</p>}
                <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-wrap">{body}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Past newsletters */}
        {history.length > 0 && (
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 overflow-hidden">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-stone-500" />
                <span className="text-sm font-semibold text-stone-300">Past newsletters</span>
                <span className="text-xs text-stone-600">({history.length})</span>
              </div>
              {showHistory ? <ChevronUp size={14} className="text-stone-600" /> : <ChevronDown size={14} className="text-stone-600" />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-white/8 divide-y divide-white/5">
                    {history.map((nl) => (
                      <div key={nl.id}>
                        <button
                          onClick={() => setExpandedId(expandedId === nl.id ? null : nl.id)}
                          className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-white/2 transition-colors"
                        >
                          <Mail size={13} className="text-stone-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-stone-200 truncate">{nl.subject}</p>
                            <p className="text-xs text-stone-600">
                              {new Date(nl.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{nl.recipientCount > 0 ? ` · ${nl.recipientCount.toLocaleString()} sent` : ""}
                              {nl.openRate > 0 && ` · ${nl.openRate}% opened`}
                            </p>
                          </div>
                          {expandedId === nl.id ? <ChevronUp size={12} className="text-stone-600 shrink-0" /> : <ChevronDown size={12} className="text-stone-600 shrink-0" />}
                        </button>
                        <AnimatePresence>
                          {expandedId === nl.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-4">
                                <p className="text-xs text-stone-500 leading-relaxed whitespace-pre-wrap">{nl.body}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
