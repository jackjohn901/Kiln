import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Gavel, ImageIcon, X, Plus } from "lucide-react";
import Nav from "@/components/Nav";
import { useUpload } from "@/hooks/useUpload";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";

const MEDIUMS = [
  "Blown Glass", "Cast Glass", "Fused Glass", "Flameworked Glass",
  "Metal Forging", "Welding", "Bronze Casting", "Stone Carving",
  "Wood Carving", "Ceramics", "Fiber Arts", "Mixed Media",
];

const DURATIONS = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "7 days", days: 7 },
];

export default function CreateAuction() {
  const [, navigate] = useLocation();
  const { upload } = useUpload();
  const { profile } = useProfile();
  const { isAuthenticated, login } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    medium: "",
    dimensions: "",
    startingPrice: "",
    reservePrice: "",
    tags: [] as string[],
  });
  const [durationDays, setDurationDays] = useState(3);
  const [tagInput, setTagInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof typeof form, value: string | string[]) {
    setForm((f) => ({ ...f, [key]: value }));
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
    if (!profile) { navigate("/setup"); return; }
    if (!isAuthenticated) { login(); return; }
    if (!form.title || !form.startingPrice) {
      setError("Title and starting price are required.");
      return;
    }
    if (form.reservePrice && Number(form.reservePrice) < Number(form.startingPrice)) {
      setError("Reserve price can't be lower than the starting price.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      let imageUrl = "";
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

      const now = new Date();
      const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          imageUrl,
          medium: form.medium,
          dimensions: form.dimensions,
          startingPrice: Number(form.startingPrice),
          reservePrice: form.reservePrice ? Number(form.reservePrice) : null,
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
          tags: form.tags,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Failed to start auction");
      }
      const created = (await res.json().catch(() => null)) as { id?: string } | null;
      navigate(created?.id ? `/auctions/${created.id}` : "/auctions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 py-10 pb-28 md:pb-10">
        <button
          onClick={() => navigate(-1 as never)}
          className="mb-6 flex items-center gap-1 text-sm text-stone-500 hover:text-amber-300 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
            <Gavel size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Auction off a piece</h1>
            <p className="text-sm text-stone-500">Let collectors bid on a one-of-a-kind work</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-400">Photo</label>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            {imagePreview ? (
              <div className="relative w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-stone-900">
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImagePreview(""); setImageFile(null); }}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <X size={14} />
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
            <label className="mb-1.5 block text-sm font-medium text-stone-400">Description</label>
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

          {/* Starting price + Reserve */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-400">Starting bid (USD) <span className="text-rose-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={form.startingPrice}
                  onChange={(e) => set("startingPrice", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-white/10 bg-stone-900/60 pl-7 pr-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-400">Reserve <span className="text-stone-600 text-xs font-normal">(optional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={form.reservePrice}
                  onChange={(e) => set("reservePrice", e.target.value)}
                  placeholder="None"
                  className="w-full rounded-xl border border-white/10 bg-stone-900/60 pl-7 pr-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
              </div>
            </div>
          </div>
          <p className="-mt-3 text-[11px] text-stone-500">A reserve is the lowest price you'll accept. The piece won't sell unless bidding reaches it.</p>

          {/* Dimensions */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-400">Dimensions</label>
            <input
              value={form.dimensions}
              onChange={(e) => set("dimensions", e.target.value)}
              placeholder="12″ × 8″ × 6″"
              className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-400">How long should bidding run?</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDurationDays(d.days)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                    durationDays === d.days
                      ? "border-amber-400/60 bg-amber-500/20 text-amber-300"
                      : "border-white/10 bg-stone-800/60 text-stone-400 hover:border-amber-500/30"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-stone-500">Bidding starts now and ends in {durationDays} {durationDays === 1 ? "day" : "days"}.</p>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-400">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add a tag and press Enter"
                className="flex-1 rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-xl border border-white/10 px-4 text-stone-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-full bg-stone-800/60 px-3 py-1 text-xs text-stone-300">
                    #{t}
                    <button type="button" onClick={() => set("tags", form.tags.filter((x) => x !== t))} className="text-stone-500 hover:text-rose-400">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            <Gavel size={16} />
            {submitting ? "Starting auction…" : "Start auction"}
          </button>
        </form>
      </div>
    </div>
  );
}
