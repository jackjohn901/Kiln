import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPatch } from "@/lib/api";

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

function isOrderOverdue(sale: Sale): boolean {
  if (sale.status !== "in_progress" || !sale.processingWindowDays) return false;
  const deadline = new Date(sale.createdAt);
  deadline.setDate(deadline.getDate() + sale.processingWindowDays);
  return new Date() > deadline;
}

function overdueDeadline(sale: Sale): string {
  const deadline = new Date(sale.createdAt);
  deadline.setDate(deadline.getDate() + (sale.processingWindowDays ?? 0));
  return deadline.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
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

interface StatusAction {
  label: string;
  newStatus: string;
  icon: string;
  variant: "primary" | "secondary" | "danger";
  requiresTracking?: boolean;
}

function getStatusActions(status: string): StatusAction[] {
  switch (status) {
    case "inquiry":
    case "pending":
      return [
        { label: "Accept & Start Processing", newStatus: "in_progress", icon: "check-circle", variant: "primary" },
        { label: "Cancel Order", newStatus: "cancelled", icon: "x-circle", variant: "danger" },
      ];
    case "in_progress":
      return [
        { label: "Mark as Shipped", newStatus: "shipped", icon: "truck", variant: "primary", requiresTracking: true },
        { label: "Cancel Order", newStatus: "cancelled", icon: "x-circle", variant: "danger" },
      ];
    case "shipped":
      return [
        { label: "Mark as Delivered", newStatus: "delivered", icon: "check-circle", variant: "primary" },
      ];
    default:
      return [];
  }
}

export default function SaleDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [shippingModalVisible, setShippingModalVisible] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [trackingEditModalVisible, setTrackingEditModalVisible] = useState(false);
  const [trackingEditInput, setTrackingEditInput] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["me/sales", id],
    queryFn: () => apiGet<{ sale: Sale }>(`/api/me/sales/${encodeURIComponent(id!)}`),
    enabled: !!id,
  });

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: (payload: { status: string; trackingNumber?: string }) =>
      apiPatch<{ sale: Sale }>(`/api/me/sales/${encodeURIComponent(id!)}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me/sales", id] });
      queryClient.invalidateQueries({ queryKey: ["me/sales"] });
    },
    onError: (err: Error) => {
      Alert.alert("Update failed", err.message ?? "Something went wrong. Please try again.");
    },
  });

  const { mutate: updateTracking, isPending: isTrackingUpdating } = useMutation({
    mutationFn: (trackingNumber: string | null) =>
      apiPatch<{ sale: Sale }>(`/api/me/sales/${encodeURIComponent(id!)}`, {
        trackingNumber: trackingNumber ?? "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me/sales", id] });
      queryClient.invalidateQueries({ queryKey: ["me/sales"] });
      setTrackingEditModalVisible(false);
    },
    onError: (err: Error) => {
      Alert.alert("Update failed", err.message ?? "Something went wrong. Please try again.");
    },
  });

  function handleOpenTrackingEdit() {
    setTrackingEditInput(sale?.trackingNumber ?? "");
    setTrackingEditModalVisible(true);
  }

  function handleSaveTracking() {
    updateTracking(trackingEditInput.trim() || null);
  }

  function handleAction(action: StatusAction) {
    if (action.newStatus === "cancelled") {
      Alert.alert(
        "Cancel Order",
        "Are you sure you want to cancel this order? This cannot be undone.",
        [
          { text: "Keep Order", style: "cancel" },
          {
            text: "Cancel Order",
            style: "destructive",
            onPress: () => updateStatus({ status: "cancelled" }),
          },
        ],
      );
      return;
    }

    if (action.requiresTracking) {
      setTrackingInput("");
      setShippingModalVisible(true);
      return;
    }

    updateStatus({ status: action.newStatus });
  }

  function handleConfirmShipped() {
    setShippingModalVisible(false);
    updateStatus({ status: "shipped", trackingNumber: trackingInput.trim() || undefined });
  }

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
  const isPhysical = ["listing", "drop"].includes(sale.type);
  const canEditTracking = sale.status === "shipped" && isPhysical;
  const hasDeliveryEstimate =
    sale.processingWindowLabel !== null || sale.processingWindowDays !== null;
  const baseEstimate = sale.processingWindowLabel
    ? sale.processingWindowLabel
    : sale.processingWindowDays === 1
      ? "1 business day"
      : `${sale.processingWindowDays} business days`;
  const deliveryEstimateText = `Ships within ${baseEstimate}`;
  const statusActions = getStatusActions(sale.status);
  const overdue = isOrderOverdue(sale);

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
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + (statusActions.length > 0 ? 140 : 32),
        }}
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
            style={[
              styles.section,
              {
                backgroundColor: colors.card,
                borderColor: overdue ? "#D97706" : colors.border,
                borderWidth: overdue ? 1.5 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              FULFILLMENT
            </Text>
            {overdue && (
              <View style={styles.overdueRow}>
                <Feather name="alert-triangle" size={14} color="#D97706" />
                <Text style={styles.overdueText}>
                  Overdue — expected to ship by {overdueDeadline(sale)}
                </Text>
              </View>
            )}
            {hasDeliveryEstimate && (
              <View style={styles.infoRow}>
                <Feather name="clock" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  Processing time:{" "}
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
            {canEditTracking && (
              <Pressable
                style={[
                  styles.editTrackingBtn,
                  { borderColor: colors.border, backgroundColor: colors.secondary },
                ]}
                onPress={handleOpenTrackingEdit}
              >
                <Feather name="edit-2" size={13} color={colors.primary} />
                <Text style={[styles.editTrackingBtnText, { color: colors.foreground }]}>
                  {sale.trackingNumber ? "Edit tracking number" : "Add tracking number"}
                </Text>
              </Pressable>
            )}
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

      {statusActions.length > 0 && (
        <View
          style={[
            styles.actionBar,
            {
              paddingBottom: insets.bottom + 12,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          {isUpdating ? (
            <View style={styles.updatingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.updatingText, { color: colors.mutedForeground }]}>
                Updating…
              </Text>
            </View>
          ) : (
            statusActions.map((action) => {
              const isPrimary = action.variant === "primary";
              const isDanger = action.variant === "danger";
              const bg = isPrimary
                ? colors.primary
                : isDanger
                  ? "transparent"
                  : colors.secondary;
              const textColor = isPrimary
                ? colors.primaryForeground
                : isDanger
                  ? "#f87171"
                  : colors.foreground;
              const borderColor = isDanger ? "#f87171" : "transparent";
              return (
                <Pressable
                  key={action.newStatus}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: bg,
                      borderColor,
                      borderWidth: isDanger ? 1 : 0,
                    },
                  ]}
                  onPress={() => handleAction(action)}
                >
                  <Feather name={action.icon as any} size={16} color={textColor} />
                  <Text style={[styles.actionBtnText, { color: textColor }]}>{action.label}</Text>
                </Pressable>
              );
            })
          )}
        </View>
      )}

      <Modal
        visible={trackingEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTrackingEditModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTrackingEditModalVisible(false)}
        />
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {data?.sale?.trackingNumber ? "Edit Tracking Number" : "Add Tracking Number"}
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
            Update the tracking number for this shipment.
          </Text>
          <TextInput
            style={[
              styles.trackingInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Tracking number"
            placeholderTextColor={colors.mutedForeground}
            value={trackingEditInput}
            onChangeText={setTrackingEditInput}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleSaveTracking}
          />
          <Pressable
            style={[
              styles.actionBtn,
              {
                backgroundColor: isTrackingUpdating ? colors.secondary : colors.primary,
                opacity: isTrackingUpdating ? 0.7 : 1,
              },
            ]}
            onPress={handleSaveTracking}
            disabled={isTrackingUpdating}
          >
            {isTrackingUpdating ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : (
              <Feather name="save" size={16} color={colors.primaryForeground} />
            )}
            <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
              Save Tracking
            </Text>
          </Pressable>
          <Pressable
            style={styles.cancelLink}
            onPress={() => setTrackingEditModalVisible(false)}
            disabled={isTrackingUpdating}
          >
            <Text style={[styles.cancelLinkText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal
        visible={shippingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShippingModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShippingModalVisible(false)}
        />
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Mark as Shipped</Text>
          <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
            Add a tracking number for the buyer (optional).
          </Text>
          <TextInput
            style={[
              styles.trackingInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Tracking number (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={trackingInput}
            onChangeText={setTrackingInput}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleConfirmShipped}
          />
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 4 }]}
            onPress={handleConfirmShipped}
          >
            <Feather name="truck" size={16} color={colors.primaryForeground} />
            <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
              Confirm Shipped
            </Text>
          </Pressable>
          <Pressable
            style={[styles.cancelLink]}
            onPress={() => setShippingModalVisible(false)}
          >
            <Text style={[styles.cancelLinkText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
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
  overdueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  overdueText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#D97706",
    flex: 1,
  },
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
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  updatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  updatingText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  modalSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13 },
  trackingInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginTop: 4,
  },
  cancelLink: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelLinkText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  editTrackingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  editTrackingBtnText: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
