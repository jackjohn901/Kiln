export type MaterialCategory = "glass" | "clay" | "glaze" | "metal" | "fiber" | "tools";

export interface MaterialEntry {
  id: string;
  name: string;
  manufacturer?: string;
  category: MaterialCategory;
  subcategory?: string;
  description: string;
  specs?: Record<string, string>;
  compatibleWith?: string[];
  communityRating: number;
  reviewCount: number;
  supplierLinks?: { name: string; url: string }[];
  tags: string[];
}

export const MATERIALS: MaterialEntry[] = [
  // Glass — Bullseye
  { id: "be-1120", name: "Bullseye Black", manufacturer: "Bullseye Glass", category: "glass", subcategory: "Bullseye (90 COE)", description: "Dense, opaque black. One of the most versatile accent colors in Bullseye's palette. Holds its depth in kiln fusing and flame work.", specs: { COE: "90", Form: "Sheet, frit, rod", Temp: "Fuse: 1480°F" }, communityRating: 4.9, reviewCount: 284, tags: ["opaque", "accent", "fusing", "flamework"] },
  { id: "be-0113", name: "Bullseye White (Opalescent)", manufacturer: "Bullseye Glass", category: "glass", subcategory: "Bullseye (90 COE)", description: "Warm, creamy opalescent white. Diffuses light beautifully. Essential base glass for many kiln-formed compositions.", specs: { COE: "90", Form: "Sheet, frit", Temp: "Fuse: 1480°F" }, communityRating: 4.8, reviewCount: 211, tags: ["opalescent", "base", "fusing"] },
  { id: "be-0164", name: "Bullseye Deep Cobalt Blue", manufacturer: "Bullseye Glass", category: "glass", subcategory: "Bullseye (90 COE)", description: "Rich, saturated cobalt. Transmissive with strong color. Can appear near-black in thick sections.", specs: { COE: "90", Form: "Sheet, frit, powder", Temp: "Fuse: 1480°F" }, communityRating: 4.7, reviewCount: 176, tags: ["transparent", "deep", "fusing", "casting"] },
  { id: "be-0303", name: "Bullseye Tomato Red", manufacturer: "Bullseye Glass", category: "glass", subcategory: "Bullseye (90 COE)", description: "A warm, opaque red. Selenium-cadmium based. Requires careful firing to avoid color shift.", specs: { COE: "90", Form: "Sheet", Temp: "Fuse: 1490°F max" }, communityRating: 4.2, reviewCount: 89, tags: ["opaque", "red", "fusing", "temperature-sensitive"] },

  // Glass — Gaffer
  { id: "gf-c01", name: "Gaffer Crystal", manufacturer: "Gaffer Glass", category: "glass", subcategory: "Gaffer (104 COE)", description: "The clearest optical-quality crystal in the 104 COE range. Exceptional clarity for color work and sculptural blowing.", specs: { COE: "104", Form: "Batch, cullet", Temp: "Working: 2000–2100°F" }, communityRating: 4.9, reviewCount: 198, tags: ["crystal", "blowing", "optical-quality", "color-base"] },
  { id: "gf-c122", name: "Gaffer Aquamarine", manufacturer: "Gaffer Glass", category: "glass", subcategory: "Gaffer (104 COE)", description: "A luminous, transparent aquamarine. Blends cleanly with crystal. Popular for sea-inspired sculptural work.", specs: { COE: "104", Form: "Batch, rod, cane" }, communityRating: 4.8, reviewCount: 143, tags: ["transparent", "blowing", "sculptural"] },
  { id: "gf-c208", name: "Gaffer Amber", manufacturer: "Gaffer Glass", category: "glass", subcategory: "Gaffer (104 COE)", description: "Warm, golden amber. Ranges from pale honey to deep bronze depending on gather thickness. Beautiful in vessel forms.", specs: { COE: "104", Form: "Batch, rod" }, communityRating: 4.7, reviewCount: 167, tags: ["transparent", "warm", "blowing", "vessels"] },
  { id: "gf-op1", name: "Gaffer Opaque White", manufacturer: "Gaffer Glass", category: "glass", subcategory: "Gaffer (104 COE)", description: "Pure, dense opaque white for blowing. Excellent for layering and casing. The industry reference standard.", specs: { COE: "104", Form: "Batch, cullet" }, communityRating: 4.9, reviewCount: 231, tags: ["opaque", "casing", "blowing", "standard"] },

  // Glass — Kugler
  { id: "ku-25", name: "Kugler Rubino Gold", manufacturer: "Kugler Colors", category: "glass", subcategory: "Kugler (Soft)", description: "The legendary gold-ruby color from Kugler. Made with colloidal gold. Strikes to a deep ruby on reheating. The most prized color in glass blowing.", specs: { COE: "Soft (Gaffer-compatible)", Form: "Rod, cane", Price: "Premium (gold content)" }, communityRating: 5.0, reviewCount: 312, tags: ["gold-ruby", "striking", "premium", "blowing", "sculptural"] },
  { id: "ku-46", name: "Kugler Cobalt Blue", manufacturer: "Kugler Colors", category: "glass", subcategory: "Kugler (Soft)", description: "Classic Kugler cobalt — deep, saturated, and reliable. Used by artists worldwide for 60+ years. Works in hot shop and flamework.", specs: { COE: "Soft", Form: "Rod, cane" }, communityRating: 4.8, reviewCount: 178, tags: ["transparent", "cobalt", "blowing", "flamework"] },

  // Clay bodies
  { id: "laguna-b-mix", name: "Laguna B-Mix 5", manufacturer: "Laguna Clay", category: "clay", subcategory: "Stoneware", description: "The most popular cone 5-6 clay body in North America. Smooth, white-firing, excellent for wheel throwing and hand building. Forgiving and consistent.", specs: { "Firing Range": "Cone 5–6", "Shrinkage": "12%", "Color": "White", "Absorption": "1.5%" }, communityRating: 4.8, reviewCount: 892, tags: ["wheel", "handbuilding", "white", "cone-6", "versatile"] },
  { id: "standard-182", name: "Standard 182 Porcelain", manufacturer: "Standard Clay", category: "clay", subcategory: "Porcelain", description: "Translucent porcelain for wheel throwing. Highly plastic, fires brilliant white. Requires skill — less forgiving than stoneware but the results are unmatched.", specs: { "Firing Range": "Cone 6–10", "Shrinkage": "14%", "Color": "Translucent white", "Absorption": "0.2%" }, communityRating: 4.6, reviewCount: 403, tags: ["porcelain", "wheel", "translucent", "cone-10"] },
  { id: "raku-clay", name: "Laguna Raku", manufacturer: "Laguna Clay", category: "clay", subcategory: "Raku", description: "High-grog, thermal-shock resistant body designed for raku firing. Can withstand dramatic temperature changes. Available in buff and white.", specs: { "Firing Range": "Cone 06–6", "Grog": "30%", "Color": "Buff" }, communityRating: 4.7, reviewCount: 234, tags: ["raku", "thermal-shock", "grog", "pit-fire"] },
  { id: "earthenware-red", name: "Plainsman M370", manufacturer: "Plainsman Clays", category: "clay", subcategory: "Earthenware", description: "A classic red earthenware with excellent plasticity. Low-fire cone 04-2. Rich terracotta color when fired. Great for hand building and sculpture.", specs: { "Firing Range": "Cone 04–2", "Color": "Terracotta red" }, communityRating: 4.5, reviewCount: 167, tags: ["earthenware", "red", "low-fire", "sculpture", "handbuilding"] },

  // Glazes
  { id: "celadon-base", name: "Celadon Base Glaze", category: "glaze", subcategory: "Cone 10 Reduction", description: "Classic iron celadon. Fires to a soft jade green in reduction. One of the oldest glaze traditions in ceramics — Chinese Song dynasty lineage.", specs: { "Cone": "10 Reduction", "Color": "Jade green", "Surface": "Satin matte" }, communityRating: 4.8, reviewCount: 345, tags: ["celadon", "reduction", "cone-10", "iron", "classic"] },
  { id: "tenmoku", name: "Tenmoku", category: "glaze", subcategory: "Cone 10 Reduction", description: "Iron-saturate black with russet oil-spot or hare's fur effects in reduction. One of the most complex and rewarding glazes to work with.", specs: { "Cone": "10 Reduction", "Iron Oxide": "8–12%", "Surface": "Glossy to oil-spot" }, communityRating: 4.9, reviewCount: 412, tags: ["tenmoku", "iron", "reduction", "cone-10", "oil-spot"] },
  { id: "shino", name: "Shino", category: "glaze", subcategory: "Cone 10", description: "High-feldspar, high-sodium glaze that traps carbon in crawled and blistered surfaces. Fires orange, white, and grey. The signature glaze of American wood-fire ceramics.", specs: { "Cone": "10 Reduction/Wood", "Surface": "Crawled, matte to satin" }, communityRating: 4.9, reviewCount: 289, tags: ["shino", "wood-fire", "carbon-trap", "cone-10", "sodium"] },
  { id: "copper-red", name: "Copper Red (Ox Blood)", category: "glaze", subcategory: "Cone 10 Reduction", description: "Technically demanding copper-red glaze. Achieves brilliant blood red to ox-blood purple in heavy reduction. Considered one of the hardest glazes to master.", specs: { "Cone": "10 Reduction", "Copper Carbonate": "0.3%", "Surface": "Glossy" }, communityRating: 4.7, reviewCount: 198, tags: ["copper-red", "reduction", "cone-10", "difficult", "ox-blood"] },

  // Metals
  { id: "1084-steel", name: "1084 High Carbon Steel", category: "metal", subcategory: "Carbon Steel", description: "The classic beginner bladesmith steel. Simple heat treat, responsive to hand finishing, good edge retention. Ideal for first knives and simple tools.", specs: { "Carbon": "0.84%", "Heat Treat": "1475°F, quench water/oil", "HRC": "58–60" }, communityRating: 4.8, reviewCount: 324, tags: ["bladesmithing", "knife", "beginner", "carbon-steel", "simple-heat-treat"] },
  { id: "o1-tool-steel", name: "O1 Tool Steel", category: "metal", subcategory: "Tool Steel", description: "Oil-quench tool steel. Fine-grained, excellent edge retention, takes a mirror polish beautifully. The favorite of many custom knife makers.", specs: { "Carbon": "0.90%", "Manganese": "1.0%", "Heat Treat": "1475°F, oil quench", "HRC": "60–62" }, communityRating: 4.9, reviewCount: 287, tags: ["bladesmithing", "tool-steel", "mirror-polish", "knife", "oil-quench"] },
  { id: "wrought-iron", name: "Antique Wrought Iron", category: "metal", subcategory: "Wrought Iron", description: "Historical wrought iron with slag inclusions giving distinctive fibrous grain. Welds cleanly, forges beautifully. Source from reclaimed wagon wheels, anchors, or dedicated suppliers.", specs: { "Carbon": "< 0.1%", "Slag": "2–4%", "Origin": "Varies (reclaimed)" }, communityRating: 4.9, reviewCount: 178, tags: ["blacksmithing", "historical", "forge-welding", "traditional", "wrought-iron"] },
  { id: "fine-silver", name: "Fine Silver (999)", category: "metal", subcategory: "Precious Metal", description: "Pure silver for jewelry. Softer than sterling, doesn't oxidize, excellent for enameling and reticulation. The studio jeweler's workhorse.", specs: { "Purity": "999/1000", "Melting Point": "1763°F", "Work-Hardening": "Low" }, communityRating: 4.8, reviewCount: 234, tags: ["jewelry", "enamel", "reticulation", "fine-silver", "precious"] },

  // Fiber
  { id: "indigo-natural", name: "Natural Indigo (Indigofera tinctoria)", category: "fiber", subcategory: "Natural Dyes", description: "The oldest and most revered blue dye plant. Requires vat fermentation. Produces the deepest, most lightfast blues available from natural sources.", specs: { "Mordant": "None required", "Method": "Reduction vat", "Lightfastness": "Excellent" }, communityRating: 4.9, reviewCount: 312, tags: ["natural-dye", "blue", "vat", "lightfast", "historic"] },
  { id: "madder-root", name: "Madder Root (Rubia tinctorum)", category: "fiber", subcategory: "Natural Dyes", description: "The primary red of historical textile dyeing. With alum mordant: coral to brick red. With iron: dark burgundy. With tannin: warm brown. Incredibly versatile.", specs: { "Mordant": "Alum, iron, or chrome", "Method": "Simmering bath", "Colors": "Coral, red, burgundy" }, communityRating: 4.8, reviewCount: 267, tags: ["natural-dye", "red", "mordant", "versatile", "historic"] },
  { id: "weld-plant", name: "Weld (Reseda luteola)", category: "fiber", subcategory: "Natural Dyes", description: "The best yellow from the natural world. Bright, clear, and the most lightfast of all natural yellows. Combine with indigo for clear, lasting greens.", specs: { "Mordant": "Alum", "Lightfastness": "Very good", "Colors": "Bright yellow to gold" }, communityRating: 4.7, reviewCount: 189, tags: ["natural-dye", "yellow", "lightfast", "alum-mordant"] },
];

export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  glass: "Glass",
  clay: "Clay Bodies",
  glaze: "Glazes",
  metal: "Metals & Alloys",
  fiber: "Natural Dyes & Fibers",
  tools: "Tools & Equipment",
};

export const CATEGORY_EMOJIS: Record<MaterialCategory, string> = {
  glass: "🔥",
  clay: "🏺",
  glaze: "🎨",
  metal: "⚒️",
  fiber: "🧵",
  tools: "🔧",
};
