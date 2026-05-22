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
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

interface Order {
  id: string;
  type: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  amount: number;
  currency: string;
  status: string;
  sellerId: string;
  shippingAddress: string | null;
  trackingNumber: string | null;
  notes: string | null;
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
  manualPayout: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OrderDetailResponse {
  order: Order;
  siblingOrders?: Order[];
}

interface SellerProcessingWindow {
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
}

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function ordinalId(id: string) {
  return "KLN-" + id.slice(0, 8).toUpperCase();
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

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [sellerWindow, setSellerWindow] = useState<SellerProcessingWindow | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["me/orders", id],
    queryFn: () => apiGet<OrderDetailResponse>(`/api/me/orders/${encodeURIComponent(id!)}`),
    enabled: !!id,
  });

  useEffect(() => {
    const order = data?.order;
    if (!order) return;
    if (order.processingWindowDays !== null || order.processingWindowLabel !== null) return;
    if (!order.sellerId) return;
    apiGet<{ processingWindow?: unknown; processingWindowLabel?: unknown }>(
      `/api/users/${order.sellerId}/payment-settings`
    )
      .then(ps => {
        setSellerWindow({
          processingWindowDays: typeof ps.processingWindow === "number" ? ps.processingWindow : null,
          processingWindowLabel:
            typeof ps.processingWindowLabel === "string" && (ps.processingWindowLabel as string).trim()
              ? (ps.processingWindowLabel as string).trim()
              : null,
        });
      })
      .catch(() => {});
  }, [data?.order]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !data?.order) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Order not found.</Text>
        <Pressable style={[styles.backLink, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Text style={[styles.backLinkText, { color: colors.foreground }]}>Back to Orders</Text>
        </Pressable>
      </View>
    );
  }

  const order = data.order;
  const siblings: Order[] = (data.siblingOrders && data.siblingOrders.length > 1) ? data.siblingOrders : [];
  const isCartOrder = siblings.length > 1;
  const cartTotal = isCartOrder ? siblings.reduce((sum, o) => sum + o.amount, 0) : order.amount;
  const statusColor = STATUS_COLOR[order.status] ?? "#8A7E75";
  const statusLabel = STATUS_LABEL[order.status] ?? "Pending";
  const typeIconName = (TYPE_ICON[order.type] ?? "shopping-bag") as any;
  const isActive = !["delivered", "cancelled"].includes(order.status);
  const windowLabel = order.processingWindowLabel ?? sellerWindow?.processingWindowLabel ?? null;
  const windowDays = order.processingWindowDays ?? sellerWindow?.processingWindowDays ?? null;
  const hasDeliveryEstimate = windowLabel !== null || windowDays !== null;
  const deliveryEstimateText = windowLabel
    ? windowLabel
    : windowDays === 1
      ? "1 business day"
      : `${windowDays} business days`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Order Receipt</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.orderId, { color: colors.primary }]}>{ordinalId(order.id)}</Text>

        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="clock" size={16} color={statusColor} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            <Text style={[styles.statusDate, { color: colors.mutedForeground }]}>
              Placed {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {isCartOrder ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                ITEMS ({siblings.length})
              </Text>
              {siblings.map((item, idx) => {
                const itemIconName = (TYPE_ICON[item.type] ?? "shopping-bag") as any;
                return (
                  <View key={item.id} style={[styles.lineItem, idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 12 }]}>
                    <View style={[styles.lineThumb, { backgroundColor: colors.secondary }]}>
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      ) : (
                        <Feather name={itemIconName} size={14} color={colors.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lineTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
                      {item.description ? (
                        <Text style={[styles.lineDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.description}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.linePrice, { color: colors.primary }]}>{formatPrice(item.amount)}</Text>
                  </View>
                );
              })}
              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total</Text>
                <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatPrice(cartTotal)}</Text>
              </View>
            </>
          ) : (
            <View style={styles.singleItem}>
              <View style={[styles.singleThumb, { backgroundColor: colors.secondary }]}>
                {order.imageUrl ? (
                  <Image source={{ uri: order.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Feather name={typeIconName} size={22} color={colors.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.singleTitle, { color: colors.foreground }]}>{order.title}</Text>
                {order.description ? (
                  <Text style={[styles.lineDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{order.description}</Text>
                ) : null}
                <Text style={[styles.totalAmount, { color: colors.primary, marginTop: 6 }]}>{formatPrice(order.amount)}</Text>
              </View>
            </View>
          )}
        </View>

        {(isActive || hasDeliveryEstimate) && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FULFILLMENT</Text>
            {hasDeliveryEstimate && (
              <View style={styles.infoRow}>
                <Feather name="clock" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  Delivery estimate:{" "}
                  <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                    {deliveryEstimateText}
                  </Text>
                </Text>
              </View>
            )}
            {!hasDeliveryEstimate && isActive && (
              <View style={styles.infoRow}>
                <Feather name="clock" size={14} color={colors.mutedForeground} />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>No delivery estimate provided.</Text>
              </View>
            )}
            {isActive && (
              <View style={styles.infoRow}>
                <Feather name="package" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  The artist will reach out within 2–3 business days with shipping details.
                </Text>
              </View>
            )}
          </View>
        )}

        {order.manualPayout && (
          <View style={[styles.section, styles.warnSection, { borderColor: "#D87F3140" }]}>
            <View style={styles.infoRow}>
              <Feather name="alert-circle" size={14} color="#D87F31" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.warnTitle, { color: "#D87F31" }]}>Manual fulfillment in progress</Text>
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                  This artist processes payments directly. Your order has been recorded and the artist has been notified. Expect a reply within{" "}
                  <Text style={{ color: "#D87F31", fontFamily: "Inter_500Medium" }}>2–5 business days</Text>{" "}
                  with payment instructions and shipping details.
                </Text>
              </View>
            </View>
          </View>
        )}

        {order.trackingNumber ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TRACKING</Text>
            <View style={styles.infoRow}>
              <Feather name="truck" size={14} color="#60a5fa" />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                Tracking:{" "}
                <Text style={{ fontFamily: "Inter_500Medium" }}>{order.trackingNumber}</Text>
              </Text>
            </View>
          </View>
        ) : null}

        {order.shippingAddress ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SHIP TO</Text>
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{order.shippingAddress}</Text>
            </View>
          </View>
        ) : null}

        {order.notes && !order.notes.startsWith("stripe:") ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NOTES</Text>
            <View style={styles.infoRow}>
              <Feather name="file-text" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{order.notes}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.border }]}
            onPress={() =>
              router.push({
                pathname: "/chat/user/[userId]" as any,
                params: {
                  userId: order.sellerId,
                  orderRef: order.title,
                },
              })
            }
          >
            <Feather name="message-square" size={15} color={colors.foreground} />
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Message artist</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
            onPress={() => router.push("/orders" as any)}
          >
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Back to Orders</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  notFoundText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  backLink: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  backLinkText: { fontFamily: "Inter_500Medium", fontSize: 14 },
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
  orderId: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 12, letterSpacing: 0.5 },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  statusLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  statusDate: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  section: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  warnSection: {
    backgroundColor: "rgba(216,127,49,0.06)",
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: -4,
  },
  lineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lineThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lineTitle: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  lineDesc: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  linePrice: { fontFamily: "Inter_700Bold", fontSize: 14, flexShrink: 0 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: -2,
  },
  totalLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  totalAmount: { fontFamily: "Inter_700Bold", fontSize: 16 },
  singleItem: { flexDirection: "row", gap: 14 },
  singleThumb: {
    width: 62,
    height: 62,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  singleTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 20 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, flex: 1 },
  warnTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 4 },
  actions: { gap: 10, marginTop: 4 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 24,
    paddingVertical: 13,
  },
  actionBtnOutline: { borderWidth: 1 },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
