import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ChevronLeft, Flame, Instagram, Share2, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";

interface SocialConnection {
  platform: "instagram" | "tiktok" | "facebook";
  platformUsername: string | null;
  autoPost: boolean;
}

const PLATFORM_META: Record<string, { label: string; color: string; bg: string; textColor: string }> = {
  instagram: { label: "Instagram", color: "border-purple-500/40", bg: "bg-purple-500/10", textColor: "text-purple-400" },
  tiktok: { label: "TikTok", color: "border-stone-500/40", bg: "bg-stone-700/40", textColor: "text-stone-300" },
  facebook: { label: "Facebook", color: "border-blue-500/40", bg: "bg-blue-500/10", textColor: "text-blue-400" },
};

export default function KilnOpening() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [result, setResult] = useState<{ success: boolean; sharedTo: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/me/social-connections", { credentials: "include" })
      .then((r) => r.json())
      .then((data: SocialConnection[]) => setConnections(Array.isArray(data) ? data : []))
      .catch(() => setConnections([]))
      .finally(() => setConnectionsLoading(false));
  }, [user]);

  const activeConnections = connections.filter((c) => c.autoPost);

  async function handleAnnounce(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/kiln-opening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, description, imageUrl: imageUrl || undefined }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed");
      }
      const data = await res.json() as { success: boolean; sharedTo: string[] };
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground text-sm">
            <Link href="/login" className="text-primary hover:underline">Sign in</Link> to announce a kiln opening.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-28 md:pb-8">
      <Nav />
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/settings" className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Kiln Opening Reveal</h1>
            <p className="text-xs text-muted-foreground">Announce your kiln opening across all platforms simultaneously</p>
          </div>
        </div>

        {result ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Flame size={32} className="text-amber-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Opening announced!</h2>
              <p className="text-sm text-muted-foreground">Your kiln opening was shared to:</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {result.sharedTo.map((platform) => {
                const meta = PLATFORM_META[platform];
                return meta ? (
                  <span key={platform} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${meta.color} ${meta.bg} ${meta.textColor}`}>
                    <CheckCircle2 size={12} />
                    {meta.label}
                  </span>
                ) : null;
              })}
              {result.sharedTo.length === 0 && (
                <p className="text-sm text-muted-foreground">No platforms connected with auto-post enabled.</p>
              )}
            </div>
            <button
              onClick={() => { setResult(null); setTitle(""); setDescription(""); setImageUrl(""); }}
              className="mt-4 text-xs text-primary hover:underline"
            >
              Announce another opening
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 rounded-2xl border border-white/8 bg-stone-900/60 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Share2 size={14} className="text-amber-400" />
                <span className="text-xs font-medium text-stone-300">Connected platforms</span>
              </div>
              {connectionsLoading ? (
                <div className="flex items-center gap-2 text-stone-500 text-xs">
                  <Loader2 size={12} className="animate-spin" /> Loading…
                </div>
              ) : activeConnections.length === 0 ? (
                <div className="flex items-start gap-2 text-sm text-amber-400/80">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>
                    No platforms with auto-post enabled.{" "}
                    <Link href="/social-sync" className="underline hover:text-amber-300">Connect in Social Sync →</Link>
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeConnections.map((c) => {
                    const meta = PLATFORM_META[c.platform];
                    return meta ? (
                      <span key={c.platform} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${meta.color} ${meta.bg} ${meta.textColor}`}>
                        <CheckCircle2 size={10} />
                        {meta.label}
                        {c.platformUsername && <span className="opacity-60">· @{c.platformUsername}</span>}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            <form onSubmit={handleAnnounce} className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-stone-900/60 overflow-hidden">
                <div className="px-5 pt-5 pb-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1.5">Opening name *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Spring Firing Reveal · Anagama #4 Opening…"
                      className="w-full bg-stone-800/60 border border-white/8 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1.5">What's coming out?</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="20+ pieces from this firing — bowls, cups, sculptural work. Six weeks in the making…"
                      rows={3}
                      className="w-full bg-stone-800/60 border border-white/8 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1.5">Teaser image URL <span className="text-stone-600">(optional)</span></label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://…"
                      className="w-full bg-stone-800/60 border border-white/8 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-400/80 space-y-1">
                <p className="font-medium text-amber-300">What gets posted</p>
                <p>Each platform gets a caption adapted by AI — Instagram gets hashtags and a story, TikTok gets a hook, Facebook gets the community angle.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !title.trim() || activeConnections.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-3.5 rounded-2xl transition-colors text-sm"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Announcing…</>
                ) : (
                  <><Flame size={16} /> Announce Opening</>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
