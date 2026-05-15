import React, { useState } from "react";
import {
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { router } from "expo-router";

const DEMO_POSTS = [
  { id: "1", thumb: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=300", likes: 342 },
  { id: "2", thumb: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300", likes: 891 },
  { id: "3", thumb: "https://images.unsplash.com/photo-1464790719320-516ecd75af6c?w=300", likes: 217 },
  { id: "4", thumb: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=300", likes: 1204 },
  { id: "5", thumb: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300", likes: 456 },
  { id: "6", thumb: "https://images.unsplash.com/photo-1464790719320-516ecd75af6c?w=300", likes: 678 },
];

function StatBlock({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const displayName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Kiln Artist" : "";
  const initials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  if (!isAuthenticated && !isLoading) {
    return (
      <View style={[styles.authWall, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={[styles.bigAvatar, { backgroundColor: colors.secondary }]}>
          <Feather name="user" size={40} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Your profile</Text>
        <Text style={[styles.authSub, { color: colors.mutedForeground }]}>
          Sign in to share your craft journey and connect with artists
        </Text>
        <Pressable style={[styles.authBtn, { backgroundColor: colors.primary }]} onPress={login}>
          <Text style={[styles.authBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 80) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.headerArea, { paddingTop: topPad + 12 }]}>
        <View style={styles.topRow}>
          <Text style={[styles.handle, { color: colors.foreground }]}>@{user?.firstName?.toLowerCase() ?? "kiln_artist"}</Text>
          <View style={styles.topActions}>
            <Pressable hitSlop={8}>
              <Feather name="send" size={22} color={colors.foreground} />
            </Pressable>
            <Pressable onPress={logout} hitSlop={8}>
              <Feather name="log-out" size={22} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        {/* Avatar + stats */}
        <View style={styles.avatarRow}>
          <View style={[styles.avatarLg, { backgroundColor: colors.primary }]}>
            {user?.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text style={[styles.avatarInitials, { color: colors.primaryForeground }]}>{initials || "KA"}</Text>
            )}
          </View>
          <View style={styles.statsRow}>
            <StatBlock label="Posts" value="24" />
            <StatBlock label="Followers" value="1.2k" />
            <StatBlock label="Following" value="186" />
          </View>
        </View>

        {/* Bio */}
        <Text style={[styles.displayName, { color: colors.foreground }]}>{displayName || "Kiln Artist"}</Text>
        <Text style={[styles.bio, { color: colors.mutedForeground }]}>
          Craft artist · Ceramics & stoneware{"\n"}Studio in Portland, OR
        </Text>
        <View style={[styles.mediumTag, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="layers" size={13} color={colors.primary} />
          <Text style={[styles.mediumTagText, { color: colors.primary }]}>Ceramics</Text>
        </View>

        {/* Edit profile */}
        <Pressable style={[styles.editBtn, { borderColor: colors.border }]}>
          <Text style={[styles.editBtnText, { color: colors.foreground }]}>Edit Profile</Text>
        </Pressable>
      </View>

      {/* Posts grid */}
      <View style={styles.grid}>
        {DEMO_POSTS.map((post) => (
          <Pressable key={post.id} style={styles.gridItem}>
            <Image
              source={{ uri: post.thumb }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <View style={styles.gridLikes}>
              <Feather name="heart" size={11} color="#fff" />
              <Text style={styles.gridLikeText}>
                {post.likes > 999 ? `${(post.likes / 1000).toFixed(1)}k` : post.likes}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const GRID_SIZE = StyleSheet.flatten({ width: "100%" }).width;

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerArea: { paddingHorizontal: 20, gap: 10 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  handle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  topActions: { flexDirection: "row", gap: 20 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 24, marginTop: 6 },
  avatarLg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontFamily: "Inter_700Bold", fontSize: 28 },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  statBlock: { alignItems: "center", gap: 2 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 16, marginTop: 2 },
  bio: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  mediumTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mediumTagText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  editBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 2,
    marginBottom: 10,
  },
  editBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem: {
    width: "33.33%",
    aspectRatio: 1,
    backgroundColor: "#111",
    position: "relative",
  },
  gridLikes: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  gridLikeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  authWall: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 },
  bigAvatar: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  authTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  authSub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  authBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  authBtnText: { fontFamily: "Inter_700Bold", fontSize: 16 },
});
