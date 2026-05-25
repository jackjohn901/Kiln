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
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api";

interface ListingDetail {
  id: string;
  title: string;
  artistId: string;
  artistName: string | null;
  price: number;
  medium: string | null;
  dimensions: string | null;
  year: number | null;
  imageUrl: string | null;
  isAvailable: boolean;
  editionInfo: string | null;
  description: string | null;
}

function formatPrice(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function ListingDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { isAuthenticated } = useAuth();

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => apiGet<ListingDetail>(`/api/listings/${listingId}`),
    enabled: !!listingId,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !listing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="package" size={36} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Work not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.primary, fontSize: 14 }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.foreground }]} numberOfLines={1}>
          {listing.title}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {listing.imageUrl ? (
          <Image
            source={{ uri: listing.imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.card }]}>
            <Feather name="image" size={48} color={colors.mutedForeground} />
          </View>
        )}

        {!listing.isAvailable && (
          <View style={[styles.soldBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.soldBannerText, { color: colors.mutedForeground }]}>This work has been sold</Text>
          </View>
        )}

        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif" }]}>
            {listing.title}
          </Text>

          {listing.artistName && (
            <Text style={[styles.artist, { color: colors.primary }]}>{listing.artistName}</Text>
          )}

          <Text style={[styles.price, { color: colors.primary }]}>
            {formatPrice(listing.price)}
          </Text>

          <View style={[styles.metaGrid, { borderColor: colors.border }]}>
            {listing.medium && (
              <View style={[styles.metaCell, { borderColor: colors.border }]}>
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Medium</Text>
                <Text style={[styles.metaValue, { color: colors.foreground }]}>{listing.medium}</Text>
              </View>
            )}
            {listing.dimensions && (
              <View style={[styles.metaCell, { borderColor: colors.border }]}>
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Dimensions</Text>
                <Text style={[styles.metaValue, { color: colors.foreground }]}>{listing.dimensions}</Text>
              </View>
            )}
            {listing.year && (
              <View style={[styles.metaCell, { borderColor: colors.border }]}>
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Year</Text>
                <Text style={[styles.metaValue, { color: colors.foreground }]}>{listing.year}</Text>
              </View>
            )}
            {listing.editionInfo && (
              <View style={[styles.metaCell, { borderColor: colors.border }]}>
                <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Edition</Text>
                <Text style={[styles.metaValue, { color: colors.foreground }]}>{listing.editionInfo}</Text>
              </View>
            )}
          </View>

          {listing.description ? (
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{listing.description}</Text>
          ) : null}

          {listing.isAvailable && (
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/shop` as any)}
            >
              <Feather name="shopping-cart" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Add to cart</Text>
            </Pressable>
          )}

          {isAuthenticated && listing.artistId && (
            <Pressable
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => router.push(`/chat/user/${listing.artistId}` as any)}
            >
              <Feather name="message-circle" size={16} color={colors.foreground} />
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Message artist</Text>
            </Pressable>
          )}

          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            All sales are handled directly between collector and artist. Inquiries are typically answered within 2–3 business days.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 15 },
  backBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  content: { gap: 0 },
  image: { width: "100%", aspectRatio: 1 },
  imagePlaceholder: { width: "100%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  soldBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  soldBannerText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  body: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
  artist: { fontFamily: "Inter_500Medium", fontSize: 14 },
  price: { fontFamily: "Inter_700Bold", fontSize: 26 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, overflow: "hidden" },
  metaCell: { width: "50%", padding: 12, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  metaLabel: { fontFamily: "Inter_400Regular", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  metaValue: { fontFamily: "Inter_500Medium", fontSize: 13 },
  description: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 24,
    paddingVertical: 14,
    marginTop: 4,
  },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 13,
  },
  secondaryBtnText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  disclaimer: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 4 },
});
