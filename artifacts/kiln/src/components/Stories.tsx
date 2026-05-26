import { useState, useEffect, useRef } from "react";
import { X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { artists } from "@/data/artists";
import { seedArtists } from "@/data/seedArtists";
import { useProfile } from "@/contexts/ProfileContext";
import { Link } from "wouter";

const ALL_ARTISTS = [...artists, ...seedArtists];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const STORY_TEXTS: Record<string, string[]> = {
  glass: [
    "Fresh out of the glory hole 🔥 new color series starting today",
    "Seven hours at the bench. The annealing oven is packed.",
    "Just pulled this from the annealer — the color shift surprised me",
    "Opening commission slots for June. DM if interested.",
    "New cullet arrived from Gaffer — trying the Copper Blue tonight",
  ],
  metal: [
    "Forge is at 2,200°F. First heat of the day always hits different.",
    "New commission coming along at the anvil — can't share yet 🤫",
    "Finished the surface grind on the gate commission. 48 hours in.",
    "Teaching my first apprentice today. Nervous and excited.",
    "The hammer scale is flying. A good morning.",
  ],
  ceramics: [
    "Raku batch is in the kiln. Fingers crossed 🤞",
    "Trimming 40 bowls today. Meditative work.",
    "New glaze test results — the copper red finally worked",
    "Loading the wood kiln tonight. 18-hour firing starts at midnight.",
    "Pulled a perfect celadon out of the reduction kiln. Worth the wait.",
  ],
  fiber: [
    "Thread arrived from Japan — this silk is something else",
    "Warp set up for the next 3 months of work. Let's go.",
    "Finishing a commission — the client is going to love this",
    "Dyeing today. The studio smells like indigo and hope.",
    "Pattern drafting for a new loom setup. Geometry is wild.",
  ],
  default: [
    "Studio day. The work continues. ✨",
    "New piece coming together — can't share yet",
    "Just finished a long commission. Feels good.",
    "Open studio this Saturday — come visit if you're local",
    "Process work today. The quiet part of making.",
  ],
};

function getStoryText(artistId: string, medium: string): string {
  const m = medium.toLowerCase();
  let pool = STORY_TEXTS.default;
  if (m.includes("glass")) pool = STORY_TEXTS.glass;
  else if (m.includes("metal") || m.includes("iron") || m.includes("steel") || m.includes("bronze")) pool = STORY_TEXTS.metal;
  else if (m.includes("ceramic") || m.includes("clay") || m.includes("raku") || m.includes("porcelain")) pool = STORY_TEXTS.ceramics;
  else if (m.includes("fiber") || m.includes("textile") || m.includes("weav") || m.includes("embroid")) pool = STORY_TEXTS.fiber;
  return pool[hash(artistId) % pool.length];
}

function getStoryImage(artistId: string, a: typeof ALL_ARTISTS[0]): string {
  return a.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=1400&fit=crop&seed=${artistId}-story`;
}

const STORY_ARTISTS = ALL_ARTISTS
  .filter((a) => hash(a.id) % 3 !== 0)
  .slice(0, 14);

interface StoryItem {
  artistId: string;
  artistName: string;
  avatarUrl: string;
  imageUrl: string;
  text: string;
  medium: string;
}

const STORIES: StoryItem[] = STORY_ARTISTS.map((a) => ({
  artistId: a.id,
  artistName: a.name,
  avatarUrl: a.images?.[0]?.url ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=150&h=150&fit=crop&seed=${a.id}`,
  imageUrl: getStoryImage(a.id, a),
  text: getStoryText(a.id, a.medium),
  medium: a.medium,
}));

function StoryViewer({ stories, startIndex, onClose }: {
  stories: StoryItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const story = stories[idx];

  function startProgress() {
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + 2;
      });
    }, 100);
  }

  useEffect(() => {
    startProgress();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [idx]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [idx, stories.length]);

  function next() {
    if (idx < stories.length - 1) setIdx((i) => i + 1);
    else onClose();
  }
  function prev() {
    if (idx > 0) setIdx((i) => i - 1);
    else onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
    >
      <div className="relative w-full max-w-sm h-full sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-stone-950">
        {/* Background image */}
        <img
          src={story.imageUrl}
          alt={story.text}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=700&fit=crop&seed=${story.artistId}`; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/70" />

        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white transition-none rounded-full"
                style={{ width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 left-3 right-3 z-20 flex items-center gap-2.5">
          <Link href={`/artists/${story.artistId}`} onClick={onClose}>
            <img src={story.avatarUrl} alt={story.artistName} className="h-9 w-9 rounded-full object-cover border-2 border-white/80" />
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/artists/${story.artistId}`} onClick={onClose}>
              <p className="text-sm font-semibold text-white truncate hover:text-amber-200 transition-colors">{story.artistName}</p>
            </Link>
            <p className="text-[10px] text-white/50">{story.medium.split(",")[0]} · Just now</p>
          </div>
          <button onClick={onClose} aria-label="Close stories" className="relative z-[40] p-1 text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Navigation tap zones */}
        <button onClick={prev} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" />
        <button onClick={next} className="absolute right-0 top-0 bottom-0 w-1/3 z-10" />

        {/* Story text */}
        <div className="absolute bottom-8 left-4 right-4 z-20">
          <p className="text-base font-medium text-white leading-snug drop-shadow-lg">{story.text}</p>
        </div>

        {/* Nav arrows (desktop) */}
        <button onClick={prev} className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <button onClick={next} className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}

export default function Stories() {
  const { profile } = useProfile();
  const [viewing, setViewing] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [allStories, setAllStories] = useState<StoryItem[]>(STORIES);

  // Fetch real stories from API and merge with static stories
  useEffect(() => {
    fetch("/api/stories/feed", { credentials: "include" })
      .then(r => r.json())
      .then((d: { groups?: Array<{ authorId: string; authorName: string; authorAvatarUrl: string | null; stories: Array<{ id: string; mediaUrl: string; caption: string | null; }> }> }) => {
        if (!d.groups?.length) return;
        // Convert API groups to StoryItem format, prepend to static stories
        const apiItems: StoryItem[] = d.groups
          .filter(g => !STORIES.some(s => s.artistId === g.authorId)) // avoid duplicates
          .map(g => ({
            artistId: g.authorId,
            artistName: g.authorName,
            avatarUrl: g.authorAvatarUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${g.authorId}`,
            imageUrl: g.stories[0]?.mediaUrl ?? `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=1400&fit=crop&seed=${g.authorId}`,
            text: g.stories[0]?.caption ?? "Studio update",
            medium: "Craft",
          }));
        if (apiItems.length > 0) setAllStories([...apiItems, ...STORIES]);
      })
      .catch(() => {}); // graceful fallback to static
  }, []);

  function openStory(i: number) {
    setViewing(i);
    setSeen((s) => new Set(s).add(allStories[i].artistId));
    // Mark viewed in API
    fetch(`/api/stories/${allStories[i].artistId}/view`, { method: "POST", credentials: "include" }).catch(() => {});
  }

  return (
    <>
      <div
        className="pointer-events-auto flex gap-3 overflow-x-auto px-4 py-2"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Add story (own profile) */}
        {profile && (
          <Link href="/create">
            <div className="shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group">
              <div className="relative h-14 w-14">
                <div className="h-full w-full rounded-full overflow-hidden border-2 border-stone-700 bg-stone-800">
                  {profile.avatarUrl
                    ? <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                    : <div className="h-full w-full flex items-center justify-center text-stone-500 text-lg font-bold">{profile.name[0]}</div>
                  }
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 border-2 border-black">
                  <Plus size={11} className="text-stone-950" />
                </div>
              </div>
              <p className="text-[9px] text-stone-500 max-w-[56px] text-center truncate">Add Story</p>
            </div>
          </Link>
        )}

        {/* Artist stories */}
        {allStories.map((story, i) => {
          const isSeen = seen.has(story.artistId);
          return (
            <button key={story.artistId} onClick={() => openStory(i)} className="shrink-0 flex flex-col items-center gap-1.5">
              <div className={`h-14 w-14 rounded-full p-[2px] ${isSeen ? "bg-stone-700" : "bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500"}`}>
                <div className="h-full w-full rounded-full overflow-hidden border-2 border-black">
                  <img
                    src={story.avatarUrl}
                    alt={story.artistName}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=${story.artistId}`; }}
                  />
                </div>
              </div>
              <p className="text-[9px] text-stone-500 max-w-[56px] text-center truncate">{story.artistName.split(" ")[0]}</p>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {viewing !== null && (
          <StoryViewer
            stories={allStories}
            startIndex={viewing}
            onClose={() => setViewing(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
