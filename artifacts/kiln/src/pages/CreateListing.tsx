import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { ChevronLeft, ShoppingBag, Check, Loader2, Plus, X, ImageIcon, Sparkles } from "lucide-react";
import Nav from "@/components/Nav";
import { useUpload } from "@/hooks/useUpload";
import ImageEditPanel from "@/components/ImageEditPanel";
import type { FilterSettings } from "@/components/ImageEditor";

const MEDIUMS = [
  "Blown Glass", "Cast Glass", "Fused Glass", "Flameworked Glass",
  "Metal Forging", "Welding", "Bronze Casting", "Stone Carving",
  "Wood Carving", "Ceramics", "Fiber Arts", "Mixed Media",
];

const SHIPS_TO_OPTIONS = ["Worldwide", "United States", "Canada", "Europe", "Australia", "United Kingdom"];

export default function CreateListing() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { upload, uploading } = useUpload();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [generatingDesc, setGeneratingDesc] = useState(false);

  async function handleGenerateDescription() {
    if (!form.title) return;
    setGeneratingDesc(true);
    try {
      const res = await fetch("/api/ai/listing-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          medium: form.medium,
          technique: form.technique,
          dimensions: form.dimensions,
          year: form.year,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { description?: string };
        if (data.description) set("description", data.description);
      }
    } catch {
    } finally {
      setGeneratingDesc(false);
    }
  }

  const [form, setForm] = useState({
    title: "",
    description: "",
    medium: "",
    technique: "",
    dimensions: "",
    weight: "",
    year: new Date().getFullYear().toString(),
    edition: "",
    price: "",
    shipsFrom: "",
    shipsTo: [] as string[],
    tags: [] as string[],
    imageUrl: "",
  });
  const [bundleMinQty, setBundleMinQty] = useState("");
  const [bundleDiscountPct, setBundleDiscountPct] = useState("");
  const [isResale, setIsResale] = useState(false);
  const [originalArtistName, setOriginalArtistName] = useState("");
  const [originalListingId, setOriginalListingId] = useState("");
  const [royaltyPercent, setRoyaltyPercent] = useState("10");
  const [editionNumber, setEditionNumber] = useState("");
  const [editionTotal, setEditionTotal] = useState("");
  const [isOneOfAKind, setIsOneOfAKind] = useState(true);
  const [tagInput, setTagInput] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  // Pre-fill price + technique from PriceCalculator query params
  useEffect(() => {
    const params = new URLSearchParams(search);
    const price = params.get("price");
    const technique = params.get("technique");
    if (price || technique) {
      setForm(f => ({ ...f, ...(price ? { price } : {}), ...(technique ? { technique } : {}) }));
    }
  }, [search]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropPreview, setCropPreview] = useState("");
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState("");
  const [wmFile, setWmFile] = useState<File | null>(null);
  const [wmPreview, setWmPreview] = useState("");
  const [tsFile, setTsFile] = useState<File | null>(null);
  const [tsPreview, setTsPreview] = useState("");
  const [filterSettings, setFilterSettings] = useState<FilterSettings | null>(null);
  const [filterCss, setFilterCss] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof typeof form, value: string | string[]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleShipsTo(opt: string) {
    set("shipsTo", form.shipsTo.includes(opt)
      ? form.shipsTo.filter((x) => x !== opt)
      : [...form.shipsTo, opt]);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    setBgFile(null); setBgPreview("");
    setCropFile(null); setCropPreview("");
    setFilterSettings(null); setFilterCss("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.price) { setError("Title and price are required."); return; }
    setError("");
    setSubmitting(true);
    try {
      let imageUrl = form.imageUrl;
      const fileToUpload = bgFile ?? tsFile ?? wmFile ?? cropFile ?? imageFile;
      if (fileToUpload) {
        try {
          const r = await upload(fileToUpload);
          imageUrl = r.servingUrl;
        } catch {
          imageUrl = bgPreview || cropPreview || imagePreview;
        }
      }

      const finalEdition = isOneOfAKind 
        ? "One of a kind" 
        : (editionNumber && editionTotal ? `${editionNumber}/${editionTotal}` : form.edition);

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          ...form, 
          imageUrl, 
          edition: finalEdition,
          price: Number(form.price), 
          year: form.year ? Number(form.year) : null,
          isResale,
          originalArtistName,
          originalListingId,
          royaltyPercent: Number(royaltyPercent),
          bundleMinQty: bundleMinQty ? Number(bundleMinQty) : null,
          bundleDiscountPct: bundleDiscountPct ? Number(bundleDiscountPct) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Failed to create listing");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="h-16 w-16 flex items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40">
          <Check size={28} className="text-emerald-400" />
        </div>
        <h2 className="font-serif text-2xl text-amber-100">Listing Live</h2>
        <p className="text-stone-400 max-w-sm">Your piece is now visible in the Kiln shop for collectors to discover.</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/shop")}
            className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            View Shop
          </button>
          <button
            onClick={() => { setDone(false); setForm({ title: "", description: "", medium: "", technique: "", dimensions: "", weight: "", year: new Date().getFullYear().toString(), edition: "", price: "", shipsFrom: "", shipsTo: [], tags: [], imageUrl: "" }); setImagePreview(""); setImageFile(null); }}
            className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors"
          >
            Add Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 py-10">
        <button
          onClick={() => navigate(-1 as never)}
          className="mb-6 flex items-center gap-1 text-sm text-stone-500 hover:text-amber-300 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
            <ShoppingBag size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Add a Listing</h1>
            <p className="text-sm text-stone-500">List a piece for sale in the Kiln shop</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-400">Photo</label>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            {imagePreview ? (
              <div className="space-y-3">
                <div className="relative w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-stone-900">
                  <img
                    src={bgPreview || cropPreview || imagePreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    style={{ filter: filterCss || undefined }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(""); setImageFile(null);
                      setBgFile(null); setBgPreview("");
                      setCropFile(null); setCropPreview("");
                      setFilterSettings(null); setFilterCss("");
                    }}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <ImageEditPanel
                  previewUrl={bgPreview || tsPreview || wmPreview || cropPreview || imagePreview}
                  sourceFile={cropFile ?? imageFile}
                  onFilterChange={(s, css) => { setFilterSettings(s); setFilterCss(css); }}
                  onCrop={(url, f) => { setCropPreview(url); setCropFile(f); setBgFile(null); setBgPreview(""); setWmFile(null); setWmPreview(""); setTsFile(null); setTsPreview(""); }}
                  onBgResult={(url, f) => { setBgPreview(url); setBgFile(f); }}
                  onBgReset={() => { setBgPreview(""); setBgFile(null); }}
                  onWatermark={(url, f) => { setWmPreview(url); setWmFile(f); }}
                  onTiltShift={(url, f) => { setTsPreview(url); setTsFile(f); }}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-white/10 bg-stone-900/40 py-10 text-center hover:border-amber-500/30 hover:bg-stone-900/60 transition-all"
              >
                <ImageIcon size={28} className="text-stone-600" />
                <span className="text-sm text-stone-500">Click to upload a photo</span>
              </button>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-400">Title <span className="text-rose-400">*</span></label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Amber Vessel No. 7"
              className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-stone-400">Description</label>
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={generatingDesc || !form.title}
                title={!form.title ? "Add a title first" : "Generate description with AI"}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
              >
                {generatingDesc ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                {generatingDesc ? "Writing…" : "Write with AI"}
              </button>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Describe your piece — materials, process, inspiration..."
              className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-none"
            />
          </div>

          {/* Medium */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-400">Medium</label>
            <div className="flex flex-wrap gap-2">
              {MEDIUMS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("medium", form.medium === m ? "" : m)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    form.medium === m
                      ? "border-amber-400/60 bg-amber-500/20 text-amber-300"
                      : "border-white/10 bg-stone-800/60 text-stone-400 hover:border-amber-500/30"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Price + Year row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-400">Price (USD) <span className="text-rose-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-white/10 bg-stone-900/60 pl-7 pr-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-400">Year Made</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Dimensions + Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-400">Dimensions</label>
              <input
                value={form.dimensions}
                onChange={(e) => set("dimensions", e.target.value)}
                placeholder="12″ × 8″ × 6″"
                className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-400">Weight</label>
              <input
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
                placeholder="2.4 lbs"
                className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Edition */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-stone-400">Edition</label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isOneOfAKind}
                  onChange={(e) => setIsOneOfAKind(e.target.checked)}
                  className="rounded border-white/10 bg-stone-900 text-amber-500 focus:ring-amber-500/20 h-4 w-4"
                />
                <span className="text-xs text-stone-500 group-hover:text-stone-400 transition-colors">One of a kind</span>
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  disabled={isOneOfAKind}
                  value={isOneOfAKind ? "" : editionNumber}
                  onChange={(e) => setEditionNumber(e.target.value)}
                  placeholder={isOneOfAKind ? "1" : "Edition #"}
                  className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {!isOneOfAKind && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-stone-600 font-bold">Number</span>}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  disabled={isOneOfAKind}
                  value={isOneOfAKind ? "" : editionTotal}
                  onChange={(e) => setEditionTotal(e.target.value)}
                  placeholder={isOneOfAKind ? "1" : "Total"}
                  className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {!isOneOfAKind && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider text-stone-600 font-bold">Total</span>}
              </div>
            </div>
            {isOneOfAKind && (
              <p className="mt-2 text-[10px] text-stone-500 italic">This piece will be listed as a unique, one-of-a-kind work.</p>
            )}
          </div>

          {/* Resale */}
          <div className="rounded-xl border border-white/5 bg-stone-900/40 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-stone-400">Resale Listing</label>
                <p className="text-[10px] text-stone-500">Is this a resale of another artist's work?</p>
              </div>
              <input
                type="checkbox"
                checked={isResale}
                onChange={(e) => setIsResale(e.target.checked)}
                className="rounded border-white/10 bg-stone-900 text-amber-500 focus:ring-amber-500/20 h-5 w-5"
              />
            </div>

            {isResale && (
              <div className="space-y-4 pt-2 border-t border-white/5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-500">Original Artist Name</label>
                  <input
                    value={originalArtistName}
                    onChange={(e) => setOriginalArtistName(e.target.value)}
                    placeholder="e.g. Dale Chihuly"
                    className="w-full rounded-lg border border-white/10 bg-stone-900/60 px-3 py-2 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-stone-500">Original Listing ID (Optional)</label>
                    <input
                      value={originalListingId}
                      onChange={(e) => setOriginalListingId(e.target.value)}
                      placeholder="UUID"
                      className="w-full rounded-lg border border-white/10 bg-stone-900/60 px-3 py-2 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-stone-500">Royalty Percent (%)</label>
                    <input
                      type="number"
                      value={royaltyPercent}
                      onChange={(e) => setRoyaltyPercent(e.target.value)}
                      placeholder="10"
                      className="w-full rounded-lg border border-white/10 bg-stone-900/60 px-3 py-2 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bundle Deal */}
          <div className="rounded-xl border border-white/8 bg-stone-900/40 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-stone-400 mb-0.5">Bundle deal <span className="text-stone-600 text-xs font-normal">(optional)</span></p>
              <p className="text-xs text-stone-600">Offer a discount when collectors buy multiple pieces.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-stone-500">Min. quantity</label>
                <input
                  type="number"
                  min="2"
                  value={bundleMinQty}
                  onChange={(e) => setBundleMinQty(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full rounded-lg border border-white/10 bg-stone-900/60 px-3 py-2 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-stone-500">Discount %</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={bundleDiscountPct}
                  onChange={(e) => setBundleDiscountPct(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-lg border border-white/10 bg-stone-900/60 px-3 py-2 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
              </div>
            </div>
            {bundleMinQty && bundleDiscountPct && (
              <p className="text-[11px] text-emerald-400">🎁 Buy {bundleMinQty}+ and save {bundleDiscountPct}%</p>
            )}
          </div>

          {/* Ships From */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-400">Ships From</label>
            <input
              value={form.shipsFrom}
              onChange={(e) => set("shipsFrom", e.target.value)}
              placeholder="Seattle, WA"
              className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
            />
          </div>

          {/* Ships To */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-400">Ships To</label>
            <div className="flex flex-wrap gap-2">
              {SHIPS_TO_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleShipsTo(opt)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    form.shipsTo.includes(opt)
                      ? "border-amber-400/60 bg-amber-500/20 text-amber-300"
                      : "border-white/10 bg-stone-800/60 text-stone-400 hover:border-amber-500/30"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-400">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="glassblowing, vessel..."
                className="flex-1 rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={addTag}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-stone-800/60 text-stone-400 hover:border-amber-500/30 hover:text-amber-300 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-full bg-stone-800/80 border border-white/10 px-2.5 py-0.5 text-xs text-stone-300">
                    #{t}
                    <button type="button" onClick={() => set("tags", form.tags.filter((x) => x !== t))}>
                      <X size={10} className="text-stone-500 hover:text-rose-400" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting || uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {uploading ? "Uploading…" : "Creating…"}
              </>
            ) : (
              "List for Sale"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
