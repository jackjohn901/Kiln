import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { ChevronLeft, Check, Zap, ToggleLeft, ToggleRight, Trash2, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useProfile } from "@/contexts/ProfileContext";

type Platform = "instagram" | "tiktok" | "facebook";

type Connection = {
  platform: Platform;
  platformUsername: string | null;
  platformAvatarUrl: string | null;
  autoPost: boolean;
  connectedAt: string;
};

const PLATFORMS: { id: Platform; label: string; color: string; bg: string; border: string; description: string; icon: string }[] = [
  {
    id: "instagram",
    label: "Instagram",
    icon: "📷",
    color: "text-pink-400",
    bg: "bg-gradient-to-br from-purple-900/30 to-pink-900/30",
    border: "border-pink-500/20",
    description: "Auto-post reels and photos to your Instagram feed",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: "🎵",
    color: "text-cyan-400",
    bg: "bg-gradient-to-br from-stone-900/60 to-cyan-900/20",
    border: "border-cyan-500/20",
    description: "Publish your video reels directly to TikTok",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "📘",
    color: "text-blue-400",
    bg: "bg-gradient-to-br from-stone-900/60 to-blue-900/20",
    border: "border-blue-500/20",
    description: "Share posts and videos to your Facebook Page",
  },
];

export default function SocialSync() {
  const { profile } = useProfile();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const justConnected = params.get("connected") as Platform | null;
  const connectError = params.get("error");

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<Platform | null>(null);
  const [togglingAutoPost, setTogglingAutoPost] = useState<Platform | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    if (justConnected) {
      setBanner({ type: "success", msg: `${justConnected.charAt(0).toUpperCase() + justConnected.slice(1)} connected! Your posts will now auto-publish there.` });
      setTimeout(() => setBanner(null), 5000);
    } else if (connectError) {
      setBanner({ type: "error", msg: connectError });
      setTimeout(() => setBanner(null), 7000);
    }
  }, [justConnected, connectError]);

  useEffect(() => {
    fetch("/api/me/social-connections", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Connection[]) => setConnections(data))
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, []);

  function isConnected(platform: Platform) {
    return connections.some((c) => c.platform === platform);
  }

  function getConnection(platform: Platform) {
    return connections.find((c) => c.platform === platform);
  }

  async function handleDisconnect(platform: Platform) {
    setDisconnecting(platform);
    try {
      const res = await fetch(`/api/me/social-connections/${platform}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setConnections((prev) => prev.filter((c) => c.platform !== platform));
    } finally {
      setDisconnecting(null);
    }
  }

  async function handleToggleAutoPost(platform: Platform, current: boolean) {
    setTogglingAutoPost(platform);
    try {
      const res = await fetch(`/api/me/social-connections/${platform}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ autoPost: !current }),
      });
      if (res.ok) {
        setConnections((prev) =>
          prev.map((c) => (c.platform === platform ? { ...c, autoPost: !current } : c))
        );
      }
    } finally {
      setTogglingAutoPost(null);
    }
  }

  const connectedCount = connections.length;

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <Link href="/setup" className="text-amber-400 underline text-sm">Set up your profile first</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e] pb-28 md:pb-8">
      <Nav />
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/settings" className="rounded-full bg-stone-800/60 p-2 text-stone-400 hover:text-stone-200 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-serif text-amber-100">Social Sync</h1>
            <p className="text-xs text-stone-500">Auto-post to every platform at once</p>
          </div>
        </div>

        {/* Banner */}
        {banner && (
          <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${banner.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-300"}`}>
            {banner.type === "success" ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
            {banner.msg}
          </div>
        )}

        {/* How it works */}
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-5 py-4 space-y-2">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            <p className="text-xs font-semibold text-amber-300">How it works</p>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Connect your accounts once. Every time you post on Kiln, it automatically publishes to all connected platforms simultaneously — no extra steps needed.
          </p>
          {connectedCount > 0 && (
            <p className="text-xs text-amber-400 font-medium">
              {connectedCount} platform{connectedCount !== 1 ? "s" : ""} connected · next post will sync automatically
            </p>
          )}
        </div>

        {/* Platform cards */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-stone-600" />
          </div>
        ) : (
          <div className="space-y-3">
            {PLATFORMS.map((p) => {
              const conn = getConnection(p.id);
              const connected = !!conn;
              return (
                <div key={p.id} className={`rounded-2xl border ${p.border} ${p.bg} overflow-hidden`}>
                  {/* Platform header */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.icon}</span>
                      <div>
                        <p className={`text-sm font-semibold ${p.color}`}>{p.label}</p>
                        <p className="text-xs text-stone-500">{p.description}</p>
                      </div>
                    </div>
                    {connected ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                        <Check size={10} /> Connected
                      </span>
                    ) : (
                      <a
                        href={`/api/social-auth/${p.id}/connect`}
                        className={`rounded-full border ${p.border} px-4 py-1.5 text-xs font-semibold ${p.color} hover:bg-white/5 transition-colors flex items-center gap-1.5`}
                      >
                        <ExternalLink size={11} /> Connect
                      </a>
                    )}
                  </div>

                  {/* Connected details */}
                  {connected && conn && (
                    <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        {conn.platformAvatarUrl && (
                          <img src={conn.platformAvatarUrl} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                        )}
                        <span className="text-xs text-stone-400 truncate">
                          {conn.platformUsername ? `@${conn.platformUsername}` : "Connected"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Auto-post toggle */}
                        <button
                          onClick={() => void handleToggleAutoPost(p.id, conn.autoPost)}
                          disabled={togglingAutoPost === p.id}
                          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors"
                          title={conn.autoPost ? "Auto-post on" : "Auto-post off"}
                        >
                          {togglingAutoPost === p.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : conn.autoPost ? (
                            <ToggleRight size={18} className="text-amber-400" />
                          ) : (
                            <ToggleLeft size={18} />
                          )}
                          <span className="hidden sm:inline">{conn.autoPost ? "Auto" : "Manual"}</span>
                        </button>

                        {/* Disconnect */}
                        <button
                          onClick={() => void handleDisconnect(p.id)}
                          disabled={disconnecting === p.id}
                          className="text-stone-600 hover:text-red-400 transition-colors"
                          title="Disconnect"
                        >
                          {disconnecting === p.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Setup guide */}
        <div className="rounded-2xl border border-white/8 bg-stone-900/40 px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-stone-400">First time connecting?</p>
          <div className="space-y-2 text-xs text-stone-500 leading-relaxed">
            <p><span className="text-stone-400 font-medium">Instagram & Facebook</span> — requires a Business or Creator account. Personal accounts are not supported by the platforms' APIs.</p>
            <p><span className="text-stone-400 font-medium">TikTok</span> — any TikTok account can connect. Videos only — images post as TikTok photo posts.</p>
            <p><span className="text-stone-400 font-medium">Auto vs Manual</span> — toggle "Auto" off on any platform to pause auto-posting there without disconnecting.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
