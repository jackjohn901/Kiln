import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, router } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost, relativeTime } from "@/lib/api";
import { useWebSocket, type TypingEvent } from "@/lib/useWebSocket";

interface ThreadInfo {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserHandle: string | null;
  otherUserAvatar: string | null;
}

interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  text: string;
  read: boolean;
  createdAt: string;
}

function BouncingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -5, duration: 250, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.delay(500),
        ])
      );
    const a1 = bounce(dot1, 0);
    const a2 = bounce(dot2, 150);
    const a3 = bounce(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((anim, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { backgroundColor: color, transform: [{ translateY: anim }] }]}
        />
      ))}
    </View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { threadId, orderRef } = useLocalSearchParams<{ threadId: string; orderRef?: string }>();
  const { user } = useAuth();

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [contextRef, setContextRef] = useState<string | undefined>(
    orderRef ? String(orderRef) : undefined
  );
  const flatRef = useRef<FlatList>(null);
  const typingDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  useWebSocket({
    onTyping: useCallback(
      (evt: TypingEvent) => {
        if (evt.threadId !== threadId) return;
        setOtherUserTyping(true);
        if (typingDismissRef.current) clearTimeout(typingDismissRef.current);
        typingDismissRef.current = setTimeout(() => setOtherUserTyping(false), 3000);
      },
      [threadId]
    ),
  });

  useEffect(() => {
    return () => {
      if (typingDismissRef.current) clearTimeout(typingDismissRef.current);
    };
  }, []);

  const queryKey = ["thread", threadId];

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      apiGet<{ thread: ThreadInfo; messages: Message[] }>(`/api/messages/threads/${threadId}`),
    enabled: !!threadId && threadId !== "inbox",
    refetchInterval: 5_000,
  });

  const thread = data?.thread;
  const messages = [...(data?.messages ?? [])].reverse();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  const sendTypingSignal = useCallback(() => {
    if (!threadId || threadId === "inbox") return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1000) return;
    lastTypingSentRef.current = now;
    void apiPost("/api/messages/typing", { threadId });
  }, [threadId]);

  const handleDraftChange = useCallback(
    (text: string) => {
      setDraft(text);
      if (text) sendTypingSignal();
    },
    [sendTypingSignal]
  );

  const handleSend = useCallback(async () => {
    if (!draft.trim() || !thread?.otherUserId || sending) return;
    const rawText = draft.trim();
    const text = contextRef ? `Re: ${contextRef}\n\n${rawText}` : rawText;
    setDraft("");
    setContextRef(undefined);
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await apiPost("/api/messages/send", { recipientId: thread.otherUserId, text });
      await refetch();
    } catch {
      setDraft(rawText);
      setContextRef(contextRef);
    } finally {
      setSending(false);
    }
  }, [draft, thread, sending, refetch, contextRef]);

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 84 : 0);

  if (threadId === "inbox" || !threadId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.topBarTitle, { color: colors.foreground }]}>Messages</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.center}>
          <Feather name="message-square" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Follow artists and start a conversation
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.foreground }]} numberOfLines={1}>
          {thread?.otherUserName ?? "Chat"}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messageList, { paddingBottom: 12 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const fromMe = item.senderId === user?.id;
            return (
              <View style={[styles.msgRow, fromMe ? styles.msgRowMe : styles.msgRowThem]}>
                <View
                  style={[
                    styles.bubble,
                    fromMe
                      ? [styles.bubbleMe, { backgroundColor: colors.primary }]
                      : [styles.bubbleThem, { backgroundColor: colors.card, borderColor: colors.border }],
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: fromMe ? colors.primaryForeground : colors.foreground }]}>
                    {item.text}
                  </Text>
                </View>
                <Text style={[styles.msgTime, { color: colors.mutedForeground }]}>
                  {relativeTime(item.createdAt)} ago
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>No messages yet</Text>
            </View>
          }
          ListFooterComponent={
            otherUserTyping ? (
              <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <BouncingDots color={colors.mutedForeground} />
              </View>
            ) : null
          }
        />
      )}

      <View
        style={[
          styles.composerArea,
          { borderTopColor: colors.border, paddingBottom: bottomPad, backgroundColor: colors.background },
        ]}
      >
        {contextRef ? (
          <View
            style={[
              styles.contextChip,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="tag" size={13} color={colors.primary} />
            <Text
              style={[styles.contextChipText, { color: colors.foreground }]}
              numberOfLines={1}
            >
              Re: {contextRef}
            </Text>
            <Pressable
              onPress={() => setContextRef(undefined)}
              hitSlop={8}
              style={styles.contextChipDismiss}
            >
              <Feather name="x" size={13} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
            placeholder="Message…"
            placeholderTextColor={colors.mutedForeground}
            value={draft}
            onChangeText={handleDraftChange}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            autoFocus={!!orderRef}
          />
          <Pressable
            style={[
              styles.sendBtn,
              {
                backgroundColor: draft.trim() ? colors.primary : colors.secondary,
              },
            ]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Feather name="send" size={18} color={draft.trim() ? colors.primaryForeground : colors.mutedForeground} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, flex: 1, textAlign: "center", marginHorizontal: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  messageList: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  msgRow: { gap: 3 },
  msgRowMe: { alignItems: "flex-end" },
  msgRowThem: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 21 },
  msgTime: { fontFamily: "Inter_400Regular", fontSize: 11, paddingHorizontal: 4 },
  composerArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    alignSelf: "flex-start",
    maxWidth: "90%",
  },
  contextChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  contextChipDismiss: {
    marginLeft: 2,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingBottom: 0,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  typingBubble: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderBottomLeftRadius: 4,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 21,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
