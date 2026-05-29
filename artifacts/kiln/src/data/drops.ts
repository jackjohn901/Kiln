export interface Drop {
  id: string;
  artistId: string;
  artistName: string;
  artistHandle: string;
  artistAvatarUrl: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  medium: string;
  technique: string;
  dimensions?: string;
  spotsTotal: number;
  spotsLeft: number;
  waitlistCount: number;
  dropDate: string; // ISO
  status: "upcoming" | "live" | "sold";
}

export const DROPS: Drop[] = [
  {
    id: "drop-001",
    artistId: "marcus-williams",
    artistName: "Marcus Williams",
    artistHandle: "marcus-williams",
    artistAvatarUrl: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=200&q=80",
    title: "Solstice Fire Set",
    description: "Five-piece hand-forged iron fire tool set with walnut handles. Hammer-textured surface, oil-blackened finish. Designed for a lifetime of use by an open hearth. The handles are fitted to the iron with hidden mortise joints — no screws, no glue.",
    imageUrl: "https://images.unsplash.com/photo-1599256872237-5dcc0fbe9668?w=800&q=80",
    price: 1840,
    medium: "Metal",
    technique: "Traditional Blacksmithing",
    dimensions: "Poker 32\" · Shovel 28\" · Tongs 26\" · Brush 24\" · Stand 18\"",
    spotsTotal: 1,
    spotsLeft: 1,
    waitlistCount: 0,
    dropDate: "2026-05-15T18:00:00Z",
    status: "live",
  },
  {
    id: "drop-002",
    artistId: "takeshi-mori",
    artistName: "Takeshi Mori",
    artistHandle: "takeshi-mori",
    artistAvatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80",
    title: "Raku Autumn Vessels (Set of 2)",
    description: "Two companion raku vessels with crackle-glaze surfaces. Fired in the traditional Japanese style — removed from the kiln while red-hot, placed in a reduction chamber with pine needles. The carbon marks are unique to each firing and can never be reproduced exactly.",
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
    price: 890,
    medium: "Ceramics",
    technique: "Raku Firing",
    dimensions: "Tall: 11\" H × 5\" W · Short: 8\" H × 6\" W",
    spotsTotal: 2,
    spotsLeft: 2,
    waitlistCount: 0,
    dropDate: "2026-05-15T12:00:00Z",
    status: "live",
  },
  {
    id: "drop-003",
    artistId: "alex-bernstein",
    artistName: "Alex Bernstein",
    artistHandle: "alex-bernstein",
    artistAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    title: "Orbit Series No. 12",
    description: "Cast and cold-worked optical glass. The interior geometry is carved by hand on a water-cooled wheel — a process that takes 40+ hours after the initial casting. The piece refracts daylight into spectral patterns on surrounding surfaces.",
    imageUrl: "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=800&q=80",
    price: 8500,
    medium: "Glass",
    technique: "Cast & Cold-Worked Glass",
    dimensions: "14\" × 9\" × 9\"",
    spotsTotal: 1,
    spotsLeft: 1,
    waitlistCount: 0,
    dropDate: "2026-06-20T17:00:00Z",
    status: "upcoming",
  },
  {
    id: "drop-004",
    artistId: "maya-chen",
    artistName: "Maya Chen",
    artistHandle: "maya-chen",
    artistAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    title: "Celadon Ritual Set",
    description: "Four-piece tea ceremony set in a deep celadon glaze achieved through reduction firing. Includes teapot, two cups, and a small water jug. The celadon glaze is made from wood ash and local clay — the formula took three years to develop.",
    imageUrl: "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=800&q=80",
    price: 1200,
    medium: "Ceramics",
    technique: "Reduction Firing",
    dimensions: "Teapot 6\" H · Cups 3\" H · Jug 5\" H",
    spotsTotal: 3,
    spotsLeft: 3,
    waitlistCount: 0,
    dropDate: "2026-06-25T16:00:00Z",
    status: "upcoming",
  },
  {
    id: "drop-005",
    artistId: "james-okafor",
    artistName: "James Okafor",
    artistHandle: "james-okafor",
    artistAvatarUrl: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=200&q=80",
    title: "Solstice Wall Piece",
    description: "Large-format welded steel wall sculpture representing the geometry of solstice light. Ground and patinated with a salt-vinegar wash to achieve the warm ochre tones. Interior has a raw-steel finish that will continue to develop over time.",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    price: 3400,
    medium: "Metal",
    technique: "TIG Welding & Patination",
    dimensions: "48\" × 36\" × 2.5\"",
    spotsTotal: 1,
    spotsLeft: 1,
    waitlistCount: 0,
    dropDate: "2026-06-28T20:00:00Z",
    status: "upcoming",
  },
  {
    id: "drop-006",
    artistId: "elena-vasquez",
    artistName: "Elena Vasquez",
    artistHandle: "elena-vasquez",
    artistAvatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    title: "Torch Series — Summer (Set of 5)",
    description: "Five flameworked borosilicate pendants, each unique. Copper ruby and aurae glass with applied filigrana cane. Each piece is approximately 2\" and comes with a 20\" sterling silver chain. These won't be repeated — the aurae batch they're made from is now discontinued.",
    imageUrl: "https://images.unsplash.com/photo-1573408301185-9519f94815f9?w=800&q=80",
    price: 450,
    medium: "Glass",
    technique: "Flameworking",
    dimensions: "Each approx. 2\" diameter",
    spotsTotal: 5,
    spotsLeft: 5,
    waitlistCount: 0,
    dropDate: "2026-07-15T17:00:00Z",
    status: "upcoming",
  },
  {
    id: "drop-007",
    artistId: "ingrid-larsson",
    artistName: "Ingrid Larsson",
    artistHandle: "ingrid-larsson",
    artistAvatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
    title: "Winter Vessel",
    description: "Pâte de verre cast bowl — glass paste formed in a refractory mould and fused at low temperature. The pale blue-white color is achieved by blending crushed Bullseye glass with metallic oxide powders. Surface has a frosty, mineral quality unlike any blown piece.",
    imageUrl: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=800&q=80",
    price: 5200,
    medium: "Glass",
    technique: "Pâte de Verre",
    dimensions: "13\" diameter × 5\" H",
    spotsTotal: 1,
    spotsLeft: 1,
    waitlistCount: 0,
    dropDate: "2026-08-05T18:00:00Z",
    status: "upcoming",
  },
  {
    id: "drop-008",
    artistId: "sarah-thornton",
    artistName: "Sarah Thornton",
    artistHandle: "sarah-thornton",
    artistAvatarUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80",
    title: "The Blue Field",
    description: "Hand-woven tapestry in naturally dyed wool and linen. Blues are achieved with woad and indigo. Yellows with weld. The weaving took nine weeks. It documents a specific afternoon light in a field near the studio — a thing you can only do when you actually watch it.",
    imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80",
    price: 2300,
    medium: "Fiber",
    technique: "Natural Dyeing & Hand Weaving",
    dimensions: "40\" × 60\"",
    spotsTotal: 1,
    spotsLeft: 1,
    waitlistCount: 0,
    dropDate: "2026-09-01T17:00:00Z",
    status: "upcoming",
  },
  {
    id: "drop-009",
    artistId: "priya-patel",
    artistName: "Priya Patel",
    artistHandle: "priya-patel",
    artistAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
    title: "Devotion Series Brooches",
    description: "Series of eight cloisonné enamel brooches on fine silver. Each interprets a different devotional textile from South Asian weaving traditions, translated into enamel and gold wire. All eight sold in the first 4 minutes. These will not be reproduced.",
    imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80",
    price: 620,
    medium: "Enamel",
    technique: "Cloisonné Enamel",
    dimensions: "Each 2\" × 1.5\"",
    spotsTotal: 8,
    spotsLeft: 8,
    waitlistCount: 0,
    dropDate: "2026-05-10T17:00:00Z",
    status: "live",
  },
  {
    id: "drop-010",
    artistId: "dante-marioni",
    artistName: "Dante Marioni",
    artistHandle: "dante-marioni",
    artistAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    title: "Leaf Vessel in Prussian",
    description: "Single blown glass vessel in the Leaf series. Prussian blue body with applied hot-worked leaves in white alabaster glass. The leaf attachments are pulled and shaped entirely in the heat — each takes one gather and cannot be repositioned.",
    imageUrl: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&q=80",
    price: 6800,
    medium: "Glass",
    technique: "Blown Glass",
    dimensions: "22\" H × 7\" W",
    spotsTotal: 1,
    spotsLeft: 1,
    waitlistCount: 0,
    dropDate: "2026-10-01T18:00:00Z",
    status: "upcoming",
  },
];

export function getDropsByArtist(artistId: string): Drop[] {
  return DROPS.filter((d) => d.artistId === artistId);
}

export function getLiveDrops(): Drop[] {
  return DROPS.filter((d) => d.status === "live");
}

export function getUpcomingDrops(): Drop[] {
  return DROPS.filter((d) => d.status === "upcoming");
}

export function getTimeUntilDrop(dropDate: string): string {
  const now = new Date();
  const drop = new Date(dropDate);
  const diff = drop.getTime() - now.getTime();
  if (diff <= 0) return "Now";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
