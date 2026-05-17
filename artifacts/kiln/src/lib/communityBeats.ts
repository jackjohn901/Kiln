export interface CommunityBeat {
  id: string;
  title: string;
  artistHandle: string;
  artistName: string;
  bpm: number;
  /** pattern[trackIndex][stepIndex] */
  pattern: boolean[][];
  license: "free" | "community" | "premium";
  price: number;
  createdAt: string;
  usedCount: number;

  // v2 extended fields (all optional for backward compat with old saved beats)
  steps?: 16 | 32;
  trackCount?: number;
  trackVolumes?: number[];
  trackMutes?: boolean[];
  /** Per-step note index for melody track (track 9) */
  melodyNotes?: number[];
  /** Per-step note index for bass track (track 7) */
  bassNotes?: number[];
  /** Per-step chord index for chord track (track 8) */
  chordNotes?: number[];
  swing?: number;
  reverb?: boolean;
  genre?: string;
  description?: string;
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
  fetch("/api/beats", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: beat.title, bpm: beat.bpm, steps: beat.steps ?? 16,
      pattern: beat.pattern, trackCount: beat.trackCount ?? 10,
      trackVolumes: beat.trackVolumes ?? [], trackMutes: beat.trackMutes ?? [],
      melodyNotes: beat.melodyNotes ?? [], bassNotes: beat.bassNotes ?? [],
      chordNotes: beat.chordNotes ?? [], swing: beat.swing ?? 0,
      reverb: beat.reverb ? 0.5 : 0,
      license: beat.license, price: beat.price ?? 0, isPublic: true,
    }),
  }).then(r => r.ok ? r.json() as Promise<{ id: string }> : null)
    .then(saved => {
      if (!saved) return;
      const updated = getCommunityBeats().map(b => b.id === beat.id ? { ...b, id: saved.id } : b);
      localStorage.setItem(KEY, JSON.stringify(updated));
    })
    .catch(() => {});
}

export function deleteCommunityBeat(id: string): void {
  const beats = getCommunityBeats().filter((b) => b.id !== id);
  localStorage.setItem(KEY, JSON.stringify(beats));
  fetch(`/api/beats/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
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
  free:      "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  community: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  premium:   "text-purple-400 bg-purple-500/10 border-purple-500/30",
};
