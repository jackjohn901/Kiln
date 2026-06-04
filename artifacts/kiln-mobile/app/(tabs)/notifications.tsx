import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { useGetNotifications } from "@workspace/api-client-react";
import { router } from "expo-router";
import { relativeTime, apiPost } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotifType =
  | "like"
  | "follow"
  | "comment"
  | "sale"
  | "commission"
  | "commission_payment"
  | "tip"
  | "workshop"
  | "workshop_booking"
  | "drop"
  | "subscription"
  | "message"
  | "bid";

const ICON_MAP: Record<string, { name: keyof typeof Feather.glyphMap; color: string }> = {
  like: { name: "heart", color: "#E05D5D" },
  follow: { name: "user-plus", color: "#4A90D9" },
  comment: { name: "message-circle", color: "#D87F31" },
  sale: { name: "shopping-bag", color: "#4CAF50" },
  commission: { name: "edit-2", color: "#9C6FE4" },
  commission_payment: { name: "dollar-sign", color: "#4CAF50" },
  tip: { name: "gift", color: "#D87F31" },
  workshop: { name: "book-open", color: "#4A90D9" },
  workshop_booking: { name: "calendar", color: "#4A90D9" },
  drop: { name: "droplet", color: "#26C6DA" },
  subscription: { name: "star", color: "#F5A623" },
  message: { name: "mail", color: "#78909C" },
  bid: { name: "trending-up", color: "#9C6FE4" },
};

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

function PushBanner({ onDismiss }: { onDismiss: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.pushBanner, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <View style={[styles.pushIconCircle, { backgroundColor: `${colors.primary}22` }]}>
        <Feather name="bell" size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.pushTitle, { color: colors.foreground }]}>Enable notifications</Text>
        <Text style={[styles.pushSub, { color: colors.mutedForeground }]}>
          Get alerts for likes, comments, and new followers
        </Text>
      </View>
      <Pressable onPress={onDismiss} hitSlop={10}>
        <Feather name="x" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, login } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [pushStatus, setPushStatus] = useState<"idle" | "requested" | "granted" | "denied">("idle");
  const notifListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") return;

    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status === "granted") {
        setPushStatus("granted");
        registerForPushNotifications().then((token) => {
          if (token) apiPost("/api/me/push-token", { token, platform: Platform.OS }).catch(() => {});
        });
      } else if (status === "denied") {
        setPushStatus("denied");
      } else {
        setPushStatus("idle");
      }
    });

    notifListener.current = Notifications.addNotificationReceivedListener(() => {
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = response.notification.request.content.data?.link as string | undefined;
      if (link) router.push(link as any);
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);

  const handleEnablePush = async () => {
    setPushStatus("requested");
    const token = await registerForPushNotifications();
    if (token) {
      setPushStatus("granted");
      await apiPost("/api/me/push-token", { token, platform: Platform.OS }).catch(() => {});
    } else {
      setPushStatus("denied");
    }
  };

  const { data, isLoading, refetch } = useGetNotifications(
    { query: { enabled: isAuthenticated, refetchInterval: 30_000 } as any }
  );

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

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
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Activity</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {pushStatus === "idle" && Platform.OS !== "web" && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <PushBanner onDismiss={handleEnablePush} />
        </View>
      )}

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
          onRefresh={refetch}
          refreshing={isLoading}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item }) => {
            const icon = ICON_MAP[item.type] ?? ICON_MAP["comment"]!;
            const actor = item.fromName ?? "Someone";
            const text = item.text ?? "";
            const time = item.createdAt ? relativeTime(item.createdAt) : "";
            const isTip = item.type === "tip";
            const tipperInitials =
              actor
                .split(" ")
                .filter(Boolean)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "?";
            return (
              <Pressable
                style={[
                  styles.row,
                  { backgroundColor: item.read ? "transparent" : colors.card },
                ]}
                onPress={() => {
                  if (item.link) router.push(item.link as any);
                }}
              >
                {isTip ? (
                  <View style={styles.avatarCircle}>
                    {item.fromAvatarUrl ? (
                      <Image
                        source={{ uri: item.fromAvatarUrl }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.iconCircle,
                          { backgroundColor: `${icon.color}22` },
                        ]}
                      >
                        <Text style={[styles.avatarInitials, { color: icon.color }]}>
                          {tipperInitials}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={[styles.iconCircle, { backgroundColor: `${icon.color}22` }]}>
                    <Feather name={icon.name} size={18} color={icon.color} />
                  </View>
                )}
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
              </Pressable>
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
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28 },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 11 },
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
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarInitials: { fontFamily: "Inter_700Bold", fontSize: 14 },
  textBlock: { flex: 1 },
  rowText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  actor: { fontFamily: "Inter_600SemiBold" },
  time: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  pushBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 12,
  },
  pushIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  pushTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  pushSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  authWall: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 },
  authTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  authSub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  authBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  authBtnText: { fontFamily: "Inter_700Bold", fontSize: 16 },
});
