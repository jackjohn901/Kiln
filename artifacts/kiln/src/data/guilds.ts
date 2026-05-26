export interface GuildMember {
  artistId: string;
  name: string;
  avatarUrl: string;
  role: "founder" | "moderator" | "member";
  medium: string;
  location: string;
}

export interface GuildPost {
  id: string;
  artistId: string;
  artistName: string;
  avatarUrl: string;
  imageUrl: string;
  caption: string;
  likes: number;
  createdAt: string;
}

export interface GuildResource {
  title: string;
  description: string;
  type: "guide" | "supplier" | "glossary" | "video" | "community";
  url?: string;
}

export interface Guild {
  id: string;
  name: string;
  medium: string;
  emoji: string;
  color: string;
  description: string;
  longDescription: string;
  memberCount: number;
  postCount: number;
  founded: string;
  bannerUrl: string;
  members: GuildMember[];
  posts: GuildPost[];
  resources: GuildResource[];
  rules: string[];
  events: { title: string; date: string; location: string; description: string }[];
}

export const GUILDS: Guild[] = [
  {
    id: "glass-blowers",
    name: "Glass Blowers Guild",
    medium: "Glass",
    emoji: "🔥",
    color: "#f59e0b",
    description: "Hot glass artists sharing technique, critique, and studio life.",
    longDescription: "The Glass Blowers Guild is the home for hot glass artists on Kiln — from beginners picking up the pipe for the first time to seasoned masters with decades in the hot shop. Share your gathers, your color experiments, your disasters and victories.",
    memberCount: 4812,
    postCount: 28400,
    founded: "2024-03-01",
    bannerUrl: "https://img.youtube.com/vi/dQhKVFbpZoQ/maxresdefault.jpg",
    members: [
      { artistId: "lino-tagliapietra", name: "Lino Tagliapietra", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=lino", role: "founder", medium: "Glass Blowing", location: "Seattle, WA" },
      { artistId: "dante-marioni", name: "Dante Marioni", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=dante", role: "moderator", medium: "Glass Blowing", location: "Seattle, WA" },
      { artistId: "caleb-siemon", name: "Caleb Siemon", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=caleb", role: "moderator", medium: "Glass Blowing", location: "Los Angeles, CA" },
      { artistId: "alex-bernstein", name: "Alex Bernstein", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=alex", role: "member", medium: "Glass Casting", location: "Asheville, NC" },
      { artistId: "richard-royal", name: "Richard Royal", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=richard", role: "member", medium: "Glass Blowing", location: "Seattle, WA" },
      { artistId: "john-kiley", name: "John Kiley", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=john", role: "member", medium: "Glass Blowing", location: "Portland, OR" },
      { artistId: "erica-rosenfeld", name: "Erica Rosenfeld", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=erica", role: "member", medium: "Murrine", location: "Seattle, WA" },
      { artistId: "william-morris", name: "William Morris", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=william", role: "member", medium: "Glass Blowing", location: "Stanwood, WA" },
    ],
    posts: [
      { id: "gp-001", artistId: "lino-tagliapietra", artistName: "Lino Tagliapietra", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=lino", imageUrl: "https://img.youtube.com/vi/dQhKVFbpZoQ/maxresdefault.jpg", caption: "Working on a new murrine cane — the color palette took 3 days to develop.", likes: 2841, createdAt: "2026-05-13T10:00:00Z" },
      { id: "gp-002", artistId: "dante-marioni", artistName: "Dante Marioni", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=dante", imageUrl: "https://img.youtube.com/vi/kOd0r6FWMOY/maxresdefault.jpg", caption: "Revisiting vessel forms from my 2019 Pilchuck residency. Memory is interesting material.", likes: 1203, createdAt: "2026-05-12T14:30:00Z" },
      { id: "gp-003", artistId: "caleb-siemon", artistName: "Caleb Siemon", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=caleb", imageUrl: "https://img.youtube.com/vi/RVZ7HFOP7VY/maxresdefault.jpg", caption: "Cracked a piece I'd been working on for 2 weeks. Documenting the process anyway.", likes: 987, createdAt: "2026-05-11T09:00:00Z" },
    ],
    resources: [
      { title: "Bullseye Glass Color Chart", description: "The most complete reference for compatible glass colors", type: "supplier" },
      { title: "Beginner's Guide to Gathering", description: "Step-by-step guide to your first gather — technique, posture, rhythm", type: "guide" },
      { title: "Hot Glass Glossary", description: "Gather, parison, punty, marver, annealer — every term explained", type: "glossary" },
      { title: "Kiln Annealing Calculator", description: "Community-built tool for calculating annealing schedules by piece size and glass type", type: "guide" },
      { title: "Gaffer Glass Suppliers", description: "Where to source quality batch glass, color bars, and cullet in North America", type: "supplier" },
    ],
    rules: [
      "Share your failures as freely as your successes — we learn from both.",
      "Credit techniques, teachers, or artists who inspired your work.",
      "No unsolicited critiques — mark posts [critique welcome] if you want honest feedback.",
      "Promote your work respectfully — no spam or aggressive self-promotion.",
      "Help beginners. We were all there once.",
    ],
    events: [
      { title: "Pilchuck Summer Meetup", date: "2026-07-12", location: "Stanwood, WA", description: "Annual in-person gathering during Pilchuck's summer session. All members welcome." },
      { title: "Virtual Hot Shop Q&A — Lino Tagliapietra", date: "2026-06-05", location: "Online (Zoom)", description: "An hour with Lino — bring your questions about color, form, and 60 years in the hot shop." },
    ],
  },
  {
    id: "ceramic-circle",
    name: "Ceramic Circle",
    medium: "Ceramics",
    emoji: "🏺",
    color: "#a16207",
    description: "A community for wheel throwers, hand builders, and kiln-firers of all traditions.",
    longDescription: "From raku to porcelain, wood-fire to cone 6, the Ceramic Circle gathers artists who work with clay in all its forms. Share your glaze experiments, your firing results, your studio setups.",
    memberCount: 7234,
    postCount: 51200,
    founded: "2024-01-15",
    bannerUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=400&fit=crop&seed=ceramics-banner",
    members: [
      { artistId: "maya-chen", name: "Maya Chen", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=maya-chen", role: "founder", medium: "Ceramics", location: "Portland, OR" },
      { artistId: "elena-vasquez", name: "Elena Vasquez", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=elena", role: "moderator", medium: "Raku", location: "Santa Fe, NM" },
      { artistId: "hana-kim", name: "Hana Kim", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=hana", role: "moderator", medium: "Porcelain", location: "Brooklyn, NY" },
      { artistId: "takeshi-mori", name: "Takeshi Mori", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=takeshi", role: "member", medium: "Ceramics", location: "Kyoto, Japan" },
      { artistId: "anna-kowalski", name: "Anna Kowalski", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=anna", role: "member", medium: "Ceramics", location: "Warsaw, Poland" },
      { artistId: "priya-patel", name: "Priya Patel", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=priya", role: "member", medium: "Ceramics", location: "London, UK" },
    ],
    posts: [
      { id: "gp-010", artistId: "maya-chen", artistName: "Maya Chen", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=maya-chen", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=raku1", caption: "Latest reduction firing — the copper matte glaze behaved perfectly this time.", likes: 2104, createdAt: "2026-05-14T08:00:00Z" },
      { id: "gp-011", artistId: "hana-kim", artistName: "Hana Kim", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=hana", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=porcelain1", caption: "Throwing porcelain at 6am before the studio gets busy. The light at that hour is everything.", likes: 891, createdAt: "2026-05-12T06:00:00Z" },
    ],
    resources: [
      { title: "Glaze Chemistry Basics", description: "Understanding flux, alumina, and silica ratios for cone 6 and cone 10", type: "guide" },
      { title: "Wood-Fire Kiln Map", description: "Community-sourced map of wood-fire kilns open for guest firings", type: "community" },
      { title: "Clay Body Comparison Chart", description: "Porcelain, stoneware, earthenware — shrinkage, firing range, texture", type: "glossary" },
    ],
    rules: [
      "All traditions welcome — wheel, hand-build, slab, coil.",
      "Share glaze recipes freely. Knowledge belongs to the community.",
      "Safety first — kiln ventilation, respirators, silica dust.",
      "No AI-generated ceramic 'designs' presented as hand-made work.",
    ],
    events: [
      { title: "Community Wood Fire — Archie Bray", date: "2026-08-20", location: "Helena, MT", description: "Community wood firing at the Archie Bray Foundation. Guild members invited to load pots." },
    ],
  },
  {
    id: "metal-forge",
    name: "Metal Forge Society",
    medium: "Metal",
    emoji: "⚒️",
    color: "#6b7280",
    description: "Blacksmiths, welders, and metalsmiths sharing the heat, noise, and beauty of working metal.",
    longDescription: "The Metal Forge Society is the home for all who work in metal — blacksmiths, welders, bladesmiths, jewelers, and sculptors. Share your forging process, your finish techniques, and the sparks that light up your studio.",
    memberCount: 3102,
    postCount: 19800,
    founded: "2024-04-10",
    bannerUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=400&fit=crop&seed=metal-forge",
    members: [
      { artistId: "james-okafor", name: "James Okafor", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=james", role: "founder", medium: "Metal Forging", location: "Detroit, MI" },
      { artistId: "marcus-williams", name: "Marcus Williams", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=marcus", role: "moderator", medium: "Welding", location: "Chicago, IL" },
      { artistId: "felix-braun", name: "Felix Braun", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=felix", role: "moderator", medium: "Blacksmithing", location: "Berlin, Germany" },
      { artistId: "tomas-novak", name: "Tomas Novak", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=tomas", role: "member", medium: "Metal Forging", location: "Prague, Czech Republic" },
    ],
    posts: [
      { id: "gp-020", artistId: "james-okafor", artistName: "James Okafor", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=james", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=forge1", caption: "First heat of the day. The forge at 7am is one of the great pleasures.", likes: 1842, createdAt: "2026-05-14T07:00:00Z" },
      { id: "gp-021", artistId: "marcus-williams", artistName: "Marcus Williams", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=marcus", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=weld2", caption: "TIG welding on a commission piece. The bead is everything.", likes: 742, createdAt: "2026-05-11T11:00:00Z" },
    ],
    resources: [
      { title: "Hammer Selection Guide", description: "Cross-peen, ball-peen, rounding hammer — what each is for and why it matters", type: "guide" },
      { title: "Coal vs. Propane Forges", description: "Pros and cons of each fuel type for different forging contexts", type: "guide" },
      { title: "Steel Grades Explained", description: "1084, 1095, O1, W2 — the metallurgy behind choosing your stock", type: "glossary" },
    ],
    rules: [
      "Safety is non-negotiable. Always document your PPE.",
      "Share your heat-treating process — it's what separates good work from great work.",
      "Bladesmiths welcome — swords, knives, axes, and tools all belong here.",
    ],
    events: [
      { title: "ABANA Conference 2026", date: "2026-06-18", location: "Richmond, VA", description: "Annual Artist-Blacksmith Association of North America conference. Guild meetup at the anvil demo tent." },
    ],
  },
  {
    id: "fiber-arts",
    name: "Fiber Arts Collective",
    medium: "Fiber",
    emoji: "🧵",
    color: "#9333ea",
    description: "Weavers, knitters, embroiderers, and textile artists of every tradition.",
    longDescription: "The Fiber Arts Collective gathers artists who work with thread, yarn, fabric, and all forms of textile. Weaving, knitting, crochet, embroidery, basketry, felting, natural dyeing — if it involves fiber, you belong here.",
    memberCount: 9841,
    postCount: 72100,
    founded: "2024-02-01",
    bannerUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=400&fit=crop&seed=fiber-banner",
    members: [
      { artistId: "ingrid-larsson", name: "Ingrid Larsson", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=ingrid", role: "founder", medium: "Fiber Arts", location: "Stockholm, Sweden" },
      { artistId: "freya-lindqvist", name: "Freya Lindqvist", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=freya", role: "moderator", medium: "Tapestry", location: "Copenhagen, Denmark" },
      { artistId: "sonja-berg", name: "Sonja Berg", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=sonja", role: "member", medium: "Natural Dyeing", location: "Bergen, Norway" },
      { artistId: "leila-nouri", name: "Leila Nouri", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=leila", role: "member", medium: "Persian Weaving", location: "Tehran, Iran" },
    ],
    posts: [
      { id: "gp-030", artistId: "ingrid-larsson", artistName: "Ingrid Larsson", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=ingrid", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=fiber1", caption: "Hand-dyeing with weld and indigo for the autumn series. The greens are unreal.", likes: 2341, createdAt: "2026-05-13T15:00:00Z" },
    ],
    resources: [
      { title: "Natural Dye Plant Guide", description: "Weld, madder, indigo, and woad — mordanting and color results", type: "guide" },
      { title: "Loom Types Comparison", description: "Rigid heddle, floor loom, inkle, tapestry — what to buy first", type: "guide" },
      { title: "SAQA Member Resources", description: "Exhibition opportunities, educational programs, and community for art quilters", type: "community" },
    ],
    rules: [
      "All fiber traditions welcome — ancient to contemporary.",
      "Share natural dye recipes. Freely and completely.",
      "Document your process — fiber arts are often invisible to outsiders.",
    ],
    events: [
      { title: "Natural Dye Gathering — Mendocino", date: "2026-09-05", location: "Mendocino, CA", description: "Two-day natural dyeing retreat. RSVP to guild moderators." },
    ],
  },
  {
    id: "clay-and-wood",
    name: "Wood & Stone Carvers",
    medium: "Wood / Stone",
    emoji: "🪨",
    color: "#78716c",
    description: "Carvers, sculptors, and makers who work with the earth's slowest materials.",
    longDescription: "Wood carvers, stone sculptors, furniture makers, and anyone who works with natural materials in their raw, tactile form. Share your chisels, your sawdust, your stone dust, and the slow satisfaction of subtractive making.",
    memberCount: 2180,
    postCount: 11300,
    founded: "2024-06-01",
    bannerUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=400&fit=crop&seed=wood-stone",
    members: [
      { artistId: "kwame-asante", name: "Kwame Asante", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=kwame", role: "founder", medium: "Wood Carving", location: "Accra, Ghana" },
      { artistId: "celia-moss", name: "Celia Moss", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=celia", role: "moderator", medium: "Stone Carving", location: "Edinburgh, UK" },
      { artistId: "riku-sato", name: "Riku Sato", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=riku", role: "member", medium: "Wood", location: "Osaka, Japan" },
    ],
    posts: [
      { id: "gp-040", artistId: "kwame-asante", artistName: "Kwame Asante", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=kwame", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=wood1", caption: "Finishing a commission piece in African ebony. The grain reveals itself slowly.", likes: 1203, createdAt: "2026-05-10T09:00:00Z" },
    ],
    resources: [
      { title: "Wood Species Guide", description: "Grain, hardness, workability, and best uses for 40 common species", type: "glossary" },
      { title: "Stone Carving Tools for Beginners", description: "What you actually need to start — chisels, mallets, rasps, and finishing tools", type: "guide" },
    ],
    rules: [
      "All wood and stone traditions welcome — furniture, sculpture, relief, spoons.",
      "Safety equipment is not optional. Wear your respirator.",
      "Share your tool maintenance practice — sharp tools are safe tools.",
    ],
    events: [],
  },
  {
    id: "enamel-jewelry",
    name: "Enamel & Jewelry Guild",
    medium: "Enamel / Jewelry",
    emoji: "💎",
    color: "#0ea5e9",
    description: "Studio jewelers, enamelists, and metalsmiths working at the intimate scale.",
    longDescription: "The Enamel & Jewelry Guild is for studio jewelers, enamelists, and metalsmiths who work at the intimate human scale — pieces made to be worn, held, and treasured. Share your bench setups, your stone-setting techniques, your enamel experiments.",
    memberCount: 5421,
    postCount: 34800,
    founded: "2024-03-15",
    bannerUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&h=400&fit=crop&seed=jewelry-banner",
    members: [
      { artistId: "amara-diallo", name: "Amara Diallo", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=amara", role: "founder", medium: "Jewelry", location: "Paris, France" },
      { artistId: "ines-costa", name: "Inês Costa", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=ines", role: "moderator", medium: "Enamel", location: "Lisbon, Portugal" },
      { artistId: "petra-vance", name: "Petra Vance", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=petra", role: "member", medium: "Jewelry", location: "Amsterdam, Netherlands" },
    ],
    posts: [
      { id: "gp-050", artistId: "amara-diallo", artistName: "Amara Diallo", avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=amara", imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=jewelry1", caption: "Cloisonné enamel on fine silver. 12 firings to get this depth of color.", likes: 1904, createdAt: "2026-05-13T12:00:00Z" },
    ],
    resources: [
      { title: "Torch vs. Kiln Enamel", description: "When to use each method and the results they produce", type: "guide" },
      { title: "Gemstone Sourcing Ethically", description: "Finding conflict-free stones and understanding supply chains", type: "guide" },
      { title: "SNAG Exhibition Calendar", description: "Annual competition and exhibition opportunities for jewelry and metalsmithing", type: "community" },
    ],
    rules: [
      "Fine jewelry and folk jewelry are equally welcome here.",
      "Always disclose the materials you use — clients and collectors deserve to know.",
      "No reproduction of other artists' designs without credit and permission.",
    ],
    events: [
      { title: "SNAG Conference 2026", date: "2026-05-28", location: "Denver, CO", description: "Society of North American Goldsmiths annual conference. Guild meetup at the contemporary jewelry show." },
    ],
  },
];

export function getGuildById(id: string): Guild | undefined {
  return GUILDS.find((g) => g.id === id);
}
