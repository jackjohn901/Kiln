import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export interface SaleEvent {
  text: string;
  link: string;
  fromName: string;
}

export interface TypingEvent {
  threadId: string;
  userId: string;
}

interface UseWebSocketOptions {
  onSaleNotification?: (evt: SaleEvent) => void;
  onTyping?: (evt: TypingEvent) => void;
}

export function useWebSocket(options?: UseWebSocketOptions) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const onSaleRef = useRef(options?.onSaleNotification);
  onSaleRef.current = options?.onSaleNotification;
  const onTypingRef = useRef(options?.onTyping);
  onTypingRef.current = options?.onTyping;

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return;

    const url = `wss://${domain}/api/ws?userId=${encodeURIComponent(user.id)}`;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      const ws = new WebSocket(url);
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
              if (data.notifType === "sale" && onSaleRef.current) {
                onSaleRef.current({
                  text: (data.text as string | undefined) ?? "You have a new sale!",
                  link: (data.link as string | undefined) ?? "/earnings",
                  fromName: (data.fromName as string | undefined) ?? "A buyer",
                });
              }
              break;
            case "message":
              queryClient.invalidateQueries({ queryKey: ["message-threads"] });
              queryClient.invalidateQueries({ queryKey: ["messages", data.threadId] });
              break;
            case "typing":
              if (onTypingRef.current) {
                onTypingRef.current({ threadId: data.threadId as string, userId: data.userId as string });
              }
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

    function reconnectIfNeeded() {
      const ws = wsRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        connect();
      }
    }

    connect();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          reconnectIfNeeded();
        }
      }
    );

    return () => {
      appStateSubscription.remove();
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [isAuthenticated, user?.id, queryClient]);
}
