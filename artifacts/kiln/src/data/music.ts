export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: "Ambient" | "Classical" | "Electronic" | "Jazz" | "Orchestral" | "World";
  mood: string;
  bpm: number;
  duration: number;
  url: string;
  license: string;
}

export const musicTracks: MusicTrack[] = [
  {
    id: "night-owl",
    title: "Night Owl",
    artist: "Broke For Free",
    genre: "Electronic",
    mood: "Dreamy",
    bpm: 90,
    duration: 214,
    url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/WFMU/Broke_For_Free/Directionless_EP/Broke_For_Free_-_01_-_Night_Owl.mp3",
    license: "CC BY 3.0",
  },
  {
    id: "shipping-lanes",
    title: "Shipping Lanes",
    artist: "Chad Crouch",
    genre: "Ambient",
    mood: "Calm",
    bpm: 75,
    duration: 182,
    url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/ccCommunity/Chad_Crouch/Arps_in_Stripes/Chad_Crouch_-_Shipping_Lanes.mp3",
    license: "CC BY-NC 4.0",
  },
  {
    id: "intermezzo",
    title: "Intermezzo",
    artist: "Kai Engel",
    genre: "Ambient",
    mood: "Contemplative",
    bpm: 68,
    duration: 156,
    url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/WFMU/Kai_Engel/Incompatible/Kai_Engel_-_02_-_Intermezzo.mp3",
    license: "CC BY 4.0",
  },
  {
    id: "gymnopedie",
    title: "Gymnopédie No. 1",
    artist: "Erik Satie / Kai Engel",
    genre: "Classical",
    mood: "Meditative",
    bpm: 60,
    duration: 198,
    url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/WFMU/Kai_Engel/Sustain/Kai_Engel_-_04_-_Gymnopedie_No_1.mp3",
    license: "Public Domain",
  },
  {
    id: "serenity",
    title: "Serenity",
    artist: "Scott Buckley",
    genre: "Orchestral",
    mood: "Uplifting",
    bpm: 72,
    duration: 225,
    url: "https://www.scottbuckley.com.au/library/wp-content/uploads/2019/12/Serenity.mp3",
    license: "CC BY 4.0",
  },
  {
    id: "snow",
    title: "Snow",
    artist: "Kevin MacLeod",
    genre: "Ambient",
    mood: "Ethereal",
    bpm: 60,
    duration: 172,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Snow%20Light.mp3",
    license: "CC BY 3.0",
  },
  {
    id: "equatorial-complex",
    title: "Equatorial Complex",
    artist: "Kevin MacLeod",
    genre: "Electronic",
    mood: "Energetic",
    bpm: 128,
    duration: 211,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Equatorial%20Complex.mp3",
    license: "CC BY 3.0",
  },
  {
    id: "evening-stroll",
    title: "Evening Stroll",
    artist: "Monk Turner + Fascinoma",
    genre: "Jazz",
    mood: "Warm",
    bpm: 98,
    duration: 168,
    url: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Monk_Turner__Fascinoma/Its_Your_Birthday/Monk_Turner__Fascinoma_-_06_-_Evening_Stroll.mp3",
    license: "CC BY-NC 3.0",
  },
  {
    id: "hypnotic",
    title: "Hypnotic Puzzle",
    artist: "Kevin MacLeod",
    genre: "Ambient",
    mood: "Focus",
    bpm: 80,
    duration: 195,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hypnotic%20Puzzle.mp3",
    license: "CC BY 3.0",
  },
  {
    id: "impact-prelude",
    title: "Impact Prelude",
    artist: "Kevin MacLeod",
    genre: "Orchestral",
    mood: "Dramatic",
    bpm: 88,
    duration: 138,
    url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Impact%20Prelude.mp3",
    license: "CC BY 3.0",
  },
];

export const GENRES = ["All", "Ambient", "Classical", "Electronic", "Jazz", "Orchestral", "World"] as const;

export function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function getTrackById(id: string): MusicTrack | undefined {
  return musicTracks.find((t) => t.id === id);
}
