import type { CommunityBeat } from "./communityBeats";

export interface BeatLicense {
  id: string;
  beatId: string;
  beatTitle: string;
  creatorHandle: string;
  creatorName: string;
  licenseType: CommunityBeat["license"];
  price: number;
  licenseeHandle: string;
  licenseeName: string;
  licensedAt: string;
  /** How many posts it has been used in after licensing */
  postCount: number;
}

const KEY = "kiln_beat_licenses_v1";

export function getLicenses(): BeatLicense[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as BeatLicense[];
  } catch {
    return [];
  }
}

export function addLicense(license: BeatLicense): void {
  const existing = getLicenses().filter((l) => l.id !== license.id);
  localStorage.setItem(KEY, JSON.stringify([license, ...existing]));
}

/** Returns whether the given user already has a license (or the beat is free) */
export function hasLicense(beatId: string, licenseeHandle: string): boolean {
  return getLicenses().some(
    (l) => l.beatId === beatId && l.licenseeHandle === licenseeHandle,
  );
}

/** All licenses granted BY others FOR a specific beat — used for creator earnings */
export function getLicensesByBeat(beatId: string): BeatLicense[] {
  return getLicenses().filter((l) => l.beatId === beatId);
}

/** All licenses acquired by a specific user — their "licensed sounds" library */
export function getLicensesByLicensee(handle: string): BeatLicense[] {
  return getLicenses().filter((l) => l.licenseeHandle === handle);
}

/** All licenses acquired by others for beats owned by this creator */
export function getLicensesByCreator(creatorHandle: string): BeatLicense[] {
  return getLicenses().filter((l) => l.creatorHandle === creatorHandle);
}

/** Total earnings for a creator from licensing */
export function getTotalEarnings(creatorHandle: string): number {
  return getLicensesByCreator(creatorHandle).reduce((sum, l) => sum + l.price, 0);
}

export function randomId() {
  return Math.random().toString(36).slice(2, 10);
}
