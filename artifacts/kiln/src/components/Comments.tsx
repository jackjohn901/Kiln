import { useState, useRef, useEffect } from "react";
import { X, Heart, Send, CornerDownRight, ChevronDown, ChevronUp } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { ParsedCaption } from "@/lib/parseCaption";
import RelativeTime from "@/components/RelativeTime";


interface ApiComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  likeCount: number;
  replyCount: number;
  parentCommentId: string | null;
  createdAt: string;
  replies: ApiComment[];
}

interface Props {
  postId: string;
  artistName: string;
  onClose: () => void;
}

function CommentAvatar({ name, url, size = 8 }: { name: string; url: string | null; size?: number }) {
  return url ? (
    <img src={url} alt={name} className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0 mt-0.5`} />
  ) : (
    <div className={`w-${size} h-${size} rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5`}>
      <span className="text-xs font-bold text-white">{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

export default function Comments({ postId, artistName, onClose }: Props) {
  const { profile } = useProfile();
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const rawId = postId.startsWith("db-") ? postId.slice(3) : postId;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/posts/${rawId}/comments`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setComments(data.comments ?? []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [rawId]);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || submitting || !profile) return;
    setSubmitting(true);
    setText("");
    const parentId = replyingTo?.id ?? undefined;
    const parentName = replyingTo?.authorName;
    setReplyingTo(null);
    try {
      const res = await fetch(`/api/posts/${rawId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, parentId }),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json() as { comment: ApiComment };
        if (parentId) {
          setComments((prev) => prev.map((c) =>
            c.id === parentId
              ? { ...c, replyCount: c.replyCount + 1, replies: [...(c.replies ?? []), data.comment] }
              : c
          ));
          setExpandedReplies((s) => new Set([...s, parentId]));
        } else {
          setComments((prev) => [data.comment, ...prev]);
          listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }
        void parentName; // suppress unused warning
      }
    } catch {
      setText(trimmed);
    } finally {
      setSubmitting(false);
    }
  }

  function startReply(comment: ApiComment) {
    setReplyingTo({ id: comment.id, authorName: comment.authorName });
    setText(`@${comment.authorName.replace(/\s+/g, "")} `);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleLike(commentId: string) {
    if (liked[commentId]) return;
    setLiked((p) => ({ ...p, [commentId]: true }));
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) return { ...c, likeCount: c.likeCount + 1 };
        return { ...c, replies: (c.replies ?? []).map((r) => r.id === commentId ? { ...r, likeCount: r.likeCount + 1 } : r) };
      })
    );
  }

  function toggleReplies(commentId: string) {
    setExpandedReplies((s) => {
      const next = new Set(s);
      if (next.has(commentId)) next.delete(commentId); else next.add(commentId);
      return next;
    });
  }

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="relative flex flex-col bg-stone-900 rounded-t-2xl max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
          <span className="text-sm font-semibold text-stone-100">{totalCount} Comments</span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
          {loading && <div className="text-center py-10 text-stone-500 text-sm">Loading…</div>}
          {!loading && comments.length === 0 && (
            <div className="text-center py-10 text-stone-500">
              <p className="text-sm">No comments yet.</p>
              <p className="text-xs mt-1">Be the first to say something about {artistName}'s work.</p>
            </div>
          )}
          {comments.map((c) => {
            const hasReplies = (c.replies?.length ?? 0) > 0;
            const expanded = expandedReplies.has(c.id);
            return (
              <div key={c.id} className="flex gap-3">
                <CommentAvatar name={c.authorName} url={c.authorAvatarUrl} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-stone-200">{c.authorName}</span>
                    <RelativeTime since={c.createdAt} className="text-xs text-stone-500" />
                  </div>
                  <p className="text-sm text-stone-300 mt-0.5 leading-relaxed">
                    <ParsedCaption text={c.text} />
                  </p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <button
                      className={`flex items-center gap-1 text-xs transition-colors ${liked[c.id] ? "text-rose-400" : "text-stone-500 hover:text-stone-300"}`}
                      onClick={() => handleLike(c.id)}
                    >
                      <Heart size={11} fill={liked[c.id] ? "currentColor" : "none"} />
                      {c.likeCount > 0 && c.likeCount}
                    </button>
                    {profile && (
                      <button
                        className="flex items-center gap-1 text-xs text-stone-500 hover:text-amber-400 transition-colors"
                        onClick={() => startReply(c)}
                      >
                        <CornerDownRight size={11} />
                        Reply
                      </button>
                    )}
                  </div>

                  {hasReplies && (
                    <button
                      className="flex items-center gap-1.5 mt-2 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                      onClick={() => toggleReplies(c.id)}
                    >
                      {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {expanded ? "Hide" : `View ${c.replies!.length}`} {c.replies!.length === 1 ? "reply" : "replies"}
                    </button>
                  )}

                  {expanded && hasReplies && (
                    <div className="mt-2 space-y-3 pl-2 border-l border-stone-800">
                      {c.replies!.map((r) => (
                        <div key={r.id} className="flex gap-2">
                          <CommentAvatar name={r.authorName} url={r.authorAvatarUrl} size={6} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-semibold text-stone-300">{r.authorName}</span>
                              <RelativeTime since={r.createdAt} className="text-xs text-stone-600" />
                            </div>
                            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                              <ParsedCaption text={r.text} />
                            </p>
                            <button
                              className={`flex items-center gap-1 mt-1 text-[10px] transition-colors ${liked[r.id] ? "text-rose-400" : "text-stone-600 hover:text-stone-400"}`}
                              onClick={() => handleLike(r.id)}
                            >
                              <Heart size={9} fill={liked[r.id] ? "currentColor" : "none"} />
                              {r.likeCount > 0 && r.likeCount}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-stone-800 px-4 py-3 flex flex-col gap-2">
          {replyingTo && (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <CornerDownRight size={11} className="text-amber-500" />
              <span>Replying to <span className="text-amber-400">{replyingTo.authorName}</span></span>
              <button onClick={() => { setReplyingTo(null); setText(""); }} className="ml-auto text-stone-600 hover:text-stone-400">
                <X size={12} />
              </button>
            </div>
          )}
          {profile ? (
            <div className="flex items-center gap-3">
              <CommentAvatar name={profile.name} url={profile.avatarUrl ?? null} />
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                placeholder={replyingTo ? `Reply to ${replyingTo.authorName}…` : "Add a comment…"}
                className="flex-1 bg-stone-800 rounded-full px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || submitting}
                className="text-amber-400 disabled:text-stone-600 hover:text-amber-300 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          ) : (
            <p className="flex-1 text-center text-sm text-stone-500 py-1">
              <a href="/setup" className="text-amber-400 hover:text-amber-300">Create a profile</a> to join the conversation
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
