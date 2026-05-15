import React, { useState } from "react";
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

const MEDIA_TYPES = ["All", "Ceramics", "Glass", "Weaving", "Wood", "Metal", "Pottery", "Fiber"];

const DEMO_ARTISTS = [
  { id: "1", name: "Elena Vasquez", handle: "@elena.clay", medium: "Ceramics", followerCount: 12400, avatarColor: "#D87F31" },
  { id: "2", name: "Marco Chen", handle: "@marcoglass", medium: "Glasswork", followerCount: 8700, avatarColor: "#4A90D9" },
  { id: "3", name: "Zoe Nakamura", handle: "@zoe.weaves", medium: "Weaving", followerCount: 5200, avatarColor: "#7B5C9E" },
  { id: "4", name: "Felix Okafor", handle: "@felixcraft", medium: "Woodwork", followerCount: 19300, avatarColor: "#4CAF50" },
  { id: "5", name: "Aria Patel", handle: "@ariametal", medium: "Metalwork", followerCount: 7100, avatarColor: "#E91E63" },
  { id: "6", name: "Sam Rivera", handle: "@sam.kiln", medium: "Pottery", followerCount: 3400, avatarColor: "#FF5722" },
  { id: "7", name: "Lena Bauer", handle: "@lenafiberart", medium: "Fiber", followerCount: 6800, avatarColor: "#009688" },
  { id: "8", name: "Dev Singh", handle: "@devwoodshop", medium: "Wood", followerCount: 22100, avatarColor: "#795548" },
];

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [following, setFollowing] = useState<Set<string>>(new Set());

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const filtered = DEMO_ARTISTS.filter((a) => {
    const matchQ =
      !query ||
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.medium.toLowerCase().includes(query.toLowerCase());
    const matchF = activeFilter === "All" || a.medium === activeFilter;
    return matchQ && matchF;
  });

  const toggleFollow = (id: string) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatCount = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerArea, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Discover</Text>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Search artists or craft types…"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
        <FlatList
          horizontal
          data={MEDIA_TYPES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const active = item === activeFilter;
            return (
              <Pressable
                onPress={() => setActiveFilter(item)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 80) },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isFollowing = following.has(item.id);
          return (
            <View
              style={[
                styles.artistRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[styles.artistAvatar, { backgroundColor: item.avatarColor }]}
              >
                <Text style={styles.artistAvatarText}>
                  {item.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.artistInfo}>
                <Text style={[styles.artistName, { color: colors.foreground }]}>
                  {item.name}
                </Text>
                <Text style={[styles.artistHandle, { color: colors.mutedForeground }]}>
                  {item.handle}
                </Text>
                <Text style={[styles.artistMedium, { color: colors.primary }]}>
                  {item.medium} · {formatCount(item.followerCount)} followers
                </Text>
              </View>
              <Pressable
                onPress={() => toggleFollow(item.id)}
                style={[
                  styles.followBtn,
                  {
                    backgroundColor: isFollowing ? "transparent" : colors.primary,
                    borderColor: isFollowing ? colors.border : colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.followBtnText,
                    { color: isFollowing ? colors.mutedForeground : colors.primaryForeground },
                  ]}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No artists found
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerArea: { paddingHorizontal: 16, gap: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterList: { paddingBottom: 4, gap: 8 },
  filterChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterChipText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  list: { padding: 16, gap: 10 },
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  artistAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  artistAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#fff",
  },
  artistInfo: { flex: 1 },
  artistName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  artistHandle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },
  artistMedium: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 3 },
  followBtn: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  followBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15 },
});
