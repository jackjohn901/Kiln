import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Flame, ArrowRight, Check, Copy, Link2, Sparkles, Users, Gift, Lock } from "lucide-react";
import Nav from "@/components/Nav";
import AuthSplash from "@/components/AuthSplash";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";

interface Inviter {
  name: string | null;
  handle: string | null;
  avatarUrl: string | null;
  medium: string | null;
  accountType: string | null;
}

// The dedicated landing page an invite link (kilndrop.com/kiln/join?ref=CODE)
// points to. It welcomes a brand-new visitor by name of whoever invited them,
// makes clear ANYONE can join (not just artists), and routes them into sign-up
// while preserving the code so the inviter gets credit. It also handles the
// case where the link is opened by an existing member (or its own owner), so
// the link never silently dumps people on an unrelated page.
export default function InviteLanding() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading, login } = useAuth();
  const { profile, profileLoaded } = useProfile();

  const code = useMemo(() => {
    const raw = new URLSearchParams(search).get("ref");
    return raw ? raw.trim().toUpperCase() : "";
  }, [search]);

  const [inviter, setInviter] = useState<Inviter | null>(null);
  const [myCode, setMyCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Persist the code immediately so it survives the full-page sign-in redirect.
  useEffect(() => {
    if (!code) return;
    try { localStorage.setItem("kiln_referral_code", code); } catch {}
  }, [code]);

  // Look up who is inviting them (public, name + avatar only).
  useEffect(() => {
    if (!code) { setInviter(null); return; }
    let cancelled = false;
    fetch(`/api/referrals/code/${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setInviter(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [code]);

  // If they're already signed in, find their own code so we can tell whether
  // this is THEIR link (a common "why did it open my own page?" confusion).
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetch("/api/me/referral", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data?.code) setMyCode(data.code); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const isOwnLink = !!myCode && !!code && myCode === code;
  const inviterName = inviter?.name?.trim() || null;

  const myInviteUrl = myCode ? `https://kilndrop.com/kiln/join?ref=${myCode}` : "";
  const handleCopyMine = async () => {
    if (!myInviteUrl) return;
    try {
      await navigator.clipboard.writeText(myInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (isLoading) return <AuthSplash label="Warming up…" />;

  // ── Already a signed-in member ────────────────────────────────────────────
  if (isAuthenticated && profileLoaded && profile) {
    return (
      <div className="min-h-screen bg-[#12100e]">
        <Nav />
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
            <Link2 size={28} className="text-amber-400" />
          </div>
          {isOwnLink ? (
            <>
              <h1 className="font-serif text-3xl text-amber-100">This is your invite link</h1>
              <p className="mt-3 leading-relaxed text-stone-400">
                Share it with anyone — they don't have to be an artist. When they join, they get their
                own link too, and your network grows beneath you.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-3xl text-amber-100">You're already on Kiln 🎉</h1>
              <p className="mt-3 leading-relaxed text-stone-400">
                {inviterName ? `${inviterName} sent you an invite, but you're already in.` : "You're already in."}{" "}
                Want to grow the community? Grab your own invite link and start your chain.
              </p>
            </>
          )}

          {myInviteUrl && (
            <div className="mt-6 w-full rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4">
              <p className="text-left text-xs uppercase tracking-wide text-stone-400">Your invite link</p>
              <div className="mt-2 break-all rounded-xl bg-stone-950/50 p-3 text-left font-mono text-sm text-stone-300">
                {myInviteUrl}
              </div>
              <button
                onClick={handleCopyMine}
                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                  copied ? "bg-green-500/20 text-green-400" : "bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95"
                }`}
              >
                {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy invite link</>}
              </button>
            </div>
          )}

          <button
            onClick={() => navigate("/referrals")}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm text-stone-300 transition-colors hover:border-amber-500/40"
          >
            Open invite dashboard <ArrowRight size={15} />
          </button>
          <button
            onClick={() => navigate("/")}
            className="mt-3 text-sm text-stone-500 underline-offset-4 transition-colors hover:text-amber-300 hover:underline"
          >
            Back to the feed
          </button>
        </div>
      </div>
    );
  }

  // ── Brand-new visitor (or signed in but no profile yet) ───────────────────
  const goJoin = () => {
    if (code) { try { localStorage.setItem("kiln_referral_code", code); } catch {} }
    if (isAuthenticated) navigate("/setup");
    else login();
  };

  return (
    <div className="min-h-screen bg-[#12100e]">
      <Nav />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          {/* Inviter identity */}
          {inviterName ? (
            <div className="mb-6 flex flex-col items-center">
              <div className="relative">
                {inviter?.avatarUrl ? (
                  <img
                    src={inviter.avatarUrl}
                    alt={inviterName}
                    className="h-20 w-20 rounded-full border-2 border-amber-500/40 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-500/40 bg-amber-500/10 text-2xl font-bold text-amber-200">
                    {inviterName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#12100e] bg-amber-500">
                  <Flame size={15} className="text-stone-950" />
                </div>
              </div>
              <p className="mt-4 text-sm uppercase tracking-wide text-amber-400">You've been invited</p>
              <h1 className="mt-1 font-serif text-3xl text-amber-100">
                {inviterName} invited you to Kiln
              </h1>
            </div>
          ) : (
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                <Flame size={30} className="text-amber-400" />
              </div>
              <p className="text-sm uppercase tracking-wide text-amber-400">You've been invited</p>
              <h1 className="mt-1 font-serif text-3xl text-amber-100">Join Kiln</h1>
            </div>
          )}

          <p className="leading-relaxed text-stone-400">
            Kiln is the home for craft — and <span className="text-amber-200">anyone can join</span>. You
            don't have to be an artist. Collectors, design lovers, and the merely curious are all welcome.
          </p>

          {/* The chain / game framing */}
          <div className="mt-7 w-full space-y-2.5 text-left">
            {[
              { icon: <Users size={16} className="text-amber-400" />, text: "Join free with a unique email — that's all it takes" },
              { icon: <Link2 size={16} className="text-amber-400" />, text: "Get your own invite link to pass on — start your own chain" },
              { icon: <Gift size={16} className="text-amber-400" />, text: "Earn badges and rewards as your invite network grows" },
            ].map((line) => (
              <div
                key={line.text}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-stone-900/50 px-4 py-3"
              >
                <span className="shrink-0">{line.icon}</span>
                <span className="text-sm text-stone-300">{line.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={goJoin}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-6 py-3.5 text-base font-semibold text-stone-950 transition-colors hover:bg-amber-400"
          >
            <Sparkles size={17} /> Claim your spot
            <ArrowRight size={16} />
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-stone-600">
            <Lock size={11} /> Free to join · No fees · Secure sign-in
          </p>

          <button
            onClick={() => navigate("/?skipLanding=true")}
            className="mt-6 text-sm text-stone-500 underline-offset-4 transition-colors hover:text-amber-300 hover:underline"
          >
            Just looking? Explore Kiln first
          </button>
        </motion.div>
      </div>
    </div>
  );
}
