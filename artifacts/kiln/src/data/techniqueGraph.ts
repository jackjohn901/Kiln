export interface TechniqueGraphNode {
  id: string;
  name: string;
  medium: "Glass" | "Metal" | "Ceramics" | "Fiber" | "Enamel" | "Mixed";
  era: string;
  origin: string;
  description: string;
  x: number;
  y: number;
}

export interface TechniqueGraphEdge {
  from: string;
  to: string;
  relationship: "evolved-from" | "shares-materials" | "shares-tools" | "cultural-exchange" | "parallel-development";
  label: string;
}

export const TECHNIQUE_NODES: TechniqueGraphNode[] = [
  { id: "ancient-glassmaking", name: "Ancient Glassmaking", medium: "Glass", era: "3500 BCE", origin: "Mesopotamia", description: "The earliest cast and core-formed glass vessels, developed in ancient Egypt and Mesopotamia. All modern glass techniques trace their lineage here.", x: 50, y: 10 },
  { id: "roman-glassblowing", name: "Roman Glassblowing", medium: "Glass", era: "50 BCE", origin: "Syria / Roman Empire", description: "Phoenician craftsmen discovered that gathering molten glass on a pipe and blowing air created hollow vessels. This single discovery transformed glass forever.", x: 35, y: 22 },
  { id: "venetian-glass", name: "Venetian Glass", medium: "Glass", era: "1200 CE", origin: "Murano, Italy", description: "Venice's Republic concentrated all glassmakers on Murano to protect trade secrets. Venetian techniques — filigrana, murrine, millefiori — remain the bedrock of decorative glass.", x: 28, y: 35 },
  { id: "glass-blowing", name: "Glass Blowing", medium: "Glass", era: "1962 (studio)", origin: "Toledo, OH, USA", description: "Harvey Littleton and Dominick Labino brought glassblowing out of factories and into artists' studios in 1962. The Studio Glass movement was born.", x: 20, y: 50 },
  { id: "flameworking", name: "Flameworking", medium: "Glass", era: "14th century", origin: "Venice", description: "Working glass in a flame rather than a furnace. Venetian bead-makers used oil lamp flames; modern flameworkers use precision oxygen-propane torches.", x: 38, y: 50 },
  { id: "kiln-forming", name: "Kiln Forming", medium: "Glass", era: "3000 BCE", origin: "Egypt", description: "Glass shaped by the heat of a kiln — fusing, slumping, casting. The oldest glass technique, predating glassblowing by 3,000 years.", x: 55, y: 38 },
  { id: "cold-working", name: "Cold Working", medium: "Glass", era: "ancient", origin: "Egypt", description: "Cutting, grinding, polishing, and engraving glass after it has cooled. Combines the discipline of lapidary with the optical properties of glass.", x: 68, y: 50 },
  { id: "murrine", name: "Murrine", medium: "Glass", era: "15th century", origin: "Murano, Italy", description: "Cross-sections of bundled, fused glass cane that reveal intricate patterns. Each murrine is a miniature painting in glass, sliced to reveal its hidden interior image.", x: 42, y: 62 },
  { id: "ancient-pottery", name: "Ancient Pottery", medium: "Ceramics", era: "25,000 BCE", origin: "Czechia / Japan", description: "The oldest known fired ceramics date to the Upper Paleolithic. Pottery represents humanity's first transformation of raw earth through fire.", x: 80, y: 10 },
  { id: "stoneware", name: "Stoneware", medium: "Ceramics", era: "1400 BCE", origin: "China", description: "High-fire ceramics that vitrify at cone 6–10. China's Song dynasty elevated stoneware to an art form; its influence spread through Korea and Japan.", x: 75, y: 25 },
  { id: "porcelain", name: "Porcelain", medium: "Ceramics", era: "600 CE", origin: "China", description: "Translucent, pure white, fired above 2,300°F. China's greatest ceramic achievement, brought to Europe in the 18th century and forever changed decorative arts.", x: 82, y: 40 },
  { id: "raku", name: "Raku", medium: "Ceramics", era: "1580 CE", origin: "Kyoto, Japan", description: "Low-fire hand-formed tea bowls created for Sen no Rikyū's tea ceremony. Paul Soldner adapted Raku for American artists in the 1960s, adding post-firing reduction.", x: 88, y: 52 },
  { id: "wood-fired", name: "Wood-Fired", medium: "Ceramics", era: "2000 BCE", origin: "Japan / Korea", description: "Anagama and noborigama kilns fired with wood over days, creating ash glazes and flame markings that cannot be replicated any other way.", x: 76, y: 55 },
  { id: "ceramics", name: "Ceramics / Earthenware", medium: "Ceramics", era: "7000 BCE", origin: "Middle East", description: "Low-fire clay bodies — the foundation of human ceramic making. Terracotta, majolica, and faience all fall within the earthenware tradition.", x: 72, y: 40 },
  { id: "bronze-casting", name: "Bronze Casting", medium: "Metal", era: "3300 BCE", origin: "Middle East", description: "Lost-wax casting in bronze — one of civilization's oldest metalworking techniques. Sculptors create a wax model, invest it in ceramic, burn out the wax, pour liquid metal.", x: 15, y: 20 },
  { id: "blacksmithing", name: "Blacksmithing", medium: "Metal", era: "1200 BCE", origin: "Middle East / Africa", description: "Forging iron and steel at high heat. Blacksmiths shaped civilization — tools, weapons, architecture. The forge is humanity's oldest industrial workspace.", x: 10, y: 35 },
  { id: "metal-forging", name: "Metal Forging", medium: "Metal", era: "modern", origin: "Studio practice", description: "Contemporary artists who use forging, welding, and fabrication to create sculptural metalwork. Draws from blacksmithing but operates in the fine art tradition.", x: 12, y: 50 },
  { id: "enamel", name: "Enamel", medium: "Enamel", era: "1300 BCE", origin: "Greece / Egypt", description: "Glass fused to metal surfaces at high heat. Cloisonné, champlevé, plique-à-jour — enameling bridges the traditions of glassmaking and metalworking.", x: 30, y: 72 },
  { id: "fiber-arts", name: "Fiber Arts", medium: "Fiber", era: "25,000 BCE", origin: "Global", description: "Weaving, tapestry, felt, and textile — the oldest human craft traditions. Modern fiber art expands these techniques into three-dimensional sculptural territory.", x: 55, y: 75 },
  { id: "tapestry", name: "Tapestry Weaving", medium: "Fiber", era: "3000 BCE", origin: "Egypt / Persia", description: "Loom-woven pictorial textiles that have served as monumental art forms since antiquity. The Gobelins tapestry tradition elevated weaving to a royal art.", x: 65, y: 82 },
  { id: "neon-glass", name: "Neon Glass", medium: "Glass", era: "1910 CE", origin: "France", description: "Georges Claude demonstrated neon tubes in 1910. Artists adopted the medium in the 1970s for its luminous, color-saturated glow. A descendant of flameworking.", x: 28, y: 62 },
];

export const TECHNIQUE_EDGES: TechniqueGraphEdge[] = [
  { from: "ancient-glassmaking", to: "roman-glassblowing", relationship: "evolved-from", label: "Phoenician discovery of blowing" },
  { from: "roman-glassblowing", to: "venetian-glass", relationship: "evolved-from", label: "Roman techniques to Venice" },
  { from: "venetian-glass", to: "glass-blowing", relationship: "cultural-exchange", label: "Littleton + Murano masters" },
  { from: "venetian-glass", to: "flameworking", relationship: "evolved-from", label: "Venetian bead lamp tradition" },
  { from: "venetian-glass", to: "murrine", relationship: "evolved-from", label: "Murano millefiori tradition" },
  { from: "ancient-glassmaking", to: "kiln-forming", relationship: "evolved-from", label: "Earliest glass technique" },
  { from: "kiln-forming", to: "cold-working", relationship: "shares-tools", label: "Post-kiln refinement" },
  { from: "glass-blowing", to: "cold-working", relationship: "shares-tools", label: "Grinding and polishing blown work" },
  { from: "flameworking", to: "neon-glass", relationship: "evolved-from", label: "Glass tube manipulation" },
  { from: "flameworking", to: "murrine", relationship: "shares-tools", label: "Cane-making techniques" },
  { from: "ancient-pottery", to: "stoneware", relationship: "evolved-from", label: "Higher fire temperatures" },
  { from: "stoneware", to: "porcelain", relationship: "evolved-from", label: "Refined kaolin clay body" },
  { from: "stoneware", to: "wood-fired", relationship: "shares-materials", label: "High-fire kiln tradition" },
  { from: "ancient-pottery", to: "ceramics", relationship: "evolved-from", label: "Earthenware development" },
  { from: "ceramics", to: "raku", relationship: "evolved-from", label: "Sen no Rikyū tea ceremony" },
  { from: "ancient-pottery", to: "raku", relationship: "evolved-from", label: "Hand-building tradition" },
  { from: "bronze-casting", to: "blacksmithing", relationship: "parallel-development", label: "Metal-working traditions" },
  { from: "blacksmithing", to: "metal-forging", relationship: "evolved-from", label: "Studio metal practice" },
  { from: "ancient-glassmaking", to: "enamel", relationship: "evolved-from", label: "Glass fused to metal" },
  { from: "bronze-casting", to: "enamel", relationship: "shares-materials", label: "Metal substrate tradition" },
  { from: "kiln-forming", to: "enamel", relationship: "shares-tools", label: "Kiln fusing process" },
  { from: "fiber-arts", to: "tapestry", relationship: "evolved-from", label: "Loom weaving tradition" },
  { from: "stoneware", to: "ceramics", relationship: "parallel-development", label: "Clay body variations" },
];

export const MEDIUM_COLORS: Record<string, string> = {
  Glass: "#60a5fa",
  Metal: "#f59e0b",
  Ceramics: "#c2855e",
  Fiber: "#a78bfa",
  Enamel: "#34d399",
  Mixed: "#f472b6",
};
