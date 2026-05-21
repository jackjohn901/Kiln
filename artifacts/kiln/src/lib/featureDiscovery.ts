const STORAGE_KEY = "kiln_feature_discovery_v1";
const SURFACE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface DiscoveryState {
  visited: string[];
  surfaced: Record<string, number>;
}

export interface DiscoveryFeature {
  id: string;
  label: string;
  path: string;
  emoji: string;
  tagline: string;
  description: string;
}

export const DISCOVERY_FEATURES: DiscoveryFeature[] = [
  {
    id: "shop",
    label: "Shop",
    path: "/shop",
    emoji: "🛍️",
    tagline: "Buy original works",
    description: "Handmade pieces sold directly by the artist — no middlemen, no mass production.",
  },
  {
    id: "workshops",
    label: "Workshops",
    path: "/workshops",
    emoji: "🎓",
    tagline: "Learn from working artists",
    description: "Book in-person and online classes in ceramics, glass, weaving, woodwork, and more.",
  },
  {
    id: "auctions",
    label: "Auctions",
    path: "/auctions",
    emoji: "🔨",
    tagline: "Bid on one-of-a-kind works",
    description: "Live auctions on unique pieces. Place a bid before time runs out.",
  },
  {
    id: "guilds",
    label: "Craft Guilds",
    path: "/guilds",
    emoji: "⚒️",
    tagline: "Find your craft community",
    description: "Join technique-based guilds. Connect with ceramicists, glassblowers, weavers, and more.",
  },
  {
    id: "drops",
    label: "Drops",
    path: "/drops",
    emoji: "💎",
    tagline: "Limited-edition releases",
    description: "Timed drops of exclusive work. Patrons get first access before anyone else.",
  },
  {
    id: "commissions",
    label: "Commissions",
    path: "/commissions",
    emoji: "✏️",
    tagline: "Get something made for you",
    description: "Request a custom piece from any artist who accepts commissions.",
  },
];

function load(): DiscoveryState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return { visited: [], surfaced: {} };
  }
}

function save(state: DiscoveryState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function markFeatureVisited(id: string) {
  const state = load();
  const visited = new Set(state.visited ?? []);
  visited.add(id);
  save({ ...state, visited: [...visited] });
}

export function markFeatureSurfaced(id: string) {
  const state = load();
  const surfaced = state.surfaced ?? {};
  surfaced[id] = Date.now();
  save({ ...state, surfaced });
}

export function getNextFeatureToSurface(): DiscoveryFeature | null {
  const state = load();
  const visited = new Set(state.visited ?? []);
  const surfaced = state.surfaced ?? {};
  const now = Date.now();

  return (
    DISCOVERY_FEATURES.find((f) => {
      if (visited.has(f.id)) return false;
      const lastShown = surfaced[f.id] ?? 0;
      return now - lastShown > SURFACE_COOLDOWN_MS;
    }) ?? null
  );
}
