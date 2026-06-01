export interface Listing {
  id: string;
  artistId: string;
  title: string;
  year: string;
  medium: string;
  dimensions: string;
  price: number;
  imageUrl: string | null;
  available: boolean;
  edition?: string;
  isResale?: boolean;
  editionNumber?: string;
  editionTotal?: string;
  originalArtistName?: string;
  originalListingId?: string;
  royaltyPercent?: number;
  shipsTo?: string[];
  currency?: string;
  bundleMinQty?: number | null;
  bundleDiscountPct?: number | null;
  stockCount?: number | null;
}

export const listings: Listing[] = [
  {
    id: "ab-001",
    artistId: "alex-bernstein",
    title: "Color Series No. 12",
    year: "2023",
    medium: "Cast, carved and polished glass",
    dimensions: "14 × 9 × 4 inches",
    price: 9800,
    imageUrl: "https://img.youtube.com/vi/lvOjWStv_Q0/hqdefault.jpg",
    available: true,
  },
  {
    id: "ab-002",
    artistId: "alex-bernstein",
    title: "Optical Prism IV",
    year: "2022",
    medium: "Optical cast and polished glass",
    dimensions: "8 × 8 × 6 inches",
    price: 13500,
    imageUrl: "https://img.youtube.com/vi/7xZfRTsNBos/hqdefault.jpg",
    available: true,
  },
  {
    id: "lt-001",
    artistId: "lino-tagliapietra",
    title: "Dinosaur 2019-04",
    year: "2019",
    medium: "Blown glass with murrine",
    dimensions: "28 × 14 × 6 inches",
    price: 88000,
    imageUrl: "https://img.youtube.com/vi/luU1mlCZc8U/hqdefault.jpg",
    available: true,
  },
  {
    id: "lt-002",
    artistId: "lino-tagliapietra",
    title: "Angel 2020-02",
    year: "2020",
    medium: "Blown glass",
    dimensions: "22 × 18 × 5 inches",
    price: 68000,
    imageUrl: "https://img.youtube.com/vi/knlD4-jWANE/hqdefault.jpg",
    available: true,
  },
  {
    id: "pb-001",
    artistId: "peter-bremers",
    title: "IceScape No. 7",
    year: "2021",
    medium: "Optical cast glass",
    dimensions: "20 × 14 × 8 inches",
    price: 22000,
    imageUrl: "https://img.youtube.com/vi/nLBpHh2opPk/hqdefault.jpg",
    available: true,
  },
  {
    id: "pb-002",
    artistId: "peter-bremers",
    title: "Colors of the Sea — Abyss",
    year: "2022",
    medium: "Optical cast glass",
    dimensions: "18 × 12 × 6 inches",
    price: 19500,
    imageUrl: "https://img.youtube.com/vi/6usn-ODghd0/hqdefault.jpg",
    available: false,
  },
  {
    id: "bv-001",
    artistId: "bertil-vallien",
    title: "Boat 'Passage' 2020",
    year: "2020",
    medium: "Sand-cast glass",
    dimensions: "24 × 6 × 4 inches",
    price: 48000,
    imageUrl: "https://img.youtube.com/vi/NK0U6kgGxlc/hqdefault.jpg",
    available: true,
  },
  {
    id: "bv-002",
    artistId: "bertil-vallien",
    title: "Head 'Deep Memory'",
    year: "2019",
    medium: "Kiln-cast glass",
    dimensions: "12 × 9 × 9 inches",
    price: 42000,
    imageUrl: "https://img.youtube.com/vi/hHuc6AnBVtk/hqdefault.jpg",
    available: true,
  },
  {
    id: "sma-001",
    artistId: "shelley-muzylowski-allen",
    title: "Great Horned Owl",
    year: "2022",
    medium: "Flameworked glass",
    dimensions: "16 × 10 × 8 inches",
    price: 9500,
    imageUrl: "https://www.muzylowski.com/wp-content/uploads/2019/04/shelley-muzylowski-allen-artist.jpg",
    available: true,
  },
  {
    id: "sma-002",
    artistId: "shelley-muzylowski-allen",
    title: "Blue Morpho Butterfly",
    year: "2023",
    medium: "Flameworked glass",
    dimensions: "8 × 12 × 3 inches",
    price: 7200,
    imageUrl: "https://img.youtube.com/vi/nchQ4OV3quI/hqdefault.jpg",
    available: true,
  },
  {
    id: "ll-001",
    artistId: "lucy-lyon",
    title: "The Reader",
    year: "2021",
    medium: "Cast glass",
    dimensions: "18 × 8 × 6 inches",
    price: 15500,
    imageUrl: "https://img.youtube.com/vi/3GnHzIQlIFQ/hqdefault.jpg",
    available: true,
  },
  {
    id: "ll-002",
    artistId: "lucy-lyon",
    title: "Standing Figure — Solitude",
    year: "2022",
    medium: "Cast glass",
    dimensions: "22 × 7 × 5 inches",
    price: 19000,
    imageUrl: "https://lucylyonart.com/wp-content/uploads/2015/01/gfx-artist-statement.jpg",
    available: false,
  },
  {
    id: "mk-001",
    artistId: "marta-klonowska",
    title: "Weimaraner after Snyders",
    year: "2020",
    medium: "Leaded glass shards",
    dimensions: "Life size — 28 × 48 × 14 inches",
    price: 32000,
    imageUrl: "https://img.youtube.com/vi/5QlFD7V4G_g/hqdefault.jpg",
    available: true,
  },
  {
    id: "mk-002",
    artistId: "marta-klonowska",
    title: "Lynx after Dürer",
    year: "2019",
    medium: "Leaded glass shards",
    dimensions: "Life size — 30 × 52 × 18 inches",
    price: 38000,
    imageUrl: "https://pixel77.com/wp-content/uploads/2013/02/Amazing-glass-shard-sculptures-Marta-Klonowska-2.jpg",
    available: false,
  },
  {
    id: "mb-001",
    artistId: "michael-behrens",
    title: "Seaforms 268",
    year: "2017",
    medium: "Cast glass",
    dimensions: "54 × 33.5 × 8 inches",
    price: 19500,
    imageUrl: "https://www.michael-behrens.com/wp-content/uploads/Behrens_SF268-17_web-980x1279.jpg",
    available: true,
  },
  {
    id: "mb-002",
    artistId: "michael-behrens",
    title: "Phoenix III",
    year: "2021",
    medium: "Cast glass",
    dimensions: "22 × 16 × 10 inches",
    price: 24000,
    imageUrl: "https://www.michael-behrens.com/wp-content/uploads/Behrens_SF271-18_web-980x1279.jpg",
    available: true,
  },
  {
    id: "dc-001",
    artistId: "dale-chihuly",
    title: "Gold Ruby Seaform Set",
    year: "2018",
    medium: "Blown glass",
    dimensions: "Various, largest 24 × 18 × 12 inches",
    price: 195000,
    imageUrl: "https://www.chihuly.com/sites/default/files/images/M14120s5_01_nw-1600-3.jpg",
    available: true,
  },
  {
    id: "dc-002",
    artistId: "dale-chihuly",
    title: "Macchia with Black Lip Wrap",
    year: "2019",
    medium: "Blown glass",
    dimensions: "18 × 22 × 14 inches",
    price: 98000,
    imageUrl: "https://img.youtube.com/vi/mTgjZe8O3bY/hqdefault.jpg",
    available: false,
  },
  {
    id: "tz-001",
    artistId: "toots-zynsky",
    title: "Primaticcio-149",
    year: "2020",
    medium: "Filet de verre",
    dimensions: "14 × 18 × 6 inches",
    price: 29000,
    imageUrl: "https://d3zr9vspdnjxi.cloudfront.net/sites/tootszy1/sm/539775_Primaticcio-149-web.jpg?436775612c22c262c63a670c7ea9c0b4",
    available: true,
  },
  {
    id: "tz-002",
    artistId: "toots-zynsky",
    title: "Ithaginis — Endangered Species",
    year: "2022",
    medium: "Filet de verre",
    dimensions: "12 × 16 × 5 inches",
    price: 23500,
    imageUrl: "https://d3zr9vspdnjxi.cloudfront.net/sites/tootszy1/sm/10666326_Ithaginis-RectoVerso.jpg?d103751c419dfd302d61969780ba1880",
    available: true,
  },
  {
    id: "ap-001",
    artistId: "albert-paley",
    title: "Garden Gesture VIII",
    year: "2019",
    medium: "Forged and fabricated steel",
    dimensions: "48 × 36 × 18 inches",
    price: 52000,
    imageUrl: "https://img.youtube.com/vi/3Kfj7BvzuZw/hqdefault.jpg",
    available: true,
  },
  {
    id: "ap-002",
    artistId: "albert-paley",
    title: "Bird Form IV",
    year: "2021",
    medium: "Forged and fabricated steel",
    dimensions: "32 × 24 × 12 inches",
    price: 36000,
    imageUrl: "https://img.youtube.com/vi/NAGdVu_knLU/hqdefault.jpg",
    available: true,
  },
];

export function getListingsByArtist(artistId: string): Listing[] {
  return listings.filter((l) => l.artistId === artistId);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}
