export interface KilnFiringStatus {
  artistId: string;
  artistName: string;
  avatarUrl: string;
  cone: string;
  fuel: string;
  pieces: number;
  notes?: string;
  startedAt: string;
  estimatedHours: number;
  firingId?: string;
}

export const KILN_STATUS_STORAGE_KEY = "kiln_firing_status_v1";

export const SEED_KILN_STATUSES: KilnFiringStatus[] = [
  {
    artistId: "alex-bernstein",
    artistName: "Alex Bernstein",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    cone: "Cone 10 Reduction",
    fuel: "Gas",
    pieces: 24,
    notes: "New optical-clear series. Reduction atmosphere starts at 8pm.",
    startedAt: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
    estimatedHours: 10,
  },
  {
    artistId: "maya-chen",
    artistName: "Maya Chen",
    avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=maya-chen",
    cone: "Cone 6",
    fuel: "Electric",
    pieces: 35,
    notes: "Celadon glaze test batch — new recipe with more wood ash.",
    startedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    estimatedHours: 8,
  },
  {
    artistId: "james-okafor",
    artistName: "James Okafor",
    avatarUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&seed=james-okafor",
    cone: "Anagama Wood",
    fuel: "Wood",
    pieces: 60,
    notes: "Three-day anagama fire. Day 2 of stoking. Flame reaching Cone 12.",
    startedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    estimatedHours: 72,
  },
];

export function getHoursAgo(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / 3_600_000;
}

export function getFiringProgress(s: KilnFiringStatus): number {
  return Math.min(100, (getHoursAgo(s.startedAt) / s.estimatedHours) * 100);
}

export function getFiringETA(s: KilnFiringStatus): string {
  const remaining = s.estimatedHours - getHoursAgo(s.startedAt);
  if (remaining <= 0) return "Complete";
  if (remaining < 1) return `${Math.round(remaining * 60)}m left`;
  return `~${remaining.toFixed(1)}h left`;
}

export function getUserKilnStatus(): KilnFiringStatus | null {
  try {
    const raw = localStorage.getItem(KILN_STATUS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as KilnFiringStatus) : null;
  } catch {
    return null;
  }
}

export function saveUserKilnStatus(s: KilnFiringStatus | null): void {
  if (s) localStorage.setItem(KILN_STATUS_STORAGE_KEY, JSON.stringify(s));
  else localStorage.removeItem(KILN_STATUS_STORAGE_KEY);
}
