export interface ExhibitionEntry {
  year: number;
  title: string;
  venue: string;
  location: string;
  type: "solo" | "group" | "residency" | "award" | "collection" | "fair" | "publication";
}

export interface ArtistCV {
  artistId: string;
  education: { year: string; degree: string; institution: string }[];
  exhibitions: ExhibitionEntry[];
  collections: string[];
  awards: string[];
  publications: string[];
}

const CVS: Record<string, ArtistCV> = {
  "alex-bernstein": {
    artistId: "alex-bernstein",
    education: [
      { year: "1992–1996", degree: "BFA in Glass, Sculpture", institution: "Rhode Island School of Design" },
      { year: "1997–1998", degree: "Pilchuck Glass School Residency", institution: "Pilchuck Glass School, WA" },
    ],
    exhibitions: [
      { year: 2025, title: "Luminous Matter", venue: "Habatat Galleries", location: "Royal Oak, MI", type: "solo" },
      { year: 2024, title: "SOFA Chicago — Featured Artist", venue: "Navy Pier", location: "Chicago, IL", type: "fair" },
      { year: 2024, title: "New Glass Review 45", venue: "Corning Museum of Glass", location: "Corning, NY", type: "group" },
      { year: 2023, title: "Material Intelligence", venue: "Bullseye Glass Project Space", location: "Portland, OR", type: "group" },
      { year: 2023, title: "Tensions in Light", venue: "Duane Reed Gallery", location: "St. Louis, MO", type: "solo" },
      { year: 2022, title: "Collect London", venue: "Saatchi Gallery", location: "London, UK", type: "fair" },
      { year: 2021, title: "Glass Art Society Conference Exhibition", venue: "Museum of Arts & Design", location: "New York, NY", type: "group" },
      { year: 2020, title: "Form Follows Feeling", venue: "Ann Nathan Gallery", location: "Chicago, IL", type: "solo" },
    ],
    collections: [
      "Corning Museum of Glass, Corning, NY",
      "Museum of Arts and Design, New York, NY",
      "Los Angeles County Museum of Art (LACMA)",
      "Chrysler Museum of Art, Norfolk, VA",
      "Private collections: USA, Germany, Japan, UK",
    ],
    awards: [
      "2024 — USA Artist Fellow, Visual Arts",
      "2022 — Windgate Foundation Grant",
      "2019 — National Endowment for the Arts Individual Artist Fellowship",
      "2015 — Rakow Commission, Corning Museum of Glass",
    ],
    publications: [
      "New Glass Review 45, Corning Museum of Glass (2024)",
      "American Craft Magazine — Feature Profile (Spring 2023)",
      "Glass Quarterly, Urban Glass (Winter 2022)",
    ],
  },
};

function buildGenericCV(artistId: string): ArtistCV {
  function hash(s: string): number {
    let h = 0;
    for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
    return Math.abs(h);
  }
  const h = hash(artistId);
  const schools = [
    "Rhode Island School of Design", "Cranbrook Academy of Art",
    "Alfred University", "California College of the Arts",
    "Pilchuck Glass School", "Penland School of Craft",
    "Arrowmont School of Arts and Crafts", "Peters Valley School of Craft",
  ];
  const venues = [
    "Habatat Galleries", "Bullseye Glass Project Space", "Duane Reed Gallery",
    "Ann Nathan Gallery", "Lacoste Gallery", "William Traver Gallery",
    "Blue Rain Gallery", "Snyderman-Works Galleries",
  ];
  const cities = ["New York, NY", "Chicago, IL", "Portland, OR", "Seattle, WA", "Philadelphia, PA", "San Francisco, CA"];
  const collectionInsts = [
    "Corning Museum of Glass, Corning, NY",
    "Museum of Arts and Design, New York, NY",
    "Renwick Gallery, Smithsonian, Washington, DC",
    "Philadelphia Museum of Art",
    "Chrysler Museum of Art, Norfolk, VA",
  ];
  const grants = [
    "USA Artist Fellowship", "Windgate Foundation Grant",
    "National Endowment for the Arts Fellowship",
    "Pew Center for Arts & Heritage Award",
    "Pollock-Krasner Foundation Grant",
  ];
  const currentYear = 2026;

  const exhibitions: ExhibitionEntry[] = [];
  for (let i = 0; i < 6; i++) {
    const year = currentYear - i;
    exhibitions.push({
      year,
      title: ["Material Witness", "Process & Form", "Between States", "Gathered Light", "In the Fire", "Surface Tensions"][i % 6],
      venue: venues[(h + i) % venues.length],
      location: cities[(h + i * 3) % cities.length],
      type: (i % 3 === 0 ? "solo" : i % 3 === 1 ? "group" : "fair") as ExhibitionEntry["type"],
    });
  }

  return {
    artistId,
    education: [
      { year: `${1990 + (h % 12)}–${1990 + (h % 12) + 4}`, degree: "BFA, Studio Arts", institution: schools[h % schools.length] },
      { year: `${1994 + (h % 8)}`, degree: "Summer Residency", institution: schools[(h + 3) % schools.length] },
    ],
    exhibitions,
    collections: collectionInsts.slice(0, 2 + (h % 3)),
    awards: [grants[h % grants.length], grants[(h + 2) % grants.length]],
    publications: [
      `American Craft Magazine — Profile (${currentYear - 1})`,
      `New Glass Review ${44 + (h % 3)}, Corning Museum of Glass`,
    ],
  };
}

export function getArtistCV(artistId: string): ArtistCV {
  return CVS[artistId] ?? buildGenericCV(artistId);
}

export const EXHIBITION_TYPE_LABELS: Record<ExhibitionEntry["type"], string> = {
  solo: "Solo",
  group: "Group",
  residency: "Residency",
  award: "Award",
  collection: "Collection",
  fair: "Art Fair",
  publication: "Publication",
};

export const EXHIBITION_TYPE_COLORS: Record<ExhibitionEntry["type"], string> = {
  solo: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  group: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  residency: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  award: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  collection: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  fair: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  publication: "text-stone-400 bg-stone-500/10 border-stone-500/20",
};
