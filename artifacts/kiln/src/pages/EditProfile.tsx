import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Save, User, Camera, Globe, Instagram, MapPin, Layers, AlignLeft, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import { toast } from "@/hooks/use-toast";
import { useProfile, type UserProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";

import { CRAFT_CATEGORIES } from "@/data/craftCategories";

const COLLECTING_OPTIONS = [
  "Ceramics", "Glass", "Metalwork", "Fiber Arts", "Wood", "Jewelry",
  "Contemporary Craft", "Studio Pottery", "Functional Ware", "Sculptural Works",
  "Vintage / Antique", "Emerging Artists", "Investment Pieces",
];

const DECORATOR_OPTIONS = [
  "Residential", "Commercial", "Hospitality", "Healthcare", "Retail",
  "Art Consulting", "New Builds", "Renovations", "Luxury", "Sustainable Design",
];

const GALLERY_FOCUS_OPTIONS = [
  "Ceramics", "Glass", "Metalwork", "Fiber Arts", "Wood", "Jewelry",
  "Mixed Media", "Contemporary Craft", "Traditional Craft", "Emerging Artists",
  "Established Artists", "International Artists",
];

const MUSEUM_FOCUS_OPTIONS = [
  "Ceramics & Pottery", "Glass Arts", "Textile & Fiber", "Metalwork",
  "Wood Arts", "Contemporary Craft", "Folk Art", "Industrial Design",
  "American Craft", "International Craft", "Decorative Arts",
];

const BIO_PLACEHOLDER: Record<string, string> = {
  artist: "Tell your story — your medium, practice, and what drives your work...",
  collector: "Tell artists about yourself — what you collect, what you love, and what you're looking for...",
  interior_decorator: "Tell artists about your practice — what kinds of projects you work on and what craft means to your clients...",
  gallery: "Tell artists and collectors about your gallery — your focus, location, and what makes your program special...",
  museum: "Tell artists and collectors about your institution — your collection, mission, and what you're looking to acquire...",
  enthusiast: "Tell the community about yourself — what draws you to craft and how you engage with it...",
};

/** Step 1: Resize on canvas → Blob (never touches localStorage) */
function resizeToBlob(file: File, maxPx: number, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
          "image/jpeg",
          quality,
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Step 2 & 3: Request presigned URL → PUT blob directly to GCS.
 * Only the returned path (~50 chars) is ever stored — exactly how Instagram/TikTok do it.
 */
async function uploadToStorage(blob: Blob, filename: string): Promise<string> {
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: filename, size: blob.size, contentType: "image/jpeg" }),
  });
  if (!urlRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  if (!putRes.ok) throw new Error("Upload to storage failed");

  // Mark profile photos as publicly readable so they display on public profiles
  await fetch("/api/storage/uploads/make-public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ objectPath }),
  });

  return `/api/storage${objectPath}`;
}

export default function EditProfile() {
  const { user } = useAuth();
  const { profile, setProfile } = useProfile();
  const [, navigate] = useLocation();

  const [form, setForm] = useState<UserProfile>(
    profile ?? {
      id: "",
      name: "",
      handle: "",
      bio: "",
      mediums: [],
      location: "",
      website: "",
      instagram: "",
      avatarUrl: "",
      coverUrl: "",
      isCustom: true,
      whyICreate: "",
      inspirations: "",
      artistStatement: "",
      collectorStory: "",
    }
  );

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Clean up blob preview URLs on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [avatarPreview, coverPreview]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <p className="text-stone-400">You need to be signed in to edit your profile.</p>
          <a
            href="/api/login?returnTo=/kiln/edit-profile"
            className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-stone-400">No profile found. <a href="/setup" className="text-amber-400">Set one up</a>.</p>
        </div>
      </div>
    );
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setAvatarUploading(true);
    // Show instant local preview while upload happens in background
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    try {
      const blob = await resizeToBlob(file, 400);
      const url = await uploadToStorage(blob, "avatar.jpg");
      setForm((prev) => ({ ...prev, avatarUrl: url }));
      URL.revokeObjectURL(preview);
      setAvatarPreview(null);
    } catch {
      setUploadError("Image upload failed — please try again.");
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setCoverUploading(true);
    const preview = URL.createObjectURL(file);
    setCoverPreview(preview);
    try {
      const blob = await resizeToBlob(file, 1200, 0.80);
      const url = await uploadToStorage(blob, "cover.jpg");
      setForm((prev) => ({ ...prev, coverUrl: url }));
      URL.revokeObjectURL(preview);
      setCoverPreview(null);
    } catch {
      setUploadError("Image upload failed — please try again.");
      setCoverPreview(null);
    } finally {
      setCoverUploading(false);
    }
  }

  function toggleMedium(m: string) {
    setForm((prev) => ({
      ...prev,
      mediums: prev.mediums.includes(m)
        ? prev.mediums.filter((x) => x !== m)
        : [...prev.mediums, m],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setProfile({ ...form, isCustom: true });

    try {
      const r = await fetch("/api/me/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.name,
          handle: form.handle,
          bio: form.bio,
          medium: form.mediums.join(", "),
          location: form.location,
          website: form.website,
          avatarUrl: form.avatarUrl,
          bannerUrl: form.coverUrl,
          whyICreate: form.whyICreate ?? "",
          inspirations: form.inspirations ?? "",
          artistStatement: form.artistStatement ?? "",
          collectorStory: form.collectorStory ?? "",
        }),
      });
      if (!r.ok) throw new Error();
    } catch {
      savingRef.current = false;
      setSaving(false);
      toast({ title: "Couldn\u2019t save your profile", description: "Please check your connection and try again.", variant: "destructive" });
      return;
    }

    setSaved(true);
    const dest = form.id || profile?.id || "";
    setTimeout(() => {
      navigate(`/artists/${dest}`);
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 py-8 pb-28 md:pb-8">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold text-amber-100">Edit Profile</h1>
          <p className="text-sm text-stone-500">Changes saved to your profile</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {uploadError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {uploadError}
            </div>
          )}

          {/* Avatar / Cover */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-600">Images</p>

            {/* Avatar picker */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                className="relative shrink-0 group"
              >
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-dashed border-stone-600 group-hover:border-amber-400/60 transition-colors bg-stone-800">
                  {avatarUploading ? (
                    <div className="flex h-full w-full items-center justify-center">
                      <Loader2 size={20} className="text-amber-400 animate-spin" />
                    </div>
                  ) : (avatarPreview || form.avatarUrl) ? (
                    <img src={avatarPreview ?? form.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User size={24} className="text-stone-600" />
                    </div>
                  )}
                </div>
                {!avatarUploading && (
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 border-2 border-[#12100e]">
                    <Camera size={11} className="text-stone-950" />
                  </div>
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div>
                <p className="text-sm font-medium text-stone-300">Profile photo</p>
                <p className="text-xs text-stone-600">
                  {avatarUploading ? "Uploading to cloud storage…" : "Tap the circle to choose a photo"}
                </p>
              </div>
            </div>

            {/* Cover image picker */}
            <div>
              <p className="mb-2 text-xs font-medium text-stone-500">Cover image</p>
              <button
                type="button"
                onClick={() => !coverUploading && coverInputRef.current?.click()}
                className="relative w-full h-24 overflow-hidden rounded-xl border-2 border-dashed border-stone-600 hover:border-amber-400/60 transition-colors bg-stone-800 group"
              >
                {coverUploading ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="text-amber-400 animate-spin" />
                    <span className="text-xs text-stone-500">Uploading…</span>
                  </div>
                ) : (coverPreview || form.coverUrl) ? (
                  <img src={coverPreview ?? form.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                    <Camera size={20} className="text-stone-600 group-hover:text-amber-400/60 transition-colors" />
                    <span className="text-xs text-stone-700">Click to upload cover photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverChange}
              />
            </div>
          </div>

          {/* Basic info */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-600">Basic info</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  <User size={11} /> Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  @ Handle
                </label>
                <input
                  type="text"
                  value={form.handle}
                  onChange={(e) => setForm({ ...form, handle: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                <AlignLeft size={11} /> Bio
              </label>
              <textarea
                rows={4}
                maxLength={500}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder={BIO_PLACEHOLDER[profile.accountType ?? "artist"] ?? BIO_PLACEHOLDER.artist}
                className="w-full resize-none rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-stone-700">{form.bio.length}/500</p>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                <MapPin size={11} /> Location
              </label>
              <input
                type="text"
                placeholder="City, State, Country"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Story & Purpose — artist/enthusiast */}
          {(profile.accountType === "artist" || !profile.accountType || profile.accountType === "enthusiast") && (
            <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5 space-y-5">
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-600">
                  ✦ Story & Purpose
                </p>
                <p className="text-xs text-stone-700">The why behind your work — shown on your profile to collectors and followers.</p>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  Why I Create
                </label>
                <textarea
                  rows={3}
                  maxLength={600}
                  value={form.whyICreate ?? ""}
                  onChange={(e) => setForm({ ...form, whyICreate: e.target.value })}
                  placeholder="What drives you to make? What would be missing from your life without this work?"
                  className="w-full resize-none rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-stone-700">{(form.whyICreate ?? "").length}/600</p>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  Inspirations & Influences
                </label>
                <textarea
                  rows={3}
                  maxLength={600}
                  value={form.inspirations ?? ""}
                  onChange={(e) => setForm({ ...form, inspirations: e.target.value })}
                  placeholder="Who or what inspires your work? Artists, places, materials, ideas, traditions…"
                  className="w-full resize-none rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-stone-700">{(form.inspirations ?? "").length}/600</p>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  Artist Statement
                </label>
                <textarea
                  rows={4}
                  maxLength={800}
                  value={form.artistStatement ?? ""}
                  onChange={(e) => setForm({ ...form, artistStatement: e.target.value })}
                  placeholder="A formal statement about your practice — what your work is about, the ideas it explores, how it connects to the world."
                  className="w-full resize-none rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-stone-700">{(form.artistStatement ?? "").length}/800</p>
              </div>
            </div>
          )}

          {/* Collector Story */}
          {profile.accountType === "collector" && (
            <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5 space-y-5">
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-600">
                  ✦ Your Collector Story
                </p>
                <p className="text-xs text-stone-700">Help artists understand why you collect — your taste, your purpose, what collecting means to you.</p>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                  Why I Collect
                </label>
                <textarea
                  rows={4}
                  maxLength={800}
                  value={form.collectorStory ?? ""}
                  onChange={(e) => setForm({ ...form, collectorStory: e.target.value })}
                  placeholder="What draws you to collecting craft? What does bringing a piece into your home or collection mean to you?"
                  className="w-full resize-none rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-stone-700">{(form.collectorStory ?? "").length}/800</p>
              </div>
            </div>
          )}

          {/* Account-type-specific interests/focus */}
          {(() => {
            const accountType = profile.accountType ?? "artist";
            const useGrouped = accountType === "artist" || accountType === "enthusiast";
            let sectionTitle = "Mediums";
            let sectionDesc = "Select all that apply";
            let flatOptions: string[] = [];
            if (accountType === "collector") { sectionTitle = "Collecting Focus"; sectionDesc = "What kinds of craft do you collect?"; flatOptions = COLLECTING_OPTIONS; }
            else if (accountType === "interior_decorator") { sectionTitle = "Project Specialties"; sectionDesc = "What kinds of projects do you work on?"; flatOptions = DECORATOR_OPTIONS; }
            else if (accountType === "gallery") { sectionTitle = "Gallery Focus"; sectionDesc = "What types of work does your gallery represent?"; flatOptions = GALLERY_FOCUS_OPTIONS; }
            else if (accountType === "museum") { sectionTitle = "Collection Focus"; sectionDesc = "What does your institution collect or exhibit?"; flatOptions = MUSEUM_FOCUS_OPTIONS; }
            else if (accountType === "enthusiast") { sectionTitle = "Craft Interests"; sectionDesc = "Which crafts are you passionate about?"; }
            const pillClass = (active: boolean) =>
              `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                  : "border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300"
              }`;
            return (
              <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-600">
                  <Layers size={11} /> {sectionTitle}
                </p>
                <p className="mb-3 text-xs text-stone-700">{sectionDesc}</p>
                {useGrouped ? (
                  <div className="space-y-4">
                    {CRAFT_CATEGORIES.map((cat) => (
                      <div key={cat.id}>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                          {cat.emoji} {cat.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {cat.crafts.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => toggleMedium(m)}
                              className={pillClass(form.mediums.includes(m))}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {flatOptions.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMedium(m)}
                        className={pillClass(form.mediums.includes(m))}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Links */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-600">Links</p>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                <Globe size={11} /> Website
              </label>
              <input
                type="url"
                placeholder="https://yoursite.com"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                <Instagram size={11} /> Instagram handle
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 text-sm">@</span>
                <input
                  type="text"
                  placeholder="yourhandle"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-stone-800 pl-8 pr-3 py-2.5 text-sm text-stone-200 placeholder-stone-700 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <button
            type="submit"
            disabled={saving || saved}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
              saved
                ? "bg-emerald-500 text-white"
                : "bg-amber-500 text-stone-950 hover:bg-amber-400"
            }`}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saved ? "Saved!" : saving ? "Saving\u2026" : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
