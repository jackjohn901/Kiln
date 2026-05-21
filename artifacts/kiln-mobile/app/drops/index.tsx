import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";

interface Drop {
  id: string;
  title: string;
  artistId: string;
  artistName: string | null;
  description: string | null;
  price: number;
  quantity: number;
  quantityRemaining: number;
  imageUrl: string | null;
  status: "upcoming" | "live" | "sold_out" | "ended";
  startsAt: string | null;
  endsAt: string | null;
  isPatronOnly: boolean;
  isOnWaitlist: boolean;
}

function formatPrice(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US");
}

function dropTime(drop: Drop): string {
  if (drop.status === "upcoming" && drop.startsAt) {
    const diff = new Date(drop.startsAt).getTime() - Date.now();
    if (diff > 0) {
      const h = Math.floor(diff / 3600000);
      const d = Math.floor(h / 24);
      if (d > 0) return `Drops in ${d}d ${h % 24}h`;
      return `Drops in ${h}h`;
    }
  }
  if (drop.status === "live" && drop.endsAt) {
    const diff = new Date(drop.endsAt).getTime() - Date.now();
    if (diff > 0) {
      const h = Math.floor(diff / 3600000);
      if (h > 24) return `${Math.floor(h / 24)}d left`;
      return `${h}h left`;
    }
  }
  return "";
}

const STATUS_LABEL: Record<string, string> = {
  live: "Live",
  upcoming: "Upcoming",
  sold_out: "Sold out",
  ended: "Ended",
};

const STATUS_COLOR: Record<string, string> = {
  live: "#e05d5d",
  upcoming: "#D87F31",
  sold_out: "#666",
  ended: "#666",
};

const TABS = ["all", "live", "upcoming", "sold"] as const;
type Tab = typeof TABS[number];

export default function DropsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ drops: Drop[] }>("/api/drops")
      .then((d) => setDrops(d.drops ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = drops.filter((d) => {
    if (tab === "all") return true;
    if (tab === "sold") return d.status === "sold_out" || d.status === "ended";
    return d.status === tab;
  });

  async function handleAction(drop: Drop) {
    if (!isAuthenticated) { Alert.alert("Sign in to continue"); return; }
    setActionId(drop.id);
    try {
      if (drop.status === "live") {
        await apiPost(`/api/shop/listings/${drop.id}/buy`, {});
        Alert.alert("Purchase successful!");
      } else if (drop.status === "upcoming") {
        await apiPost(`/api/drops/${drop.id}/waitlist`, {});
        setDrops((prev) => prev.map((d) => d.id === drop.id ? { ...d, isOnWaitlist: true } : d));
      }
    } catch (e: any) {
      Alert.alert("Action failed", e?.message ?? "Please try again");
    }
    setActionId(null);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Drops</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Limited-edition timed releases</Text>
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="zap" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No drops here</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, gap: 16 }}
          renderItem={({ item }) => {
            const isSoldOrEnded = item.status === "sold_out" || item.status === "ended";
            const time = dropTime(item);
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.coverImage} contentFit="cover" />
                ) : (
                  <View style={[styles.coverPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="zap" size={28} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + "22", borderColor: STATUS_COLOR[item.status] + "44" }]}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] }]} />
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>{STATUS_LABEL[item.status]}</Text>
                  </View>
                  {item.isPatronOnly && (
                    <View style={[styles.patronBadge, { backgroundColor: colors.primary + "22" }]}>
                      <Text style={[styles.patronText, { color: colors.primary }]}>Patron early access</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.dropTitle, { color: colors.foreground }]}>{item.title}</Text>
                  <Text style={[styles.artistName, { color: colors.mutedForeground }]}>by {item.artistName}</Text>
                  {item.description && (
                    <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>{item.description}</Text>
                  )}
                  <View style={styles.metaRow}>
                    <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(item.price)}</Text>
                    <Text style={[styles.qty, { color: colors.mutedForeground }]}>
                      {item.quantityRemaining} / {item.quantity} remaining
                    </Text>
                  </View>
                  {time && (
                    <View style={styles.timeRow}>
                      <Feather name="clock" size={12} color={colors.primary} />
                      <Text style={[styles.timeText, { color: colors.primary }]}>{time}</Text>
                    </View>
                  )}
                  {!isSoldOrEnded && (
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.primary, opacity: actionId === item.id ? 0.7 : 1 }]}
                      onPress={() => handleAction(item)}
                      disabled={actionId === item.id}
                    >
                      <Text style={styles.actionBtnText}>
                        {item.status === "live" ? "Buy Now" : item.isOnWaitlist ? "On Waitlist" : "Join Waitlist"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Georgia" : "serif" },
  subtitle: { fontSize: 12, marginTop: 2 },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10 },
  tabText: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 14 },
  card: { borderRadius: 14, overflow: "hidden", borderWidth: 1 },
  coverImage: { width: "100%", height: 200 },
  coverPlaceholder: { width: "100%", height: 140, alignItems: "center", justifyContent: "center" },
  statusRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 10 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  patronBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  patronText: { fontSize: 10, fontWeight: "600" },
  cardBody: { padding: 14, gap: 4 },
  dropTitle: { fontSize: 17, fontWeight: "700" },
  artistName: { fontSize: 12 },
  description: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  price: { fontSize: 20, fontWeight: "700" },
  qty: { fontSize: 12 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  timeText: { fontSize: 13, fontWeight: "600" },
  actionBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  actionBtnText: { color: "#1a1a1a", fontWeight: "700", fontSize: 15 },
});
