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
