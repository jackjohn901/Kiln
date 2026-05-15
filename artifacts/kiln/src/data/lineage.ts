export interface LineageNode {
  artistId: string;
  name: string;
  medium: string;
  era: string;
  location: string;
  avatarUrl: string;
  bio: string;
  mentorId: string | null;
  apprenticeIds: string[];
  isFounder?: boolean;
}

export const LINEAGE_NODES: LineageNode[] = [
  {
    artistId: "harvey-littleton",
    name: "Harvey Littleton",
    medium: "Studio Glass",
    era: "1962–2013",
    location: "Spruce Pine, NC",
    avatarUrl: "https://picsum.photos/seed/harvey/200/200",
    bio: "Father of the American Studio Glass movement. Co-created the first studio glass workshop with Dominick Labino at Toledo Museum of Art in 1962, igniting a global craft revolution.",
    mentorId: null,
    apprenticeIds: ["fritz-dreisbach", "marvin-lipofsky", "dale-chihuly", "richard-royal"],
    isFounder: true,
  },
  {
    artistId: "dominick-labino",
    name: "Dominick Labino",
    medium: "Studio Glass",
    era: "1962–1987",
    location: "Grand Rapids, OH",
    avatarUrl: "https://picsum.photos/seed/labino/200/200",
    bio: "Scientist and artist who co-founded the Studio Glass movement. Developed the Vitrocrisa furnace glass formula that made studio glassblowing economically possible.",
    mentorId: null,
    apprenticeIds: [],
    isFounder: true,
  },
  {
    artistId: "dale-chihuly",
    name: "Dale Chihuly",
    medium: "Glass Blowing",
    era: "1968–present",
    location: "Seattle, WA",
    avatarUrl: "https://picsum.photos/seed/chihuly/200/200",
    bio: "Studied under Harvey Littleton and went to Murano to study with Venini glassblowers. Founded Pilchuck Glass School in 1971, training generations of glass artists.",
    mentorId: "harvey-littleton",
    apprenticeIds: ["dante-marioni", "william-morris", "lino-tagliapietra"],
  },
  {
    artistId: "fritz-dreisbach",
    name: "Fritz Dreisbach",
    medium: "Glass Blowing",
    era: "1964–present",
    location: "Seattle, WA",
    avatarUrl: "https://picsum.photos/seed/fritz/200/200",
    bio: "One of the earliest students of Harvey Littleton. Known as the 'Resident Goblinmaker of American Glass' and instrumental in establishing the Glass Art Society.",
    mentorId: "harvey-littleton",
    apprenticeIds: ["richard-royal"],
  },
  {
    artistId: "marvin-lipofsky",
    name: "Marvin Lipofsky",
    medium: "Glass Blowing",
    era: "1964–2016",
    location: "Berkeley, CA",
    avatarUrl: "https://picsum.photos/seed/marvin/200/200",
    bio: "Second MFA student in glass art under Harvey Littleton. Founded the glass program at UC Berkeley and collaborated with glassblowers across 17 countries.",
    mentorId: "harvey-littleton",
    apprenticeIds: [],
  },
  {
    artistId: "lino-tagliapietra",
    name: "Lino Tagliapietra",
    medium: "Glass Blowing",
    era: "1954–present",
    location: "Murano, Italy / Seattle, WA",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    bio: "Maestro from Murano who brought Italian glassblowing traditions to America. Became a pivotal figure in Pilchuck Glass School, bridging old-world mastery with contemporary studio practice.",
    mentorId: "dale-chihuly",
    apprenticeIds: ["alex-bernstein", "caleb-siemon", "erica-rosenfeld"],
  },
  {
    artistId: "william-morris",
    name: "William Morris",
    medium: "Glass Blowing",
    era: "1978–present",
    location: "Stanwood, WA",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    bio: "Former Chihuly assistant who became one of the most significant figures in American studio glass. Known for archaeological and anthropological glass sculptures.",
    mentorId: "dale-chihuly",
    apprenticeIds: ["dante-marioni", "john-kiley"],
  },
  {
    artistId: "dante-marioni",
    name: "Dante Marioni",
    medium: "Glass Blowing",
    era: "1988–present",
    location: "Seattle, WA",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&q=80",
    bio: "Son of Paul Marioni. Trained with William Morris and Lino Tagliapietra. Known for elegantly proportioned vessels that blend Muranese and American studio traditions.",
    mentorId: "william-morris",
    apprenticeIds: [],
  },
  {
    artistId: "richard-royal",
    name: "Richard Royal",
    medium: "Glass Blowing",
    era: "1980–present",
    location: "Seattle, WA",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80",
    bio: "Studied with Fritz Dreisbach and was deeply influenced by the Pilchuck environment. Known for commanding, architecturally-scaled glass sculptures.",
    mentorId: "fritz-dreisbach",
    apprenticeIds: [],
  },
  {
    artistId: "alex-bernstein",
    name: "Alex Bernstein",
    medium: "Cast & Carved Glass",
    era: "1995–present",
    location: "Asheville, NC",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    bio: "Son of William and Katherine Bernstein, trained at RIT and influenced by Lino Tagliapietra at Pilchuck. Developed a distinctive approach to cast, carved, and polished glass sculpture.",
    mentorId: "lino-tagliapietra",
    apprenticeIds: [],
  },
  {
    artistId: "john-kiley",
    name: "John Kiley",
    medium: "Glass Blowing",
    era: "1990–present",
    location: "Providence, RI",
    avatarUrl: "https://picsum.photos/seed/kiley/200/200",
    bio: "RISD-trained glass artist influenced by William Morris's sculptural approach. Known for intricate narrative vessel work.",
    mentorId: "william-morris",
    apprenticeIds: [],
  },
  {
    artistId: "caleb-siemon",
    name: "Caleb Siemon",
    medium: "Flameworking",
    era: "2000–present",
    location: "Shelburne Falls, MA",
    avatarUrl: "https://picsum.photos/seed/caleb/200/200",
    bio: "Flameworker who studied at Pilchuck under Lino Tagliapietra's circle. Bridges the Italian bead tradition with contemporary American flameworking.",
    mentorId: "lino-tagliapietra",
    apprenticeIds: [],
  },
  {
    artistId: "erica-rosenfeld",
    name: "Erica Rosenfeld",
    medium: "Flameworking",
    era: "1998–present",
    location: "Brooklyn, NY",
    avatarUrl: "https://picsum.photos/seed/erica/200/200",
    bio: "Studied at Pilchuck and Haystack. Brings a jeweler's precision to flameworked glass sculpture. Pioneer in wearable flameworked glass.",
    mentorId: "lino-tagliapietra",
    apprenticeIds: [],
  },
];

export function getLineageNode(artistId: string): LineageNode | undefined {
  return LINEAGE_NODES.find((n) => n.artistId === artistId);
}

export function getAncestors(artistId: string): LineageNode[] {
  const ancestors: LineageNode[] = [];
  let current = LINEAGE_NODES.find((n) => n.artistId === artistId);
  while (current?.mentorId) {
    const mentor = LINEAGE_NODES.find((n) => n.artistId === current!.mentorId);
    if (!mentor) break;
    ancestors.unshift(mentor);
    current = mentor;
  }
  return ancestors;
}

export function getGeneration(artistId: string): number {
  return getAncestors(artistId).length;
}

export const LINEAGE_STORAGE_KEY = "kiln_user_lineage_v1";

export interface UserLineageClaim {
  mentorId: string | null;
  mentorName: string;
  mentorNote: string;
  apprentices: { name: string; note: string }[];
}

export function readUserLineage(): UserLineageClaim | null {
  try {
    const raw = localStorage.getItem(LINEAGE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveUserLineage(claim: UserLineageClaim): void {
  try { localStorage.setItem(LINEAGE_STORAGE_KEY, JSON.stringify(claim)); } catch {}
}
