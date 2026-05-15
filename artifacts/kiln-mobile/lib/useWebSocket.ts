import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export function useWebSocket() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return;

    const url = `wss://${domain}/api/ws?userId=${encodeURIComponent(user.id)}`;
    let ws: WebSocket;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          switch (data.type) {
            case "like":
              queryClient.invalidateQueries({ queryKey: ["feed"] });
              queryClient.invalidateQueries({ queryKey: ["post", data.postId] });
              break;
            case "comment":
              queryClient.invalidateQueries({ queryKey: ["comments", data.postId] });
              queryClient.invalidateQueries({ queryKey: ["feed"] });
              break;
            case "follow":
              queryClient.invalidateQueries({ queryKey: ["me/profile"] });
              queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
              break;
            case "notification":
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
              break;
            case "message":
              queryClient.invalidateQueries({ queryKey: ["message-threads"] });
              queryClient.invalidateQueries({ queryKey: ["messages", data.threadId] });
              break;
          }
        } catch {
          // ignore malformed events
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        retryTimer = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [isAuthenticated, user?.id, queryClient]);
}
