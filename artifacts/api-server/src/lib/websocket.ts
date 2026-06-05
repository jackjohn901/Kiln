import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { logger } from "./logger";

export type WsEvent =
  | { type: "like"; postId: string; likeCount: number }
  | { type: "save"; postId: string; saveCount: number }
  | { type: "follow"; followerId: string; followingId: string }
  | { type: "comment"; postId: string; commentId: string; authorId: string }
  | { type: "notification"; userId: string; text: string; link?: string; notifType?: string; fromName?: string }
  | { type: "message"; threadId: string; senderId: string; recipientId: string; senderName: string; senderAvatarUrl: string | null; attachmentUrl?: string }
  | { type: "typing"; threadId: string; userId: string }
  | { type: "bid"; auctionId: string; currentBid: number; bidCount: number; bidderName: string; bidAt?: string }
  | { type: "firing-viewers"; firingId: string; count: number }
  | { type: "feed-viewers"; artistId: string; count: number }
  | { type: "new-post"; authorId: string };

const clients = new Map<string, Set<WebSocket>>();

// firingId → set of userIds currently watching
const firingRooms = new Map<string, Set<string>>();
// artistId → set of follower userIds currently on the Following tab
const feedRooms = new Map<string, Set<string>>();
// ws → { userId, watchingFiringId, feedArtistIds } for cleanup on disconnect
const wsMetadata = new Map<WebSocket, { userId: string | null; firingId: string | null; feedArtistIds: Set<string> }>();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const userId = url.searchParams.get("userId");

    if (userId) {
      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId)!.add(ws);
      logger.info({ userId }, "WebSocket client connected");
    }

    wsMetadata.set(ws, { userId, firingId: null, feedArtistIds: new Set() });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; firingId?: string; artistIds?: string[] };
        const meta = wsMetadata.get(ws);
        if (!meta || !userId) return;

        if (msg.type === "join-firing" && msg.firingId) {
          // Leave previous room if any
          if (meta.firingId) {
            firingRooms.get(meta.firingId)?.delete(userId);
            broadcastViewerCount(meta.firingId);
          }
          meta.firingId = msg.firingId;
          if (!firingRooms.has(msg.firingId)) firingRooms.set(msg.firingId, new Set());
          firingRooms.get(msg.firingId)!.add(userId);
          broadcastViewerCount(msg.firingId);
        } else if (msg.type === "leave-firing" && meta.firingId) {
          firingRooms.get(meta.firingId)?.delete(userId);
          broadcastViewerCount(meta.firingId);
          meta.firingId = null;
        } else if (msg.type === "join-feed" && Array.isArray(msg.artistIds)) {
          // Leave any previously joined feed rooms
          leaveFeedRooms(userId, meta.feedArtistIds);
          // Join new rooms
          const ids = (msg.artistIds as string[]).filter((id) => typeof id === "string" && id.length > 0).slice(0, 100);
          meta.feedArtistIds = new Set(ids);
          for (const artistId of ids) {
            if (!feedRooms.has(artistId)) feedRooms.set(artistId, new Set());
            feedRooms.get(artistId)!.add(userId);
            broadcastFeedViewerCount(artistId);
          }
        } else if (msg.type === "leave-feed") {
          leaveFeedRooms(userId, meta.feedArtistIds);
          meta.feedArtistIds = new Set();
        }
      } catch { /* ignore malformed messages */ }
    });

    ws.on("close", () => {
      const meta = wsMetadata.get(ws);
      wsMetadata.delete(ws);
      if (userId) {
        clients.get(userId)?.delete(ws);
        if (clients.get(userId)?.size === 0) clients.delete(userId);
      }
      if (meta?.firingId && userId) {
        firingRooms.get(meta.firingId)?.delete(userId);
        broadcastViewerCount(meta.firingId);
      }
      if (meta?.feedArtistIds && userId) {
        leaveFeedRooms(userId, meta.feedArtistIds);
      }
    });

    ws.on("error", (err) => {
      logger.warn({ err }, "WebSocket error");
    });

    ws.send(JSON.stringify({ type: "connected" }));
  });

  return wss;
}

function broadcastViewerCount(firingId: string): void {
  const count = firingRooms.get(firingId)?.size ?? 0;
  broadcastAll({ type: "firing-viewers", firingId, count });
}

export function getFireRoomCount(firingId: string): number {
  return firingRooms.get(firingId)?.size ?? 0;
}

function leaveFeedRooms(userId: string, artistIds: Set<string>): void {
  for (const artistId of artistIds) {
    feedRooms.get(artistId)?.delete(userId);
    broadcastFeedViewerCount(artistId);
  }
}

function broadcastFeedViewerCount(artistId: string): void {
  const count = feedRooms.get(artistId)?.size ?? 0;
  broadcast(artistId, { type: "feed-viewers", artistId, count });
}

export function getFeedViewerCount(artistId: string): number {
  return feedRooms.get(artistId)?.size ?? 0;
}

// Snapshot of every artist currently being watched, used by the periodic
// feed-viewer snapshot cron. Only returns artists with at least one viewer.
export function getAllFeedViewerCounts(): { artistId: string; count: number }[] {
  const out: { artistId: string; count: number }[] = [];
  for (const [artistId, viewers] of feedRooms.entries()) {
    const count = viewers.size;
    if (count > 0) out.push({ artistId, count });
  }
  return out;
}

export function broadcast(userId: string, event: WsEvent): void {
  const sockets = clients.get(userId);
  if (!sockets?.size) return;
  const payload = JSON.stringify(event);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

export function broadcastAll(event: WsEvent): void {
  const payload = JSON.stringify(event);
  for (const sockets of clients.values()) {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}
