import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, profilesTable, postsTable } from "@workspace/db";
import { logger } from "./logger";

const SEED_MARKER_ID = "seed-v2-marker";

const SEED_USERS = [
  { id: "seed-v2-marker", email: "seed-v2@kiln.internal", firstName: "Seed", lastName: "V2" },
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
  // Elena — Ceramics
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
    caption: "High-fire reduction session. The copper red glaze has that deep oxblood effect I've been chasing for months.",
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
  // Marco — Glass
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
    caption: "Flamework session — borosilicate tubing and silver foil. The colour layering took 6 hours to get right.",
    technique: "Glasswork", likeCount: 1102, commentCount: 55, saveCount: 189,
  },
  // Zoe — Weaving
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
  // Felix — Woodwork
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
    caption: "Hand-cut dovetails on this walnut cabinet took 2 full days. No shortcuts, no jigs — just a sharp chisel and patience.",
    technique: "Woodwork", likeCount: 2670, commentCount: 93, saveCount: 438,
  },
  // Aria — Metalwork
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
  // Sam — Pottery
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
  // Additional posts — v2
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
    caption: "Argentium silver cuff — reticulated with heat, then hand-hammered over a mandrel. The surface texture is irreproducible.",
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

export async function seedDatabase(): Promise<void> {
  try {
    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, SEED_MARKER_ID));

    if (existing) {
      logger.debug("Seed v2 already present — skipping");
      return;
    }

    logger.info("Seeding database with v2 content...");
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
        videoUrl: sql`EXCLUDED.video_url`,
        authorAvatarUrl: sql`EXCLUDED.author_avatar_url`,
      },
    });
    logger.info({ users: SEED_USERS.length, posts: SEED_POSTS.length }, "Database seeded (v2)");
  } catch (err) {
    logger.error({ err }, "Seed error (non-fatal)");
  }
}
