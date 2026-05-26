import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { Heart, Users, Share2, DollarSign, MessageCircle, X, Flame, Send, ShoppingBag, ArrowLeft, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useSocial } from "@/contexts/SocialContext";
import { useProfile } from "@/contexts/ProfileContext";
import TipModal from "@/components/TipModal";

const ALL_ARTISTS = [...artists, ...seedArtists];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const CHAT_POOL = [
  ["Clara H.", "🔥 This is incredible work"],
  ["Erik L.", "How long does this piece take to make?"],
  ["Mia T.", "I want this in my collection someday"],
  ["Jordan K.", "First time watching live — absolutely mind-blowing"],
  ["Sam R.", "The color coming through is so rich"],
  ["Alex M.", "❤️❤️❤️"],
  ["Chris W.", "What temperature is the glory hole at right now?"],
  ["Riley N.", "Been following for years, never gets old watching"],
  ["Taylor B.", "Just sent a tip — worth every penny"],
  ["Morgan P.", "Can this technique be done in cobalt blue?"],
  ["Jamie S.", "The gather looks perfect today"],
  ["Casey R.", "I'm a ceramicist and watching glass work is wild"],
  ["Drew P.", "How many years have you been doing this?"],
  ["Harper L.", "The bubble is so even 😍"],
  ["Quinn B.", "Showing this to my whole studio right now"],
  ["Sage M.", "Is that a punty transfer happening?"],
  ["River K.", "What's the music? Love the vibe in here"],
  ["Blake T.", "Commission inquiry sent! Hope to work with you"],
  ["Avery W.", "The way the color wraps around — stunning"],
  ["Peyton C.", "New subscriber! Found you through the challenges"],
];

const STORY_SEEDS = [
  "The gather is heavy today — working with a new batch of optical glass",
  "Starting the annealing process. This piece took 4 hours.",
  "Opening commissions for June. DM me your ideas.",
  "Quick question from chat: yes, the color is applied at the gather stage",
  "This is for a private collector in Portland — hope they love it",
  "First time trying this shoulder technique — going for it live",
];

interface ChatMsg { id: number; user: string; text: string; ts: number; }
interface FloatingHeart { id: number; x: number; }

export default function LiveStudio() {
  const { artistId } = useParams<{ artistId: string }>();
  const [, navigate] = useLocation();
  const { profile } = useProfile();
  const { isFollowing, followArtist, unfollowArtist } = useSocial();

  const staticArtist = ALL_ARTISTS.find((a) => a.id === artistId);
  // When a real user navigates to their own live studio, fall back to their profile
  const artist = (staticArtist ?? (profile?.id === artistId ? {
    id: profile!.id,
    name: profile!.name ?? artistId,
    medium: "Craft Artist",
    location: "",
    videos: [] as { id: string }[],
    images: profile!.avatarUrl ? [{ url: profile!.avatarUrl }] : [] as { url: string }[],
  } : null)) as typeof staticArtist | null;

  const avatarUrl = artist?.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=${artistId}`;

  const [viewers, setViewers] = useState(() => 800 + (hash(artistId ?? "") % 3000));
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [input, setInput] = useState("");
  const [showTip, setShowTip] = useState(false);
  const [heartCount, setHeartCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const msgId = useRef(0);
  const heartId = useRef(0);

  const following = isFollowing(artistId ?? "");

  useEffect(() => {
    if (!artistId) return;
    const addMsg = () => {
      const [user, text] = CHAT_POOL[Math.floor(Math.random() * CHAT_POOL.length)];
      setChatMsgs((prev) => [...prev.slice(-60), { id: msgId.current++, user, text, ts: Date.now() }]);
    };
    // Delay first message so the page settles before chat starts
    const initial = setTimeout(addMsg, 1200);
    const interval = setInterval(addMsg, 3500 + Math.random() * 3000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [artistId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setViewers((v) => Math.max(100, v + Math.round((Math.random() - 0.45) * 12)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const sendHeart = useCallback(() => {
    const id = heartId.current++;
    const x = 20 + Math.random() * 60;
    setHearts((h) => [...h, { id, x }]);
    setHeartCount((c) => c + 1);
    setTimeout(() => setHearts((h) => h.filter((hh) => hh.id !== id)), 2200);
  }, []);

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setChatMsgs((prev) => [...prev.slice(-60), {
      id: msgId.current++,
      user: profile?.name ?? "You",
      text: input.trim(),
      ts: Date.now(),
    }]);
    setInput("");
  }

  // Profile may still be loading — wait briefly before declaring "not found"
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!artist) {
    if (!ready) {
      return (
        <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <div className="text-center">
          <Radio size={32} className="mx-auto mb-3 text-stone-700" />
          <p className="text-stone-400">Artist not found.</p>
          <Link href="/" className="mt-3 block text-amber-400 text-sm">← Back to feed</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col lg:flex-row overflow-hidden">
      {/* ── Video / stream area ── */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Studio background — artist avatar blurred as ambient fill */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${avatarUrl})`,
            filter: "blur(32px) brightness(0.25) saturate(0.6)",
            transform: "scale(1.1)",
          }}
        />
        {/* Dark studio overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-950/80 via-stone-900/60 to-amber-950/30" />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30 lg:to-black/10" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center gap-3 z-20">
          <button
            onClick={() => navigate(-1 as never)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
          >
            <ArrowLeft size={17} />
          </button>

          {/* Live badge */}
          <div className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 shadow-lg">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wide">LIVE</span>
          </div>

          {/* Viewer count */}
          <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
            <Users size={12} className="text-stone-300" />
            <span className="text-xs text-stone-200 font-medium tabular-nums">{viewers.toLocaleString()}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
            >
              <Share2 size={15} />
            </button>
          </div>
        </div>

        {/* Artist info — bottom left */}
        <div className="absolute bottom-6 left-4 z-20 flex items-end gap-3">
          <Link href={`/artists/${artist.id}`}>
            <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-red-500 shadow-xl">
              <img src={avatarUrl} alt={artist.name} className="h-full w-full object-cover" />
            </div>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/artists/${artist.id}`}>
                <span className="font-serif text-xl font-bold text-white drop-shadow-lg hover:text-amber-200 transition-colors">
                  {artist.name}
                </span>
              </Link>
              <button
                onClick={() => following
                  ? unfollowArtist(artist.id)
                  : followArtist(artist.id, artist.name, avatarUrl)
                }
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  following
                    ? "border border-white/30 text-white/60 hover:border-red-500 hover:text-red-400"
                    : "bg-white text-stone-950 hover:bg-amber-300"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
            </div>
            <p className="text-xs text-stone-400">{artist.medium.split(",")[0]} · {artist.location}</p>
            <p className="mt-1 text-sm text-stone-200 max-w-xs line-clamp-2">
              {STORY_SEEDS[hash(artist.id) % STORY_SEEDS.length]}
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="absolute bottom-6 right-4 z-20 flex flex-col items-center gap-3">
          <button
            onClick={sendHeart}
            className="flex flex-col items-center gap-1"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-red-500/30 transition-colors">
              <Heart size={22} className="text-rose-400" fill="currentColor" />
            </div>
            <span className="text-[10px] text-stone-400">{(heartCount + 2847).toLocaleString()}</span>
          </button>

          <button
            onClick={() => setShowTip(true)}
            className="flex flex-col items-center gap-1"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/90 backdrop-blur-sm hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/30">
              <DollarSign size={20} className="text-stone-950" />
            </div>
            <span className="text-[10px] text-stone-400">Tip</span>
          </button>

          <Link href={`/commission/${artist.id}`}>
            <button className="flex flex-col items-center gap-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-stone-700/70 transition-colors">
                <ShoppingBag size={20} className="text-amber-300" />
              </div>
              <span className="text-[10px] text-stone-400">Commission</span>
            </button>
          </Link>
        </div>

        {/* Floating hearts */}
        <AnimatePresence>
          {hearts.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -180, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute bottom-24 pointer-events-none"
              style={{ left: `${h.x}%` }}
            >
              <Heart size={28} className="text-rose-500 fill-rose-500 drop-shadow-lg" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Chat panel ── */}
      <div className="w-full lg:w-80 flex flex-col bg-stone-950/95 border-l border-white/10 h-48 lg:h-full shrink-0">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={14} className="text-amber-400" />
            <span className="text-sm font-medium text-stone-300">Live Chat</span>
          </div>
          <span className="text-xs text-stone-600">{viewers.toLocaleString()} watching</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{ scrollbarWidth: "thin", scrollbarColor: "#292524 transparent" }}>
          <AnimatePresence initial={false}>
            {chatMsgs.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 text-sm"
              >
                <span className="font-semibold text-amber-300 shrink-0 text-xs">{msg.user}</span>
                <span className="text-stone-400 text-xs leading-relaxed">{msg.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={chatBottomRef} />
        </div>

        {/* Chat input */}
        <form onSubmit={sendChat} className="p-3 border-t border-white/8">
          {profile ? (
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Say something…"
                maxLength={200}
                className="flex-1 rounded-full border border-white/10 bg-stone-900 px-3 py-2 text-xs text-stone-200 placeholder-stone-600 focus:border-amber-500/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
              >
                <Send size={13} />
              </button>
            </div>
          ) : (
            <Link href="/setup">
              <div className="rounded-full border border-white/10 bg-stone-900 px-4 py-2 text-center text-xs text-stone-600 cursor-pointer hover:border-amber-500/30 hover:text-amber-400 transition-colors">
                Create a profile to chat
              </div>
            </Link>
          )}
        </form>
      </div>

      {/* Tip modal */}
      {showTip && (
        <TipModal
          artistId={artist.id}
          artistName={artist.name}
          artistAvatarUrl={avatarUrl}
          onClose={() => setShowTip(false)}
        />
      )}
    </div>
  );
}
