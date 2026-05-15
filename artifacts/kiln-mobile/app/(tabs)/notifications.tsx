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
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { useGetNotifications } from "@workspace/api-client-react";
import { relativeTime } from "@/lib/api";

type NotifType = "like" | "follow" | "comment" | "sale";

const ICON_MAP: Record<string, { name: keyof typeof Feather.glyphMap; color: string }> = {
  like: { name: "heart", color: "#E05D5D" },
  follow: { name: "user-plus", color: "#4A90D9" },
  comment: { name: "message-circle", color: "#D87F31" },
  sale: { name: "shopping-bag", color: "#4CAF50" },
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, login } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data, isLoading } = useGetNotifications(
    { query: { enabled: isAuthenticated } as any }
  );

  const notifications = data?.notifications ?? [];

  if (!isAuthenticated) {
    return (
      <View style={[styles.authWall, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="bell" size={48} color={colors.mutedForeground} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Stay in the loop</Text>
        <Text style={[styles.authSub, { color: colors.mutedForeground }]}>
          Sign in to see likes, comments, and new followers
        </Text>
        <Pressable style={[styles.authBtn, { backgroundColor: colors.primary }]} onPress={login}>
          <Text style={[styles.authBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Activity</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 80) },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item }) => {
            const icon = ICON_MAP[item.type] ?? ICON_MAP["comment"]!;
            const actor = item.fromName ?? "Someone";
            const text = item.text ?? "";
            const time = item.createdAt ? relativeTime(item.createdAt) : "";
            return (
              <View
                style={[
                  styles.row,
                  { backgroundColor: item.read ? "transparent" : colors.card },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${icon.color}22` }]}>
                  <Feather name={icon.name} size={18} color={icon.color} />
                </View>
                <View style={styles.textBlock}>
                  <Text style={[styles.rowText, { color: colors.foreground }]}>
                    <Text style={styles.actor}>{actor}</Text>
                    {text ? ` ${text}` : ""}
                  </Text>
                  {time ? (
                    <Text style={[styles.time, { color: colors.mutedForeground }]}>{time} ago</Text>
                  ) : null}
                </View>
                {!item.read && (
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="bell-off" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 0 },
  sep: { height: StyleSheet.hairlineWidth },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1 },
  rowText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  actor: { fontFamily: "Inter_600SemiBold" },
  time: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  authWall: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 },
  authTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  authSub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  authBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  authBtnText: { fontFamily: "Inter_700Bold", fontSize: 16 },
});
