import { useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

type EventHandler = (event: Record<string, unknown>) => void;

const handlers = new Map<string, Set<EventHandler>>();
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | undefined;

function getWsUrl(userId?: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const base = `${proto}//${window.location.host}/api/ws`;
  return userId ? `${base}?userId=${encodeURIComponent(userId)}` : base;
}

function connect(userId?: string) {
  const url = getWsUrl(userId);
  if (socket) {
    if (socket.readyState === WebSocket.OPEN && socket.url === url) return;
    if (socket.readyState === WebSocket.CONNECTING) return;
    socket.onclose = null;
    socket.close();
  }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  currentUserId = userId;
  socket = new WebSocket(url);
  socket.onmessage = (e) => {
    try {
      const evt = JSON.parse(e.data) as Record<string, unknown>;
      const type = evt.type as string;
      if (type) handlers.get(type)?.forEach((h) => h(evt));
    } catch { /* ignore */ }
  };
  socket.onclose = () => {
    socket = null;
    reconnectTimer = setTimeout(() => connect(currentUserId), 5000);
  };
  socket.onerror = () => socket?.close();
}

export function useWebSocket() {
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    connect(userId);
  }, [userId]);

  const subscribe = useCallback((type: string, handler: EventHandler) => {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type)!.add(handler);
    return () => { handlers.get(type)?.delete(handler); };
  }, []);

  return { subscribe };
}
