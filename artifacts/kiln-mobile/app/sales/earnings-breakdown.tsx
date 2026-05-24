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
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
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
  workshop: "#34d399",
};

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

  const params = useLocalSearchParams<{ category?: string; month?: string; year?: string }>();
  const category = (params.category ?? "shop") as Category;
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.shop;

  const monthParam = params.month ? parseInt(params.month, 10) : null;
  const yearParam = params.year ? parseInt(params.year, 10) : null;
  const hasDateFilter = monthParam !== null && yearParam !== null;
  const monthLabel = hasDateFilter
    ? new Date(yearParam!, monthParam! - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const { data, isLoading } = useQuery({
    queryKey: ["me/earnings", monthParam, yearParam],
    queryFn: () => {
      const qs = hasDateFilter ? `?month=${monthParam}&year=${yearParam}` : "";
      return apiGet<EarningsResponse>(`/api/me/earnings${qs}`);
    },
    enabled: isAuthenticated,
  });

  const allEarnings = data?.earnings ?? [];
  const filtered = allEarnings.filter((e) => config.types.includes(e.type));
  const total = filtered.reduce((s, e) => s + e.amount, 0);

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{config.title}</Text>
        <View style={{ width: 30 }} />
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
              name={config.icon as any}
              size={20}
              color={config.iconColor}
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

          {filtered.length === 0 ? (
            <View style={[styles.center, { paddingTop: 40 }]}>
              <Feather
                name={config.icon as any}
                size={36}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {config.emptyText}
              </Text>
            </View>
          ) : (
            filtered.map((earning) => {
              const iconName = TYPE_ICON[earning.type] ?? "dollar-sign";
              const iconColor = TYPE_COLOR[earning.type] ?? colors.primary;
              return (
                <View
                  key={earning.id}
                  style={[
                    styles.row,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[styles.iconCircle, { backgroundColor: colors.secondary }]}
                  >
                    <Feather name={iconName as any} size={16} color={iconColor} />
                  </View>
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
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
  rowLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rowSublabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  rowDate: { fontFamily: "Inter_400Regular", fontSize: 11 },
  rowAmount: { fontFamily: "Inter_700Bold", fontSize: 16, flexShrink: 0 },
});
