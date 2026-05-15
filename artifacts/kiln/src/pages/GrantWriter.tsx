import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Sparkles, Copy, Check, RefreshCw, FileText, ChevronDown, ChevronUp, Download } from "lucide-react";
import Nav from "@/components/Nav";
import { generateDoc } from "@/data/grantTemplates";

type DocType = "artist_statement" | "project_narrative" | "bio" | "budget_justification" | "work_samples_desc";

interface GrantProfile {
  artistName: string;
  medium: string;
  yearsActive: string;
  location: string;
  grantName: string;
  grantAmount: string;
  projectTitle: string;
  projectDesc: string;
  communityImpact: string;
  awards: string;
  tone: "formal" | "conversational" | "academic";
}

const EMPTY: GrantProfile = {
  artistName: "", medium: "", yearsActive: "", location: "",
  grantName: "", grantAmount: "", projectTitle: "", projectDesc: "",
  communityImpact: "", awards: "", tone: "formal",
};

const DOC_TYPES: { key: DocType; label: string; desc: string }[] = [
  { key: "artist_statement", label: "Artist Statement", desc: "Who you are and why you make" },
  { key: "project_narrative", label: "Project Narrative", desc: "What you'll create and how" },
  { key: "bio", label: "Professional Bio", desc: "Third-person bio for the application" },
  { key: "budget_justification", label: "Budget Justification", desc: "How the funds will be used" },
  { key: "work_samples_desc", label: "Work Samples Description", desc: "Context for your portfolio pieces" },
];

function buildPrompt(profile: GrantProfile, docType: DocType): string {
  const toneMap = { formal: "formal and professional", conversational: "warm and accessible", academic: "scholarly and rigorous" };
  const tone = toneMap[profile.tone];

  const base = `You are a professional grant writer specializing in craft and fine art applications.
Artist: ${profile.artistName || "the artist"}
Medium: ${profile.medium || "craft"}
Years active: ${profile.yearsActive || "several years"}
Location: ${profile.location || "United States"}
Grant: ${profile.grantName || "the grant"} (${profile.grantAmount ? "$" + profile.grantAmount : "amount not specified"})
Project: ${profile.projectTitle || "the proposed project"}
Project description: ${profile.projectDesc || "not provided"}
Community impact: ${profile.communityImpact || "not specified"}
Awards/exhibitions: ${profile.awards || "not specified"}
Tone: ${tone}

Write ONLY the document text, no preamble, no labels, no markdown headers. Use paragraph breaks.`;

  if (docType === "artist_statement") return base + `\n\nWrite a compelling 250–350 word artist statement for this grant application.`;
  if (docType === "project_narrative") return base + `\n\nWrite a 300–450 word project narrative explaining the artistic goals, process, timeline, and significance.`;
  if (docType === "bio") return base + `\n\nWrite a 150–200 word third-person professional bio suitable for a grant application.`;
  if (docType === "budget_justification") return base + `\n\nWrite a 200–300 word budget justification explaining how the grant funds will be allocated and why each expense is necessary.`;
  if (docType === "work_samples_desc") return base + `\n\nWrite a 200–250 word description of the artist's body of work to accompany portfolio samples in a grant application.`;
  return base;
}

export default function GrantWriter() {
  const [profile, setProfile] = useState<GrantProfile>(EMPTY);
  const [selectedDoc, setSelectedDoc] = useState<DocType>("artist_statement");
  const [generated, setGenerated] = useState<Partial<Record<DocType, string>>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);

  const currentText = generated[selectedDoc] ?? "";

  async function generate(docType: DocType) {
    setLoading(true);
    setError("");
    setSelectedDoc(docType);
    setShowForm(false);
    // Generate locally using templates — simulated async delay for UX
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
    const text = generateDoc(profile, docType);
    setGenerated((prev) => ({ ...prev, [docType]: text }));
    setLoading(false);
  }

  useEffect(() => {
    if (currentText && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentText]);

  function copyText() {
    if (!currentText) return;
    navigator.clipboard.writeText(currentText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadAll() {
    const entries = Object.entries(generated) as [DocType, string][];
    if (entries.length === 0) return;
    const content = entries.map(([k, v]) => {
      const label = DOC_TYPES.find((d) => d.key === k)?.label ?? k;
      return `=== ${label} ===\n\n${v}`;
    }).join("\n\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.grantName || "grant"}-documents.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const F = ({ label, field, placeholder, textarea }: { label: string; field: keyof GrantProfile; placeholder?: string; textarea?: boolean }) => (
    <div>
      <label className="text-xs text-stone-500 mb-1 block">{label}</label>
      {textarea ? (
        <textarea
          value={profile[field] as string}
          onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none resize-none"
        />
      ) : (
        <input
          value={profile[field] as string}
          onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-stone-800/60 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-6">

        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-stone-500 hover:text-stone-300 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-amber-100 flex items-center gap-2">
              <Sparkles size={20} className="text-amber-400" /> Grant Writer
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">AI-powered grant documents for craft artists</p>
          </div>
          {Object.keys(generated).length > 0 && (
            <button
              onClick={downloadAll}
              className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-stone-400 hover:border-white/20 hover:text-stone-200 transition-colors"
            >
              <Download size={12} /> Export all
            </button>
          )}
        </div>

        {/* Profile form */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-amber-400" />
              <span className="text-sm font-semibold text-stone-200">Artist &amp; Grant Profile</span>
              {profile.artistName && <span className="text-xs text-stone-600">— {profile.artistName}</span>}
            </div>
            {showForm ? <ChevronUp size={14} className="text-stone-500" /> : <ChevronDown size={14} className="text-stone-500" />}
          </button>

          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-4 border-t border-white/8 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Your name" field="artistName" placeholder="e.g. Maya Goldstein" />
                    <F label="Primary medium" field="medium" placeholder="e.g. blown glass, ceramics" />
                    <F label="Years active" field="yearsActive" placeholder="e.g. 12" />
                    <F label="Location" field="location" placeholder="e.g. Seattle, WA" />
                    <F label="Grant / award name" field="grantName" placeholder="e.g. NEA Craft Fellowship" />
                    <F label="Grant amount ($)" field="grantAmount" placeholder="e.g. 25000" />
                    <div className="col-span-2">
                      <F label="Project title" field="projectTitle" placeholder="e.g. Vessel Series: Memory and Form" />
                    </div>
                    <div className="col-span-2">
                      <F label="Project description" field="projectDesc" placeholder="What will you create? Artistic goals, process, significance…" textarea />
                    </div>
                    <div className="col-span-2">
                      <F label="Community impact" field="communityImpact" placeholder="How does your work serve your community or the field?" textarea />
                    </div>
                    <div className="col-span-2">
                      <F label="Awards, exhibitions, residencies" field="awards" placeholder="Key career achievements to highlight…" textarea />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-stone-500 mb-1 block">Writing tone</label>
                      <div className="flex gap-2">
                        {(["formal", "conversational", "academic"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setProfile((p) => ({ ...p, tone: t }))}
                            className={`flex-1 rounded-xl border px-3 py-2 text-xs capitalize transition-colors ${
                              profile.tone === t
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                : "border-white/10 text-stone-500 hover:border-white/20"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Document type buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {DOC_TYPES.map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => generate(key)}
              disabled={loading}
              className={`relative flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all hover:border-amber-500/30 ${
                generated[key]
                  ? "border-emerald-500/25 bg-emerald-500/5"
                  : "border-white/8 bg-stone-900/40 hover:bg-stone-900/60"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Sparkles size={14} className={generated[key] ? "text-emerald-400 mt-0.5 shrink-0" : "text-amber-500/60 mt-0.5 shrink-0"} />
              <div>
                <p className="text-sm font-medium text-stone-200">{label}</p>
                <p className="text-xs text-stone-600 mt-0.5">{desc}</p>
              </div>
              {generated[key] && (
                <Check size={12} className="absolute top-3 right-3 text-emerald-400" />
              )}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl border border-white/8 bg-stone-900/60 p-8 text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-stone-700 border-t-amber-400" />
            <p className="text-sm text-stone-400">Drafting your {DOC_TYPES.find((d) => d.key === selectedDoc)?.label}…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        {/* Generated text */}
        {!loading && Object.keys(generated).length > 0 && (
          <div ref={outputRef} className="space-y-4">
            {/* Tab selector */}
            {Object.keys(generated).length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {DOC_TYPES.filter((d) => generated[d.key]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedDoc(key)}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      selectedDoc === key
                        ? "bg-amber-500 text-stone-950 font-bold"
                        : "border border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {currentText && (
              <motion.div
                key={selectedDoc}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
                  <p className="text-xs font-semibold text-stone-400">{DOC_TYPES.find((d) => d.key === selectedDoc)?.label}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generate(selectedDoc)}
                      className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                    >
                      <RefreshCw size={11} /> Regenerate
                    </button>
                    <button
                      onClick={copyText}
                      className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-stone-400 hover:border-white/20 hover:text-stone-200 transition-colors"
                    >
                      {copied ? <><Check size={11} className="text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-wrap">{currentText}</p>
                </div>
                <div className="px-5 py-3 border-t border-white/8 text-xs text-stone-700">
                  {currentText.split(/\s+/).filter(Boolean).length} words · Review and personalize before submitting
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
