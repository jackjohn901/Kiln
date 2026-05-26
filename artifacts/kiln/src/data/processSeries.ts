export interface ProcessStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  imageUrl: string;
  videoId?: string;
  materials?: string[];
  technicalNotes?: string;
  timeSpent?: string;
  kilnSchedule?: string;
  postedAt: string;
}

export interface ProcessSeries {
  id: string;
  artistId: string;
  artistName: string;
  avatarUrl: string;
  title: string;
  medium: string;
  coverImageUrl: string;
  description: string;
  status: "in-progress" | "completed";
  steps: ProcessStep[];
  startedAt: string;
  completedAt?: string;
  watcherCount: number;
  tags: string[];
  finalSalePrice?: string;
}

export const ALL_SERIES: ProcessSeries[] = [
  {
    id: "s-001",
    artistId: "lino-tagliapietra",
    artistName: "Lino Tagliapietra",
    avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=lino",
    title: "Endeavour — A 14-Day Glass Sculpture",
    medium: "Glass Blowing",
    coverImageUrl: "https://img.youtube.com/vi/dQhKVFbpZoQ/maxresdefault.jpg",
    description: "Documenting the full creation of a large-scale blown glass sculpture from initial color development through final annealing. This piece explores the tension between geometric structure and organic form.",
    status: "completed",
    watcherCount: 8412,
    tags: ["glass-blowing", "sculpture", "color-development", "large-scale"],
    finalSalePrice: "$28,000",
    startedAt: "2026-04-01",
    completedAt: "2026-04-14",
    steps: [
      {
        id: "s001-step1",
        stepNumber: 1,
        title: "Color palette development",
        description: "Spent two full days testing color combinations. The palette I'm working toward — a deep cobalt transitioning through prussian to a warm amber — required six test pulls before I was satisfied. The amber is Gaffer 208 with a thin overlay of rubino to give it depth in the interior gather.",
        imageUrl: "https://img.youtube.com/vi/kOd0r6FWMOY/maxresdefault.jpg",
        materials: ["Gaffer Crystal", "Gaffer Amber 208", "Kugler Rubino Gold", "Kugler Cobalt Blue 46"],
        technicalNotes: "Rubino must be applied AFTER the first gather of cobalt or it will migrate. Temperature of cobalt gather: 2080°F.",
        timeSpent: "16 hours",
        postedAt: "2026-04-01T18:00:00Z",
      },
      {
        id: "s001-step2",
        stepNumber: 2,
        title: "First gather and form",
        description: "Started with a 2-lb gather of crystal, applied the cobalt casing, and began establishing the primary form. This piece will be approximately 18 inches tall when finished — large enough that I'll need my assistant Mattia for the final blow.",
        imageUrl: "https://img.youtube.com/vi/RVZ7HFOP7VY/maxresdefault.jpg",
        materials: ["Gaffer Crystal (2 lb)"],
        technicalNotes: "Working temp: 2100°F. Punty transfer at 1900°F to avoid distortion in the neck.",
        timeSpent: "8 hours",
        postedAt: "2026-04-03T20:00:00Z",
      },
      {
        id: "s001-step3",
        stepNumber: 3,
        title: "Adding the amber layer and neck detail",
        description: "The amber overlay changes everything. It creates an internal warmth that the cobalt alone could never achieve. The neck detail — a subtle optic rib — required reheating the piece eight times to get the rhythm exactly right.",
        imageUrl: "https://img.youtube.com/vi/dQhKVFbpZoQ/maxresdefault.jpg",
        materials: ["Gaffer Amber 208", "Kugler Rubino Gold"],
        technicalNotes: "Applied rubino cane at 1950°F, then full reheat to 2050°F before optic mold.",
        timeSpent: "10 hours",
        postedAt: "2026-04-06T15:00:00Z",
      },
      {
        id: "s001-step4",
        stepNumber: 4,
        title: "Final blow, punty off, and anneal",
        description: "The final blow is always the most uncertain moment. Too little and the form stays tight; too much and you lose the rhythm established in all the previous steps. Mattia helped hold the piece as I did the final expansion — 18.5 inches. Into the annealer at 960°F.",
        imageUrl: "https://img.youtube.com/vi/kOd0r6FWMOY/maxresdefault.jpg",
        kilnSchedule: "960°F hold 2hr → ramp -50°F/hr to 700°F → ramp -25°F/hr to room temp",
        timeSpent: "6 hours (plus 18hr anneal)",
        postedAt: "2026-04-10T22:00:00Z",
      },
      {
        id: "s001-step5",
        stepNumber: 5,
        title: "Cold work and final photography",
        description: "Cold-worked the rim with a 220 grit diamond belt followed by 600 wet/dry. The finished piece speaks for itself — the cobalt exterior with that amber-rubino interior creates a depth I hadn't anticipated. It reads differently in every light.",
        imageUrl: "https://img.youtube.com/vi/RVZ7HFOP7VY/maxresdefault.jpg",
        materials: ["Diamond belt 220 grit", "Wet/dry sandpaper 400/600/1200"],
        timeSpent: "4 hours",
        postedAt: "2026-04-14T14:00:00Z",
      },
    ],
  },
  {
    id: "s-002",
    artistId: "maya-chen",
    artistName: "Maya Chen",
    avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=maya-chen",
    title: "Wood-Fire Raku: 30 Bowls in 10 Days",
    medium: "Ceramics",
    coverImageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=raku-series",
    description: "I'm challenging myself to throw, trim, glaze, and raku-fire 30 bowls in 10 days. Documenting every failure and success. No editing.",
    status: "completed",
    watcherCount: 5123,
    tags: ["raku", "ceramics", "challenge", "bowls", "process"],
    startedAt: "2026-03-15",
    completedAt: "2026-03-25",
    steps: [
      {
        id: "s002-step1",
        stepNumber: 1,
        title: "Day 1: Centering and throwing",
        description: "Wedged 50 lbs of Laguna Raku clay. Threw 8 bowls — lost 2 to centering failures. The clay is short today; the studio is cold. Notes for tomorrow: wedge longer, let clay warm to room temp before throwing.",
        imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=raku-bowl-1",
        materials: ["Laguna Raku clay (50 lbs)", "Wire tool", "Needle tool"],
        timeSpent: "7 hours",
        postedAt: "2026-03-15T20:00:00Z",
      },
      {
        id: "s002-step2",
        stepNumber: 2,
        title: "Day 3: Trimming and slip application",
        description: "Trimmed yesterday's bowls at leather-hard. Applied a white slip to 6 of them — I want to see how slip interacts with copper carbonate in the raku fire. The other 6 will get a bare clay surface.",
        imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=raku-bowl-2",
        materials: ["White engobe slip", "Loop trimming tool"],
        timeSpent: "5 hours",
        postedAt: "2026-03-17T18:00:00Z",
      },
      {
        id: "s002-step3",
        stepNumber: 3,
        title: "Day 7: First firing",
        description: "The first raku fire. Put 12 bowls in the kiln. 6 came out with stunning copper metallics — the slip caught the reduction beautifully. 3 cracked. 3 are mediocre but acceptable. I'm at 9 finished bowls. Need 21 more in 3 days.",
        imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=raku-fire",
        materials: ["Copper carbonate glaze", "Commercial raku propane kiln", "Reduction can with newspaper"],
        kilnSchedule: "Cone 06 (~1850°F), rapid heat, pull and reduce 3 minutes",
        timeSpent: "8 hours",
        postedAt: "2026-03-21T21:00:00Z",
      },
    ],
  },
  {
    id: "s-003",
    artistId: "james-okafor",
    artistName: "James Okafor",
    avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=80&h=80&fit=crop&seed=james",
    title: "Forging a Japanese-Style Kitchen Knife",
    medium: "Metal Forging",
    coverImageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=knife-series",
    description: "Step-by-step documentation of forging a 240mm gyuto from 1084 high carbon steel. Every heat, every hammer blow, every grind. This is the real process — no shortcuts.",
    status: "in-progress",
    watcherCount: 3204,
    tags: ["blacksmithing", "knife", "bladesmithing", "kitchen-knife", "1084-steel"],
    startedAt: "2026-05-01",
    steps: [
      {
        id: "s003-step1",
        stepNumber: 1,
        title: "Stock selection and profile marking",
        description: "Starting with a 1-inch x 2-inch bar of 1084 from New Jersey Steel Baron. Marked the profile with a sharpie — 240mm blade length, 55mm heel height at the ricasso. Normalized three times at orange heat before beginning forging.",
        imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=knife-step1",
        materials: ["1084 high carbon steel (1\" x 2\" x 12\")", "New Jersey Steel Baron", "Sharpie marker"],
        technicalNotes: "Three normalizing heats at ~1500°F before forging to relieve mill scale stress.",
        timeSpent: "2 hours",
        postedAt: "2026-05-01T18:00:00Z",
      },
      {
        id: "s003-step2",
        stepNumber: 2,
        title: "Drawing out the blade bevel",
        description: "Forged the primary bevel at high yellow heat (~2100°F). Working the distal taper first — the tip needs to be thin before you work the edge bevel or you lose control. 8 heats to get the profile right.",
        imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&seed=knife-step2",
        materials: ["Propane forge (2 burner)"],
        technicalNotes: "Working temp: high yellow (~2100°F). Stop hammering when orange. 25-pound rounding hammer.",
        timeSpent: "4 hours",
        postedAt: "2026-05-05T20:00:00Z",
      },
    ],
  },
];

export function getSeriesById(id: string): ProcessSeries | undefined {
  return ALL_SERIES.find((s) => s.id === id);
}

export function getSeriesByArtist(artistId: string): ProcessSeries[] {
  return ALL_SERIES.filter((s) => s.artistId === artistId);
}
