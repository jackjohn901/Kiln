export interface CollectorProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  location: string;
  bio: string;
  memberSince: string;
  totalSpent: number;
  piecesOwned: number;
  artistsFollowed: number;
  isVerifiedCollector: boolean;
  preferredMediums: string[];
  collectedWorks: CollectedWork[];
  followedArtistIds: string[];
  reviews: CollectorReview[];
}

export interface CollectedWork {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  year: string;
  medium: string;
  imageUrl: string;
  acquiredDate: string;
  acquisitionPrice?: number;
  showPrice: boolean;
  provenance?: string;
}

export interface CollectorReview {
  id: string;
  artistId: string;
  artistName: string;
  rating: number;
  text: string;
  date: string;
}

export const COLLECTORS: CollectorProfile[] = [
  {
    id: "rachel-osei",
    name: "Rachel Osei",
    handle: "rachel-osei",
    avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80",
    location: "New York, NY",
    bio: "Private collector focusing on contemporary studio glass and ceramics. Board member, Urban Glass NYC. Collecting for 12 years.",
    memberSince: "2022-03-15",
    totalSpent: 142000,
    piecesOwned: 28,
    artistsFollowed: 47,
    isVerifiedCollector: true,
    preferredMediums: ["Studio Glass", "Glass Blowing", "Ceramics"],
    followedArtistIds: ["alex-bernstein", "dante-marioni", "caleb-siemon", "richard-royal", "william-morris"],
    collectedWorks: [
      {
        id: "cw-ro-001",
        title: "Color Series No. 12",
        artistName: "Alex Bernstein",
        artistId: "alex-bernstein",
        year: "2023",
        medium: "Cast, carved and polished glass",
        imageUrl: "https://img.youtube.com/vi/lvOjWStv_Q0/hqdefault.jpg",
        acquiredDate: "2024-02-10",
        acquisitionPrice: 9800,
        showPrice: false,
        provenance: "Acquired directly from the artist's studio.",
      },
      {
        id: "cw-ro-002",
        title: "Untitled Vessel Series IV",
        artistName: "Dante Marioni",
        artistId: "dante-marioni",
        year: "2022",
        medium: "Blown glass",
        imageUrl: "https://img.youtube.com/vi/luU1mlCZc8U/hqdefault.jpg",
        acquiredDate: "2023-06-20",
        showPrice: false,
        provenance: "Pilchuck Glass School auction, 2023.",
      },
      {
        id: "cw-ro-003",
        title: "Flamework Study No. 9",
        artistName: "Caleb Siemon",
        artistId: "caleb-siemon",
        year: "2023",
        medium: "Flameworked borosilicate",
        imageUrl: "https://picsum.photos/seed/cw-ro-003/400/300",
        acquiredDate: "2024-05-01",
        acquisitionPrice: 4200,
        showPrice: true,
      },
    ],
    reviews: [
      { id: "rv-ro-001", artistId: "alex-bernstein", artistName: "Alex Bernstein", rating: 5, text: "Alex's communication was exceptional throughout the commission process. The piece arrived perfectly packed and exceeded all expectations. Would commission again without hesitation.", date: "2024-02-15" },
      { id: "rv-ro-002", artistId: "dante-marioni", artistName: "Dante Marioni", rating: 5, text: "Working with Dante was a privilege. The piece is even more stunning in person than in photographs.", date: "2023-06-25" },
    ],
  },
  {
    id: "james-whitfield",
    name: "James Whitfield",
    handle: "whitfield-gallery",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    location: "Chicago, IL",
    bio: "Gallery director and private collector. 20 years in the craft art world. Specialising in American studio glass and contemporary metalwork.",
    memberSince: "2021-09-01",
    totalSpent: 380000,
    piecesOwned: 61,
    artistsFollowed: 89,
    isVerifiedCollector: true,
    preferredMediums: ["Glass Blowing", "Metal Forging", "Murrine", "Bronze Casting"],
    followedArtistIds: ["lino-tagliapietra", "william-morris", "richard-royal", "alex-bernstein", "john-kiley"],
    collectedWorks: [
      {
        id: "cw-jw-001",
        title: "Dinosaur 2019-04",
        artistName: "Lino Tagliapietra",
        artistId: "lino-tagliapietra",
        year: "2019",
        medium: "Blown glass with murrine",
        imageUrl: "https://img.youtube.com/vi/luU1mlCZc8U/hqdefault.jpg",
        acquiredDate: "2022-04-15",
        showPrice: false,
        provenance: "Habatat Galleries Michigan, 2022.",
      },
      {
        id: "cw-jw-002",
        title: "Vessel in Red and Black",
        artistName: "William Morris",
        artistId: "william-morris",
        year: "2021",
        medium: "Blown and sand-carved glass",
        imageUrl: "https://picsum.photos/seed/cw-jw-002/400/300",
        acquiredDate: "2023-01-08",
        showPrice: false,
      },
      {
        id: "cw-jw-003",
        title: "Forged Iron Gate Study",
        artistName: "Richard Royal",
        artistId: "richard-royal",
        year: "2022",
        medium: "Forged and patinated iron",
        imageUrl: "https://picsum.photos/seed/cw-jw-003/400/300",
        acquiredDate: "2023-09-22",
        acquisitionPrice: 22000,
        showPrice: true,
      },
    ],
    reviews: [
      { id: "rv-jw-001", artistId: "lino-tagliapietra", artistName: "Lino Tagliapietra", rating: 5, text: "One of the most significant acquisitions of my collecting career. An absolute masterwork.", date: "2022-04-20" },
      { id: "rv-jw-002", artistId: "william-morris", artistName: "William Morris", rating: 5, text: "Bill's attention to detail is unmatched. The piece arrived with full documentation and a handwritten note.", date: "2023-01-10" },
    ],
  },
  {
    id: "mei-lin",
    name: "Mei Lin",
    handle: "mei-lin",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
    location: "Portland, OR",
    bio: "Interior designer and emerging collector. Curating a corporate art collection for boutique hotels. Interest in functional art that bridges craft and design.",
    memberSince: "2023-01-20",
    totalSpent: 58000,
    piecesOwned: 14,
    artistsFollowed: 32,
    isVerifiedCollector: true,
    preferredMediums: ["Ceramics", "Kiln Forming", "Fiber Arts"],
    followedArtistIds: ["erica-rosenfeld", "caleb-siemon", "maya-chen"],
    collectedWorks: [
      {
        id: "cw-ml-001",
        title: "Reduction Bowl Series",
        artistName: "Erica Rosenfeld",
        artistId: "erica-rosenfeld",
        year: "2023",
        medium: "Thrown and reduction-fired stoneware",
        imageUrl: "https://picsum.photos/seed/cw-ml-001/400/300",
        acquiredDate: "2023-11-05",
        acquisitionPrice: 3200,
        showPrice: true,
      },
      {
        id: "cw-ml-002",
        title: "Woven Wall Piece No. 3",
        artistName: "Laura Donefer",
        artistId: "laura-donefer",
        year: "2022",
        medium: "Mixed fiber and glass beads",
        imageUrl: "https://picsum.photos/seed/cw-ml-002/400/300",
        acquiredDate: "2024-03-18",
        acquisitionPrice: 5800,
        showPrice: true,
      },
    ],
    reviews: [
      { id: "rv-ml-001", artistId: "erica-rosenfeld", artistName: "Erica Rosenfeld", rating: 5, text: "Erica's work transforms any space. Our hotel guests always ask about the pieces. Incredibly professional to work with.", date: "2023-11-10" },
    ],
  },
  {
    id: "thomas-berg",
    name: "Thomas Berg",
    handle: "thomas-berg",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    location: "Seattle, WA",
    bio: "Tech executive and passionate glass art collector. Member of the Pilchuck Glass School board. Focus on Pacific Northwest studio glass.",
    memberSince: "2021-06-10",
    totalSpent: 95000,
    piecesOwned: 19,
    artistsFollowed: 28,
    isVerifiedCollector: false,
    preferredMediums: ["Glass Blowing", "Flameworking", "Studio Glass"],
    followedArtistIds: ["alex-bernstein", "richard-royal", "caleb-siemon", "john-kiley"],
    collectedWorks: [
      {
        id: "cw-tb-001",
        title: "Pacific Form Study",
        artistName: "Richard Royal",
        artistId: "richard-royal",
        year: "2023",
        medium: "Blown glass",
        imageUrl: "https://picsum.photos/seed/cw-tb-001/400/300",
        acquiredDate: "2024-01-15",
        acquisitionPrice: 18500,
        showPrice: true,
        provenance: "Acquired at Pilchuck's annual gala auction.",
      },
    ],
    reviews: [],
  },
];

export function getCollectorById(id: string): CollectorProfile | undefined {
  return COLLECTORS.find((c) => c.id === id);
}

export function getCollectorsByArtist(artistId: string): CollectorProfile[] {
  return COLLECTORS.filter((c) => c.followedArtistIds.includes(artistId));
}
