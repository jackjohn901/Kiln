import { profilesTable } from "@workspace/db";

export const publicProfileFields = {
  userId: profilesTable.userId,
  handle: profilesTable.handle,
  displayName: profilesTable.displayName,
  bio: profilesTable.bio,
  medium: profilesTable.medium,
  location: profilesTable.location,
  website: profilesTable.website,
  avatarUrl: profilesTable.avatarUrl,
  bannerUrl: profilesTable.bannerUrl,
  isVerified: profilesTable.isVerified,
  followerCount: profilesTable.followerCount,
  followingCount: profilesTable.followingCount,
  postCount: profilesTable.postCount,
  studioHours: profilesTable.studioHours,
  kilnStatus: profilesTable.kilnStatus,
  generation: profilesTable.generation,
  mentorId: profilesTable.mentorId,
  isVerifiedCollector: profilesTable.isVerifiedCollector,
  broadcastSubscriberCount: profilesTable.broadcastSubscriberCount,
  linkInBioSlug: profilesTable.linkInBioSlug,
  accountType: profilesTable.accountType,
  createdAt: profilesTable.createdAt,
  updatedAt: profilesTable.updatedAt,
};

type PatronPost = {
  isPatronOnly: boolean;
  videoUrl: string | null;
  muxUploadId: string | null;
  muxAssetId: string | null;
  muxPlaybackId: string | null;
  [key: string]: unknown;
};

export function redactPatronMedia<T extends PatronPost>(post: T): T {
  if (!post.isPatronOnly) return post;
  return { ...post, videoUrl: null, muxUploadId: null, muxAssetId: null, muxPlaybackId: null };
}
