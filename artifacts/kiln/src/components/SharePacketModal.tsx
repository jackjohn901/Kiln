import { useEffect, useState } from "react";
import { X, Check, ExternalLink, Mail, Copy, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  artistId: string;
  artistName: string;
  bio: string | null;
  packetUrl: string;
  onClose: () => void;
}

interface PlatformConfig {
  id: string;
  label: string;
  description: string;
  color: string;
  textColor: string;
  symbol: string;
  category: "url" | "api" | "copy";
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "twitter",
    label: "X / Twitter",
    description: "Opens the tweet composer",
    color: "bg-black",
    textColor: "text-white",
    symbol: "𝕏",
    category: "url",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Opens a LinkedIn post",
    color: "bg-[#0A66C2]",
    textColor: "text-white",
    symbol: "in",
    category: "url",
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Opens the share dialog",
    color: "bg-[#1877F2]",
    textColor: "text-white",
    symbol: "f",
    category: "url",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    description: "Creates a pin with your work",
    color: "bg-[#E60023]",
    textColor: "text-white",
    symbol: "P",
    category: "url",
  },
  {
    id: "bluesky",
    label: "Bluesky",
    description: "Posts via Kiln's Bluesky account",
    color: "bg-[#0085FF]",
    textColor: "text-white",
    symbol: "🦋",
    category: "api",
  },
  {
    id: "mastodon",
    label: "Mastodon",
    description: "Posts via Kiln's Mastodon account",
    color: "bg-[#6364FF]",
    textColor: "text-white",
    symbol: "🐘",
    category: "api",
  },
  {
    id: "artsy",
    label: "Artsy",
    description: "Copy link to paste in your Artsy bio",
    color: "bg-stone-900",
    textColor: "text-white",
    symbol: "A",
    category: "copy",
  },
  {
    id: "email",
    label: "Email",
    description: "Opens your email with a draft",
    color: "bg-stone-700",
    textColor: "text-white",
    symbol: "✉",
    category: "url",
  },
];

type SharedState = "idle" | "loading" | "success" | "error";

export default function SharePacketModal({ artistId, artistName, bio, packetUrl, onClose }: Props) {
  const { isAuthenticated, login } = useAuth();
  const [platformStates, setPlatformStates] = useState<Record<string, SharedState>>({});
  const [platformMessages, setPlatformMessages] = useState<Record<string, string>>({});
  const [serverConfig, setServerConfig] = useState<{
    blueskyConfigured: boolean;
    mastodonConfigured: boolean;
    connectedPlatforms: string[];
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetch("/api/press-packet/platforms", { credentials: "include" })
      .then(r => r.json())
      .then(setServerConfig)
      .catch(() => {});
  }, []);

  function setStateFor(platform: string, state: SharedState, message?: string) {
    setPlatformStates(s => ({ ...s, [platform]: state }));
    if (message !== undefined) setPlatformMessages(m => ({ ...m, [platform]: message }));
  }

  function shareViaUrl(platform: string) {
    const encoded = encodeURIComponent(packetUrl);
    const text = encodeURIComponent(`${artistName} — press packet on Kiln`);

    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encoded}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encoded}&description=${text}`,
      email: `mailto:?subject=${encodeURIComponent(`Press packet — ${artistName}`)}&body=${encodeURIComponent(`Hi,\n\nI wanted to share my press packet with you:\n\n${packetUrl}\n\nIt includes my recent work, bio, and contact details — updated automatically from my Kiln profile.\n\nBest,\n${artistName}`)}`,
    };
    const url = urls[platform];
    if (url) window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
    setStateFor(platform, "success");
    setTimeout(() => setStateFor(platform, "idle"), 3000);
  }

  function copyLink(platform: string) {
    navigator.clipboard.writeText(packetUrl).then(() => {
      setStateFor(platform, "success", platform === "artsy"
        ? "Link copied — paste it into your Artsy bio"
        : "Link copied!");
      setTimeout(() => setStateFor(platform, "idle"), 3000);
    }).catch(() => setStateFor(platform, "error", "Could not copy"));
  }

  async function shareViaApi(platform: string) {
    if (!isAuthenticated) { login(); return; }
    setStateFor(platform, "loading");
    try {
      const resp = await fetch("/api/press-packet/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ platform, artistName, packetUrl, bio }),
      });
      const data = await resp.json() as { success?: boolean; url?: string; error?: string; needsConnection?: boolean };
      if (data.success) {
        const msg = data.url ? `Posted! View at ${data.url}` : "Posted successfully";
        setStateFor(platform, "success", msg);
        if (data.url) setTimeout(() => window.open(data.url, "_blank"), 400);
      } else {
        setStateFor(platform, "error", data.error ?? "Failed to post");
      }
    } catch {
      setStateFor(platform, "error", "Network error — please try again");
    }
    setTimeout(() => setStateFor(platform, "idle", ""), 6000);
  }

  function handleShare(p: PlatformConfig) {
    if (p.category === "url") return shareViaUrl(p.id);
    if (p.category === "copy") return copyLink(p.id);
    if (p.category === "api") return shareViaApi(p.id);
  }

  function getButtonLabel(p: PlatformConfig): string {
    const state = platformStates[p.id] ?? "idle";
    if (state === "loading") return "Posting…";
    if (state === "success") return p.category === "copy" ? "Copied!" : "Done!";
    if (state === "error") return "Retry";
    if (p.category === "url") return "Share";
    if (p.category === "copy") return "Copy link";
    if (p.id === "bluesky" || p.id === "mastodon") {
      if (!isAuthenticated) return "Sign in to post";
      const configured = p.id === "bluesky" ? serverConfig?.blueskyConfigured : serverConfig?.mastodonConfigured;
      return configured ? "Post via Kiln" : "Not yet set up";
    }
    return "Share";
  }

  function isDisabled(p: PlatformConfig): boolean {
    const state = platformStates[p.id] ?? "idle";
    if (state === "loading") return true;
    if (p.category === "api") {
      const configured = p.id === "bluesky" ? serverConfig?.blueskyConfigured : serverConfig?.mastodonConfigured;
      return !isAuthenticated ? false : !configured;
    }
    return false;
  }

  function copyAllLink() {
    navigator.clipboard.writeText(packetUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }).catch(() => {});
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1209] shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/8 px-5 py-4">
          <div>
            <h2 className="font-semibold text-amber-100">Share press packet</h2>
            <p className="mt-0.5 text-xs text-stone-500">Choose where to send {artistName}'s press packet</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 hover:bg-white/8 hover:text-stone-300 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Link bar */}
        <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3">
          <p className="flex-1 truncate rounded bg-stone-900 px-3 py-1.5 font-mono text-xs text-stone-400">
            {packetUrl}
          </p>
          <button
            onClick={copyAllLink}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors"
          >
            {linkCopied ? <><Check size={11} className="text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy link</>}
          </button>
        </div>

        {/* Platform grid */}
        <div className="p-4">
          {/* URL-based platforms */}
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-stone-600">Share anywhere</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PLATFORMS.filter(p => p.category === "url").map(p => (
              <PlatformTile
                key={p.id}
                platform={p}
                state={platformStates[p.id] ?? "idle"}
                message={platformMessages[p.id]}
                buttonLabel={getButtonLabel(p)}
                disabled={isDisabled(p)}
                onShare={() => handleShare(p)}
              />
            ))}
          </div>

          {/* API-based platforms */}
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-stone-600">Post via Kiln's account</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PLATFORMS.filter(p => p.category === "api").map(p => {
              const configured = p.id === "bluesky" ? serverConfig?.blueskyConfigured : serverConfig?.mastodonConfigured;
              return (
                <PlatformTile
                  key={p.id}
                  platform={p}
                  state={platformStates[p.id] ?? "idle"}
                  message={platformMessages[p.id]}
                  buttonLabel={getButtonLabel(p)}
                  disabled={isDisabled(p)}
                  onShare={() => handleShare(p)}
                  badge={!isAuthenticated ? "Sign in required" : !configured ? "Credentials needed" : undefined}
                />
              );
            })}
          </div>

          {/* Copy-based */}
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-stone-600">Profile & portfolio sites</p>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.filter(p => p.category === "copy").map(p => (
              <PlatformTile
                key={p.id}
                platform={p}
                state={platformStates[p.id] ?? "idle"}
                message={platformMessages[p.id]}
                buttonLabel={getButtonLabel(p)}
                disabled={isDisabled(p)}
                onShare={() => handleShare(p)}
              />
            ))}
            {/* Filler: native share if supported */}
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                onClick={() => {
                  navigator.share({ title: `${artistName} — press packet`, url: packetUrl }).catch(() => {});
                }}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-stone-900/60 p-3 text-left hover:border-amber-500/30 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-700 text-base">📱</div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-200">More options</p>
                  <p className="text-[10px] text-stone-500">System share sheet</p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="border-t border-white/8 px-5 py-3 text-[10px] text-stone-600">
          This link always shows {artistName}'s latest work — share it once and it stays current.
        </div>
      </div>
    </div>
  );
}

function PlatformTile({
  platform, state, message, buttonLabel, disabled, onShare, badge,
}: {
  platform: PlatformConfig;
  state: SharedState;
  message?: string;
  buttonLabel: string;
  disabled: boolean;
  onShare: () => void;
  badge?: string;
}) {
  const isSuccess = state === "success";
  const isError = state === "error";
  const isLoading = state === "loading";

  return (
    <div className={`relative flex flex-col gap-2.5 rounded-xl border p-3 transition-colors ${
      isSuccess ? "border-emerald-500/30 bg-emerald-500/5" :
      isError ? "border-rose-500/30 bg-rose-500/5" :
      "border-white/8 bg-stone-900/60 hover:border-amber-500/20"
    }`}>
      {badge && (
        <span className="absolute right-2 top-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${platform.color} ${platform.textColor}`}>
          {platform.symbol}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-stone-200 leading-tight">{platform.label}</p>
          {message ? (
            <p className={`text-[10px] leading-tight truncate ${isError ? "text-rose-400" : "text-emerald-400"}`}>{message}</p>
          ) : (
            <p className="text-[10px] text-stone-500 leading-tight">{platform.description}</p>
          )}
        </div>
      </div>
      <button
        onClick={onShare}
        disabled={disabled && state !== "error"}
        className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
          isSuccess ? "bg-emerald-500/20 text-emerald-300" :
          isError ? "bg-rose-500/20 text-rose-300" :
          disabled ? "cursor-not-allowed bg-stone-800 text-stone-600" :
          "bg-amber-500 text-stone-950 hover:bg-amber-400"
        }`}
      >
        {isLoading && <Loader2 size={11} className="animate-spin" />}
        {isSuccess && <Check size={11} />}
        {isError && <ExternalLink size={11} />}
        {buttonLabel}
      </button>
    </div>
  );
}
