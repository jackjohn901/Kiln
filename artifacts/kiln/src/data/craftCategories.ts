export interface CraftCategory {
  id: string;
  label: string;
  emoji: string;
  crafts: string[];
}

export const CRAFT_CATEGORIES: CraftCategory[] = [
  {
    id: "fiber-textile",
    label: "Fiber & Textile",
    emoji: "🧵",
    crafts: [
      "Weaving",
      "Knitting",
      "Crochet",
      "Quilting",
      "Embroidery",
      "Macramé",
      "Felting",
      "Sewing",
      "Textile Dyeing",
      "Rug Hooking",
      "Basket Weaving",
    ],
  },
  {
    id: "clay-ceramic",
    label: "Clay & Ceramic",
    emoji: "🏺",
    crafts: [
      "Pottery",
      "Ceramics",
      "Porcelain",
      "Raku",
      "Tile Making",
      "Ceramic Sculpture",
    ],
  },
  {
    id: "glass",
    label: "Glass",
    emoji: "🫧",
    crafts: [
      "Glass Blowing",
      "Kiln-Formed Glass",
      "Stained Glass",
      "Flameworking",
      "Fused Glass",
      "Mosaic Glass",
      "Cast Glass",
      "Cold Working / Engraving",
    ],
  },
  {
    id: "wood",
    label: "Wood",
    emoji: "🪵",
    crafts: [
      "Wood Carving",
      "Furniture Making",
      "Wood Turning",
      "Marquetry",
      "Wood Burning (Pyrography)",
      "Cabinetmaking",
    ],
  },
  {
    id: "metal",
    label: "Metal",
    emoji: "⚒️",
    crafts: [
      "Blacksmithing",
      "Jewelry Making",
      "Silversmithing",
      "Enameling",
      "Bronze Casting",
      "Knife Making",
    ],
  },
  {
    id: "paper",
    label: "Paper",
    emoji: "📄",
    crafts: [
      "Bookbinding",
      "Origami",
      "Papermaking",
      "Printmaking",
      "Calligraphy",
      "Collage",
      "Scrapbooking",
    ],
  },
  {
    id: "leather",
    label: "Leather",
    emoji: "🪡",
    crafts: [
      "Leather Tooling",
      "Saddle Making",
      "Handbag Making",
      "Shoemaking",
    ],
  },
  {
    id: "mixed-media",
    label: "Mixed Media & Contemporary",
    emoji: "✨",
    crafts: [
      "Assemblage",
      "Resin Art",
      "Upcycled Crafts",
      "Installation Craft",
      "Wearable Art",
      "DIY Fabrication",
    ],
  },
  {
    id: "natural-folk",
    label: "Natural & Folk",
    emoji: "🌿",
    crafts: [
      "Folk Art",
      "Indigenous Crafts",
      "Soap Making",
      "Candle Making",
      "Herbal Crafts",
      "Gourd Art",
    ],
  },
  {
    id: "decorative-surface",
    label: "Decorative & Surface Arts",
    emoji: "🖌️",
    crafts: [
      "Painting on Functional Objects",
      "Tole Painting",
      "Gilding",
      "Faux Finishing",
    ],
  },
  {
    id: "digital-modern",
    label: "Digital & Modern",
    emoji: "🖥️",
    crafts: [
      "3D Printing",
      "Laser Cutting",
      "CNC Carving",
      "Digital Textile Design",
      "Interactive Craft Objects",
    ],
  },
  {
    id: "craft-approaches",
    label: "Craft Approaches",
    emoji: "🎓",
    crafts: [
      "Fine Craft",
      "Functional Craft",
      "Studio Craft",
      "Contemporary Craft",
      "Traditional Craft",
      "Experimental Craft",
    ],
  },
];

export const ALL_CRAFTS: string[] = CRAFT_CATEGORIES.flatMap((c) => c.crafts);

export function getCategoryForCraft(craft: string): CraftCategory | undefined {
  return CRAFT_CATEGORIES.find((c) =>
    c.crafts.some((cr) => cr.toLowerCase() === craft.toLowerCase())
  );
}

export function getCraftsByCategory(categoryId: string): string[] {
  return CRAFT_CATEGORIES.find((c) => c.id === categoryId)?.crafts ?? [];
}
