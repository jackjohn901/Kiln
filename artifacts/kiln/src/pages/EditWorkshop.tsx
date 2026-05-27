import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { ChevronLeft, BookOpen, Check, Loader2, X, ImageIcon, Globe, MapPin } from "lucide-react";
import Nav from "@/components/Nav";
import { useUpload } from "@/hooks/useUpload";

const TECHNIQUES = [
  "Glass Blowing", "Kiln Forming", "Flameworking", "Cold Working",
  "Metal Forging", "Welding", "Bronze Casting", "Stone Carving",
  "Ceramics", "Fiber Arts", "Mixed Media", "Enameling",
];

const LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"];

function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditWorkshop() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { upload, uploading } = useUpload();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    technique: "",
    level: "All levels",
    location: "",
    isOnline: false,
    meetingUrl: "",
    price: "",
    maxSpots: "8",
    durationHours: "3",
    imageUrl: "",
    startDate: "",
    endDate: "",
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workshops/${id}`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        if (res.status === 403) { setForbidden(true); return; }
        if (!res.ok) throw new Error("Failed to load");
        const w = await res.json() as {
          title: string; description: string | null; technique: string | null;
          level: string; location: string | null; isOnline: boolean; meetingUrl: string | null;
          price: number; maxSpots: number; durationHours: number; imageUrl: string | null;
          startDate: string | null; endDate: string | null; tags: string[];
          artistId: string;
        };
        setForm({
          title: w.title,
          description: w.description ?? "",
          technique: w.technique ?? "",
          level: w.level,
          location: w.location ?? "",
          isOnline: w.isOnline,
          meetingUrl: w.meetingUrl ?? "",
          price: String(w.price),
          maxSpots: String(w.maxSpots),
          durationHours: String(w.durationHours),
          imageUrl: w.imageUrl ?? "",
          startDate: toLocalDatetimeValue(w.startDate),
          endDate: toLocalDatetimeValue(w.endDate),
          tags: w.tags ?? [],
        });
        if (w.imageUrl) setImagePreview(w.imageUrl);
      })
      .catch(() => setError("Failed to load workshop"))
      .finally(() => setLoading(false));
  }, [id]);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.price) {
      setError("Title and price are required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      let imageUrl = form.imageUrl;
      if (imageFile) {
        try {
          const r = await upload(imageFile);
          imageUrl = r.servingUrl;
        } catch {
          imageUrl = imagePreview;
        }
      }
      const res = await fetch(`/api/workshops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          technique: form.technique || null,
          level: form.level,
          location: form.isOnline ? "Online" : form.location,
          isOnline: form.isOnline,
          meetingUrl: form.isOnline && form.meetingUrl ? form.meetingUrl : null,
          price: Number(form.price),
          maxSpots: Number(form.maxSpots) || 8,
          durationHours: Number(form.durationHours) || 3,
          imageUrl: imageUrl || null,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
          tags: form.tags,
        }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = `/api/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        if (res.status === 403) {
          setError("You can only edit your own workshops.");
          return;
        }
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Failed to update workshop");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-amber-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-4 text-center p-8">
        <p className="text-stone-400">Workshop not found.</p>
        <button onClick={() => navigate("/workshops")} className="text-sm text-amber-400 hover:underline">Back to Workshops</button>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-4 text-center p-8">
        <p className="text-stone-400">You can only edit your own workshops.</p>
        <button onClick={() => navigate("/workshops")} className="text-sm text-amber-400 hover:underline">Back to Workshops</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="h-16 w-16 flex items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/40">
          <Check size={28} className="text-purple-400" />
        </div>
        <h2 className="font-serif text-2xl text-amber-100">Workshop Updated</h2>
        <p className="text-stone-400 max-w-sm">Your changes have been saved.</p>
        <button
          onClick={() => navigate("/workshops")}
          className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
        >
          View Workshops
        </button>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30">
            <BookOpen size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-amber-100">Edit Workshop</h1>
            <p className="text-sm text-stone-500">Update your workshop details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-400">Workshop Photo</label>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            {imagePreview ? (
              <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-white/10 bg-stone-900">
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImagePreview(""); setImageFile(null); set("imageUrl", ""); }}
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
              placeholder="e.g. Intro to Glass Blowing"
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
              placeholder="What will students learn? What's included? What should they bring?"
              className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-none"
            />
          </div>

          {/* Technique */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-400">Technique</label>
            <div className="flex flex-wrap gap-2">
              {TECHNIQUES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("technique", form.technique === t ? "" : t)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    form.technique === t
                      ? "border-amber-400/60 bg-amber-500/20 text-amber-300"
                      : "border-white/10 bg-stone-800/60 text-stone-400 hover:border-amber-500/30"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-400">Skill Level</label>
            <div className="flex gap-2 flex-wrap">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => set("level", l)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    form.level === l
                      ? "border-purple-400/60 bg-purple-500/20 text-purple-300"
                      : "border-white/10 bg-stone-800/60 text-stone-400 hover:border-purple-500/30"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Online toggle + location/meeting link */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-400">Format</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => set("isOnline", false)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  !form.isOnline
                    ? "border-amber-400/60 bg-amber-500/20 text-amber-300"
                    : "border-white/10 bg-stone-800/60 text-stone-400 hover:border-amber-500/30"
                }`}
              >
                <MapPin size={13} /> In person
              </button>
              <button
                type="button"
                onClick={() => set("isOnline", true)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  form.isOnline
                    ? "border-amber-400/60 bg-amber-500/20 text-amber-300"
                    : "border-white/10 bg-stone-800/60 text-stone-400 hover:border-amber-500/30"
                }`}
              >
                <Globe size={13} /> Online
              </button>
            </div>
            {!form.isOnline && (
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Studio address or city"
                className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
            )}
            {form.isOnline && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-400">Meeting link</label>
                <input
                  type="url"
                  value={form.meetingUrl}
                  onChange={(e) => set("meetingUrl", e.target.value)}
                  placeholder="https://zoom.us/j/… or Google Meet link"
                  className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
                <p className="mt-1 text-xs text-stone-600">Shared with students in their booking confirmation and reminder emails.</p>
              </div>
            )}
          </div>

          {/* Price + spots + duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-400">Price <span className="text-rose-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs">$</span>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-white/10 bg-stone-900/60 pl-6 pr-3 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-400">Max Spots</label>
              <input
                type="number"
                min="1"
                value={form.maxSpots}
                onChange={(e) => set("maxSpots", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-3 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-400">Hours</label>
              <input
                type="number"
                min="1"
                value={form.durationHours}
                onChange={(e) => set("durationHours", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-3 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-400">Start Date</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white focus:border-amber-500/40 focus:outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-400">End Date</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white focus:border-amber-500/40 focus:outline-none [color-scheme:dark]"
              />
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
                placeholder="glassblowing, beginner-friendly..."
                className="flex-1 rounded-xl border border-white/10 bg-stone-900/60 px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
              />
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
                {uploading ? "Uploading…" : "Saving…"}
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
