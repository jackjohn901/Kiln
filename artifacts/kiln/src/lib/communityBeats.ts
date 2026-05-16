export interface CommunityBeat {
  id: string;
  title: string;
  artistHandle: string;
  artistName: string;
  bpm: number;
  pattern: boolean[][];
  license: "free" | "community" | "premium";
  price: number;
  createdAt: string;
  usedCount: number;
}

const KEY = "kiln_community_beats_v1";

export function getCommunityBeats(): CommunityBeat[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as CommunityBeat[];
  } catch {
    return [];
  }
}

export function saveCommunityBeat(beat: CommunityBeat): void {
  const beats = getCommunityBeats().filter((b) => b.id !== beat.id);
  localStorage.setItem(KEY, JSON.stringify([beat, ...beats]));
}

export function deleteCommunityBeat(id: string): void {
  const beats = getCommunityBeats().filter((b) => b.id !== id);
  localStorage.setItem(KEY, JSON.stringify(beats));
}

export function incrementUsed(id: string): void {
  const beats = getCommunityBeats().map((b) =>
    b.id === id ? { ...b, usedCount: b.usedCount + 1 } : b
  );
  localStorage.setItem(KEY, JSON.stringify(beats));
}

export const LICENSE_LABELS: Record<CommunityBeat["license"], string> = {
  free: "Free",
  community: "Community",
  premium: "Premium",
};

export const LICENSE_COLORS: Record<CommunityBeat["license"], string> = {
  free: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  community: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  premium: "text-purple-400 bg-purple-500/10 border-purple-500/30",
};
