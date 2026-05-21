import React from "react";
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

interface Sale {
  id: string;
  buyerId: string;
  type: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  amount: number;
  currency: string;
  status: string;
  shippingAddress: string | null;
  trackingNumber: string | null;
  notes: string | null;
  processingWindowDays: number | null;
  processingWindowLabel: string | null;
  manualPayout: boolean;
  createdAt: string;
  updatedAt: string;
  buyerDisplayName: string | null;
  buyerHandle: string | null;
}

function formatPrice(n: number, currency = "USD") {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
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

export default function SaleDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["me/sales", id],
    queryFn: () => apiGet<{ sale: Sale }>(`/api/me/sales/${encodeURIComponent(id!)}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !data?.sale) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          Sale not found.
        </Text>
        <Pressable
          style={[styles.backLink, { borderColor: colors.border }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/sales" as any)}
        >
          <Text style={[styles.backLinkText, { color: colors.foreground }]}>Back to Sales</Text>
        </Pressable>
      </View>
    );
  }

  const sale = data.sale;
  const statusColor = STATUS_COLOR[sale.status] ?? "#8A7E75";
  const statusLabel = STATUS_LABEL[sale.status] ?? "Pending";
  const typeIconName = (TYPE_ICON[sale.type] ?? "shopping-bag") as any;
  const buyerName = sale.buyerDisplayName ?? sale.buyerHandle ?? "Unknown buyer";
  const isActive = !["delivered", "cancelled"].includes(sale.status);
  const hasDeliveryEstimate =
    sale.processingWindowLabel !== null || sale.processingWindowDays !== null;
  const deliveryEstimateText = sale.processingWindowLabel
    ? sale.processingWindowLabel
    : sale.processingWindowDays === 1
      ? "1 business day"
      : `${sale.processingWindowDays} business days`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Sale Detail</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.orderId, { color: colors.primary }]}>{ordinalId(sale.id)}</Text>

        <View
          style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="clock" size={16} color={statusColor} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            <Text style={[styles.statusDate, { color: colors.mutedForeground }]}>
              Placed {formatDate(sale.createdAt)} at {formatTime(sale.createdAt)}
            </Text>
          </View>
        </View>

        <View
          style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.singleItem}>
            <View style={[styles.singleThumb, { backgroundColor: colors.secondary }]}>
              {sale.imageUrl ? (
                <Image
                  source={{ uri: sale.imageUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <Feather name={typeIconName} size={22} color={colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.singleTitle, { color: colors.foreground }]}>{sale.title}</Text>
              {sale.description ? (
                <Text style={[styles.lineDesc, { color: colors.mutedForeground }]} numberOfLines={3}>
                  {sale.description}
                </Text>
              ) : null}
              <Text style={[styles.totalAmount, { color: colors.primary, marginTop: 6 }]}>
                {formatPrice(sale.amount, sale.currency)}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>BUYER</Text>
          <View style={styles.infoRow}>
            <Feather name="user" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>{buyerName}</Text>
          </View>
          {sale.buyerHandle ? (
            <View style={styles.infoRow}>
              <Feather name="at-sign" size={14} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                @{sale.buyerHandle}
              </Text>
            </View>
          ) : null}
        </View>

        {(isActive || hasDeliveryEstimate) && (
          <View
            style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              FULFILLMENT
            </Text>
            {hasDeliveryEstimate && (
              <View style={styles.infoRow}>
                <Feather name="clock" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  Processing:{" "}
                  <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                    {deliveryEstimateText}
                  </Text>
                </Text>
              </View>
            )}
            {sale.trackingNumber ? (
              <View style={styles.infoRow}>
                <Feather name="package" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  Tracking:{" "}
                  <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                    {sale.trackingNumber}
                  </Text>
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {sale.shippingAddress ? (
          <View
            style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              SHIP TO
            </Text>
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                {sale.shippingAddress}
              </Text>
            </View>
          </View>
        ) : null}

        <View
          style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PAYOUT</Text>
          <View style={styles.infoRow}>
            <Feather name="dollar-sign" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>
              {formatPrice(sale.amount, sale.currency)}{" "}
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {sale.manualPayout ? "(manual payout)" : "(via Stripe Connect)"}
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  notFoundText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  backLink: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
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
  orderId: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
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
    gap: 10,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  singleItem: { flexDirection: "row", gap: 12 },
  singleThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  singleTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 20 },
  lineDesc: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 },
  totalAmount: { fontFamily: "Inter_700Bold", fontSize: 16 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
});
