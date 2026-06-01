import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  Trophy, Clock, Users, Flame, Zap, CheckCircle, Loader2, ChevronLeft, Heart,
} from "lucide-react";
import Nav from "@/components/Nav";
import { toast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";

interface ApiChallenge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  prompt: string;
  technique: string | null;
  hashtag: string;
  prizeDescription: string | null;
  sponsoredBy: string | null;
  entryCount: number;
  startsAt: string;
  endsAt: string;
  status: "active" | "upcoming" | "ended";
  winnerId: string | null;
}

interface ApiEntry {
  id: string;
  userId: string;
  postId: string | null;
  voteCount: number;
  createdAt: string;
  isWinner: boolean;
}

function timeLeft(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useProfile();
  const [challenge, setChallenge] = useState<ApiChallenge | null>(null);
  const [entries, setEntries] = useState<ApiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [entering, setEntering] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/challenges/${id}`, { credentials: "include" })
      .then(r => {
        if (r.status === 404) { if (!cancelled) setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        if (cancelled || !data?.challenge?.id) return;
        setChallenge(data.challenge as ApiChallenge);
        setEntries((data.entries ?? []) as ApiEntry[]);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const entered = !!profile && entries.some(e => e.userId === profile.id);

  const handleEnter = async () => {
    if (!challenge || entered || challenge.status !== "active") return;
    setEntering(true);
    try {
      const r = await fetch(`/api/challenges/${challenge.id}/enter`, { method: "POST", credentials: "include" });
      if (!r.ok && r.status !== 409) throw new Error();
      const re = await fetch(`/api/challenges/${challenge.id}`, { credentials: "include" });
      if (re.ok) {
        const data = await re.json();
        setChallenge(data.challenge as ApiChallenge);
        setEntries((data.entries ?? []) as ApiEntry[]);
      }
      toast({ title: "You\u2019re in!", description: "Post your work with the challenge hashtag to compete." });
    } catch {
      toast({ title: "Couldn\u2019t enter challenge", description: "Please try again.", variant: "destructive" });
    } finally {
      setEntering(false);
    }
  };

  const handleVote = async (entryId: string) => {
    if (!challenge || votingId) return;
    setVotingId(entryId);
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, voteCount: e.voteCount + 1 } : e));
    try {
      const r = await fetch(`/api/challenges/${challenge.id}/entries/${entryId}/vote`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error();
    } catch {
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, voteCount: Math.max(0, e.voteCount - 1) } : e));
      toast({ title: "Couldn\u2019t register vote", description: "Please try again.", variant: "destructive" });
    } finally {
      setVotingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950">
        <Nav />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-stone-600" />
        </div>
      </div>
    );
  }

  if (notFound || !challenge) {
    return (
      <div className="min-h-screen bg-stone-950">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <Flame size={32} className="mx-auto mb-3 text-stone-700" />
          <p className="text-stone-400 text-sm mb-4">Challenge not found.</p>
          <Link href="/challenges">
            <button className="rounded-full border border-white/10 px-5 py-2 text-sm text-stone-300 hover:border-amber-500/40 transition-colors">
              Back to Challenges
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const isActive = challenge.status === "active";
  const isUpcoming = challenge.status === "upcoming";
  const isEnded = challenge.status === "ended";

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-28 md:pb-8">
      <Nav />
      <div className="max-w-2xl mx-auto px-4 pt-16">
        <Link href="/challenges" className="mt-4 mb-5 inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-400 transition-colors">
          <ChevronLeft size={14} /> Back to Challenges
        </Link>

        {/* Header */}
        <div className="rounded-2xl border border-amber-500/20 bg-stone-900/60 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{challenge.emoji}</span>
              <div>
                <h1 className="text-xl font-bold leading-tight">{challenge.title}</h1>
                {challenge.technique && <p className="text-xs text-amber-400/80 mt-0.5">{challenge.technique}</p>}
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
              isActive ? "bg-green-500/20 text-green-400" :
              isUpcoming ? "bg-sky-500/20 text-sky-400" :
              "bg-stone-700 text-stone-400"
            }`}>
              {isActive ? "LIVE" : isUpcoming ? "SOON" : "ENDED"}
            </span>
          </div>

          <p className="text-sm text-stone-300 leading-relaxed">{challenge.description}</p>

          <div className="rounded-xl border border-white/8 bg-stone-950/40 p-3.5">
            <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">The prompt</p>
            <p className="text-sm text-stone-200 leading-relaxed">{challenge.prompt}</p>
          </div>

          {challenge.prizeDescription && (
            <div className="flex items-center gap-2 text-sm text-amber-300">
              <Trophy className="w-4 h-4 flex-shrink-0" />
              <span>{challenge.prizeDescription}</span>
            </div>
          )}
          {challenge.sponsoredBy && (
            <p className="text-xs text-stone-500">Sponsored by {challenge.sponsoredBy}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-stone-400 pt-1 border-t border-white/5">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{challenge.entryCount.toLocaleString()} entries</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {isUpcoming ? `Starts ${formatDate(challenge.startsAt)}` : isEnded ? `Ended ${formatDate(challenge.endsAt)}` : timeLeft(challenge.endsAt)}
            </span>
          </div>

          <p className="text-xs text-stone-500 font-mono">#{challenge.hashtag}</p>

          {/* CTA */}
          {isActive && (
            <button
              onClick={handleEnter}
              disabled={entered || entering}
              className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all ${
                entered
                  ? "bg-green-500/20 text-green-400 cursor-default"
                  : "bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95"
              }`}
            >
              {entering ? <Loader2 className="w-4 h-4 animate-spin" /> :
               entered ? <><CheckCircle className="w-4 h-4" /> You&rsquo;re entered</> :
               <><Zap className="w-4 h-4" /> Enter this challenge</>}
            </button>
          )}
        </div>

        {/* Entries leaderboard */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-stone-300 mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
          </h2>
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-stone-900/50 p-6 text-center text-sm text-stone-500">
              No entries yet. {isActive ? "Be the first to enter!" : ""}
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((e, i) => (
                <div
                  key={e.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    e.isWinner ? "border-amber-500/40 bg-amber-500/5" : "border-white/8 bg-stone-900/50"
                  }`}
                >
                  <span className={`w-7 text-center text-sm font-bold ${i === 0 ? "text-amber-400" : "text-stone-500"}`}>
                    {e.isWinner ? <Trophy className="w-4 h-4 mx-auto text-amber-400" /> : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-200">
                      {e.postId ? "Submission" : "Entry"}{e.isWinner ? " · Winner" : ""}
                    </p>
                    <p className="text-[11px] text-stone-500">{e.voteCount.toLocaleString()} vote{e.voteCount !== 1 ? "s" : ""}</p>
                  </div>
                  {e.postId && (
                    <Link
                      href={`/posts/${e.postId}`}
                      className="text-[11px] text-amber-400/80 hover:text-amber-300 transition-colors"
                    >
                      View post
                    </Link>
                  )}
                  {!isEnded && (
                    <button
                      onClick={() => handleVote(e.id)}
                      disabled={votingId === e.id}
                      className="flex items-center gap-1 rounded-full border border-white/8 px-3 py-1.5 text-xs text-stone-300 hover:border-rose-400/40 hover:text-rose-300 transition-colors disabled:opacity-50"
                    >
                      {votingId === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heart className="w-3 h-3" />}
                      Vote
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
