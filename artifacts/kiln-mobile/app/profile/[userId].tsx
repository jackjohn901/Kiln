import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";

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
  postCount: number;
  isFollowing: boolean;
}

interface Post {
  id: string;
  thumbnailUrl: string | null;
  likeCount: number;
  technique: string | null;
  caption: string;
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function PublicProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const queryClient = useQueryClient();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => apiGet<Profile>(`/api/users/${userId}/profile`),
    enabled: !!userId,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["userPosts", userId],
    queryFn: () => apiGet<{ posts: Post[] }>(`/api/users/${userId}/posts`),
    enabled: !!userId,
  });

  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  const isFollowing = followOverride ?? profile?.isFollowing ?? false;

  const handleFollow = async () => {
    if (!isAuthenticated || !userId) return;
    const current = isFollowing;
    setFollowOverride(!current);
    try {
      await apiPost(`/api/users/${userId}/follow`);
      await refetchProfile();
      queryClient.invalidateQueries({ queryKey: ["users/search"] });
    } catch {
      setFollowOverride(current);
    }
  };

  const posts = postsData?.posts ?? [];

  if (profileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Profile not found</Text>
        </View>
      </View>
    );
  }

  const displayName = profile.displayName ?? profile.handle ?? "Artist";
  const initials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.topBar, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.foreground }]} numberOfLines={1}>
          {profile.handle ? `@${profile.handle}` : displayName}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.headerArea}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatarLg, { backgroundColor: colors.primary }]}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text style={[styles.avatarInitials, { color: colors.primaryForeground }]}>{initials}</Text>
            )}
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{fmt(profile.postCount)}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Posts</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{fmt(profile.followerCount)}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Followers</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{fmt(profile.followingCount)}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Following</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.displayName, { color: colors.foreground }]}>{displayName}</Text>

        {profile.bio ? (
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>{profile.bio}</Text>
        ) : null}

        <View style={styles.tagRow}>
          {profile.medium ? (
            <View style={[styles.mediumTag, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="layers" size={12} color={colors.primary} />
              <Text style={[styles.mediumTagText, { color: colors.primary }]}>{profile.medium}</Text>
            </View>
          ) : null}
          {profile.location ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{profile.location}</Text>
            </View>
          ) : null}
        </View>

        {isAuthenticated && (
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.followBtn,
                {
                  backgroundColor: isFollowing ? "transparent" : colors.primary,
                  borderColor: isFollowing ? colors.border : colors.primary,
                  flex: 1,
                },
              ]}
              onPress={handleFollow}
            >
              <Text style={[styles.followBtnText, { color: isFollowing ? colors.mutedForeground : colors.primaryForeground }]}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.followBtn,
                {
                  backgroundColor: "transparent",
                  borderColor: colors.border,
                  flex: 1,
                  flexDirection: "row",
                  gap: 6,
                },
              ]}
              onPress={() => router.push(`/chat/user/${userId}` as any)}
            >
              <Feather name="message-circle" size={14} color={colors.mutedForeground} />
              <Text style={[styles.followBtnText, { color: colors.mutedForeground }]}>Message</Text>
            </Pressable>
          </View>
        )}
      </View>

      {postsLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={[styles.center, { paddingTop: 40 }]}>
          <Feather name="camera-off" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts yet</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {posts.map((post) => (
            <Pressable key={post.id} style={styles.gridItem} onPress={() => router.push(`/post/${post.id}` as any)}>
              {post.thumbnailUrl ? (
                <Image source={{ uri: post.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: "#222", alignItems: "center", justifyContent: "center" }]}>
                  <Feather name="image" size={20} color="#555" />
                </View>
              )}
              <View style={styles.gridLikes}>
                <Feather name="heart" size={11} color="#fff" />
                <Text style={styles.gridLikeText}>
                  {post.likeCount > 999 ? `${(post.likeCount / 1000).toFixed(1)}k` : post.likeCount}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, flex: 1, textAlign: "center", marginHorizontal: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15 },
  headerArea: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 24 },
  avatarLg: {
    width: 80, height: 80, borderRadius: 40,
    overflow: "hidden", alignItems: "center", justifyContent: "center",
  },
  avatarInitials: { fontFamily: "Inter_700Bold", fontSize: 28 },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  statBlock: { alignItems: "center", gap: 2 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  bio: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  mediumTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  mediumTagText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  followBtn: {
    borderWidth: 1, borderRadius: 10, paddingVertical: 10,
    alignItems: "center", justifyContent: "center",
  },
  followBtnText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  gridItem: {
    width: "33.33%", aspectRatio: 1,
    backgroundColor: "#111", position: "relative",
  },
  gridLikes: {
    position: "absolute", bottom: 6, left: 6,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  gridLikeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
});
