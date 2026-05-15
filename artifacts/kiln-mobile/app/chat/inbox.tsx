import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiGet, relativeTime } from "@/lib/api";

interface Thread {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserHandle: string | null;
  otherUserAvatar: string | null;
  lastMessageText: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

export default function InboxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, login } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data, isLoading } = useQuery({
    queryKey: ["message-threads"],
    queryFn: () => apiGet<{ threads: Thread[] }>("/api/messages/threads"),
    enabled: isAuthenticated,
    refetchInterval: 10_000,
  });

  const threads = data?.threads ?? [];

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.center}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to message</Text>
          <Pressable style={[styles.loginBtn, { backgroundColor: colors.primary }]} onPress={login}>
            <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.threadRow, { backgroundColor: item.unreadCount > 0 ? colors.card : "transparent" }]}
              onPress={() => router.push(`/chat/${item.id}` as any)}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                {item.otherUserAvatar ? (
                  <Image
                    source={{ uri: item.otherUserAvatar }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                    {item.otherUserName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.threadInfo}>
                <View style={styles.threadTopRow}>
                  <Text style={[styles.threadName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.otherUserName}
                  </Text>
                  <Text style={[styles.threadTime, { color: colors.mutedForeground }]}>
                    {relativeTime(item.lastMessageAt)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.threadPreview,
                    { color: item.unreadCount > 0 ? colors.foreground : colors.mutedForeground },
                    item.unreadCount > 0 && styles.threadPreviewBold,
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessageText ?? "No messages yet"}
                </Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                    {item.unreadCount > 9 ? "9+" : item.unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="message-square" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Follow artists and start a conversation
              </Text>
            </View>
          }
        />
      )}
    </View>
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
  title: { fontFamily: "Inter_700Bold", fontSize: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  loginBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 32, marginTop: 4 },
  loginBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  list: { gap: 0 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 80 },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 18 },
  threadInfo: { flex: 1, gap: 3 },
  threadTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  threadName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  threadTime: { fontFamily: "Inter_400Regular", fontSize: 12 },
  threadPreview: { fontFamily: "Inter_400Regular", fontSize: 14 },
  threadPreviewBold: { fontFamily: "Inter_600SemiBold" },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 11 },
});
