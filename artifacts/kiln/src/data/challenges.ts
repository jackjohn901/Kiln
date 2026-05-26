export interface ChallengeEntry {
  artistId: string;
  artistName: string;
  avatarUrl: string;
  likes: number;
  thumbnail: string;
}

export interface Challenge {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  technique: string | null;
  prize: string;
  deadline: string;
  entries: number;
  tag: string;
  status: "active" | "upcoming" | "ended";
  sponsoredBy?: string;
  leaderboard: ChallengeEntry[];
}

export const challenges: Challenge[] = [
  {
    id: "ch-001",
    emoji: "🔥",
    title: "60-Second Gather",
    subtitle: "Show your gather in under a minute",
    description: "Record your best 60-second gather from start to finished gather ball. We want to see your technique, your posture, your rhythm. Glass artists only — any gather size, any color.",
    technique: "Glass Blowing",
    prize: "$500 Bullseye Glass credit",
    deadline: "2026-05-31T23:59:00Z",
    entries: 347,
    tag: "60secondgather",
    status: "active",
    sponsoredBy: "Bullseye Glass",
    leaderboard: [
      { artistId: "lino-tagliapietra", artistName: "Lino Tagliapietra", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=lino", likes: 4821, thumbnail: "https://img.youtube.com/vi/dQhKVFbpZoQ/maxresdefault.jpg" },
      { artistId: "dante-marioni", artistName: "Dante Marioni", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=dante", likes: 3104, thumbnail: "https://img.youtube.com/vi/kOd0r6FWMOY/maxresdefault.jpg" },
      { artistId: "caleb-siemon", artistName: "Caleb Siemon", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=caleb", likes: 2587, thumbnail: "https://img.youtube.com/vi/RVZ7HFOP7VY/maxresdefault.jpg" },
    ],
  },
  {
    id: "ch-002",
    emoji: "🏺",
    title: "Imperfect Perfect",
    subtitle: "The piece that surprised you",
    description: "Share a piece that didn't go as planned but turned out more interesting because of it. Cracks, unexpected color shifts, collapsed forms — what happy accident became your best work?",
    technique: "Ceramics",
    prize: "Featured artist slot on Kiln homepage for 30 days",
    deadline: "2026-06-07T23:59:00Z",
    entries: 218,
    tag: "imperfectperfect",
    status: "active",
    leaderboard: [
      { artistId: "maya-chen", artistName: "Maya Chen", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=maya-chen", likes: 2943, thumbnail: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=raku1" },
      { artistId: "elena-vasquez", artistName: "Elena Vasquez", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=elena", likes: 1876, thumbnail: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=raku2" },
      { artistId: "hana-kim", artistName: "Hana Kim", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=hana", likes: 1204, thumbnail: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=raku3" },
    ],
  },
  {
    id: "ch-003",
    emoji: "⚒️",
    title: "First Heat of the Day",
    subtitle: "What does your studio morning look like?",
    description: "Show us the first moments of your workday. Whether you're lighting a forge, loading a kiln, or mixing glazes at 5am — we want to see the ritual of making.",
    technique: null,
    prize: "$300 tool credit at Wentworth Metalworks",
    deadline: "2026-06-14T23:59:00Z",
    entries: 891,
    tag: "firstheat",
    status: "active",
    sponsoredBy: "Wentworth Metalworks",
    leaderboard: [
      { artistId: "james-okafor", artistName: "James Okafor", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=james", likes: 5102, thumbnail: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=forge1" },
      { artistId: "marcus-williams", artistName: "Marcus Williams", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=marcus", likes: 3841, thumbnail: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=forge2" },
      { artistId: "felix-braun", artistName: "Felix Braun", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=felix", likes: 2918, thumbnail: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=forge3" },
    ],
  },
  {
    id: "ch-004",
    emoji: "🌈",
    title: "Color Theory",
    subtitle: "Explore a single color in your medium",
    description: "Pick one color — just one — and explore it completely. Multiple pieces, multiple techniques, same color family. Show us what one color can do.",
    technique: null,
    prize: "Solo exhibition feature in Kiln's curated gallery + press coverage",
    deadline: "2026-06-28T23:59:00Z",
    entries: 134,
    tag: "kilncolortheory",
    status: "active",
    leaderboard: [
      { artistId: "alex-bernstein", artistName: "Alex Bernstein", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=alex", likes: 3201, thumbnail: "https://img.youtube.com/vi/7xZfRTsNBos/maxresdefault.jpg" },
      { artistId: "priya-patel", artistName: "Priya Patel", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=priya", likes: 1987, thumbnail: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=color1" },
      { artistId: "ingrid-larsson", artistName: "Ingrid Larsson", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=ingrid", likes: 1543, thumbnail: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=color2" },
    ],
  },
  {
    id: "ch-005",
    emoji: "🧵",
    title: "Slow Stitch",
    subtitle: "The meditative side of fiber arts",
    description: "Share a time-lapse or close-up of your stitching, weaving, or knotting process. We want to feel the patience required. Fiber arts, textile, embroidery, basketry — all welcome.",
    technique: "Fiber Arts",
    prize: "Year of Kiln Pro + fiber arts supply kit",
    deadline: "2026-07-04T23:59:00Z",
    entries: 76,
    tag: "slowstitch",
    status: "upcoming",
    leaderboard: [],
  },
  {
    id: "ch-006",
    emoji: "⚡",
    title: "Spark to Finish",
    subtitle: "Document an entire weld from tack to grind",
    description: "Start to finish documentation of a single weld joint — tack welds, fill passes, cap, then the grind and final surface. Show your process, your PPE, your pride.",
    technique: "Welding",
    prize: "$250 Miller Electric store credit",
    deadline: "2026-04-30T23:59:00Z",
    entries: 512,
    tag: "sparktofinish",
    status: "ended",
    sponsoredBy: "Miller Electric",
    leaderboard: [
      { artistId: "james-okafor", artistName: "James Okafor", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=james", likes: 7241, thumbnail: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=weld1" },
      { artistId: "marcus-williams", artistName: "Marcus Williams", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=marcus", likes: 5103, thumbnail: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=weld2" },
      { artistId: "tomas-novak", artistName: "Tomas Novak", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=tomas", likes: 4027, thumbnail: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=weld3" },
    ],
  },
];

export function getActiveChallenge(id: string): Challenge | undefined {
  return challenges.find((c) => c.id === id);
}
