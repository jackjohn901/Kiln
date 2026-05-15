import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
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
import { apiGet, apiPatch } from "@/lib/api";

interface Profile {
  userId: string;
  handle: string | null;
  displayName: string | null;
  bio: string | null;
  medium: string | null;
  location: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  kilnStatus: string | null;
}

interface Post {
  id: string;
  thumbnailUrl: string | null;
  likeCount: number;
  technique: string | null;
  caption: string;
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  const colors = useColors();
  const display = typeof value === "number"
    ? (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value))
    : value;
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{display}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading: authLoading, login, logout } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [isEditing, setIsEditing] = useState(false);
  const [editHandle, setEditHandle] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editMedium, setEditMedium] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["me/profile"],
    queryFn: () => apiGet<Profile>("/api/me/profile"),
    enabled: isAuthenticated,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["me/posts"],
    queryFn: () => apiGet<{ posts: Post[] }>("/api/me/posts"),
    enabled: isAuthenticated,
  });

  const posts = postsData?.posts ?? [];

  useEffect(() => {
    if (profile) {
      setEditHandle(profile.handle ?? "");
      setEditBio(profile.bio ?? "");
      setEditMedium(profile.medium ?? "");
      setEditDisplayName(profile.displayName ?? "");
    }
  }, [profile]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiPatch("/api/me/profile", {
        handle: editHandle.trim() || null,
        bio: editBio.trim() || null,
        medium: editMedium.trim() || null,
        displayName: editDisplayName.trim() || null,
      });
      await refetchProfile();
      setIsEditing(false);
    } catch {
      Alert.alert("Error", "Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    (profile?.displayName ?? (user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : ""))
    || "Kiln Artist";

  const initials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  if (!isAuthenticated && !authLoading) {
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

  if (authLoading || profileLoading) {
    return (
      <View style={[styles.authWall, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 80) }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerArea, { paddingTop: topPad + 12 }]}>
        <View style={styles.topRow}>
          <Text style={[styles.handle, { color: colors.foreground }]}>
            {profile?.handle ? `@${profile.handle}` : `@${user?.firstName?.toLowerCase() ?? "artist"}`}
          </Text>
          <View style={styles.topActions}>
            <Pressable onPress={() => setIsEditing((v) => !v)} hitSlop={8}>
              <Feather name={isEditing ? "x" : "edit-2"} size={20} color={colors.foreground} />
            </Pressable>
            <Pressable onPress={logout} hitSlop={8}>
              <Feather name="log-out" size={22} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.avatarRow}>
          <View style={[styles.avatarLg, { backgroundColor: colors.primary }]}>
            {profile?.avatarUrl || user?.profileImageUrl ? (
              <Image
                source={{ uri: (profile?.avatarUrl ?? user?.profileImageUrl)! }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            ) : (
              <Text style={[styles.avatarInitials, { color: colors.primaryForeground }]}>
                {initials || "KA"}
              </Text>
            )}
          </View>
          <View style={styles.statsRow}>
            <StatBlock label="Posts" value={profile?.postCount ?? posts.length} />
            <StatBlock label="Followers" value={profile?.followerCount ?? 0} />
            <StatBlock label="Following" value={profile?.followingCount ?? 0} />
          </View>
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Display name</Text>
            <TextInput
              style={[styles.editInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Handle</Text>
            <TextInput
              style={[styles.editInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={editHandle}
              onChangeText={setEditHandle}
              placeholder="your.handle"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
            <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Medium / craft type</Text>
            <TextInput
              style={[styles.editInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={editMedium}
              onChangeText={setEditMedium}
              placeholder="Ceramics, Glasswork, Weaving…"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Bio</Text>
            <TextInput
              style={[styles.editInput, styles.editTextArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell people about your craft…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />
            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Profile</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.displayName, { color: colors.foreground }]}>{displayName}</Text>
            {profile?.bio ? (
              <Text style={[styles.bio, { color: colors.mutedForeground }]}>{profile.bio}</Text>
            ) : (
              <Text style={[styles.bio, { color: colors.mutedForeground }]}>No bio yet — tap the edit icon to add one.</Text>
            )}
            {profile?.medium ? (
              <View style={[styles.mediumTag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="layers" size={13} color={colors.primary} />
                <Text style={[styles.mediumTagText, { color: colors.primary }]}>{profile.medium}</Text>
              </View>
            ) : null}
            {profile?.location ? (
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{profile.location}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      {!isEditing && (
        postsLoading ? (
          <View style={styles.postsLoading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <Feather name="camera-off" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyPostsText, { color: colors.mutedForeground }]}>
              No posts yet — share your first creation
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {posts.map((post) => (
              <Pressable key={post.id} style={styles.gridItem}>
                {post.thumbnailUrl ? (
                  <Image
                    source={{ uri: post.thumbnailUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
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
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authWall: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 },
  bigAvatar: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  authTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  authSub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  authBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  authBtnText: { fontFamily: "Inter_700Bold", fontSize: 16 },
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
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  editForm: { gap: 6, marginTop: 4, marginBottom: 8 },
  editLabel: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  editTextArea: { height: 80, textAlignVertical: "top" },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  postsLoading: { paddingTop: 40, alignItems: "center" },
  emptyPosts: { alignItems: "center", paddingTop: 40, gap: 12, paddingHorizontal: 40 },
  emptyPostsText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
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
});
