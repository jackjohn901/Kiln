import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";

interface Auction {
  id: string;
  title: string;
  artistId: string;
  artistName: string | null;
  description: string | null;
  imageUrl: string | null;
  startingBid: number;
  currentBid: number | null;
  reservePrice: number | null;
  bidCount: number;
  endsAt: string | null;
  status: "live" | "upcoming" | "ended";
  medium: string | null;
  dimensions: string | null;
}

function formatPrice(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US");
}

function timeLeft(endsAt: string | null): string {
  if (!endsAt) return "";
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export default function AuctionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"live" | "all" | "ended">("live");
  const [bidAmount, setBidAmount] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ auctions: Auction[] }>("/api/auctions")
      .then((d) => setAuctions(d.auctions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = auctions.filter((a) =>
    tab === "all" ? true : tab === "live" ? a.status === "live" : a.status === "ended"
  );

  async function placeBid(auction: Auction) {
    if (!isAuthenticated) { Alert.alert("Sign in to place a bid"); return; }
    const amtStr = bidAmount[auction.id];
    const amtDollars = parseFloat(amtStr ?? "");
    if (isNaN(amtDollars) || amtDollars <= 0) { Alert.alert("Enter a valid bid amount"); return; }
    const amtCents = Math.round(amtDollars * 100);
    const minBid = (auction.currentBid ?? auction.startingBid) + 100;
    if (amtCents < minBid) { Alert.alert(`Minimum bid is ${formatPrice(minBid)}`); return; }
    setPlacing(auction.id);
    try {
      await apiPost(`/api/auctions/${auction.id}/bids`, { amount: amtCents });
      setAuctions((prev) => prev.map((a) => a.id === auction.id ? { ...a, currentBid: amtCents, bidCount: a.bidCount + 1 } : a));
      setBidAmount((prev) => ({ ...prev, [auction.id]: "" }));
    } catch (e: any) {
      Alert.alert("Bid failed", e?.message ?? "Please try again");
    }
    setPlacing(null);
  }

  const TABS: { key: "live" | "all" | "ended"; label: string }[] = [
    { key: "live", label: "Live" },
    { key: "all", label: "All" },
    { key: "ended", label: "Ended" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Auctions</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Bid on one-of-a-kind works</Text>
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, { color: tab === t.key ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="tag" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No auctions</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, gap: 16 }}
          renderItem={({ item }) => {
            const minNext = (item.currentBid ?? item.startingBid) + 100;
            const reserveMet = item.reservePrice == null || (item.currentBid ?? 0) >= item.reservePrice;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.coverImage} contentFit="cover" />
                ) : (
                  <View style={[styles.coverPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="image" size={28} color={colors.mutedForeground} />
                  </View>
                )}
                {item.status === "live" && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={[styles.auctionTitle, { color: colors.foreground }]}>{item.title}</Text>
                  <Text style={[styles.artistName, { color: colors.mutedForeground }]}>by {item.artistName}</Text>
                  {item.dimensions && <Text style={[styles.dimensions, { color: colors.mutedForeground }]}>{item.dimensions}</Text>}
                  <View style={styles.bidRow}>
                    <View>
                      <Text style={[styles.bidLabel, { color: colors.mutedForeground }]}>CURRENT BID</Text>
                      <Text style={[styles.bidAmount, { color: colors.foreground }]}>
                        {formatPrice(item.currentBid ?? item.startingBid)}
                      </Text>
                      <Text style={[styles.bidMeta, { color: colors.mutedForeground }]}>
                        {item.bidCount} bid{item.bidCount !== 1 ? "s" : ""} · {!reserveMet ? "Reserve not met" : "Reserve met"}
                      </Text>
                    </View>
                    {item.endsAt && (
                      <View style={styles.timeLeft}>
                        <Feather name="clock" size={12} color={colors.primary} />
                        <Text style={[styles.timeLeftText, { color: colors.primary }]}>{timeLeft(item.endsAt)}</Text>
                      </View>
                    )}
                  </View>
                  {item.status === "live" && isAuthenticated && (
                    <View style={styles.bidInput}>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                        placeholder={`Min $${((minNext) / 100).toFixed(0)}`}
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="decimal-pad"
                        value={bidAmount[item.id] ?? ""}
                        onChangeText={(v) => setBidAmount((prev) => ({ ...prev, [item.id]: v }))}
                      />
                      <Pressable
                        style={[styles.bidBtn, { backgroundColor: colors.primary, opacity: placing === item.id ? 0.7 : 1 }]}
                        onPress={() => placeBid(item)}
                        disabled={placing === item.id}
                      >
                        <Text style={styles.bidBtnText}>Place Bid</Text>
                      </Pressable>
                    </View>
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
  coverImage: { width: "100%", height: 220 },
  coverPlaceholder: { width: "100%", height: 160, alignItems: "center", justifyContent: "center" },
  liveBadge: { position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e05d5d" },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  cardBody: { padding: 16 },
  auctionTitle: { fontSize: 17, fontWeight: "700" },
  artistName: { fontSize: 12, marginTop: 2 },
  dimensions: { fontSize: 11, marginTop: 2 },
  bidRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 },
  bidLabel: { fontSize: 9, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  bidAmount: { fontSize: 24, fontWeight: "700", marginTop: 2 },
  bidMeta: { fontSize: 11, marginTop: 2 },
  timeLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  timeLeftText: { fontSize: 13, fontWeight: "600" },
  bidInput: { flexDirection: "row", gap: 10, marginTop: 14 },
  input: { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  bidBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  bidBtnText: { color: "#1a1a1a", fontWeight: "700", fontSize: 14 },
});
