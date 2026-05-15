import { useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Shield, ExternalLink, ChevronRight, AlertCircle } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";
import { useSocial } from "@/contexts/SocialContext";

const CRITERIA = [
  "Active artist with at least 6 months on Kiln",
  "Minimum 500 followers",
  "At least 10 published reels or posts",
  "Professional exhibition or gallery history",
  "Consistent, authentic craft practice",
];

type Step = "intro" | "form" | "submitted";

export default function ApplyVerified() {
  const { profile } = useProfile();
  const { isVerified } = useSocial();

  const [step, setStep] = useState<Step>("intro");
  const [form, setForm] = useState({
    website: "",
    instagram: "",
    exhibitionHistory: "",
    galleryRepresentation: "",
    yearsActive: "",
    statement: "",
  });

  const alreadyVerified = profile && isVerified(profile.id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("submitted");
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <p className="mb-4 text-stone-400">You need a profile to apply for verification.</p>
          <Link href="/setup" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950">Set up profile</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto max-w-xl px-4 py-8">

        {/* Already verified */}
        {alreadyVerified && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
            <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0" />
            <p className="text-sm text-blue-300">Your account is already verified.</p>
          </div>
        )}

        {step === "intro" && (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/15">
                <Shield size={28} className="text-blue-400" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-amber-100">Apply for Verification</h1>
              <p className="mt-2 text-stone-400 text-sm leading-relaxed">
                The blue verified badge confirms you're an authentic professional craft artist on Kiln.
              </p>
            </div>

            {/* Criteria */}
            <div className="mb-8 rounded-2xl border border-white/8 bg-stone-900/40 p-5">
              <p className="mb-4 text-sm font-semibold text-stone-300">Eligibility criteria</p>
              <div className="space-y-3">
                {CRITERIA.map((c, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                    <p className="text-sm text-stone-400">{c}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-400" />
              <p className="text-xs text-amber-400/80">
                Review takes 5–10 business days. We may reach out for additional information. Verification is at Kiln's discretion.
              </p>
            </div>

            <button
              onClick={() => setStep("form")}
              disabled={!!alreadyVerified}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Application <ChevronRight size={16} />
            </button>
          </>
        )}

        {step === "form" && (
          <>
            <div className="mb-6">
              <h1 className="font-serif text-2xl font-bold text-amber-100">Verification Application</h1>
              <p className="text-sm text-stone-500">Applying as <span className="text-stone-300">@{profile.handle}</span></p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-400">Website / portfolio</label>
                  <input
                    type="url"
                    placeholder="https://yoursite.com"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-400">Instagram handle</label>
                  <input
                    type="text"
                    placeholder="@yourhandle"
                    value={form.instagram}
                    onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">Years active as a craft artist</label>
                <input
                  type="number"
                  placeholder="e.g. 8"
                  min="0"
                  value={form.yearsActive}
                  onChange={(e) => setForm({ ...form, yearsActive: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">Exhibition / show history</label>
                <textarea
                  placeholder="List exhibitions, juried shows, fairs, or residencies you've participated in..."
                  rows={3}
                  value={form.exhibitionHistory}
                  onChange={(e) => setForm({ ...form, exhibitionHistory: e.target.value })}
                  className="w-full resize-none rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">Gallery representation (if any)</label>
                <input
                  type="text"
                  placeholder="e.g. Habatat Galleries, Bullseye Gallery"
                  value={form.galleryRepresentation}
                  onChange={(e) => setForm({ ...form, galleryRepresentation: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-400">Why do you want to be verified?</label>
                <textarea
                  placeholder="Tell us a bit about your practice and why verification matters to you..."
                  rows={4}
                  value={form.statement}
                  onChange={(e) => setForm({ ...form, statement: e.target.value })}
                  required
                  className="w-full resize-none rounded-xl border border-white/10 bg-stone-900 px-3 py-2.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("intro")}
                  className="flex-1 rounded-full border border-stone-700 py-3 text-sm font-medium text-stone-400 hover:border-stone-500 hover:text-stone-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-amber-500 py-3 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </>
        )}

        {step === "submitted" && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/15">
              <Shield size={36} className="text-blue-400" />
            </div>
            <h2 className="mb-2 font-serif text-2xl font-bold text-amber-100">Application submitted</h2>
            <p className="mb-2 text-stone-400 text-sm leading-relaxed max-w-sm">
              Thank you, {profile.name}. We'll review your application within 5–10 business days and notify you by email.
            </p>
            <p className="mb-8 text-xs text-stone-600">Application reference: KLN-{Date.now().toString(36).toUpperCase()}</p>
            <Link href={`/artists/${profile.id}`} className="flex items-center gap-1.5 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 transition-colors">
              Back to profile <ExternalLink size={13} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
