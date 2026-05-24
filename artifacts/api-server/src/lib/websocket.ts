import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { logger } from "./logger";

export type WsEvent =
  | { type: "like"; postId: string; userId: string; likeCount: number }
  | { type: "follow"; followerId: string; followingId: string }
  | { type: "comment"; postId: string; commentId: string; authorId: string }
  | { type: "notification"; userId: string; text: string; link?: string; notifType?: string; fromName?: string }
  | { type: "message"; threadId: string; senderId: string; recipientId: string }
  | { type: "typing"; threadId: string; userId: string }
  | { type: "bid"; auctionId: string; currentBid: number; bidCount: number; bidderName: string; bidAt?: string }
  | { type: "firing-viewers"; firingId: string; count: number };

const clients = new Map<string, Set<WebSocket>>();

// firingId → set of userIds currently watching
const firingRooms = new Map<string, Set<string>>();
// ws → { userId, watchingFiringId } for cleanup on disconnect
const wsMetadata = new Map<WebSocket, { userId: string | null; firingId: string | null }>();

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

    wsMetadata.set(ws, { userId, firingId: null });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; firingId?: string };
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
