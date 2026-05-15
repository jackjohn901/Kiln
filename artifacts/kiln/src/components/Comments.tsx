import { useState, useRef, useEffect } from "react";
import { X, Heart, Send } from "lucide-react";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface Props {
  postId: string;
  artistName: string;
  onClose: () => void;
}

export default function Comments({ postId, artistName, onClose }: Props) {
  const { getComments, addComment, likeComment } = useSocial();
  const { profile } = useProfile();
  const [text, setText] = useState("");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const comments = getComments(postId);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || !profile) return;
    addComment(
      postId,
      profile.id ?? "user",
      profile.name,
      profile.avatarUrl ?? `https://picsum.photos/seed/${profile.id}/60/60`,
      trimmed
    );
    setText("");
    setTimeout(() => {
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  }

  function handleLike(commentId: string) {
    if (liked[commentId]) return;
    setLiked((p) => ({ ...p, [commentId]: true }));
    likeComment(postId, commentId);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="relative flex flex-col bg-stone-900 rounded-t-2xl max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
          <span className="text-sm font-semibold text-stone-100">{comments.length} Comments</span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
          {comments.length === 0 && (
            <div className="text-center py-10 text-stone-500">
              <p className="text-sm">No comments yet.</p>
              <p className="text-xs mt-1">Be the first to say something about {artistName}'s work.</p>
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <img
                src={c.authorAvatarUrl}
                alt={c.authorName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-stone-200">{c.authorName}</span>
                  <span className="text-xs text-stone-500">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-stone-300 mt-0.5 leading-relaxed">{c.text}</p>
                <button
                  className={`flex items-center gap-1 mt-1 text-xs transition-colors ${liked[c.id] ? "text-rose-400" : "text-stone-500 hover:text-stone-300"}`}
                  onClick={() => handleLike(c.id)}
                >
                  <Heart size={11} fill={liked[c.id] ? "currentColor" : "none"} />
                  {c.likes + (liked[c.id] ? 1 : 0) > 0 && (c.likes + (liked[c.id] ? 1 : 0))}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-stone-800 px-4 py-3 flex items-center gap-3">
          {profile ? (
            <>
              <img
                src={profile.avatarUrl ?? `https://picsum.photos/seed/${profile.id}/60/60`}
                alt={profile.name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Add a comment…"
                className="flex-1 bg-stone-800 rounded-full px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={handleSubmit}
                disabled={!text.trim()}
                className="text-amber-400 disabled:text-stone-600 hover:text-amber-300 transition-colors"
              >
                <Send size={18} />
              </button>
            </>
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
