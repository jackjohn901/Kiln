export interface Artist {
  id: string;
  name: string;
  location: string;
  instagram: string;
  medium: string;
  tagline: string;
  bio: string;
  concepts: string[];
  keywords: string[];
}

export const artists: Artist[] = [
  {
    id: "alex-bernstein",
    name: "Alex Bernstein",
    location: "United States",
    instagram: "@alexbernsteinglass",
    medium: "Cast & Optical Glass",
    tagline: "Color, Form, and Optical Complexity",
    bio: "Alex Bernstein works at the intersection of color, sculptural form, and internal optical architecture. His cast glass sculptures reward extended looking — shifting with light, angle, and perspective, revealing new depths with every glance.",
    concepts: ["Optical depth", "Color as structure", "Internal light", "Sculptural weight", "Timeless form"],
    keywords: ["bernstein", "alex bernstein"],
  },
  {
    id: "lino-tagliapietra",
    name: "Lino Tagliapietra",
    location: "Venice, Italy",
    instagram: "@linotagliapietra",
    medium: "Blown & Hotworked Glass",
    tagline: "A Living Legend of the Venetian Glass Tradition",
    bio: "Born in Murano, Lino Tagliapietra is widely regarded as the greatest living glassblower in the world. His mastery of Venetian techniques — built over six decades — has redefined the boundaries of glass as a fine art medium.",
    concepts: ["Venetian mastery", "Breath and fire", "Organic gesture", "Heritage reimagined", "Pure craft"],
    keywords: ["tagliapietra", "lino"],
  },
  {
    id: "peter-bremers",
    name: "Peter Bremers",
    location: "Netherlands",
    instagram: "@peterbremers",
    medium: "Optical Cast Glass",
    tagline: "Light Captured and Transformed",
    bio: "Peter Bremers creates large-scale optical glass sculptures that explore the behavior of light within dense, crystalline forms. Inspired by glaciers, deep oceans, and geological time, his work distills the sublime into tangible objects.",
    concepts: ["Captured light", "Geological time", "Arctic silence", "Transparency", "Chromatic depth"],
    keywords: ["bremers", "peter bremers"],
  },
  {
    id: "bertil-vallien",
    name: "Bertil Vallien",
    location: "Sweden",
    instagram: "@bertilvallien",
    medium: "Sand-Cast Glass",
    tagline: "Mythology Frozen in Glass",
    bio: "Bertil Vallien's sand-cast boats and human heads are among the most recognizable works in contemporary glass art. His objects carry the weight of myth — vessels for the unconscious, symbols of passage, dream objects rendered permanent in glass.",
    concepts: ["Myth and memory", "The vessel", "Passage and journey", "Unconscious symbols", "Frozen narrative"],
    keywords: ["vallien", "bertil"],
  },
  {
    id: "shelley-muzylowski-allen",
    name: "Shelley Muzylowski Allen",
    location: "Canada",
    instagram: "@shelleymuzylowskiallen",
    medium: "Flameworked Glass",
    tagline: "Nature Rendered in Fire and Glass",
    bio: "Working at the torch, Shelley Muzylowski Allen creates exquisitely detailed flameworked sculptures that evoke the natural world — flora, fauna, and organic systems — with breathtaking precision and emotional resonance.",
    concepts: ["Natural systems", "Precision and detail", "Organic beauty", "Fragility", "The living world"],
    keywords: ["shelley", "muzylowski", "allen"],
  },
  {
    id: "lucy-lyon",
    name: "Lucy Lyon",
    location: "United States",
    instagram: "@lucylyonglass",
    medium: "Cast Glass",
    tagline: "Figurative Work of Extraordinary Intimacy",
    bio: "Lucy Lyon's cast glass figures are meditations on the human body and human emotion. Her works combine technical mastery with an intimate psychological presence — figures that seem to breathe, to hold something unsaid.",
    concepts: ["Human form", "Emotional stillness", "Intimacy", "Psychological presence", "The body in glass"],
    keywords: ["lucy lyon", "lyon"],
  },
  {
    id: "marta-klonowska",
    name: "Marta Klonowska",
    location: "Poland",
    instagram: "@martaklonowska",
    medium: "Leaded Glass Sculpture",
    tagline: "Animals in Glass, Alive with Uncanny Energy",
    bio: "Marta Klonowska reconstructs classical animal subjects from fragments of broken glass, fusing art history with material invention. Her animal sculptures shatter and reassemble, creating creatures that feel simultaneously ancient and entirely new.",
    concepts: ["Art history reclaimed", "Fragmentation", "Animal energy", "Classical forms", "Glass as fur"],
    keywords: ["klonowska", "marta"],
  },
  {
    id: "michael-behrens",
    name: "Michael Behrens",
    location: "Denmark",
    instagram: "@michaelbehrensglass",
    medium: "Cast Glass",
    tagline: "Geometry and Light in Conversation",
    bio: "Michael Behrens explores the tension between geometric precision and the inherent unpredictability of cast glass. His sculptures balance architectural rigor with the luminous, shifting qualities unique to glass as a material.",
    concepts: ["Geometric tension", "Architectural form", "Material honesty", "Light as subject", "Precise beauty"],
    keywords: ["behrens", "michael behrens"],
  },
];

export function matchArtistFromCaption(caption: string | null): Artist | null {
  if (!caption) return null;
  const lower = caption.toLowerCase();
  return artists.find((a) => a.keywords.some((kw) => lower.includes(kw))) ?? null;
}

export function getHourlyArtist(videos: { caption: string | null }[]): Artist {
  const hour = Math.floor(Date.now() / 3_600_000);
  return artists[hour % artists.length];
}
