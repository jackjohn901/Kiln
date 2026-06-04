import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api";

type EarningType = "tip" | "subscription" | "listing" | "drop" | "commission" | "workshop";

interface Earning {
  id: string;
  type: EarningType;
  label: string;
  sublabel: string;
  amount: number;
  date: string;
  fromUserId?: string | null;
  fromAvatarUrl?: string | null;
  fromHandle?: string | null;
}

interface EarningsResponse {
  earnings: Earning[];
  totals: {
    tips: number;
    subscriptions: number;
    sales: number;
    total: number;
  };
}

type Category = "tips" | "patrons" | "shop";

const CATEGORY_CONFIG: Record<
  Category,
  { title: string; icon: string; iconColor: string; types: EarningType[]; emptyText: string }
> = {
  tips: {
    title: "Tips",
    icon: "heart",
    iconColor: "#f472b6",
    types: ["tip"],
    emptyText: "No tips received yet.",
  },
  patrons: {
    title: "Patron Subscriptions",
    icon: "star",
    iconColor: "#a78bfa",
    types: ["subscription"],
    emptyText: "No active patron subscriptions.",
  },
  shop: {
    title: "Shop Sales",
    icon: "shopping-bag",
    iconColor: "#34d399",
    types: ["listing", "drop", "commission", "workshop"],
    emptyText: "No shop sales yet.",
  },
};

type ShopSubtype = "listing" | "drop" | "commission" | "workshop";

interface ShopSubtypeConfig {
  type: ShopSubtype;
  title: string;
  icon: string;
  iconColor: string;
  emptyText: string;
}

const SHOP_SUBTYPES: ShopSubtypeConfig[] = [
  {
    type: "listing",
    title: "Listings",
    icon: "shopping-bag",
    iconColor: "#34d399",
    emptyText: "No listing sales yet.",
  },
  {
    type: "drop",
    title: "Drops",
    icon: "zap",
    iconColor: "#60a5fa",
    emptyText: "No drop sales yet.",
  },
  {
    type: "commission",
    title: "Commissions",
    icon: "message-square",
    iconColor: "#f59e0b",
    emptyText: "No commission sales yet.",
  },
  {
    type: "workshop",
    title: "Workshops",
    icon: "book-open",
    iconColor: "#a78bfa",
    emptyText: "No workshop sales yet.",
  },
];

const TYPE_ICON: Record<EarningType, string> = {
  tip: "heart",
  subscription: "star",
  listing: "shopping-bag",
  drop: "zap",
  commission: "message-square",
  workshop: "book-open",
};

const TYPE_COLOR: Record<EarningType, string> = {
  tip: "#f472b6",
  subscription: "#a78bfa",
  listing: "#34d399",
  drop: "#60a5fa",
  commission: "#f59e0b",
  workshop: "#a78bfa",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_KEY = "kiln:earnings:selectedMonth";

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

export default function EarningsBreakdownScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const params = useLocalSearchParams<{
    category?: string;
    month?: string;
    year?: string;
    subtype?: string;
  }>();
  const category = (params.category ?? "shop") as Category;
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.shop;
  const subtype = params.subtype as ShopSubtype | undefined;

  const now = useMemo(() => new Date(), []);
  const monthParam = params.month ? parseInt(params.month, 10) : null;
  const yearParam = params.year ? parseInt(params.year, 10) : null;

  const [selectedMonth, setSelectedMonth] = useState(
    monthParam !== null ? monthParam - 1 : now.getMonth(),
  );
  const [selectedYear, setSelectedYear] = useState(
    yearParam !== null ? yearParam : now.getFullYear(),
  );
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedYear);

  const monthLabel = new Date(selectedYear, selectedMonth, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const isCurrentMonth =
    selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  function persistMonth(month: number, year: number) {
    AsyncStorage.setItem(
      MONTH_KEY,
      JSON.stringify({ month, year }),
    ).catch(() => {
      /* ignore */
    });
  }

  function goToPrevMonth() {
    let m = selectedMonth;
    let y = selectedYear;
    if (m === 0) {
      m = 11;
      y -= 1;
    } else {
      m -= 1;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
    persistMonth(m, y);
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    let m = selectedMonth;
    let y = selectedYear;
    if (m === 11) {
      m = 0;
      y += 1;
    } else {
      m += 1;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
    persistMonth(m, y);
  }

  function openMonthPicker() {
    setPickerYear(selectedYear);
    setShowMonthPicker(true);
  }

  function selectPickerMonth(month: number) {
    setSelectedMonth(month);
    setSelectedYear(pickerYear);
    persistMonth(month, pickerYear);
    setShowMonthPicker(false);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["me/earnings", selectedMonth, selectedYear],
    queryFn: () =>
      apiGet<EarningsResponse>(
        `/api/me/earnings?month=${selectedMonth + 1}&year=${selectedYear}`,
      ),
    enabled: isAuthenticated,
  });

  const allEarnings = data?.earnings ?? [];

  const isShopOverview = category === "shop" && !subtype;
  const isShopSubtype = category === "shop" && !!subtype;

  const subtypeConfig = isShopSubtype
    ? SHOP_SUBTYPES.find((s) => s.type === subtype)
    : undefined;

  const filtered = allEarnings.filter((e) => {
    if (isShopSubtype && subtype) return e.type === subtype;
    return config.types.includes(e.type);
  });
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const shopSubtypeBreakdown = SHOP_SUBTYPES.map((st) => {
    const stEarnings = allEarnings.filter((e) => e.type === st.type);
    return {
      ...st,
      count: stEarnings.length,
      total: stEarnings.reduce((s, e) => s + e.amount, 0),
    };
  });
  const shopBreakdownTotal = shopSubtypeBreakdown.reduce((s, st) => s + st.total, 0);
  const chartSegments = shopSubtypeBreakdown.filter((st) => st.total > 0);

  const headerTitle = isShopSubtype && subtypeConfig ? subtypeConfig.title : config.title;
  const headerIcon = isShopSubtype && subtypeConfig ? subtypeConfig.icon : config.icon;
  const headerIconColor =
    isShopSubtype && subtypeConfig ? subtypeConfig.iconColor : config.iconColor;
  const emptyText =
    isShopSubtype && subtypeConfig ? subtypeConfig.emptyText : config.emptyText;

  const dateParams = `&month=${selectedMonth + 1}&year=${selectedYear}`;

  function handleBack() {
    if (isShopSubtype) {
      router.replace(`/sales/earnings-breakdown?category=shop${dateParams}` as any);
    } else {
      router.back();
    }
  }

  function handleSubtypeTap(st: ShopSubtype) {
    router.push(
      `/sales/earnings-breakdown?category=shop&subtype=${st}${dateParams}` as any
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
        <Pressable onPress={handleBack} hitSlop={8} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{headerTitle}</Text>
        <View style={{ width: 30 }} />
      </View>

      <View
        style={[
          styles.monthBar,
          { borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <Pressable onPress={goToPrevMonth} hitSlop={8} style={styles.monthArrow}>
          <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          onPress={openMonthPicker}
          hitSlop={6}
          style={styles.monthLabelBtn}
        >
          <Feather name="calendar" size={14} color={colors.primary} />
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
          <Feather
            name="chevron-right"
            size={18}
            color={isCurrentMonth ? colors.border : colors.mutedForeground}
          />
        </Pressable>
      </View>

      {isLoading || authLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.totalBanner,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather
              name={headerIcon as any}
              size={20}
              color={headerIconColor}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.totalAmount, { color: colors.foreground }]}>
              {formatPrice(total)}
            </Text>
            {monthLabel && (
              <Text style={[styles.totalMonth, { color: colors.primary }]}>
                {monthLabel}
              </Text>
            )}
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
              {filtered.length} {filtered.length === 1 ? "transaction" : "transactions"}
            </Text>
          </View>

          {isShopOverview && chartSegments.length > 0 && (
            <View
              style={[
                styles.chartCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                REVENUE SPLIT
              </Text>
              <View style={styles.chartBar}>
                {chartSegments.map((st, i) => {
                  const pct = (st.total / shopBreakdownTotal) * 100;
                  const showInline = pct >= 16;
                  return (
                    <Pressable
                      key={st.type}
                      onPress={() => handleSubtypeTap(st.type)}
                      style={({ pressed }) => [
                        styles.chartSegment,
                        {
                          flexGrow: st.total,
                          flexBasis: 0,
                          backgroundColor: st.iconColor,
                          opacity: pressed ? 0.7 : 1,
                          borderTopLeftRadius: i === 0 ? 6 : 0,
                          borderBottomLeftRadius: i === 0 ? 6 : 0,
                          borderTopRightRadius: i === chartSegments.length - 1 ? 6 : 0,
                          borderBottomRightRadius:
                            i === chartSegments.length - 1 ? 6 : 0,
                        },
                      ]}
                    >
                      {showInline && (
                        <Text style={styles.chartSegmentLabel} numberOfLines={1}>
                          {Math.round(pct)}%
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.chartLegend}>
                {chartSegments.map((st) => {
                  const pct = (st.total / shopBreakdownTotal) * 100;
                  return (
                    <Pressable
                      key={st.type}
                      onPress={() => handleSubtypeTap(st.type)}
                      style={({ pressed }) => [
                        styles.legendItem,
                        { opacity: pressed ? 0.6 : 1 },
                      ]}
                    >
                      <View
                        style={[styles.legendDot, { backgroundColor: st.iconColor }]}
                      />
                      <Text
                        style={[styles.legendLabel, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {st.title}
                      </Text>
                      <Text
                        style={[styles.legendPct, { color: colors.mutedForeground }]}
                      >
                        {Math.round(pct)}%
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {isShopOverview && (
            <View style={{ marginBottom: 8 }}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                BY TYPE
              </Text>
              {SHOP_SUBTYPES.map((st) => {
                const stEarnings = allEarnings.filter((e) => e.type === st.type);
                const stTotal = stEarnings.reduce((s, e) => s + e.amount, 0);
                return (
                  <Pressable
                    key={st.type}
                    onPress={() => handleSubtypeTap(st.type)}
                    style={({ pressed }) => [
                      styles.subtypeRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[styles.iconCircle, { backgroundColor: colors.secondary }]}
                    >
                      <Feather name={st.icon as any} size={16} color={st.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subtypeTitle, { color: colors.foreground }]}>
                        {st.title}
                      </Text>
                      <Text style={[styles.subtypeCount, { color: colors.mutedForeground }]}>
                        {stEarnings.length}{" "}
                        {stEarnings.length === 1 ? "transaction" : "transactions"}
                      </Text>
                    </View>
                    <Text style={[styles.subtypeAmount, { color: colors.primary }]}>
                      {formatPrice(stTotal)}
                    </Text>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {isShopOverview && filtered.length > 0 && (
            <Text
              style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}
            >
              ALL TRANSACTIONS
            </Text>
          )}

          {filtered.length === 0 && !isShopOverview ? (
            <View style={[styles.center, { paddingTop: 40 }]}>
              <Feather
                name={headerIcon as any}
                size={36}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {emptyText}
              </Text>
            </View>
          ) : (
            filtered.map((earning) => {
              const iconName = TYPE_ICON[earning.type] ?? "dollar-sign";
              const iconColor = TYPE_COLOR[earning.type] ?? colors.primary;
              const isTip = earning.type === "tip";
              const tipperName = isTip ? earning.label.replace(/^Tip from\s*/i, "").trim() : "";
              const tipperInitials = tipperName
                .split(" ")
                .filter(Boolean)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "?";
              const profileId = isTip ? (earning.fromUserId ?? null) : null;

              const rowInner = (
                <>
                  {isTip ? (
                    <View style={styles.avatarCircle}>
                      {earning.fromAvatarUrl ? (
                        <Image
                          source={{ uri: earning.fromAvatarUrl }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <View
                          style={[
                            styles.avatarCircle,
                            { backgroundColor: colors.secondary, margin: 0 },
                          ]}
                        >
                          <Text style={[styles.avatarInitials, { color: iconColor }]}>
                            {tipperInitials}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View
                      style={[styles.iconCircle, { backgroundColor: colors.secondary }]}
                    >
                      <Feather name={iconName as any} size={16} color={iconColor} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={[styles.rowLabel, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {earning.label}
                    </Text>
                    <Text
                      style={[styles.rowSublabel, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {earning.sublabel}
                    </Text>
                    <Text style={[styles.rowDate, { color: colors.mutedForeground }]}>
                      {formatDate(earning.date)}
                    </Text>
                  </View>
                  <Text style={[styles.rowAmount, { color: colors.primary }]}>
                    {formatPrice(earning.amount)}
                  </Text>
                </>
              );

              return profileId ? (
                <Pressable
                  key={earning.id}
                  onPress={() => router.push(`/profile/${profileId}` as any)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  {rowInner}
                </Pressable>
              ) : (
                <View
                  key={earning.id}
                  style={[
                    styles.row,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  {rowInner}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMonthPicker(false)}>
          <Pressable
            style={[
              styles.pickerSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {}}
          >
            <View style={styles.pickerYearRow}>
              <Pressable
                hitSlop={12}
                onPress={() => setPickerYear((y) => y - 1)}
                style={styles.pickerArrow}
              >
                <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              </Pressable>
              <Text style={[styles.pickerYearLabel, { color: colors.foreground }]}>
                {pickerYear}
              </Text>
              <Pressable
                hitSlop={12}
                onPress={() => pickerYear < now.getFullYear() && setPickerYear((y) => y + 1)}
                style={[
                  styles.pickerArrow,
                  pickerYear >= now.getFullYear() && { opacity: 0.25 },
                ]}
                disabled={pickerYear >= now.getFullYear()}
              >
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((name, idx) => {
                const isFuture =
                  pickerYear > now.getFullYear() ||
                  (pickerYear === now.getFullYear() && idx > now.getMonth());
                const isSelected = idx === selectedMonth && pickerYear === selectedYear;
                return (
                  <Pressable
                    key={name}
                    onPress={() => !isFuture && selectPickerMonth(idx)}
                    disabled={isFuture}
                    style={[
                      styles.monthCell,
                      isSelected && {
                        backgroundColor: colors.primary + "33",
                        borderColor: colors.primary,
                        borderWidth: 1,
                      },
                      isFuture && { opacity: 0.25 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthCellText,
                        { color: isSelected ? colors.primary : colors.foreground },
                      ]}
                    >
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 30 },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  monthArrow: { padding: 2 },
  monthArrowDisabled: { opacity: 0.3 },
  monthLabelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 96,
    justifyContent: "center",
  },
  monthLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
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
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  totalBanner: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  totalAmount: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 2 },
  totalMonth: { fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 2 },
  totalLabel: { fontFamily: "Inter_400Regular", fontSize: 13 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
  },
  chartBar: {
    flexDirection: "row",
    height: 24,
    borderRadius: 6,
    overflow: "hidden",
    gap: 2,
  },
  chartSegment: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 4,
  },
  chartSegmentLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#ffffff",
  },
  chartLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "47%",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  legendLabel: { fontFamily: "Inter_500Medium", fontSize: 13, flexShrink: 1 },
  legendPct: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginLeft: "auto" },
  subtypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  subtypeTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  subtypeCount: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  subtypeAmount: { fontFamily: "Inter_700Bold", fontSize: 16, flexShrink: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarInitials: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  rowLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rowSublabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  rowDate: { fontFamily: "Inter_400Regular", fontSize: 11 },
  rowAmount: { fontFamily: "Inter_700Bold", fontSize: 16, flexShrink: 0 },
});
