import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Flame, CheckCircle, Camera } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { artists } from "@/data/artists";

const MEDIUMS = [
  "Blown Glass", "Cast Glass", "Fused Glass", "Flameworked Glass",
  "Metal Forging", "Welding & Fabrication", "Bronze Casting",
  "Stone Sculpture", "Wood Carving",
  "Ceramics & Pottery", "Fiber Arts", "Mixed Media",
];

const PROCESS_STAGES = [
  "🔥 Hot Shop Work", "🔨 Forming & Shaping", "🧊 Annealing",
  "✂️ Cutting & Grinding", "💎 Polishing & Finishing", "🎨 Complete Works",
];

export default function Setup() {
  const [, navigate] = useLocation();
  const { setProfile } = useProfile();
  const [step, setStep] = useState<"choose" | "form" | "done">("choose");
  const [form, setForm] = useState({
    name: "",
    handle: "",
    bio: "",
    location: "",
    website: "",
    mediums: [] as string[],
    avatarUrl: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  function handleDemoAs(artistId: string) {
    const a = artists.find((x) => x.id === artistId)!;
    setProfile({
      id: a.id,
      name: a.name,
      handle: a.id,
      bio: a.bio.slice(0, 180),
      mediums: [a.medium],
      location: a.location,
      website: a.website ?? "",
      instagram: a.instagram ?? "",
      avatarUrl: a.images[0]?.url ?? "",
      coverUrl: a.images[0]?.url ?? "",
      isCustom: false,
    });
    navigate(`/artists/${a.id}`);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function toggleMedium(m: string) {
    setForm((f) => ({
      ...f,
      mediums: f.mediums.includes(m)
        ? f.mediums.filter((x) => x !== m)
        : [...f.mediums, m],
    }));
  }

  async function handlePublish() {
    if (!form.name || !form.handle) return;
    const handle = form.handle.replace(/^@/, "");
    setProfile({
      id: handle,
      name: form.name,
      handle,
      bio: form.bio,
      mediums: form.mediums,
      location: form.location,
      website: form.website,
      instagram: "",
      avatarUrl: avatarPreview || "",
      coverUrl: avatarPreview || "",
      isCustom: true,
    });
    fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        displayName: form.name,
        handle,
        bio: form.bio,
        medium: form.mediums[0] ?? null,
        location: form.location,
        website: form.website,
        avatarUrl: avatarPreview || null,
      }),
    }).catch(() => {});
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <CheckCircle size={48} className="text-amber-400" />
        <h1 className="font-serif text-3xl text-amber-100">You're live on Kiln</h1>
        <p className="text-stone-400 max-w-sm">
          Start sharing your process — show what you're making, how you're making it, and why craft matters to you.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/create")}
            className="rounded-full bg-amber-500 px-6 py-2.5 font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            Share Your Process
          </button>
          <button
            onClick={() => navigate(`/artists/${form.handle.replace(/^@/, "")}`)}
            className="rounded-full border border-white/10 px-6 py-2.5 text-sm text-stone-300 hover:border-amber-500/40 transition-colors"
          >
            View Profile
          </button>
        </div>
      </div>
    );
  }

  if (step === "choose") {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="mb-10 text-center">
            <div className="mb-3 flex justify-center">
              <Flame size={32} className="text-amber-400" />
            </div>
            <h1 className="font-serif text-3xl text-amber-100">Join Kiln</h1>
            <p className="mt-2 text-stone-400">
              A free platform for glass, metal, and sculpture artists.{" "}
              <span className="text-amber-500">No fees. No commission.</span>
            </p>
          </div>

          <div className="grid gap-4">
            {/* Create profile */}
            <button
              onClick={() => setStep("form")}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-stone-900/60 p-6 text-left transition-all hover:border-amber-500/30 hover:bg-stone-900"
            >
              <div>
                <p className="font-serif text-lg text-amber-100">Create my artist profile</p>
                <p className="mt-1 text-sm text-stone-400">
                  Set up your page, share your process, and get discovered
                </p>
              </div>
              <ChevronRight size={20} className="text-stone-500" />
            </button>

            {/* Demo as existing artist */}
            <div className="rounded-2xl border border-white/10 bg-stone-900/40 p-5">
              <p className="mb-3 text-sm font-medium text-stone-400">
                Or explore as an existing artist
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {artists.slice(0, 6).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleDemoAs(a.id)}
                    className="flex items-center gap-2 rounded-xl border border-white/5 bg-stone-800/60 px-3 py-2 text-left text-sm transition-all hover:border-amber-500/30 hover:bg-stone-800"
                  >
                    <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/10 bg-stone-700">
                      {a.images[0] && (
                        <img src={a.images[0].url} alt={a.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span className="truncate text-stone-300">{a.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 py-10">
        <button
          onClick={() => setStep("choose")}
          className="mb-6 flex items-center gap-1 text-sm text-stone-500 hover:text-amber-300 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <h2 className="mb-6 font-serif text-2xl text-amber-100">Your artist profile</h2>

        <div className="space-y-6">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-stone-600 bg-stone-800 transition-all hover:border-amber-400/60">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Camera size={22} className="text-stone-500" />
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            <div>
              <p className="text-sm font-medium text-stone-300">Profile photo</p>
              <p className="text-xs text-stone-600">Click to upload</p>
            </div>
          </div>

          {/* Name + handle */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Full name *</label>
              <input
                type="text"
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">@handle *</label>
              <input
                type="text"
                placeholder="@yourname"
                value={form.handle}
                onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value.replace(/\s/g, "") }))}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-400">About your practice</label>
            <textarea
              rows={3}
              placeholder="I make blown glass vessels that explore the relationship between form and light..."
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none resize-none"
            />
          </div>

          {/* Location + website */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Location</label>
              <input
                type="text"
                placeholder="Portland, OR"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Website</label>
              <input
                type="text"
                placeholder="yoursite.com"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Medium selection */}
          <div>
            <label className="mb-2 block text-xs font-medium text-stone-400">Your medium(s)</label>
            <div className="flex flex-wrap gap-2">
              {MEDIUMS.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleMedium(m)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    form.mediums.includes(m)
                      ? "bg-amber-500 text-stone-950"
                      : "border border-white/10 bg-stone-800 text-stone-400 hover:border-amber-500/40"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handlePublish}
            disabled={!form.name || !form.handle}
            className="w-full rounded-full bg-amber-500 py-3 font-semibold text-stone-950 transition-all hover:bg-amber-400 disabled:opacity-40"
          >
            Go Live on Kiln
          </button>

          <p className="text-center text-xs text-stone-600">
            Completely free. No fees on sales. No subscription required.
          </p>
        </div>
      </div>
    </div>
  );
}
