import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

interface ThreadLookup {
  threadId: string | null;
  otherUser: {
    displayName: string | null;
    avatarUrl: string | null;
    handle: string | null;
  } | null;
}

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

export default function ChatByUserScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userId, orderRef } = useLocalSearchParams<{ userId: string; orderRef?: string }>();
  const { user } = useAuth();

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [resolvedThreadId, setResolvedThreadId] = useState<string | null>(null);
  const [contextRef, setContextRef] = useState<string | undefined>(
    orderRef ? String(orderRef) : undefined
  );
  const flatRef = useRef<FlatList>(null);

  const lookupKey = ["thread-by-user", userId];
  const { data: lookup, isLoading: lookupLoading } = useQuery({
    queryKey: lookupKey,
    queryFn: () => apiGet<ThreadLookup>(`/api/messages/thread-by-user/${encodeURIComponent(userId!)}`),
    enabled: !!userId,
  });

  useEffect(() => {
    if (lookup?.threadId && resolvedThreadId === null) {
      setResolvedThreadId(lookup.threadId);
    }
  }, [lookup?.threadId]);

  const threadQueryKey = ["thread", resolvedThreadId];
  const { data, isLoading: threadLoading, refetch } = useQuery({
    queryKey: threadQueryKey,
    queryFn: () =>
      apiGet<{ thread: ThreadInfo; messages: Message[] }>(
        `/api/messages/threads/${resolvedThreadId}`
      ),
    enabled: !!resolvedThreadId,
    refetchInterval: 5_000,
  });

  const thread = data?.thread;
  const messages = [...(data?.messages ?? [])].reverse();

  const otherUserName =
    thread?.otherUserName ??
    lookup?.otherUser?.displayName ??
    "Artist";

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!draft.trim() || !userId || sending) return;
    const rawText = draft.trim();
    const text = contextRef ? `Re: ${contextRef}\n\n${rawText}` : rawText;
    setDraft("");
    setContextRef(undefined);
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await apiPost<{ threadId: string }>("/api/messages/send", {
        recipientId: userId,
        text,
      });
      if (result.threadId && resolvedThreadId !== result.threadId) {
        setResolvedThreadId(result.threadId);
        queryClient.invalidateQueries({ queryKey: lookupKey });
      }
      await refetch();
    } catch {
      setDraft(rawText);
      setContextRef(contextRef);
    } finally {
      setSending(false);
    }
  }, [draft, userId, sending, resolvedThreadId, refetch, queryClient, contextRef]);

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 84 : 0);
  const isLoading = lookupLoading || (!!resolvedThreadId && threadLoading && messages.length === 0);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 12, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text
          style={[styles.topBarTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {otherUserName}
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
              <View
                style={[styles.msgRow, fromMe ? styles.msgRowMe : styles.msgRowThem]}
              >
                <View
                  style={[
                    styles.bubble,
                    fromMe
                      ? [styles.bubbleMe, { backgroundColor: colors.primary }]
                      : [
                          styles.bubbleThem,
                          { backgroundColor: colors.card, borderColor: colors.border },
                        ],
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      {
                        color: fromMe
                          ? colors.primaryForeground
                          : colors.foreground,
                      },
                    ]}
                  >
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
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                No messages yet. Say hello!
              </Text>
            </View>
          }
        />
      )}

      <View
        style={[
          styles.composerArea,
          {
            borderTopColor: colors.border,
            paddingBottom: bottomPad,
            backgroundColor: colors.background,
          },
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
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor: colors.border,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder="Message…"
            placeholderTextColor={colors.mutedForeground}
            value={draft}
            onChangeText={setDraft}
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
              <Feather
                name="send"
                size={18}
                color={
                  draft.trim() ? colors.primaryForeground : colors.mutedForeground
                }
              />
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
  topBarTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
  },
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
  msgTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    paddingHorizontal: 4,
  },
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
});
