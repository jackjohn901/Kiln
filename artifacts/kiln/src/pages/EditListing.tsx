import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { ChevronLeft, ShoppingBag, Loader2, Plus, X, ImageIcon, Sparkles } from "lucide-react";
import Nav from "@/components/Nav";
import { useUpload } from "@/hooks/useUpload";
import { toast } from "@/hooks/use-toast";

const MEDIUMS = [
  "Blown Glass", "Cast Glass", "Fused Glass", "Flameworked Glass",
  "Metal Forging", "Welding", "Bronze Casting", "Stone Carving",
  "Wood Carving", "Ceramics", "Fiber Arts", "Mixed Media",
];

const SHIPS_TO_OPTIONS = ["Worldwide", "United States", "Canada", "Europe", "Australia", "United Kingdom"];

interface ListingData {
  id: string;
  artistId: string;
  title: string;
  description: string | null;
  medium: string | null;
  technique: string | null;
  dimensions: string | null;
  weight: string | null;
  year: number | null;
  edition: string | null;
  price: number;
  shipsFrom: string | null;
  shipsTo: string[];
  tags: string[];
  imageUrl: string | null;
  bundleMinQty: number | null;
  bundleDiscountPct: number | null;
}

export default function EditListing() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { upload, uploading } = useUpload();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

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
  const [tagInput, setTagInput] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const listingFetch = fetch(`/api/listings/${id}`, { credentials: "include" });
    const settingsFetch = fetch("/api/me/settings", { credentials: "include" });

    Promise.all([listingFetch, settingsFetch])
      .then(async ([listingRes, settingsRes]) => {
        if (listingRes.status === 404) { setNotFound(true); return; }
        if (listingRes.status === 403) { setForbidden(true); return; }
        if (!listingRes.ok) throw new Error("Failed to load listing");

        const listing = await listingRes.json() as ListingData;

        const settingsData = settingsRes.ok
          ? await settingsRes.json() as { shippingSettings?: { shipsTo?: string[] }; defaultShippingAddress?: { city?: string; state?: string; country?: string } }
          : null;

        const listingShipsTo = Array.isArray(listing.shipsTo) ? listing.shipsTo : [];

        const fallbackShipsTo = (settingsData?.shippingSettings?.shipsTo ?? []).filter(Boolean);
        const addr = settingsData?.defaultShippingAddress;
        const fallbackShipsFrom = addr
          ? [addr.city, addr.state || addr.country].filter(Boolean).join(", ")
          : "";

        setForm({
          title: listing.title,
          description: listing.description ?? "",
          medium: listing.medium ?? "",
          technique: listing.technique ?? "",
          dimensions: listing.dimensions ?? "",
          weight: listing.weight ?? "",
          year: listing.year ? String(listing.year) : new Date().getFullYear().toString(),
          edition: listing.edition ?? "",
          price: String(listing.price),
          shipsFrom: listing.shipsFrom ?? fallbackShipsFrom,
          shipsTo: listingShipsTo.length > 0 ? listingShipsTo : fallbackShipsTo,
          tags: Array.isArray(listing.tags) ? listing.tags : [],
          imageUrl: listing.imageUrl ?? "",
        });

        if (listing.imageUrl) setImagePreview(listing.imageUrl);
        if (listing.bundleMinQty) setBundleMinQty(String(listing.bundleMinQty));
        if (listing.bundleDiscountPct) setBundleDiscountPct(String(listing.bundleDiscountPct));
      })
      .catch(() => {
        toast({ title: "Couldn't load listing", description: "Please try again.", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [id]);

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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.price) { setError("Title and price are required."); return; }
    setError("");
    setSubmitting(true);
    try {
      let imageUrl = form.imageUrl;
      if (imageFile) {
        try {
          const r = await upload(imageFile);
          imageUrl = r.servingUrl;
        } catch {
          try {
            imageUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(imageFile);
            });
          } catch {
            imageUrl = imagePreview;
          }
        }
      }

      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          medium: form.medium,
          technique: form.technique,
          dimensions: form.dimensions,
          weight: form.weight,
          year: form.year ? Number(form.year) : null,
          edition: form.edition,
          price: Number(form.price),
          shipsFrom: form.shipsFrom,
          shipsTo: form.shipsTo,
          tags: form.tags,
          imageUrl,
          bundleMinQty: bundleMinQty ? Number(bundleMinQty) : null,
          bundleDiscountPct: bundleDiscountPct ? Number(bundleDiscountPct) : null,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Failed to save listing");
      }

      toast({ title: "Listing updated!" });
      navigate(`/listings/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex items-center justify-center pt-32">
          <Loader2 size={24} className="animate-spin text-amber-400" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-xl px-4 py-10 text-center">
          <p className="text-stone-400">Listing not found.</p>
          <button onClick={() => navigate("/shop")} className="mt-4 text-sm text-amber-400 hover:text-amber-300">
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-xl px-4 py-10 text-center">
          <p className="text-stone-400">You don't have permission to edit this listing.</p>
          <button onClick={() => window.history.back()} className="mt-4 text-sm text-amber-400 hover:text-amber-300">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 py-10 pb-28 md:pb-10">
        <button
          onClick={() => (window.history.length > 1 ? window.history.back() : navigate(`/listings/${id}`))}
          className="mb-6 flex items-center gap-1 text-sm text-stone-500 hover:text-amber-300 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
            <ShoppingBag size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Edit Listing</h1>
            <p className="text-sm text-stone-500">Update details for this piece</p>
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
                    src={imagePreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview("");
                      setImageFile(null);
                      set("imageUrl", "");
                    }}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Replace photo
                </button>
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
                placeholder='12″ × 8″ × 6″'
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
            <label className="mb-1.5 block text-sm font-medium text-stone-400">Edition</label>
            <input
              value={form.edition}
              onChange={(e) => set("edition", e.target.value)}
              placeholder="e.g. One of a kind, 2/10"
              className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
            />
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
          </div>

          {/* Shipping */}
          <div className="rounded-xl border border-white/8 bg-stone-900/40 p-4 space-y-4">
            <p className="text-sm font-medium text-stone-400">Shipping</p>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500">Ships from</label>
              <input
                value={form.shipsFrom}
                onChange={(e) => set("shipsFrom", e.target.value)}
                placeholder="e.g. Portland, OR"
                className="w-full rounded-lg border border-white/10 bg-stone-900/60 px-3 py-2 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-stone-500">Ships to</label>
              {form.shipsTo.length === 0 && (
                <p className="mb-2 text-[11px] text-amber-400/70 italic">Inherited from your shipping settings — tap to customise</p>
              )}
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
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-400">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add a tag…"
                className="flex-1 rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={addTag}
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-stone-900/60 px-3 py-2.5 text-xs text-stone-400 hover:border-amber-500/30 hover:text-amber-300 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-full bg-stone-800 px-3 py-1 text-xs text-stone-300">
                    #{t}
                    <button
                      type="button"
                      onClick={() => set("tags", form.tags.filter((x) => x !== t))}
                      className="ml-0.5 text-stone-600 hover:text-rose-400 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Saving…
              </span>
            ) : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
