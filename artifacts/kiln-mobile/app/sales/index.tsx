import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

interface EarningsTotals {
  tips: number;
  subscriptions: number;
  sales: number;
  total: number;
}

const TYPE_ICON: Record<string, string> = {
  drop: "zap",
  listing: "shopping-bag",
  commission: "message-square",
  workshop: "book-open",
  inquiry: "message-square",
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type TabValue = "all" | "active" | "completed";

export default function SalesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [tab, setTab] = useState<TabValue>("all");
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear]           = useState(now.getFullYear());

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  function goToPrevMonth() {
    setSelectedMonth(m => {
      if (m === 0) { setSelectedYear(y => y - 1); return 11; }
      return m - 1;
    });
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    setSelectedMonth(m => {
      if (m === 11) { setSelectedYear(y => y + 1); return 0; }
      return m + 1;
    });
  }

  function openMonthPicker() {
    setPickerYear(selectedYear);
    setShowMonthPicker(true);
  }

  function selectPickerMonth(month: number) {
    setSelectedMonth(month);
    setSelectedYear(pickerYear);
    setShowMonthPicker(false);
  }

  const params = useLocalSearchParams<{ highlight?: string }>();
  const highlightId = params.highlight;

  const { data, isLoading } = useQuery({
    queryKey: ["me/sales"],
    queryFn: () => apiGet<{ orders: Sale[] }>("/api/me/sales"),
    enabled: isAuthenticated,
  });

  const { data: earningsData } = useQuery({
    queryKey: ["me/earnings", selectedMonth, selectedYear],
    queryFn: () => apiGet<{ totals: EarningsTotals }>(`/api/me/earnings?month=${selectedMonth + 1}&year=${selectedYear}`),
    enabled: isAuthenticated,
  });

  const totals = earningsData?.totals;

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me/sales"] }),
      queryClient.invalidateQueries({ queryKey: ["me/earnings", selectedMonth, selectedYear] }),
    ]);
    setRefreshing(false);
  }

  const allSales: Sale[] = data?.orders ?? [];

  const filtered = allSales.filter((s) => {
    if (tab === "active")
      return ["pending", "inquiry", "in_progress", "shipped", "confirmed", "waitlisted"].includes(s.status);
    if (tab === "completed")
      return ["delivered", "cancelled"].includes(s.status);
    return true;
  });

  if (!isAuthenticated && !authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="dollar-sign" size={40} color={colors.mutedForeground} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Your Sales</Text>
        <Text style={[styles.authSub, { color: colors.mutedForeground }]}>
          Sign in to view your sales history
        </Text>
        <Pressable style={[styles.authBtn, { backgroundColor: colors.primary }]} onPress={login}>
          <Text style={[styles.authBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Sales</Text>
        <View style={{ width: 30 }} />
      </View>

      <View
        style={[styles.tabRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}
      >
        {(["all", "active", "completed"] as TabValue[]).map((t) => (
          <Pressable key={t} style={styles.tabBtn} onPress={() => setTab(t)}>
            <Text
              style={[
                styles.tabText,
                { color: tab === t ? colors.primary : colors.mutedForeground },
              ]}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
            {tab === t && (
              <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />
            )}
          </Pressable>
        ))}
      </View>

      {isLoading || authLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {totals && (
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryHeader}>
                <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Earnings Summary</Text>
                <View style={styles.monthPicker}>
                  <Pressable
                    onPress={goToPrevMonth}
                    hitSlop={8}
                    style={styles.monthArrow}
                  >
                    <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
                  </Pressable>
                  <Pressable onPress={openMonthPicker} hitSlop={4}>
                    <Text style={[styles.monthLabel, { color: colors.primary }]}>
                      {MONTH_NAMES[selectedMonth].slice(0, 3)} {selectedYear}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={goToNextMonth}
                    hitSlop={8}
                    style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
                    disabled={isCurrentMonth}
                  >
                    <Feather name="chevron-right" size={16} color={isCurrentMonth ? colors.border : colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Pressable
                  style={styles.summaryItem}
                  onPress={() => router.push(`/sales/earnings-breakdown?category=tips&month=${selectedMonth + 1}&year=${selectedYear}` as any)}
                >
                  <Feather name="heart" size={14} color="#f472b6" style={{ marginBottom: 4 }} />
                  <Text style={[styles.summaryAmount, { color: colors.foreground }]}>
                    {formatPrice(totals.tips)}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Tips</Text>
                  <Feather name="chevron-right" size={10} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                </Pressable>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <Pressable
                  style={styles.summaryItem}
                  onPress={() => router.push(`/sales/earnings-breakdown?category=patrons&month=${selectedMonth + 1}&year=${selectedYear}` as any)}
                >
                  <Feather name="star" size={14} color="#a78bfa" style={{ marginBottom: 4 }} />
                  <Text style={[styles.summaryAmount, { color: colors.foreground }]}>
                    {formatPrice(totals.subscriptions)}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Patrons</Text>
                  <Feather name="chevron-right" size={10} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                </Pressable>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <Pressable
                  style={styles.summaryItem}
                  onPress={() => router.push(`/sales/earnings-breakdown?category=shop&month=${selectedMonth + 1}&year=${selectedYear}` as any)}
                >
                  <Feather name="shopping-bag" size={14} color="#34d399" style={{ marginBottom: 4 }} />
                  <Text style={[styles.summaryAmount, { color: colors.foreground }]}>
                    {formatPrice(totals.sales)}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Shop</Text>
                  <Feather name="chevron-right" size={10} color={colors.mutedForeground} style={{ marginTop: 2 }} />
                </Pressable>
              </View>
              <View style={[styles.summaryTotalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.summaryTotalLabel, { color: colors.mutedForeground }]}>Total earnings</Text>
                <Text style={[styles.summaryTotalAmount, { color: colors.primary }]}>
                  {formatPrice(totals.total)}
                </Text>
              </View>
            </View>
          )}

          {filtered.length === 0 ? (
            <View style={[styles.center, { paddingTop: 40 }]}>
              <Feather name="dollar-sign" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {tab === "all" ? "No sales yet." : `No ${tab} sales.`}
              </Text>
            </View>
          ) : null}

          {filtered.map((sale) => {
            const statusColor = STATUS_COLOR[sale.status] ?? "#8A7E75";
            const statusLabel = STATUS_LABEL[sale.status] ?? "Pending";
            const typeIconName = (TYPE_ICON[sale.type] ?? "shopping-bag") as any;
            const buyerName = sale.buyerDisplayName ?? sale.buyerHandle ?? "Unknown buyer";
            const isHighlighted = highlightId === sale.id;

            return (
              <Pressable
                key={sale.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: isHighlighted ? colors.primary : colors.border,
                  },
                  isHighlighted && styles.cardHighlighted,
                ]}
                onPress={() => router.push(`/sales/${sale.id}` as any)}
              >
                {isHighlighted && (
                  <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.newBadgeText, { color: colors.primaryForeground }]}>
                      New
                    </Text>
                  </View>
                )}
                <View style={styles.cardRow}>
                  <View style={[styles.thumb, { backgroundColor: colors.secondary }]}>
                    {sale.imageUrl ? (
                      <Image
                        source={{ uri: sale.imageUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                      />
                    ) : (
                      <Feather name={typeIconName} size={18} color={colors.primary} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[styles.cardTitle, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {sale.title}
                      </Text>
                      <Text style={[styles.statusBadge, { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                    </View>
                    <View style={styles.buyerRow}>
                      <Feather name="user" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.buyerText, { color: colors.mutedForeground }]}>
                        {buyerName}
                      </Text>
                    </View>
                    <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
                      {formatDate(sale.createdAt)}
                    </Text>
                    <Text style={[styles.amount, { color: colors.primary }]}>
                      {formatPrice(sale.amount, sale.currency)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMonthPicker(false)}
        >
          <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <View style={styles.pickerYearRow}>
              <Pressable
                hitSlop={12}
                onPress={() => setPickerYear(y => y - 1)}
                style={styles.pickerArrow}
              >
                <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              </Pressable>
              <Text style={[styles.pickerYearLabel, { color: colors.foreground }]}>{pickerYear}</Text>
              <Pressable
                hitSlop={12}
                onPress={() => pickerYear < now.getFullYear() && setPickerYear(y => y + 1)}
                style={[styles.pickerArrow, pickerYear >= now.getFullYear() && { opacity: 0.25 }]}
                disabled={pickerYear >= now.getFullYear()}
              >
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((name, idx) => {
                const isFuture = pickerYear > now.getFullYear() || (pickerYear === now.getFullYear() && idx > now.getMonth());
                const isSelected = idx === selectedMonth && pickerYear === selectedYear;
                return (
                  <Pressable
                    key={name}
                    onPress={() => !isFuture && selectPickerMonth(idx)}
                    disabled={isFuture}
                    style={[
                      styles.monthCell,
                      isSelected && { backgroundColor: colors.primary + "33", borderColor: colors.primary, borderWidth: 1 },
                      isFuture && { opacity: 0.25 },
                    ]}
                  >
                    <Text style={[
                      styles.monthCellText,
                      { color: isSelected ? colors.primary : colors.foreground },
                    ]}>
                      {name.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
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
  cardHighlighted: {
    borderWidth: 1.5,
  },
  newBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  newBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
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
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1, lineHeight: 18 },
  statusBadge: { fontFamily: "Inter_500Medium", fontSize: 11, flexShrink: 0 },
  buyerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  buyerText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  cardDate: { fontFamily: "Inter_400Regular", fontSize: 11 },
  amount: { fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 2 },
  summaryCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  summaryTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  monthPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  monthArrow: { padding: 2 },
  monthArrowDisabled: { opacity: 0.3 },
  monthLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, minWidth: 64, textAlign: "center" },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    marginHorizontal: 4,
  },
  summaryAmount: { fontFamily: "Inter_700Bold", fontSize: 16 },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  summaryTotalLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  summaryTotalAmount: { fontFamily: "Inter_700Bold", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  pickerSheet: {
    width: "100%",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  pickerYearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pickerArrow: { padding: 4 },
  pickerYearLabel: { fontFamily: "Inter_700Bold", fontSize: 18 },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  monthCell: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
  },
  monthCellText: { fontFamily: "Inter_500Medium", fontSize: 14 },
});
