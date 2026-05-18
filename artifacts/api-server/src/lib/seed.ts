import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable, profilesTable, postsTable,
  listingsTable, dropsTable, auctionsTable, auctionBidsTable,
  workshopsTable, guildsTable, guildMembersTable,
  patronTiersTable,
} from "@workspace/db";
import { logger } from "./logger";

const SEED_MARKER_ID = "seed-v4-marker";

const SEED_USERS = [
  { id: "seed-v4-marker", email: "seed-v4@kiln.internal", firstName: "Seed", lastName: "V4" },
  { id: "seed-elena-vasquez", email: "elena@example.kiln", firstName: "Elena", lastName: "Vasquez" },
  { id: "seed-marco-chen", email: "marco@example.kiln", firstName: "Marco", lastName: "Chen" },
  { id: "seed-zoe-nakamura", email: "zoe@example.kiln", firstName: "Zoe", lastName: "Nakamura" },
  { id: "seed-felix-okafor", email: "felix@example.kiln", firstName: "Felix", lastName: "Okafor" },
  { id: "seed-aria-patel", email: "aria@example.kiln", firstName: "Aria", lastName: "Patel" },
  { id: "seed-sam-rivera", email: "sam@example.kiln", firstName: "Sam", lastName: "Rivera" },
];

const SEED_PROFILES = [
  {
    userId: "seed-elena-vasquez", handle: "elena.clay", displayName: "Elena Vasquez",
    bio: "Wheel-thrown stoneware & reduction glazes. 15 years at the wheel.", medium: "Ceramics",
    location: "Portland, OR", followerCount: 12400, followingCount: 230, postCount: 13,
    avatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
  },
  {
    userId: "seed-marco-chen", handle: "marcoglass", displayName: "Marco Chen",
    bio: "Flameworked glass and large-scale installations. Studio in Brooklyn.", medium: "Glasswork",
    location: "Brooklyn, NY", followerCount: 8700, followingCount: 182, postCount: 10,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
  },
  {
    userId: "seed-zoe-nakamura", handle: "zoe.weaves", displayName: "Zoe Nakamura",
    bio: "Hand-dyeing and natural fiber weaving. Slow fashion advocate.", medium: "Weaving",
    location: "Seattle, WA", followerCount: 5200, followingCount: 310, postCount: 9,
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
  },
  {
    userId: "seed-felix-okafor", handle: "felixcraft", displayName: "Felix Okafor",
    bio: "Lathe-turned hardwoods and furniture joinery. Chicago woodshop since 2008.", medium: "Woodwork",
    location: "Chicago, IL", followerCount: 19300, followingCount: 145, postCount: 18,
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
  },
  {
    userId: "seed-aria-patel", handle: "ariametal", displayName: "Aria Patel",
    bio: "Forged steel and sterling silver. Experimental metalwork in San Francisco.", medium: "Metalwork",
    location: "San Francisco, CA", followerCount: 7100, followingCount: 280, postCount: 14,
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
  },
  {
    userId: "seed-sam-rivera", handle: "sam.kiln", displayName: "Sam Rivera",
    bio: "High-fire reduction ceramics. Inspired by Japanese mingei folk tradition.", medium: "Pottery",
    location: "Austin, TX", followerCount: 3400, followingCount: 195, postCount: 8,
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
  },
];

const SEED_POSTS = [
  {
    id: "seed-post-01", authorId: "seed-elena-vasquez", authorName: "Elena Vasquez",
    authorAvatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
    videoUrl: "https://videos.pexels.com/video-files/3214547/3214547-hd_1920_1080_25fps.mp4",
    caption: "Just finished this piece after 3 weeks at the wheel. The glaze oxidation turned out even better than expected.",
    technique: "Ceramics", likeCount: 1243, commentCount: 64, saveCount: 214,
  },
  {
    id: "seed-post-02", authorId: "seed-elena-vasquez", authorName: "Elena Vasquez",
    authorAvatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1490312278390-ab64016b5873?w=800&q=80",
    caption: "High-fire reduction session. The copper red glaze has that deep oxblood effect I've been chasing for months. [critique welcome] — especially curious about glaze thickness and application.",
    technique: "Ceramics", likeCount: 891, commentCount: 43, saveCount: 178,
  },
  {
    id: "seed-post-03", authorId: "seed-elena-vasquez", authorName: "Elena Vasquez",
    authorAvatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1530092376999-0df0a9e0c41a?w=800&q=80",
    videoUrl: "https://videos.pexels.com/video-files/4065665/4065665-hd_1920_1080_25fps.mp4",
    caption: "New series: vessels inspired by Korean onggi tradition. Throwing at 40 lbs felt like a whole new discipline.",
    technique: "Ceramics", likeCount: 2140, commentCount: 97, saveCount: 342,
  },
  {
    id: "seed-post-04", authorId: "seed-marco-chen", authorName: "Marco Chen",
    authorAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
    videoUrl: "https://videos.pexels.com/video-files/5726816/5726816-hd_1920_1080_25fps.mp4",
    caption: "New glass panel commission complete. Natural light changes everything — it's alive at different hours.",
    technique: "Glasswork", likeCount: 1876, commentCount: 82, saveCount: 291,
  },
  {
    id: "seed-post-05", authorId: "seed-marco-chen", authorName: "Marco Chen",
    authorAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    caption: "Flamework session — borosilicate tubing and silver foil. The colour layering took 6 hours to get right. [critique welcome] — first time using silver foil at this scale.",
    technique: "Glasswork", likeCount: 1102, commentCount: 55, saveCount: 189,
  },
  {
    id: "seed-post-06", authorId: "seed-zoe-nakamura", authorName: "Zoe Nakamura",
    authorAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1464790719320-516ecd75af6c?w=800&q=80",
    caption: "Warp and weft — finally nailed the twill variation I've been after. Natural indigo dye, 16 hours at the loom.",
    technique: "Weaving", likeCount: 743, commentCount: 38, saveCount: 156,
  },
  {
    id: "seed-post-07", authorId: "seed-zoe-nakamura", authorName: "Zoe Nakamura",
    authorAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1547234935-80c7145ec969?w=800&q=80",
    videoUrl: "https://videos.pexels.com/video-files/3057714/3057714-hd_1920_1080_25fps.mp4",
    caption: "Shibori resist dyeing with iron-tannin mordant. The feathering wasn't planned — it happened when I lifted the clamps.",
    technique: "Weaving", likeCount: 1420, commentCount: 71, saveCount: 267,
  },
  {
    id: "seed-post-08", authorId: "seed-felix-okafor", authorName: "Felix Okafor",
    authorAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1511376777868-611b54f68947?w=800&q=80",
    videoUrl: "https://videos.pexels.com/video-files/3013367/3013367-hd_1920_1080_24fps.mp4",
    caption: "Off the lathe after 8 hours. Cherry burl never disappoints — the figure in this piece is unlike anything I've turned.",
    technique: "Woodwork", likeCount: 3240, commentCount: 118, saveCount: 512,
  },
  {
    id: "seed-post-09", authorId: "seed-felix-okafor", authorName: "Felix Okafor",
    authorAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1612198790700-b12fe81e1e3c?w=800&q=80",
    caption: "Hand-cut dovetails on this walnut cabinet took 2 full days. No shortcuts, no jigs — just a sharp chisel and patience. [critique welcome] — looking for feedback on proportions and finish.",
    technique: "Woodwork", likeCount: 2670, commentCount: 93, saveCount: 438,
  },
  {
    id: "seed-post-10", authorId: "seed-aria-patel", authorName: "Aria Patel",
    authorAvatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80",
    videoUrl: "https://videos.pexels.com/video-files/5739107/5739107-hd_1920_1080_25fps.mp4",
    caption: "Forged and finished. This Damascus blade took 400 folds. The contrast between layers gets clearer with every etch.",
    technique: "Metalwork", likeCount: 1590, commentCount: 76, saveCount: 285,
  },
  {
    id: "seed-post-11", authorId: "seed-aria-patel", authorName: "Aria Patel",
    authorAvatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=800&q=80",
    caption: "Granulation work on this silver brooch — ancient technique, no solder. Each sphere is 0.5mm, fused with copper-silver eutectic.",
    technique: "Metalwork", likeCount: 1230, commentCount: 59, saveCount: 198,
  },
  {
    id: "seed-post-12", authorId: "seed-sam-rivera", authorName: "Sam Rivera",
    authorAvatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80",
    caption: "High-fire reduction kiln results. Worth every minute of the 14-hour firing — the ash glaze melted exactly as hoped.",
    technique: "Pottery", likeCount: 980, commentCount: 47, saveCount: 162,
  },
  {
    id: "seed-post-13", authorId: "seed-sam-rivera", authorName: "Sam Rivera",
    authorAvatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1609600866552-f2a71e64d8c7?w=800&q=80",
    caption: "Anagama wood firing series #4. The fly ash deposits from 3 days of stoking created these incredible natural glazes.",
    technique: "Pottery", likeCount: 1456, commentCount: 68, saveCount: 234,
  },
  {
    id: "seed-post-14", authorId: "seed-elena-vasquez", authorName: "Elena Vasquez",
    authorAvatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1550367363-ea12860cc124?w=800&q=80",
    caption: "Trimming day — 80 pieces off the hump and trimmed in one session. The rhythm of the studio is everything.",
    technique: "Ceramics", likeCount: 672, commentCount: 28, saveCount: 94,
  },
  {
    id: "seed-post-15", authorId: "seed-marco-chen", authorName: "Marco Chen",
    authorAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1541447271487-09612b3f49f7?w=800&q=80",
    videoUrl: "https://videos.pexels.com/video-files/3874104/3874104-hd_1920_1080_30fps.mp4",
    caption: "Torch session at 3am — sometimes the best work happens when the studio is completely quiet.",
    technique: "Glasswork", likeCount: 2340, commentCount: 102, saveCount: 389,
  },
  {
    id: "seed-post-16", authorId: "seed-felix-okafor", authorName: "Felix Okafor",
    authorAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1528459801416-a9241982c0a3?w=800&q=80",
    caption: "Box elder burl bowl. Found this log at a salvage yard — nobody saw what was inside. Completely hollow-turned at 1/8\" wall.",
    technique: "Woodwork", likeCount: 4120, commentCount: 167, saveCount: 623,
  },
  {
    id: "seed-post-17", authorId: "seed-aria-patel", authorName: "Aria Patel",
    authorAvatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80",
    caption: "Argentium silver cuff — reticulated with heat, then hand-hammered over a mandrel. The surface texture is irreproducible. [critique welcome] — open to thoughts on the reticulation pattern.",
    technique: "Metalwork", likeCount: 887, commentCount: 41, saveCount: 153,
  },
  {
    id: "seed-post-18", authorId: "seed-zoe-nakamura", authorName: "Zoe Nakamura",
    authorAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80",
    caption: "Overshot weave in natural wool and silk. The draft took 3 hours to thread — 480 ends on a 16-shaft loom.",
    technique: "Weaving", likeCount: 1680, commentCount: 73, saveCount: 298,
  },
  {
    id: "seed-post-19", authorId: "seed-sam-rivera", authorName: "Sam Rivera",
    authorAvatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80",
    caption: "A year of yunomi. 365 tea bowls — one per day. Only 22 made it to the keeper shelf.",
    technique: "Pottery", likeCount: 5430, commentCount: 241, saveCount: 891,
  },
  {
    id: "seed-post-20", authorId: "seed-marco-chen", authorName: "Marco Chen",
    authorAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800&q=80",
    caption: "Kiln-formed optical glass — 860°C slumped over a graphite mold. This took 7 attempts. Worth every one.",
    technique: "Glasswork", likeCount: 3190, commentCount: 134, saveCount: 476,
  },
];

// ── Listings ─────────────────────────────────────────────────────────────────
const SEED_LISTINGS = [
  {
    id: "seed-listing-01", artistId: "seed-elena-vasquez", artistName: "Elena Vasquez",
    artistAvatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
    title: "Oxblood Reduction Vase", description: "Wheel-thrown stoneware fired in a wood-reduction kiln. The deep copper-red glaze was achieved over 3 firings. One of a kind.",
    medium: "Ceramics", technique: "Wheel-throwing", dimensions: "12\" H × 6\" W",
    year: 2026, edition: "1 of 1",
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
    price: 840, shipsFrom: "Portland, OR", tags: ["ceramics", "stoneware", "reduction"],
    isAvailable: true, isSold: false, wishlistCount: 47,
  },
  {
    id: "seed-listing-02", artistId: "seed-elena-vasquez", artistName: "Elena Vasquez",
    artistAvatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
    title: "Celadon Tea Bowl Set (4)", description: "Four hand-thrown celadon bowls — slight variation in each makes the set feel alive. Ideal for everyday use.",
    medium: "Ceramics", technique: "Wheel-throwing", dimensions: "3.5\" H × 4.5\" W each",
    year: 2025, edition: "1 of 1",
    imageUrl: "https://images.unsplash.com/photo-1490312278390-ab64016b5873?w=800&q=80",
    price: 380, shipsFrom: "Portland, OR", tags: ["ceramics", "tea", "celadon"],
    isAvailable: true, isSold: false, wishlistCount: 82,
  },
  {
    id: "seed-listing-03", artistId: "seed-marco-chen", artistName: "Marco Chen",
    artistAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    title: "Borosilicate Nebula Pendant", description: "Flameworked borosilicate glass with dichroic silver foil interior. Hand-formed in a single session — each shift of light reveals a different colour.",
    medium: "Glass", technique: "Flameworking", dimensions: "2.5\" diameter",
    year: 2026, edition: "1 of 1",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
    price: 195, shipsFrom: "Brooklyn, NY", tags: ["glass", "flamework", "jewelry"],
    isAvailable: true, isSold: false, wishlistCount: 134,
  },
  {
    id: "seed-listing-04", artistId: "seed-felix-okafor", artistName: "Felix Okafor",
    artistAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    title: "Cherry Burl Hollow Form", description: "Hollow-turned from a single cherry burl blank salvaged from a Chicago park. 1/8\" walls throughout. Natural oil finish.",
    medium: "Wood", technique: "Lathe Turning", dimensions: "9\" H × 7\" W",
    year: 2026, edition: "1 of 1",
    imageUrl: "https://images.unsplash.com/photo-1511376777868-611b54f68947?w=800&q=80",
    price: 1200, shipsFrom: "Chicago, IL", tags: ["wood", "turned", "burl"],
    isAvailable: true, isSold: false, wishlistCount: 91,
  },
  {
    id: "seed-listing-05", artistId: "seed-aria-patel", artistName: "Aria Patel",
    artistAvatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    title: "Damascus Steel Letter Opener", description: "Hand-forged Damascus steel with 200-layer pattern weld. Walnut handle. Made as a functional everyday object and an heirloom.",
    medium: "Metal", technique: "Blacksmithing", dimensions: "9\" L",
    year: 2026, edition: "1 of 1",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80",
    price: 320, shipsFrom: "San Francisco, CA", tags: ["steel", "damascus", "forged"],
    isAvailable: true, isSold: false, wishlistCount: 68,
  },
  {
    id: "seed-listing-06", artistId: "seed-zoe-nakamura", artistName: "Zoe Nakamura",
    artistAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    title: "Natural Indigo Twill Wrap", description: "Handwoven twill in natural indigo-dyed wool. Single piece, 100% plant-dyed with no synthetic mordants. Signed and dated.",
    medium: "Fiber Arts", technique: "Weaving", dimensions: "72\" × 20\"",
    year: 2026, edition: "1 of 1",
    imageUrl: "https://images.unsplash.com/photo-1464790719320-516ecd75af6c?w=800&q=80",
    price: 560, shipsFrom: "Seattle, WA", tags: ["weaving", "indigo", "natural dye"],
    isAvailable: true, isSold: false, wishlistCount: 55,
  },
  {
    id: "seed-listing-07", artistId: "seed-sam-rivera", artistName: "Sam Rivera",
    artistAvatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    title: "Anagama Ash-Glaze Yunomi", description: "Wood-fired for 72 hours in an anagama kiln. Natural fly-ash deposits created the surface texture and glaze. No artificial glaze applied.",
    medium: "Ceramics", technique: "Wood Firing", dimensions: "4\" H × 3.5\" W",
    year: 2026, edition: "1 of 1",
    imageUrl: "https://images.unsplash.com/photo-1609600866552-f2a71e64d8c7?w=800&q=80",
    price: 145, shipsFrom: "Austin, TX", tags: ["pottery", "wood-fired", "yunomi"],
    isAvailable: true, isSold: false, wishlistCount: 103,
  },
  {
    id: "seed-listing-08", artistId: "seed-marco-chen", artistName: "Marco Chen",
    artistAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    title: "Kiln-Formed Optical Glass Panel", description: "Slumped at 860°C over a graphite mold. The optical-grade glass refracts light into a slow spectrum across any wall. Hanging hardware included.",
    medium: "Glass", technique: "Kiln Forming", dimensions: "18\" × 12\" × 0.75\"",
    year: 2026, edition: "1 of 3",
    imageUrl: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800&q=80",
    price: 2800, shipsFrom: "Brooklyn, NY", tags: ["glass", "kiln-formed", "wall art"],
    isAvailable: true, isSold: false, wishlistCount: 176,
  },
];

// ── Drops ─────────────────────────────────────────────────────────────────────
const now = new Date();
const d = (days: number) => new Date(now.getTime() + days * 86400000);

const SEED_DROPS = [
  {
    id: "seed-drop-01", artistId: "seed-elena-vasquez", artistName: "Elena Vasquez",
    artistAvatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
    title: "Solstice Series — Celadon Bowls", description: "Eight wheel-thrown celadon bowls released simultaneously. No reprints. Each is slightly unique from the same firing.",
    imageUrl: "https://images.unsplash.com/photo-1530092376999-0df0a9e0c41a?w=800&q=80",
    price: 290, edition: 8, editionSold: 3, status: "live",
    dropDate: d(-2), technique: "Ceramics",
    tags: ["ceramics", "celadon", "limited"],
    isPatronEarlyAccess: true,
  },
  {
    id: "seed-drop-02", artistId: "seed-marco-chen", artistName: "Marco Chen",
    artistAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    title: "Dichroic Pendant Collection", description: "12 flameworked borosilicate pendants — each catching light differently. Drop releases all at once, first come first served.",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    price: 175, edition: 12, editionSold: 7, status: "live",
    dropDate: d(-5), technique: "Flameworking",
    tags: ["glass", "pendant", "dichroic"],
    isPatronEarlyAccess: false,
  },
  {
    id: "seed-drop-03", artistId: "seed-felix-okafor", artistName: "Felix Okafor",
    artistAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    title: "Burl Season — 5 Turned Vessels", description: "Five unique burl vessels from the same salvage haul. Releasing all together so collectors can choose. Patron supporters get 48h early access.",
    imageUrl: "https://images.unsplash.com/photo-1528459801416-a9241982c0a3?w=800&q=80",
    price: 980, edition: 5, editionSold: 0, status: "upcoming",
    dropDate: d(7), technique: "Woodwork",
    tags: ["wood", "burl", "turned"],
    isPatronEarlyAccess: true,
  },
  {
    id: "seed-drop-04", artistId: "seed-aria-patel", artistName: "Aria Patel",
    artistAvatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    title: "Granulated Silver Brooch Run", description: "Six brooches using the ancient granulation technique — no solder, pure copper-silver eutectic bonding. One month to make all six.",
    imageUrl: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=800&q=80",
    price: 640, edition: 6, editionSold: 0, status: "upcoming",
    dropDate: d(14), technique: "Metalwork",
    tags: ["silver", "brooch", "granulation"],
    isPatronEarlyAccess: false,
  },
];

// ── Auctions ──────────────────────────────────────────────────────────────────
const SEED_AUCTIONS = [
  {
    id: "seed-auction-01", artistId: "seed-felix-okafor", artistName: "Felix Okafor",
    artistAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    title: "Box Elder Burl Bowl — Large", description: "The centrepiece of the burl season. Found at a Chicago salvage yard, this bowl took 11 hours to hollow-turn at 1/8\" walls throughout. The figure is extraordinary.",
    imageUrl: "https://images.unsplash.com/photo-1612198790700-b12fe81e1e3c?w=800&q=80",
    medium: "Wood", dimensions: "14\" H × 11\" W",
    startingPrice: 800, reservePrice: 1500, currentBid: 1250,
    currentBidderId: "seed-sam-rivera", currentBidderName: "Sam Rivera",
    bidCount: 6, status: "live",
    startDate: d(-3), endDate: d(4),
    tags: ["wood", "burl", "turned"],
  },
  {
    id: "seed-auction-02", artistId: "seed-elena-vasquez", artistName: "Elena Vasquez",
    artistAvatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
    title: "Exceptional Oxblood Jar — Exhibition Piece", description: "Exhibited at Portland Craft Week 2026. Three-fired stoneware, copper-red reduction glaze. The best piece I've made in 15 years at the wheel.",
    imageUrl: "https://images.unsplash.com/photo-1550367363-ea12860cc124?w=800&q=80",
    medium: "Ceramics", dimensions: "16\" H × 8\" W",
    startingPrice: 1200, reservePrice: 2000, currentBid: 1850,
    currentBidderId: "seed-marco-chen", currentBidderName: "Marco Chen",
    bidCount: 9, status: "live",
    startDate: d(-6), endDate: d(2),
    tags: ["ceramics", "oxblood", "exhibition"],
  },
  {
    id: "seed-auction-03", artistId: "seed-marco-chen", artistName: "Marco Chen",
    artistAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    title: "Large Kiln-Cast Glass Sculpture", description: "Lost-wax kiln-cast glass. The form took 8 weeks of wax work and 3 kiln runs. Museum-quality optical clarity. No bubbles.",
    imageUrl: "https://images.unsplash.com/photo-1541447271487-09612b3f49f7?w=800&q=80",
    medium: "Glass", dimensions: "22\" H × 8\" W",
    startingPrice: 3500, reservePrice: 5000, currentBid: 0,
    currentBidderId: null, currentBidderName: null,
    bidCount: 0, status: "upcoming",
    startDate: d(5), endDate: d(12),
    tags: ["glass", "cast", "sculpture"],
  },
  {
    id: "seed-auction-04", artistId: "seed-aria-patel", artistName: "Aria Patel",
    artistAvatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    title: "Damascus Chef's Knife — 500 Layers", description: "Two years of forging work. 500 layers of high-carbon and low-carbon steel, with a full convex grind. Ironwood handle with copper bolster. A tool for life.",
    imageUrl: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80",
    medium: "Metal", dimensions: "11\" blade, 16\" overall",
    startingPrice: 2200, reservePrice: 3000, currentBid: 2400,
    currentBidderId: "seed-zoe-nakamura", currentBidderName: "Zoe Nakamura",
    bidCount: 3, status: "live",
    startDate: d(-1), endDate: d(6),
    tags: ["steel", "damascus", "knife"],
  },
];

const SEED_AUCTION_BIDS = [
  { id: "seed-bid-01", auctionId: "seed-auction-01", bidderId: "seed-zoe-nakamura", bidderName: "Zoe Nakamura", amount: 850 },
  { id: "seed-bid-02", auctionId: "seed-auction-01", bidderId: "seed-sam-rivera", bidderName: "Sam Rivera", amount: 950 },
  { id: "seed-bid-03", auctionId: "seed-auction-01", bidderId: "seed-zoe-nakamura", bidderName: "Zoe Nakamura", amount: 1100 },
  { id: "seed-bid-04", auctionId: "seed-auction-01", bidderId: "seed-sam-rivera", bidderName: "Sam Rivera", amount: 1250 },
  { id: "seed-bid-05", auctionId: "seed-auction-02", bidderId: "seed-felix-okafor", bidderName: "Felix Okafor", amount: 1300 },
  { id: "seed-bid-06", auctionId: "seed-auction-02", bidderId: "seed-sam-rivera", bidderName: "Sam Rivera", amount: 1500 },
  { id: "seed-bid-07", auctionId: "seed-auction-02", bidderId: "seed-marco-chen", bidderName: "Marco Chen", amount: 1700 },
  { id: "seed-bid-08", auctionId: "seed-auction-02", bidderId: "seed-felix-okafor", bidderName: "Felix Okafor", amount: 1850 },
  { id: "seed-bid-09", auctionId: "seed-auction-04", bidderId: "seed-felix-okafor", bidderName: "Felix Okafor", amount: 2250 },
  { id: "seed-bid-10", auctionId: "seed-auction-04", bidderId: "seed-zoe-nakamura", bidderName: "Zoe Nakamura", amount: 2400 },
];

// ── Workshops ─────────────────────────────────────────────────────────────────
const SEED_WORKSHOPS = [
  {
    id: "seed-workshop-01", artistId: "seed-elena-vasquez", artistName: "Elena Vasquez",
    artistAvatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
    title: "Introduction to Wheel Throwing", description: "A full-day workshop for beginners. You'll centre clay, open forms, and pull walls on a kick wheel. All materials and glazing included. Leave with 3–5 pieces.",
    technique: "Ceramics", level: "Beginner", location: "Portland, OR",
    isOnline: false, price: 185, maxSpots: 6, spotsBooked: 4, durationHours: 7,
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
    startDate: d(10), endDate: d(10), tags: ["ceramics", "beginner", "hands-on"],
    isActive: true,
  },
  {
    id: "seed-workshop-02", artistId: "seed-elena-vasquez", artistName: "Elena Vasquez",
    artistAvatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&q=80",
    title: "Reduction Glazing Masterclass", description: "Advanced session on copper-red and celadon reduction glazes. Theory, chemistry, and kiln loading. Minimum 2 years throwing experience required.",
    technique: "Ceramics", level: "Advanced", location: "Portland, OR",
    isOnline: false, price: 280, maxSpots: 4, spotsBooked: 2, durationHours: 8,
    imageUrl: "https://images.unsplash.com/photo-1490312278390-ab64016b5873?w=800&q=80",
    startDate: d(21), endDate: d(21), tags: ["ceramics", "glazing", "advanced"],
    isActive: true,
  },
  {
    id: "seed-workshop-03", artistId: "seed-marco-chen", artistName: "Marco Chen",
    artistAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    title: "Flameworking Fundamentals — Online", description: "Live Zoom workshop. You'll need a minor torch setup (we'll send a kit list). We'll cover borosilicate vs. soft glass, basic bead forming, and encasing colour.",
    technique: "Glasswork", level: "Beginner", location: "Online",
    isOnline: true, price: 95, maxSpots: 12, spotsBooked: 8, durationHours: 3,
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
    startDate: d(6), endDate: d(6), tags: ["glass", "flamework", "online"],
    isActive: true,
  },
  {
    id: "seed-workshop-04", artistId: "seed-felix-okafor", artistName: "Felix Okafor",
    artistAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    title: "Lathe Turning — Weekend Intensive", description: "Two days, spindle and faceplate work. Saturday: tool geometry, basic cylinders, hollowing. Sunday: open forms and natural-edge work on burls. All tools and blanks provided.",
    technique: "Woodwork", level: "Intermediate", location: "Chicago, IL",
    isOnline: false, price: 420, maxSpots: 5, spotsBooked: 3, durationHours: 16,
    imageUrl: "https://images.unsplash.com/photo-1511376777868-611b54f68947?w=800&q=80",
    startDate: d(15), endDate: d(16), tags: ["wood", "turning", "weekend"],
    isActive: true,
  },
  {
    id: "seed-workshop-05", artistId: "seed-aria-patel", artistName: "Aria Patel",
    artistAvatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    title: "Forging a Damascus Billet", description: "Forge-weld and manipulate your own Damascus steel billet. Covers flux, heat management, and pattern techniques (ladder, twist, raindrop). You take the billet home.",
    technique: "Metalwork", level: "Intermediate", location: "San Francisco, CA",
    isOnline: false, price: 350, maxSpots: 4, spotsBooked: 1, durationHours: 9,
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80",
    startDate: d(28), endDate: d(28), tags: ["metal", "damascus", "forging"],
    isActive: true,
  },
];

// ── Guilds ────────────────────────────────────────────────────────────────────
const SEED_GUILDS = [
  {
    id: "seed-guild-01", name: "Ceramic Arts Collective", slug: "ceramic-arts-collective",
    description: "A community for wheel-throwers, hand-builders, and kiln enthusiasts. Share your firings, glaze experiments, and the occasional disaster.",
    technique: "Ceramics",
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1530092376999-0df0a9e0c41a?w=1200&q=80",
    memberCount: 3840, postCount: 1240, isPublic: true, createdBy: "seed-elena-vasquez",
  },
  {
    id: "seed-guild-02", name: "Glass & Fire Guild", slug: "glass-fire-guild",
    description: "Flameworkers, kiln-formers, and hot-glass artists. Technical tips, torch setups, and the shared love of molten glass.",
    technique: "Glasswork",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",
    memberCount: 2110, postCount: 876, isPublic: true, createdBy: "seed-marco-chen",
  },
  {
    id: "seed-guild-03", name: "The Woodturners' Circle", slug: "woodturners-circle",
    description: "Lathe operators, hand-tool woodworkers, and burl hunters. A place for chips on the floor and finish on your hands.",
    technique: "Woodwork",
    imageUrl: "https://images.unsplash.com/photo-1511376777868-611b54f68947?w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1528459801416-a9241982c0a3?w=1200&q=80",
    memberCount: 5670, postCount: 2190, isPublic: true, createdBy: "seed-felix-okafor",
  },
  {
    id: "seed-guild-04", name: "Metal & Forge Society", slug: "metal-forge-society",
    description: "Blacksmiths, bladesmiths, silversmiths — anyone who works metal with heat. Safety culture, tool talk, and technique deep-dives.",
    technique: "Metalwork",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&q=80",
    memberCount: 4290, postCount: 1580, isPublic: true, createdBy: "seed-aria-patel",
  },
  {
    id: "seed-guild-05", name: "Slow Fiber Collective", slug: "slow-fiber-collective",
    description: "Natural dyers, weavers, and fiber artists. Slow fashion, traditional techniques, and a deep respect for material.",
    technique: "Fiber Arts",
    imageUrl: "https://images.unsplash.com/photo-1464790719320-516ecd75af6c?w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200&q=80",
    memberCount: 1920, postCount: 690, isPublic: true, createdBy: "seed-zoe-nakamura",
  },
  {
    id: "seed-guild-06", name: "Wood-Fire & Anagama Circle", slug: "wood-fire-anagama",
    description: "Dedicated to stoking — anagama, noborigama, and any kiln fired with wood. Stoking schedules, kiln shares, and post-firing celebrations.",
    technique: "Pottery",
    imageUrl: "https://images.unsplash.com/photo-1609600866552-f2a71e64d8c7?w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&q=80",
    memberCount: 1480, postCount: 520, isPublic: true, createdBy: "seed-sam-rivera",
  },
];

const SEED_GUILD_MEMBERS = [
  { guildId: "seed-guild-01", userId: "seed-elena-vasquez", role: "admin" },
  { guildId: "seed-guild-01", userId: "seed-sam-rivera", role: "member" },
  { guildId: "seed-guild-02", userId: "seed-marco-chen", role: "admin" },
  { guildId: "seed-guild-02", userId: "seed-elena-vasquez", role: "member" },
  { guildId: "seed-guild-03", userId: "seed-felix-okafor", role: "admin" },
  { guildId: "seed-guild-03", userId: "seed-aria-patel", role: "member" },
  { guildId: "seed-guild-04", userId: "seed-aria-patel", role: "admin" },
  { guildId: "seed-guild-04", userId: "seed-felix-okafor", role: "member" },
  { guildId: "seed-guild-05", userId: "seed-zoe-nakamura", role: "admin" },
  { guildId: "seed-guild-05", userId: "seed-sam-rivera", role: "member" },
  { guildId: "seed-guild-06", userId: "seed-sam-rivera", role: "admin" },
  { guildId: "seed-guild-06", userId: "seed-elena-vasquez", role: "member" },
];

// ── Patron Tiers ──────────────────────────────────────────────────────────────
const SEED_PATRON_TIERS = [
  {
    id: "seed-tier-elena-01", artistId: "seed-elena-vasquez", name: "Clay Curious",
    description: "Monthly behind-the-scenes dispatches from the studio — what's on the wheel, what failed, and what I'm thinking about.",
    price: 5, perks: ["Monthly studio dispatch", "Early drop notifications", "Exclusive process photos"],
    sortOrder: 0, subscriberCount: 284, isActive: true,
  },
  {
    id: "seed-tier-elena-02", artistId: "seed-elena-vasquez", name: "Kiln Keeper",
    description: "Everything in Clay Curious, plus 48h early access to all drops and invitations to live online firing sessions twice a year.",
    price: 15, perks: ["Monthly studio dispatch", "48h early drop access", "2x live firing sessions/year", "10% off shop", "Name in every kiln firing"],
    sortOrder: 1, subscriberCount: 89, isActive: true,
  },
  {
    id: "seed-tier-elena-03", artistId: "seed-elena-vasquez", name: "Studio Patron",
    description: "You are part of my practice. Receive one signed work per year, access to commission slots before they open publicly, and a personal studio visit.",
    price: 50, perks: ["All Kiln Keeper perks", "1 signed work per year", "Priority commission access", "Annual studio visit (Portland)", "Personal thank-you note with every piece"],
    sortOrder: 2, subscriberCount: 22, isActive: true,
  },
  {
    id: "seed-tier-marco-01", artistId: "seed-marco-chen", name: "Torch Light",
    description: "Monthly progress journal and access to my equipment and material supplier list — the real one, not the surface-level stuff.",
    price: 8, perks: ["Monthly journal", "Full supplier list", "Process video library"],
    sortOrder: 0, subscriberCount: 156, isActive: true,
  },
  {
    id: "seed-tier-marco-02", artistId: "seed-marco-chen", name: "Glass Patron",
    description: "Full torch light perks plus first access to any limited edition work and an annual small piece gifted to you.",
    price: 25, perks: ["All Torch Light perks", "First access to all drops", "Annual gifted small piece", "Live online technique demo"],
    sortOrder: 1, subscriberCount: 41, isActive: true,
  },
  {
    id: "seed-tier-felix-01", artistId: "seed-felix-okafor", name: "Shavings Club",
    description: "Monthly shop notes — what I'm turning, what broke, what I learned. Real talk from a working studio.",
    price: 5, perks: ["Monthly shop notes", "Early drop access", "Members-only Discord"],
    sortOrder: 0, subscriberCount: 412, isActive: true,
  },
  {
    id: "seed-tier-felix-02", artistId: "seed-felix-okafor", name: "Studio Partner",
    description: "Deep-dives into project series, plus a 15% shop discount and annual invitation to my Chicago open studio.",
    price: 20, perks: ["All Shavings Club perks", "Project deep-dives", "15% shop discount", "Annual open studio invite"],
    sortOrder: 1, subscriberCount: 118, isActive: true,
  },
];

export async function seedDatabase(): Promise<void> {
  try {
    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, SEED_MARKER_ID));

    if (existing) {
      logger.debug("Seed v3 already present — skipping");
      return;
    }

    logger.info("Seeding database with v3 content...");

    await db.insert(usersTable).values(SEED_USERS).onConflictDoNothing();

    await db.insert(profilesTable).values(SEED_PROFILES).onConflictDoUpdate({
      target: profilesTable.userId,
      set: {
        avatarUrl: sql`EXCLUDED.avatar_url`,
        followerCount: sql`EXCLUDED.follower_count`,
        postCount: sql`EXCLUDED.post_count`,
      },
    });

    await db.insert(postsTable).values(SEED_POSTS).onConflictDoUpdate({
      target: postsTable.id,
      set: {
        caption: sql`EXCLUDED.caption`,
        videoUrl: sql`EXCLUDED.video_url`,
        authorAvatarUrl: sql`EXCLUDED.author_avatar_url`,
      },
    });

    await db.insert(listingsTable).values(SEED_LISTINGS).onConflictDoNothing();

    await db.insert(dropsTable).values(SEED_DROPS).onConflictDoNothing();

    await db.insert(auctionsTable).values(SEED_AUCTIONS).onConflictDoNothing();

    await db.insert(auctionBidsTable).values(SEED_AUCTION_BIDS).onConflictDoNothing();

    await db.insert(workshopsTable).values(SEED_WORKSHOPS).onConflictDoNothing();

    await db.insert(guildsTable).values(SEED_GUILDS).onConflictDoNothing();

    await db.insert(guildMembersTable).values(SEED_GUILD_MEMBERS).onConflictDoNothing();

    await db.insert(patronTiersTable).values(SEED_PATRON_TIERS).onConflictDoNothing();

    logger.info({
      users: SEED_USERS.length, posts: SEED_POSTS.length,
      listings: SEED_LISTINGS.length, drops: SEED_DROPS.length,
      auctions: SEED_AUCTIONS.length, workshops: SEED_WORKSHOPS.length,
      guilds: SEED_GUILDS.length, patronTiers: SEED_PATRON_TIERS.length,
    }, "Database seeded (v4)");
  } catch (err) {
    logger.error({ err }, "Seed error (non-fatal)");
  }
}
