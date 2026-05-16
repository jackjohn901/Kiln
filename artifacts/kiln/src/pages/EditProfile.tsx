import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Save, User, Camera, Globe, Instagram, MapPin, Layers, AlignLeft } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile, type UserProfile } from "@/contexts/ProfileContext";

const MEDIUM_OPTIONS = [
  "Glass Blowing", "Flameworking", "Kiln Forming", "Raku", "Ceramics", "Porcelain",
  "Blacksmithing", "Metal Forging", "Bronze Casting", "Fiber Arts", "Weaving",
  "Enamel", "Wood Turning", "Stone Carving", "Mosaic", "Leather", "Jewelry",
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function EditProfile() {
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
    }
  );

  const [saved, setSaved] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
    const dataUrl = await fileToDataUrl(file);
    setForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setForm((prev) => ({ ...prev, coverUrl: dataUrl }));
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
    setProfile({ ...form, isCustom: true });

    try {
      await fetch("/api/me/profile", {
        method: "PATCH",
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
        }),
      });
    } catch {
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
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold text-amber-100">Edit Profile</h1>
          <p className="text-sm text-stone-500">Changes are saved to your device</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar / Cover */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-600">Images</p>

            {/* Avatar picker */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="relative shrink-0 group"
              >
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-dashed border-stone-600 group-hover:border-amber-400/60 transition-colors bg-stone-800">
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User size={24} className="text-stone-600" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 border-2 border-[#12100e]">
                  <Camera size={11} className="text-stone-950" />
                </div>
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
                <p className="text-xs text-stone-600">Tap the circle to choose a photo</p>
              </div>
            </div>

            {/* Cover image picker */}
            <div>
              <p className="mb-2 text-xs font-medium text-stone-500">Cover image</p>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="relative w-full h-24 overflow-hidden rounded-xl border-2 border-dashed border-stone-600 hover:border-amber-400/60 transition-colors bg-stone-800 group"
              >
                {form.coverUrl ? (
                  <img src={form.coverUrl} alt="" className="h-full w-full object-cover" />
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
                placeholder="Tell your story — your medium, practice, and what drives your work..."
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

          {/* Mediums */}
          <div className="rounded-2xl border border-white/8 bg-stone-900/40 p-5">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-stone-600">
              <Layers size={11} /> Mediums
            </p>
            <p className="mb-3 text-xs text-stone-700">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {MEDIUM_OPTIONS.map((m) => {
                const active = form.mediums.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMedium(m)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                        : "border-stone-700 text-stone-500 hover:border-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

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
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all ${
              saved
                ? "bg-emerald-500 text-white"
                : "bg-amber-500 text-stone-950 hover:bg-amber-400"
            }`}
          >
            <Save size={15} />
            {saved ? "Saved!" : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
