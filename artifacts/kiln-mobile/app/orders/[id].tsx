import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
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
  sellerName?: string | null;
  sellerHandle?: string | null;
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
  perSellerWindows?: PerSellerWindow[];
}

interface SellerProcessingWindow {
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
}

interface PerSellerWindow {
  sellerName: string;
  days: number | null;
  label: string | null;
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
  const { id, highlight } = useLocalSearchParams<{ id: string; highlight?: string }>();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const isHighlighted = highlight === "shipped" || highlight === "delivered";
  const [showUpdateBanner, setShowUpdateBanner] = useState(isHighlighted);
  const [statusRing, setStatusRing] = useState(isHighlighted);
  const bannerOpacity = useRef(new Animated.Value(isHighlighted ? 1 : 0)).current;

  useEffect(() => {
    if (!isHighlighted) return;
    const ringTimer = setTimeout(() => setStatusRing(false), 3000);
    const bannerTimer = setTimeout(() => {
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowUpdateBanner(false));
    }, 5500);
    return () => {
      clearTimeout(ringTimer);
      clearTimeout(bannerTimer);
    };
  }, [isHighlighted, bannerOpacity]);

  const [sellerWindow, setSellerWindow] = useState<SellerProcessingWindow | null>(null);
  const [siblingWindows, setSiblingWindows] = useState<Record<string, SellerProcessingWindow>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["me/orders", id],
    queryFn: () => apiGet<OrderDetailResponse>(`/api/me/orders/${encodeURIComponent(id!)}`),
    enabled: !!id,
  });

  useEffect(() => {
    const order = data?.order;
    const siblings = data?.siblingOrders;
    if (!order) return;

    function parseWindow(ps: { processingWindow?: unknown; processingWindowLabel?: unknown }): SellerProcessingWindow {
      return {
        processingWindowDays: typeof ps.processingWindow === "number" ? ps.processingWindow : null,
        processingWindowLabel:
          typeof ps.processingWindowLabel === "string" && (ps.processingWindowLabel as string).trim()
            ? (ps.processingWindowLabel as string).trim()
            : null,
      };
    }

    // Backfill for the primary order (used in the single-order FULFILLMENT section)
    if (order.processingWindowDays === null && order.processingWindowLabel === null && order.sellerId) {
      apiGet<{ processingWindow?: unknown; processingWindowLabel?: unknown }>(
        `/api/users/${order.sellerId}/payment-settings`
      )
        .then(ps => { setSellerWindow(parseWindow(ps)); })
        .catch(() => {});
    }

    // Backfill for every unique seller present in sibling orders
    if (siblings && siblings.length > 1) {
      const seen = new Set<string>();
      for (const sibling of siblings) {
        if (!sibling.sellerId || seen.has(sibling.sellerId)) continue;
        seen.add(sibling.sellerId);

        // If the order record already has a window for this seller, use it directly
        const siblingWithData = siblings.find(
          s => s.sellerId === sibling.sellerId &&
            (s.processingWindowDays !== null || s.processingWindowLabel !== null)
        );
        if (siblingWithData) {
          setSiblingWindows(prev => ({
            ...prev,
            [sibling.sellerId]: {
              processingWindowDays: siblingWithData.processingWindowDays,
              processingWindowLabel: siblingWithData.processingWindowLabel,
            },
          }));
        } else {
          apiGet<{ processingWindow?: unknown; processingWindowLabel?: unknown }>(
            `/api/users/${sibling.sellerId}/payment-settings`
          )
            .then(ps => {
              setSiblingWindows(prev => ({ ...prev, [sibling.sellerId]: parseWindow(ps) }));
            })
            .catch(() => {});
        }
      }
    }
  }, [data?.order, data?.siblingOrders]);

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
  const perSellerWindows: PerSellerWindow[] = data.perSellerWindows ?? [];
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

        {showUpdateBanner && (
          <Animated.View style={[styles.updateBanner, { opacity: bannerOpacity }]}>
            <View style={styles.updateBannerDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.updateBannerTitle}>
                {highlight === "shipped" ? "Your order has shipped!" : "Your order has been delivered!"}
              </Text>
              <Text style={styles.updateBannerSub}>
                {highlight === "shipped"
                  ? "The artist has marked this order as shipped."
                  : "This order has been marked as delivered."}
              </Text>
            </View>
            <Pressable onPress={() => setShowUpdateBanner(false)} hitSlop={8}>
              <Feather name="x" size={14} color="#8A7E75" />
            </Pressable>
          </Animated.View>
        )}

        <View
          style={[
            styles.statusCard,
            { backgroundColor: colors.card, borderColor: statusRing ? "#FBBF24" : colors.border },
            statusRing && styles.statusCardHighlighted,
          ]}
        >
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
                const itemWindow = siblingWindows[item.sellerId];
                const itemWindowLabel = item.processingWindowLabel ?? itemWindow?.processingWindowLabel ?? null;
                const itemWindowDays = item.processingWindowDays ?? itemWindow?.processingWindowDays ?? null;
                const hasItemWindow = itemWindowLabel !== null || itemWindowDays !== null;
                const itemWindowText = itemWindowLabel
                  ? itemWindowLabel
                  : itemWindowDays === 1
                    ? "1 business day"
                    : `${itemWindowDays} business days`;
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
                      {item.sellerName ? (
                        <Pressable
                          onPress={() => router.push(`/profile/${item.sellerId}` as any)}
                          hitSlop={4}
                        >
                          <Text style={[styles.lineDesc, { color: colors.primary }]}>by {item.sellerName}</Text>
                        </Pressable>
                      ) : null}
                      {item.description ? (
                        <Text style={[styles.lineDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{item.description}</Text>
                      ) : null}
                      {hasItemWindow ? (
                        <View style={styles.itemWindowRow}>
                          <Feather name="clock" size={11} color={colors.primary} />
                          <Text style={[styles.itemWindowText, { color: colors.primary }]}>
                            {itemWindowText}
                          </Text>
                        </View>
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

        {isCartOrder && perSellerWindows.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PROCESSING TIMES</Text>
            {perSellerWindows.map((w, idx) => {
              const windowText = w.label
                ? w.label
                : w.days === 1
                  ? "1 business day"
                  : w.days !== null
                    ? `${w.days} business days`
                    : null;
              return (
                <View
                  key={idx}
                  style={[
                    styles.infoRow,
                    { alignItems: "center" },
                    idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 12, marginTop: 4 },
                  ]}
                >
                  <Feather name="clock" size={14} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoText, { color: colors.foreground, marginBottom: 0 }]}>
                      {w.sellerName}
                    </Text>
                    {windowText ? (
                      <Text style={[styles.infoText, { color: colors.primary, fontFamily: "Inter_600SemiBold", marginTop: 1 }]}>
                        {windowText}
                      </Text>
                    ) : (
                      <Text style={[styles.infoText, { color: colors.mutedForeground, marginTop: 1 }]}>
                        No estimate provided
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {(isActive || (!isCartOrder && hasDeliveryEstimate)) && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FULFILLMENT</Text>
            {!isCartOrder && hasDeliveryEstimate && (
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
            {!isCartOrder && !hasDeliveryEstimate && isActive && (
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

        {order.trackingNumber ? (() => {
          const tn = order.trackingNumber.replace(/\s/g, "");
          const carrier = /^1Z/i.test(tn) ? "UPS"
            : /^(94|93|92|94|95)\d{18,}/.test(tn) || /^\d{22}$/.test(tn) || /^[A-Z]{2}\d{9}US$/i.test(tn) ? "USPS"
            : /^\d{12}$/.test(tn) || /^\d{15}$/.test(tn) || /^\d{20}$/.test(tn) ? "FedEx"
            : /^JD\d{18}$/i.test(tn) || /^\d{10}$/.test(tn) ? "DHL"
            : null;
          const trackingUrl = carrier === "UPS" ? `https://www.ups.com/track?tracknum=${tn}`
            : carrier === "USPS" ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`
            : carrier === "FedEx" ? `https://www.fedex.com/fedextrack/?trknbr=${tn}`
            : carrier === "DHL" ? `https://www.dhl.com/en/express/tracking.html?AWB=${tn}`
            : null;
          return (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TRACKING</Text>
              <View style={styles.infoRow}>
                <Feather name="truck" size={14} color="#60a5fa" />
                <View style={{ flex: 1 }}>
                  {carrier ? (
                    <Text style={[styles.carrierLabel, { color: colors.mutedForeground }]}>{carrier}</Text>
                  ) : null}
                  {trackingUrl ? (
                    <Pressable onPress={() => Linking.openURL(trackingUrl)} hitSlop={6}>
                      <Text style={styles.trackingLink}>{order.trackingNumber}</Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.trackingPlain, { color: colors.foreground }]}>{order.trackingNumber}</Text>
                  )}
                </View>
              </View>
            </View>
          );
        })() : null}

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
          {isCartOrder ? (() => {
            const seen = new Set<string>();
            const uniqueSellers = siblings.filter(s => {
              if (seen.has(s.sellerId)) return false;
              seen.add(s.sellerId);
              return true;
            });
            return (
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 0 }]}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CONTACT ARTISTS</Text>
                {uniqueSellers.map((seller, idx) => (
                  <Pressable
                    key={seller.sellerId}
                    style={[
                      styles.infoRow,
                      { alignItems: "center" },
                      idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 12, marginTop: 4 },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/chat/user/[userId]" as any,
                        params: {
                          userId: seller.sellerId,
                          orderRef: order.title,
                          orderId: order.id,
                        },
                      })
                    }
                    hitSlop={4}
                  >
                    <Feather name="message-square" size={14} color={colors.primary} />
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, flex: 1, color: colors.foreground }}>
                      {seller.sellerName ?? seller.sellerId}
                    </Text>
                    <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                  </Pressable>
                ))}
              </View>
            );
          })() : (
            <Pressable
              style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.border }]}
              onPress={() =>
                router.push({
                  pathname: "/chat/user/[userId]" as any,
                  params: {
                    userId: order.sellerId,
                    orderRef: order.title,
                    orderId: order.id,
                  },
                })
              }
            >
              <Feather name="message-square" size={15} color={colors.foreground} />
              <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Message artist</Text>
            </Pressable>
          )}
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
  itemWindowRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  itemWindowText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  updateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
    backgroundColor: "rgba(251,191,36,0.08)",
    padding: 12,
    marginBottom: 10,
  },
  updateBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FBBF24",
    flexShrink: 0,
  },
  updateBannerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#FCD34D",
  },
  updateBannerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#A8A29E",
    marginTop: 2,
  },
  statusCardHighlighted: {
    shadowColor: "#FBBF24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  carrierLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  trackingLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#60a5fa",
    textDecorationLine: "underline",
  },
  trackingPlain: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
