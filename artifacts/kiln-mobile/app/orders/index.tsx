import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api";

interface Order {
  id: string;
  type: string;
  title: string;
  description: string | null;
  sellerId: string;
  amount: number;
  status: string;
  imageUrl: string | null;
  trackingNumber: string | null;
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
  manualPayout: boolean;
  notes: string | null;
  createdAt: string;
}

interface OrderGroup {
  key: string;
  orders: Order[];
  isGroup: boolean;
}

interface SellerProcessingWindow {
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
}

function groupOrders(orders: Order[]): OrderGroup[] {
  const groups: OrderGroup[] = [];
  const sessionMap = new Map<string, Order[]>();

  for (const order of orders) {
    if (order.notes && order.notes.startsWith("stripe:")) {
      const existing = sessionMap.get(order.notes);
      if (existing) {
        existing.push(order);
      } else {
        const group: Order[] = [order];
        sessionMap.set(order.notes, group);
        groups.push({ key: order.notes, orders: group, isGroup: true });
      }
    } else {
      groups.push({ key: order.id, orders: [order], isGroup: false });
    }
  }

  return groups;
}

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLOR: Record<string, string> = {
  pending: "#8A7E75",
  inquiry: "#8A7E75",
  in_progress: "#D87F31",
  shipped: "#60a5fa",
  delivered: "#34d399",
  waitlisted: "#D87F31",
  confirmed: "#34d399",
  cancelled: "#f87171",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  inquiry: "Inquiry sent",
  in_progress: "In Progress",
  shipped: "Shipped",
  delivered: "Delivered",
  waitlisted: "Waitlisted",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

const TYPE_ICON: Record<string, string> = {
  drop: "zap",
  listing: "shopping-bag",
  commission: "message-square",
  workshop: "book-open",
  inquiry: "message-square",
};

type TabValue = "all" | "active" | "completed";

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [tab, setTab] = useState<TabValue>("all");

  const [sellerWindows, setSellerWindows] = useState<Record<string, SellerProcessingWindow>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["me/orders"],
    queryFn: () => apiGet<{ orders: Order[] }>("/api/me/orders"),
    enabled: isAuthenticated,
  });

  const allOrders: Order[] = data?.orders ?? [];

  useEffect(() => {
    if (allOrders.length === 0) return;
    const missingSellerIds = [
      ...new Set(
        allOrders
          .filter(o => o.processingWindowDays === null && o.processingWindowLabel === null && o.sellerId)
          .map(o => o.sellerId)
      ),
    ];
    if (missingSellerIds.length === 0) return;
    Promise.allSettled(
      missingSellerIds.map(sid =>
        apiGet<{ processingWindow?: unknown; processingWindowLabel?: unknown }>(`/api/users/${sid}/payment-settings`)
          .then(ps => ({
            sellerId: sid,
            processingWindowDays: typeof ps.processingWindow === "number" ? ps.processingWindow : null,
            processingWindowLabel: typeof ps.processingWindowLabel === "string" && (ps.processingWindowLabel as string).trim()
              ? (ps.processingWindowLabel as string).trim()
              : null,
          }))
      )
    ).then(results => {
      const map: Record<string, SellerProcessingWindow> = {};
      for (const r of results) {
        if (r.status === "fulfilled") {
          map[r.value.sellerId] = {
            processingWindowDays: r.value.processingWindowDays,
            processingWindowLabel: r.value.processingWindowLabel,
          };
        }
      }
      if (Object.keys(map).length > 0) setSellerWindows(map);
    }).catch(() => {});
  }, [allOrders]);

  const filtered = allOrders.filter((o) => {
    if (tab === "active") return ["pending", "inquiry", "in_progress", "shipped", "confirmed", "waitlisted"].includes(o.status);
    if (tab === "completed") return ["delivered", "cancelled"].includes(o.status);
    return true;
  });

  const grouped = groupOrders(filtered);

  if (!isAuthenticated && !authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Your Orders</Text>
        <Text style={[styles.authSub, { color: colors.mutedForeground }]}>Sign in to view your order history</Text>
        <Pressable style={[styles.authBtn, { backgroundColor: colors.primary }]} onPress={login}>
          <Text style={[styles.authBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Your Orders</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={[styles.tabRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        {(["all", "active", "completed"] as TabValue[]).map((t) => (
          <Pressable key={t} style={styles.tabBtn} onPress={() => setTab(t)}>
            <Text style={[
              styles.tabText,
              { color: tab === t ? colors.primary : colors.mutedForeground },
            ]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
            {tab === t && <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />}
          </Pressable>
        ))}
      </View>

      {(isLoading || authLoading) ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : grouped.length === 0 ? (
        <View style={styles.center}>
          <Feather name="shopping-bag" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No orders yet.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {grouped.map(({ key, orders: groupOrders, isGroup }) => {
            const primary = groupOrders[0]!;
            const combinedAmount = groupOrders.reduce((sum, o) => sum + o.amount, 0);
            const statusColor = STATUS_COLOR[primary.status] ?? "#8A7E75";
            const statusLabel = STATUS_LABEL[primary.status] ?? "Pending";
            const typeIconName = (TYPE_ICON[primary.type] ?? "shopping-bag") as any;
            const itemCount = groupOrders.length;
            const isMulti = isGroup && itemCount > 1;
            const backfill = sellerWindows[primary.sellerId];
            const windowLabel = primary.processingWindowLabel ?? backfill?.processingWindowLabel ?? null;
            const windowDays = primary.processingWindowDays ?? backfill?.processingWindowDays ?? null;

            return (
              <Pressable
                key={key}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/orders/${primary.id}` as any)}
              >
                <View style={styles.cardRow}>
                  <View style={[styles.thumb, { backgroundColor: colors.secondary }]}>
                    {primary.imageUrl ? (
                      <Image source={{ uri: primary.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <Feather name={typeIconName} size={18} color={colors.primary} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                        {isMulti ? `${itemCount} items from this checkout` : primary.title}
                      </Text>
                      <Text style={[styles.statusBadge, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                    <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
                      {formatDate(primary.createdAt)}
                    </Text>
                    <View style={styles.amountRow}>
                      <Text style={[styles.amount, { color: colors.primary }]}>
                        {formatPrice(combinedAmount)}
                      </Text>
                      {isMulti && (
                        <Text style={[styles.itemCount, { color: colors.mutedForeground }]}>
                          {itemCount} items
                        </Text>
                      )}
                    </View>
                    {(windowLabel || windowDays) ? (
                      <View style={styles.windowRow}>
                        <Feather name="clock" size={11} color={colors.primary} />
                        <Text style={[styles.windowText, { color: colors.mutedForeground }]}>
                          Processing:{" "}
                          <Text style={{ color: colors.primary }}>
                            {windowLabel
                              ? windowLabel
                              : windowDays === 1
                                ? "1 business day"
                                : `${windowDays} business days`}
                          </Text>
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  authTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 8 },
  authSub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  authBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, marginTop: 4 },
  authBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 30 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "15%",
    right: "15%",
    height: 2,
    borderRadius: 2,
  },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  cardRow: { flexDirection: "row", gap: 12 },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1, lineHeight: 18 },
  statusBadge: { fontFamily: "Inter_500Medium", fontSize: 11, flexShrink: 0 },
  cardDate: { fontFamily: "Inter_400Regular", fontSize: 11 },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  amount: { fontFamily: "Inter_700Bold", fontSize: 15 },
  itemCount: { fontFamily: "Inter_400Regular", fontSize: 11 },
  windowRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  windowText: { fontFamily: "Inter_400Regular", fontSize: 11 },
});
