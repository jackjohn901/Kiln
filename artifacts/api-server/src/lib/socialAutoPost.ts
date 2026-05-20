import { db } from "@workspace/db";
import { socialConnectionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";

type PostData = {
  id: string;
  caption?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
};

function isServableUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return !url.startsWith("blob:") && !url.startsWith("data:") && !url.startsWith("idb:");
}

async function postToInstagram(token: string, platformUserId: string, post: PostData): Promise<void> {
  const mediaUrl = post.videoUrl || post.thumbnailUrl;
  if (!isServableUrl(mediaUrl)) return;

  const isVideo = isServableUrl(post.videoUrl);
  const containerBody = new URLSearchParams({ access_token: token, caption: post.caption ?? "" });
  if (isVideo) {
    containerBody.set("video_url", post.videoUrl!);
    containerBody.set("media_type", "REELS");
  } else {
    containerBody.set("image_url", post.thumbnailUrl!);
  }

  const containerRes = await fetch(`https://graph.instagram.com/v19.0/${platformUserId}/media`, {
    method: "POST",
    body: containerBody,
  });
  if (!containerRes.ok) {
    const err = await containerRes.text();
    throw new Error(`Instagram container: ${err}`);
  }
  const { id: containerId } = (await containerRes.json()) as { id: string };

  const publishRes = await fetch(`https://graph.instagram.com/v19.0/${platformUserId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ access_token: token, creation_id: containerId }),
  });
  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Instagram publish: ${err}`);
  }
}

async function postToTikTok(token: string, post: PostData): Promise<void> {
  if (!isServableUrl(post.videoUrl)) return;

  const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      post_info: {
        title: (post.caption ?? "").slice(0, 150),
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: { source: "PULL_FROM_URL", video_url: post.videoUrl },
    }),
  });
  if (!res.ok) throw new Error(`TikTok: ${await res.text()}`);
}

async function postToFacebook(token: string, platformUserId: string, post: PostData): Promise<void> {
  const mediaUrl = post.videoUrl || post.thumbnailUrl;
  if (!isServableUrl(mediaUrl)) return;

  const isVideo = isServableUrl(post.videoUrl);
  const endpoint = isVideo
    ? `https://graph.facebook.com/v19.0/${platformUserId}/videos`
    : `https://graph.facebook.com/v19.0/${platformUserId}/photos`;

  const body = new URLSearchParams({ access_token: token, message: post.caption ?? "" });
  if (isVideo) body.set("file_url", post.videoUrl!);
  else body.set("url", post.thumbnailUrl!);

  const res = await fetch(endpoint, { method: "POST", body });
  if (!res.ok) throw new Error(`Facebook: ${await res.text()}`);
}

export async function autoPostToConnectedPlatforms(userId: string, post: PostData): Promise<void> {
  try {
    const connections = await db
      .select()
      .from(socialConnectionsTable)
      .where(and(eq(socialConnectionsTable.userId, userId), eq(socialConnectionsTable.autoPost, true)));

    await Promise.allSettled(
      connections.map(async (conn) => {
        try {
          if (conn.platform === "instagram") {
            await postToInstagram(conn.accessToken, conn.platformUserId, post);
          } else if (conn.platform === "tiktok") {
            await postToTikTok(conn.accessToken, post);
          } else if (conn.platform === "facebook") {
            await postToFacebook(conn.accessToken, conn.platformUserId, post);
          }
          logger.info({ userId, platform: conn.platform, postId: post.id }, "Auto-posted to social platform");
        } catch (err) {
          logger.warn({ err, userId, platform: conn.platform, postId: post.id }, "Auto-post failed for platform");
        }
      }),
    );
  } catch (err) {
    logger.warn({ err, userId }, "autoPostToConnectedPlatforms failed");
  }
}
