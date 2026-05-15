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
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";

const MEDIA_TYPES = ["All", "Ceramics", "Glass", "Weaving", "Wood", "Metal", "Pottery", "Fiber"];

interface Profile {
  userId: string;
  handle: string | null;
  displayName: string | null;
  bio: string | null;
  medium: string | null;
  location: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const AVATAR_COLORS = ["#D87F31", "#4A90D9", "#7B5C9E", "#4CAF50", "#E91E63", "#FF5722", "#009688", "#795548"];

function avatarColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [followingOverride, setFollowingOverride] = useState<Record<string, boolean>>({});

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["users/search", debouncedQuery, activeFilter],
    queryFn: () =>
      apiGet<{ profiles: Profile[] }>(
        `/api/users/search?q=${encodeURIComponent(debouncedQuery)}&medium=${encodeURIComponent(activeFilter === "All" ? "" : activeFilter)}&limit=30`
      ),
    staleTime: 30_000,
  });

  const profiles = data?.profiles ?? [];

  const handleFollow = async (userId: string) => {
    if (!isAuthenticated) return;
    const currentlyFollowing = followingOverride[userId] ?? profiles.find((p) => p.userId === userId)?.isFollowing ?? false;
    setFollowingOverride((prev) => ({ ...prev, [userId]: !currentlyFollowing }));
    try {
      await apiPost(`/api/users/${userId}/follow`);
    } catch {
      setFollowingOverride((prev) => ({ ...prev, [userId]: currentlyFollowing }));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerArea, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Discover</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Search artists or craft types…"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
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
                <Text style={[styles.filterChipText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 80) },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isFollowing = followingOverride[item.userId] ?? item.isFollowing;
            const color = avatarColor(item.userId);
            return (
              <View style={[styles.artistRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.artistAvatar, { backgroundColor: color }]}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Text style={styles.artistAvatarText}>
                      {(item.displayName ?? item.handle ?? "A").charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.artistInfo}>
                  <Text style={[styles.artistName, { color: colors.foreground }]}>
                    {item.displayName ?? item.handle ?? "Artist"}
                  </Text>
                  {item.handle ? (
                    <Text style={[styles.artistHandle, { color: colors.mutedForeground }]}>@{item.handle}</Text>
                  ) : null}
                  <Text style={[styles.artistMedium, { color: colors.primary }]}>
                    {item.medium ?? "Craft"} · {formatCount(item.followerCount)} followers
                  </Text>
                </View>
                {isAuthenticated && (
                  <Pressable
                    onPress={() => handleFollow(item.userId)}
                    style={[
                      styles.followBtn,
                      {
                        backgroundColor: isFollowing ? "transparent" : colors.primary,
                        borderColor: isFollowing ? colors.border : colors.primary,
                      },
                    ]}
                  >
                    <Text style={[styles.followBtnText, { color: isFollowing ? colors.mutedForeground : colors.primaryForeground }]}>
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="search" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No artists found</Text>
            </View>
          }
        />
      )}
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
  filterChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  filterChipText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  artistAvatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  artistInfo: { flex: 1 },
  artistName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  artistHandle: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },
  artistMedium: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 3 },
  followBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  followBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15 },
});
