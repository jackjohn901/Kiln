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
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";
import { router } from "expo-router";

interface Listing {
  id: string;
  title: string;
  artistId: string;
  artistName: string | null;
  price: number;
  medium: string | null;
  imageUrl: string | null;
  sold: boolean;
  editionInfo: string | null;
}

const MEDIA = ["All", "Ceramics", "Glass", "Metal", "Wood", "Fiber", "Pottery"];

function formatPrice(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [medium, setMedium] = useState("All");
  const [wishlisted, setWishlisted] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiGet<{ listings: Listing[] }>("/api/shop/listings")
      .then((d) => setListings(d.listings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = medium === "All"
    ? listings
    : listings.filter((l) => l.medium?.toLowerCase().includes(medium.toLowerCase()));

  async function toggleWishlist(id: string) {
    const next = new Set(wishlisted);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      await apiPost(`/api/shop/listings/${id}/wishlist`, {}).catch(() => {});
    }
    setWishlisted(next);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Shop</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Original works from artists</Text>
      </View>

      <View style={styles.filterRow}>
        <FlatList
          data={MEDIA}
          keyExtractor={(i) => i}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setMedium(item)}
              style={[
                styles.chip,
                {
                  backgroundColor: medium === item ? colors.primary : colors.card,
                  borderColor: medium === item ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: medium === item ? "#1a1a1a" : colors.foreground }]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="package" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No listings found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 80 }}
          columnWrapperStyle={{ gap: 10 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
              onPress={() => router.push(`/listing/${item.id}` as any)}
            >
              <View style={styles.imageWrap}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="image" size={24} color={colors.mutedForeground} />
                  </View>
                )}
                {item.sold && (
                  <View style={styles.soldBadge}>
                    <Text style={styles.soldText}>Sold</Text>
                  </View>
                )}
                <Pressable
                  style={styles.wishlistBtn}
                  onPress={() => toggleWishlist(item.id)}
                  hitSlop={8}
                >
                  <Feather
                    name="heart"
                    size={16}
                    color={wishlisted.has(item.id) ? "#e05d5d" : "#fff"}
                  />
                </Pressable>
              </View>
              <View style={styles.info}>
                <Text style={[styles.listingTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.artistName, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.artistName}
                </Text>
                <Text style={[styles.price, { color: colors.primary }]}>
                  {formatPrice(item.price)}
                </Text>
                {item.editionInfo && (
                  <Text style={[styles.edition, { color: colors.mutedForeground }]}>{item.editionInfo}</Text>
                )}
              </View>
            </Pressable>
          )}
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
  filterRow: { paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 14 },
  card: { borderRadius: 12, overflow: "hidden", borderWidth: 1 },
  imageWrap: { position: "relative" },
  image: { width: "100%", aspectRatio: 1 },
  imagePlaceholder: { width: "100%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  soldBadge: { position: "absolute", top: 8, left: 8, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  soldText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  wishlistBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16, padding: 5 },
  info: { padding: 10 },
  listingTitle: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  artistName: { fontSize: 11, marginTop: 2 },
  price: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  edition: { fontSize: 10, marginTop: 2 },
});
