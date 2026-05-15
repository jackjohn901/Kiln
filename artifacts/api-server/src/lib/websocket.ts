import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { logger } from "./logger";

export type WsEvent =
  | { type: "like"; postId: string; userId: string; likeCount: number }
  | { type: "follow"; followerId: string; followingId: string }
  | { type: "comment"; postId: string; commentId: string; authorId: string }
  | { type: "notification"; userId: string; text: string; link?: string }
  | { type: "message"; threadId: string; senderId: string; recipientId: string };

const clients = new Map<string, Set<WebSocket>>();

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

    ws.on("close", () => {
      if (userId) {
        clients.get(userId)?.delete(ws);
        if (clients.get(userId)?.size === 0) clients.delete(userId);
      }
    });

    ws.on("error", (err) => {
      logger.warn({ err }, "WebSocket error");
    });

    ws.send(JSON.stringify({ type: "connected" }));
  });

  return wss;
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
