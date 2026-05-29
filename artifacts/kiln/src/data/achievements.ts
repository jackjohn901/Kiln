export type AchievementCategory = "social" | "content" | "commerce" | "community" | "craft" | "special";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: AchievementCategory;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  xp: number;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // Social
  { id: "first-follow", title: "First Follower", description: "Someone believed in you first.", emoji: "👋", category: "social", rarity: "common", xp: 10 },
  { id: "followers-10", title: "Gathering Crowd", description: "Reached 10 followers.", emoji: "✨", category: "social", rarity: "common", xp: 25 },
  { id: "followers-100", title: "Studio Audience", description: "Reached 100 followers.", emoji: "🌟", category: "social", rarity: "uncommon", xp: 75 },
  { id: "followers-1000", title: "Kiln Thousand", description: "Reached 1,000 followers. You're building something real.", emoji: "🔥", category: "social", rarity: "rare", xp: 300 },
  { id: "followers-10000", title: "Craft Celebrity", description: "10,000 followers. The studio is full.", emoji: "👑", category: "social", rarity: "legendary", xp: 1000 },
  { id: "first-follow-given", title: "Good Eye", description: "Followed your first artist.", emoji: "👁️", category: "social", rarity: "common", xp: 5 },

  // Content
  { id: "first-post", title: "Off the Bench", description: "Posted your first piece of work.", emoji: "🎬", category: "content", rarity: "common", xp: 20 },
  { id: "posts-10", title: "Regular Practice", description: "Shared 10 posts — a habit is forming.", emoji: "📅", category: "content", rarity: "common", xp: 50 },
  { id: "posts-50", title: "Prolific", description: "50 posts shared. Your catalog is growing.", emoji: "📚", category: "content", rarity: "uncommon", xp: 150 },
  { id: "posts-200", title: "The Archive", description: "200 posts. Future retrospective material.", emoji: "🗂️", category: "content", rarity: "rare", xp: 400 },
  { id: "first-process-video", title: "Behind the Glass", description: "Shared your first process video.", emoji: "🎥", category: "content", rarity: "common", xp: 30 },
  { id: "first-series-journal", title: "The Long Game", description: "Started a multi-step process journal.", emoji: "📖", category: "content", rarity: "uncommon", xp: 80 },
  { id: "completed-series", title: "Full Circle", description: "Completed a process journal from start to finished piece.", emoji: "⭕", category: "content", rarity: "rare", xp: 250 },
  { id: "first-story", title: "Day in the Studio", description: "Shared your first studio story.", emoji: "📸", category: "content", rarity: "common", xp: 15 },

  // Commerce
  { id: "first-listing", title: "Open for Business", description: "Listed your first work for sale.", emoji: "🏪", category: "commerce", rarity: "common", xp: 30 },
  { id: "first-sale", title: "First Sale", description: "Someone paid real money for something you made. That's it. That's everything.", emoji: "💰", category: "commerce", rarity: "uncommon", xp: 100 },
  { id: "sales-10", title: "Consistent Collector", description: "10 works sold.", emoji: "📦", category: "commerce", rarity: "uncommon", xp: 200 },
  { id: "sales-50", title: "Gallery Ready", description: "50 works sold — you're a working artist.", emoji: "🖼️", category: "commerce", rarity: "rare", xp: 500 },
  { id: "first-commission", title: "Made to Order", description: "Completed your first custom commission.", emoji: "✉️", category: "commerce", rarity: "uncommon", xp: 150 },
  { id: "commissions-10", title: "Commission Artist", description: "10 commissions completed. You're in demand.", emoji: "📋", category: "commerce", rarity: "rare", xp: 400 },
  { id: "first-drop", title: "The Drop", description: "Released your first limited-edition drop.", emoji: "⚡", category: "commerce", rarity: "uncommon", xp: 120 },
  { id: "sold-out-drop", title: "Sold Out", description: "A drop sold out. People were waiting for your work.", emoji: "🎯", category: "commerce", rarity: "rare", xp: 350 },
  { id: "first-tip", title: "Gratuity", description: "Received your first tip from a fan.", emoji: "🙏", category: "commerce", rarity: "common", xp: 40 },
  { id: "earnings-1000", title: "Four Figures", description: "$1,000 earned on Kiln.", emoji: "💵", category: "commerce", rarity: "rare", xp: 400 },

  // Community
  { id: "joined-guild", title: "Guild Member", description: "Joined your first craft guild.", emoji: "⚔️", category: "community", rarity: "common", xp: 20 },
  { id: "first-critique", title: "Constructive", description: "Gave your first structured critique.", emoji: "💬", category: "community", rarity: "common", xp: 25 },
  { id: "critiques-10", title: "Studio Voice", description: "Gave 10 critiques — your eye is sharpening.", emoji: "👁️‍🗨️", category: "community", rarity: "uncommon", xp: 100 },
  { id: "first-mentor", title: "Passing It On", description: "Offered mentorship to an emerging artist.", emoji: "🧑‍🏫", category: "community", rarity: "uncommon", xp: 150 },
  { id: "mentored-5", title: "The Teacher", description: "Mentored 5 artists.", emoji: "🎓", category: "community", rarity: "rare", xp: 400 },
  { id: "first-workshop", title: "Workshop Host", description: "Hosted your first workshop.", emoji: "🏫", category: "community", rarity: "uncommon", xp: 120 },
  { id: "first-collab", title: "Two Fires", description: "Collaborated with another artist.", emoji: "🤝", category: "community", rarity: "uncommon", xp: 100 },

  // Craft
  { id: "applied-residency", title: "Applied", description: "Applied to a residency or grant.", emoji: "📬", category: "craft", rarity: "common", xp: 30 },
  { id: "got-residency", title: "Resident Artist", description: "Received a residency or grant acceptance.", emoji: "🏡", category: "craft", rarity: "rare", xp: 500 },
  { id: "first-year", title: "One Year of Craft", description: "One year on Kiln. The studio doesn't close.", emoji: "🎂", category: "craft", rarity: "uncommon", xp: 200 },
  { id: "technique-explorer", title: "Technique Explorer", description: "Posted work in 3 or more different mediums.", emoji: "🔬", category: "craft", rarity: "uncommon", xp: 100 },
  { id: "press-kit-generated", title: "Press Ready", description: "Generated your artist press kit.", emoji: "📰", category: "craft", rarity: "common", xp: 40 },

  // Special
  { id: "kiln-picks", title: "Kiln Picks", description: "Your work was selected for Kiln Picks editorial.", emoji: "⭐", category: "special", rarity: "legendary", xp: 750 },
  { id: "verified", title: "Kiln Verified", description: "Earned the Kiln Verified badge.", emoji: "✅", category: "special", rarity: "legendary", xp: 500 },
  { id: "early-adopter", title: "Early Fire", description: "One of the first 1,000 artists on Kiln.", emoji: "🏆", category: "special", rarity: "legendary", xp: 1000 },
];

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  social: "Following & Followers",
  content: "Content & Creation",
  commerce: "Sales & Commerce",
  community: "Community",
  craft: "Craft Practice",
  special: "Special Recognition",
};

export const RARITY_COLORS: Record<Achievement["rarity"], string> = {
  common: "text-stone-400 border-stone-700 bg-stone-800/60",
  uncommon: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
  rare: "text-sky-400 border-sky-500/30 bg-sky-500/5",
  legendary: "text-amber-400 border-amber-500/40 bg-amber-500/8",
};

export function getXpLevel(xp: number): { level: number; title: string; nextLevelXp: number } {
  const thresholds = [
    { level: 1, title: "Apprentice", xp: 0 },
    { level: 2, title: "Journeyman", xp: 200 },
    { level: 3, title: "Craftsperson", xp: 600 },
    { level: 4, title: "Artisan", xp: 1400 },
    { level: 5, title: "Master Craftsperson", xp: 3000 },
    { level: 6, title: "Kiln Legend", xp: 6000 },
  ];
  let current = thresholds[0];
  let next = thresholds[1];
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (xp >= thresholds[i].xp) {
      current = thresholds[i];
      next = thresholds[i + 1] ?? thresholds[thresholds.length - 1];
    }
  }
  return { level: current.level, title: current.title, nextLevelXp: next.xp };
}
