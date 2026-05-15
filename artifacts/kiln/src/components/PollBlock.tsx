import { useState } from "react";
import { BarChart2, Check } from "lucide-react";

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  endsAt: string;
}

const POLL_VOTES_KEY = "kiln_poll_votes_v1";

function getVoted(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(POLL_VOTES_KEY) ?? "{}"); } catch { return {}; }
}

function recordVote(pollId: string, optionId: string) {
  const v = getVoted();
  v[pollId] = optionId;
  try { localStorage.setItem(POLL_VOTES_KEY, JSON.stringify(v)); } catch {}
}

export default function PollBlock({ poll, compact = false }: { poll: Poll; compact?: boolean }) {
  const [localVote, setLocalVote] = useState<string | null>(() => getVoted()[poll.id] ?? null);
  const [localVotes, setLocalVotes] = useState<Record<string, number>>(() =>
    Object.fromEntries(poll.options.map((o) => [o.id, o.votes]))
  );

  const totalVotes = Object.values(localVotes).reduce((s, v) => s + v, 0) + (localVote ? 1 : 0);
  const hasVoted = !!localVote;

  const ended = new Date(poll.endsAt).getTime() < Date.now();
  const timeLeft = (() => {
    const diff = new Date(poll.endsAt).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h left`;
    return `${Math.floor(hours / 24)}d left`;
  })();

  function vote(optionId: string) {
    if (hasVoted || ended) return;
    setLocalVote(optionId);
    setLocalVotes((prev) => ({ ...prev, [optionId]: (prev[optionId] ?? 0) + 1 }));
    recordVote(poll.id, optionId);
  }

  const totalWithVote = totalVotes + (hasVoted ? 0 : 0);

  return (
    <div className={`rounded-2xl border border-white/10 bg-stone-900/60 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={13} className="text-amber-400" />
        <p className={`font-semibold text-stone-200 ${compact ? "text-xs" : "text-sm"}`}>{poll.question}</p>
      </div>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const votes = localVotes[option.id] ?? 0;
          const myVotes = votes + (localVote === option.id ? 1 : 0);
          const pct = totalVotes > 0 ? Math.round((myVotes / totalVotes) * 100) : 0;
          const isChosen = localVote === option.id;

          return (
            <button
              key={option.id}
              onClick={() => vote(option.id)}
              disabled={hasVoted || ended}
              className="relative w-full overflow-hidden rounded-xl border text-left transition-all group disabled:cursor-default"
              style={{
                borderColor: isChosen
                  ? "rgba(245,158,11,0.5)"
                  : hasVoted
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(255,255,255,0.08)",
              }}
            >
              {/* Fill bar */}
              {hasVoted && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ${isChosen ? "bg-amber-500/15" : "bg-stone-800/60"}`}
                  style={{ width: `${pct}%` }}
                />
              )}

              <div className={`relative flex items-center justify-between ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}>
                <div className="flex items-center gap-2">
                  {isChosen && <Check size={11} className="text-amber-400 shrink-0" />}
                  <span className={`${compact ? "text-xs" : "text-sm"} ${isChosen ? "font-semibold text-amber-200" : "text-stone-300"}`}>
                    {option.text}
                  </span>
                </div>
                {hasVoted && (
                  <span className={`text-[11px] font-bold tabular-nums ${isChosen ? "text-amber-400" : "text-stone-600"}`}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-[10px] text-stone-700">{totalVotes.toLocaleString()} {totalVotes === 1 ? "vote" : "votes"}</p>
        <p className={`text-[10px] font-medium ${ended ? "text-stone-700" : "text-amber-600"}`}>{timeLeft}</p>
      </div>
    </div>
  );
}
