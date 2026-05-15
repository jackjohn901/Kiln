import { useState, useRef } from "react";
import { Printer, Download, Flame, Check, Plus, FileText, QrCode } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

const STORAGE_KEY = "kiln_coas_v1";

interface CoAData {
  id: string;
  title: string;
  year: string;
  medium: string;
  dimensions: string;
  edition: string;
  totalEditions: string;
  artistStatement: string;
  createdAt: string;
}

function getCoas(): CoAData[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

function saveCoa(coa: CoAData) {
  const all = getCoas();
  all.unshift(coa);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function genId() { return `coa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export default function CertificateOfAuthenticity() {
  const { profile } = useProfile();
  const printRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [history, setHistory] = useState<CoAData[]>(getCoas);

  const [form, setForm] = useState({
    title: "",
    year: new Date().getFullYear().toString(),
    medium: "",
    dimensions: "",
    edition: "1",
    totalEditions: "1",
    artistStatement: "",
  });

  function handleField(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function handleSaveAndPrint() {
    const coa: CoAData = { id: genId(), ...form, createdAt: new Date().toISOString() };
    saveCoa(coa);
    setHistory(getCoas());
    setSaved(true);
    setTimeout(() => {
      window.print();
      setSaved(false);
    }, 200);
  }

  const isValid = form.title && form.medium && form.dimensions;
  const isUnique = form.totalEditions === "1";

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-700/50">
              <FileText size={20} className="text-stone-300" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-amber-100">Certificate of Authenticity</h1>
              <p className="text-sm text-stone-500">Generate a printable certificate for any work you sell</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-xl bg-stone-900 p-1">
            {(["create", "history"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${activeTab === t ? "bg-amber-500/20 text-amber-300" : "text-stone-500 hover:text-stone-300"}`}
              >
                {t === "create" ? "New CoA" : `History (${history.length})`}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "history" ? (
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 overflow-hidden">
            {history.length === 0 ? (
              <div className="py-16 text-center">
                <FileText size={32} className="mx-auto mb-3 text-stone-700" />
                <p className="text-stone-500">No certificates yet</p>
                <button onClick={() => setActiveTab("create")} className="mt-3 text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 mx-auto">
                  <Plus size={13} /> Create your first
                </button>
              </div>
            ) : (
              history.map((c, i) => (
                <div key={c.id} className={`flex items-center justify-between px-4 py-3.5 ${i < history.length - 1 ? "border-b border-white/5" : ""}`}>
                  <div>
                    <p className="text-sm font-medium text-stone-200">{c.title}</p>
                    <p className="text-xs text-stone-600">{c.medium} · {c.dimensions} · {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] rounded-full border border-white/10 px-2 py-0.5 text-stone-500">
                    {isUnique && c.totalEditions === "1" ? "Unique" : `${c.edition}/${c.totalEditions}`}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form */}
            <div className="space-y-4 no-print">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-400">Artwork title *</label>
                <input
                  value={form.title}
                  onChange={(e) => handleField("title", e.target.value)}
                  placeholder="e.g. Endeavour No. 7"
                  className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-400">Year</label>
                  <input
                    value={form.year}
                    onChange={(e) => handleField("year", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-400">Medium *</label>
                  <input
                    value={form.medium}
                    onChange={(e) => handleField("medium", e.target.value)}
                    placeholder="e.g. Blown glass"
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-400">Dimensions *</label>
                <input
                  value={form.dimensions}
                  onChange={(e) => handleField("dimensions", e.target.value)}
                  placeholder="e.g. 18&quot; H × 9&quot; W × 9&quot; D"
                  className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-400">Edition #</label>
                  <input
                    type="number"
                    min="1"
                    value={form.edition}
                    onChange={(e) => handleField("edition", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-400">Of total editions</label>
                  <input
                    type="number"
                    min="1"
                    value={form.totalEditions}
                    onChange={(e) => handleField("totalEditions", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 focus:border-amber-500/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-400">Artist's note (optional)</label>
                <textarea
                  rows={3}
                  value={form.artistStatement}
                  onChange={(e) => handleField("artistStatement", e.target.value)}
                  placeholder="A few words about this specific piece — the intention, the process, what makes it unique..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
              </div>

              <button
                onClick={handleSaveAndPrint}
                disabled={!isValid}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 transition-all hover:bg-amber-400 disabled:opacity-40"
              >
                {saved ? <Check size={16} className="text-green-900" /> : <Printer size={16} />}
                {saved ? "Saved! Opening print…" : "Save & Print Certificate"}
              </button>
            </div>

            {/* Certificate preview */}
            <div ref={printRef} className="print-target">
              <div className="rounded-2xl border border-stone-600/40 bg-[#faf8f3] p-8 text-stone-900 shadow-xl print:shadow-none print:rounded-none print:border-none">
                {/* Header */}
                <div className="mb-6 border-b border-stone-300 pb-5 text-center">
                  <div className="mb-1 flex items-center justify-center gap-1.5 text-amber-700">
                    <Flame size={14} />
                    <span className="text-xs font-bold uppercase tracking-widest">Kiln</span>
                  </div>
                  <h2 className="font-serif text-xl font-bold text-stone-800">Certificate of Authenticity</h2>
                </div>

                {/* Work details */}
                <div className="mb-6 space-y-3">
                  <div className="text-center">
                    <p className="font-serif text-2xl font-bold text-stone-900">{form.title || "Artwork Title"}</p>
                    <p className="mt-0.5 text-sm text-stone-500">{form.year}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-stone-200 pt-4 text-sm">
                    {[
                      { label: "Artist", value: profile?.name ?? "Artist Name" },
                      { label: "Medium", value: form.medium || "—" },
                      { label: "Dimensions", value: form.dimensions || "—" },
                      { label: "Edition", value: form.totalEditions === "1" ? "Unique work" : `${form.edition} of ${form.totalEditions}` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
                        <p className="font-medium text-stone-800">{value}</p>
                      </div>
                    ))}
                  </div>

                  {form.artistStatement && (
                    <div className="rounded-lg bg-stone-100 p-3 border-l-2 border-amber-500">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Artist's note</p>
                      <p className="text-xs italic text-stone-600 leading-relaxed">{form.artistStatement}</p>
                    </div>
                  )}
                </div>

                {/* Signature + QR */}
                <div className="flex items-end justify-between border-t border-stone-200 pt-5">
                  <div>
                    <div className="mb-4 h-10 border-b border-stone-400 w-40" />
                    <p className="text-xs font-medium text-stone-700">{profile?.name ?? "Artist Name"}</p>
                    <p className="text-[10px] text-stone-400">Artist Signature</p>
                    <p className="mt-1 text-[10px] text-stone-400">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=https://kiln.art/${profile?.handle ?? "artist"}`}
                      alt="QR"
                      className="h-16 w-16 rounded"
                    />
                    <p className="text-[8px] text-stone-400">kiln.art/{profile?.handle ?? "artist"}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 border-t border-stone-200 pt-3 text-center">
                  <p className="text-[9px] text-stone-400">
                    This certificate confirms the authenticity of the above artwork. Issued via Kiln — the creative platform for craft artists.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-target, .print-target * { visibility: visible; }
          .print-target { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
