import { useState, useEffect } from "react";
import { Star, ThumbsUp, X, Send } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";

interface ApiReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

interface Stats {
  avg: string | null;
  reviewCount: number;
}

interface Props {
  targetId: string;
  targetType: "workshop" | "commission" | "listing";
  isVerifiedPurchaser?: boolean;
}

function Stars({ rating, size = 14, interactive = false, onRate }: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRate?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          disabled={!interactive}
          onClick={() => onRate?.(n)}
          onMouseEnter={() => interactive && setHovered(n)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={size}
            fill={(hovered || rating) >= n ? "#f59e0b" : "none"}
            stroke={(hovered || rating) >= n ? "#f59e0b" : "#57534e"}
          />
        </button>
      ))}
    </div>
  );
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}yr ago`;
}

export default function ReviewsSection({ targetId, targetType, isVerifiedPurchaser = false }: Props) {
  const { profile } = useProfile();
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [stats, setStats] = useState<Stats>({ avg: null, reviewCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [helpful, setHelpful] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reviews/${targetType}/${targetId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { reviews: ApiReview[]; avgRating: string | null; reviewCount: number } | null) => {
        if (data) {
          setReviews(data.reviews);
          setStats({ avg: data.avgRating, reviewCount: data.reviewCount });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetId, targetType]);

  const alreadyReviewed = reviews.some((r) => r.reviewerId === profile?.id);
  const avgNum = stats.avg ? parseFloat(stats.avg) : 0;

  async function submitReview() {
    if (!profile || !rating || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetId, targetType, rating, title: title.trim() || null, body: body.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json() as { review: ApiReview };
        setReviews((prev) => [data.review, ...prev]);
        setStats((s) => ({ ...s, reviewCount: s.reviewCount + 1 }));
        setShowForm(false);
        setTitle("");
        setBody("");
        setRating(5);
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  async function markHelpful(reviewId: string) {
    if (helpful.has(reviewId)) return;
    setHelpful((s) => new Set([...s, reviewId]));
    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r));
    await fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST", credentials: "include" }).catch(() => {});
  }

  if (loading) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-stone-100">Reviews</h3>
          {stats.reviewCount > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <Stars rating={Math.round(avgNum)} />
              <span className="text-sm text-stone-400">
                {avgNum.toFixed(1)} · {stats.reviewCount} {stats.reviewCount === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}
        </div>
        {profile && !alreadyReviewed && (isVerifiedPurchaser || targetType === "commission") && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
          >
            Write a review
          </button>
        )}
      </div>

      {/* Write form */}
      {showForm && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-stone-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-200">Your review</p>
            <button onClick={() => setShowForm(false)} className="text-stone-600 hover:text-stone-400">
              <X size={15} />
            </button>
          </div>
          <div>
            <p className="text-xs text-stone-500 mb-2">Rating</p>
            <Stars rating={rating} size={20} interactive onRate={setRating} />
          </div>
          <input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none"
          />
          <textarea
            rows={3}
            placeholder="Share your experience…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500/40 focus:outline-none resize-none"
          />
          <button
            onClick={submitReview}
            disabled={submitting || rating === 0}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            <Send size={14} />
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 && (
        <p className="text-sm text-stone-600 py-4 text-center">
          No reviews yet.
          {(isVerifiedPurchaser || targetType === "commission") && profile && !alreadyReviewed
            ? " Be the first!"
            : ""}
        </p>
      )}

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/8 bg-stone-900/40 p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {r.reviewerAvatarUrl ? (
                  <img src={r.reviewerAvatarUrl} alt={r.reviewerName} className="h-8 w-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700 shrink-0">
                    <span className="text-xs font-bold text-white">{r.reviewerName.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-stone-200">{r.reviewerName}</p>
                  <p className="text-[10px] text-stone-600">{timeAgo(r.createdAt)}</p>
                </div>
              </div>
              <Stars rating={r.rating} size={12} />
            </div>
            {r.title && <p className="text-sm font-medium text-stone-200">{r.title}</p>}
            {r.body && <p className="text-sm text-stone-400 leading-relaxed">{r.body}</p>}
            <div className="flex items-center gap-3 pt-1">
              {r.isVerifiedPurchase && (
                <span className="text-[10px] text-emerald-500 font-medium">✓ Verified</span>
              )}
              <button
                onClick={() => markHelpful(r.id)}
                disabled={helpful.has(r.id)}
                className={`flex items-center gap-1 text-[10px] transition-colors ${helpful.has(r.id) ? "text-amber-400" : "text-stone-600 hover:text-stone-400"}`}
              >
                <ThumbsUp size={10} />
                Helpful {r.helpfulCount > 0 && `(${r.helpfulCount})`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
