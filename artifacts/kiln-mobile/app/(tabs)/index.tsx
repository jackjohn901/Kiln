import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetFeed } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { apiPost } from "@/lib/api";
import { router } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  thumbnailUrl?: string | null;
  caption: string;
  technique?: string | null;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
}

function PostActions({
  post,
  onLike,
  onSave,
  onComment,
}: {
  post: FeedPost;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.actions}>
      <Pressable style={styles.actionBtn} onPress={onLike} hitSlop={8}>
        <Feather name="heart" size={26} color={post.isLiked ? "#E05D5D" : "#fff"} />
        <Text style={[styles.actionCount, { color: "#fff" }]}>
          {post.likeCount > 999 ? `${Math.floor(post.likeCount / 1000)}k` : post.likeCount}
        </Text>
      </Pressable>
      <Pressable style={styles.actionBtn} onPress={onComment} hitSlop={8}>
        <Feather name="message-circle" size={26} color="#fff" />
        <Text style={[styles.actionCount, { color: "#fff" }]}>{post.commentCount}</Text>
      </Pressable>
      <Pressable style={styles.actionBtn} onPress={onSave} hitSlop={8}>
        <Feather name="bookmark" size={26} color={post.isSaved ? colors.primary : "#fff"} />
        <Text style={[styles.actionCount, { color: "#fff" }]}>{post.saveCount}</Text>
      </Pressable>
    </View>
  );
}

function PostItem({ item, index }: { item: FeedPost; index: number }) {
  const colors = useColors();
  const [liked, setLiked] = useState(item.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [saved, setSaved] = useState(item.isSaved ?? false);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikeCount((c) => (nowLiked ? c + 1 : c - 1));
    apiPost(`/api/posts/${item.id}/like`).catch(() => {
      setLiked(!nowLiked);
      setLikeCount((c) => (nowLiked ? c - 1 : c + 1));
    });
  }, [liked, item.id]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowSaved = !saved;
    setSaved(nowSaved);
    apiPost(`/api/posts/${item.id}/save`).catch(() => {
      setSaved(!nowSaved);
    });
  }, [saved, item.id]);

  return (
    <View style={[styles.postContainer, { width: SCREEN_WIDTH }]}>
      {item.thumbnailUrl ? (
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View style={[styles.thumbnail, { backgroundColor: "#222" }]} />
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.gradient}
        locations={[0.4, 1]}
      />
      <View style={styles.postMeta}>
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {item.authorAvatarUrl ? (
              <Image
                source={{ uri: item.authorAvatarUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.avatarText}>
                {item.authorName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.authorName}>{item.authorName}</Text>
          {item.technique ? (
            <View style={[styles.tag, { borderColor: colors.primary }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{item.technique}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
      </View>
      <PostActions
        post={{ ...item, isLiked: liked, likeCount, isSaved: saved }}
        onLike={handleLike}
        onSave={handleSave}
        onComment={() => {}}
      />
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const flatRef = useRef<FlatList>(null);

  const { data, isLoading } = useGetFeed(
    { limit: 20 },
    { query: { enabled: true } as any }
  );

  const posts: FeedPost[] = data?.posts ?? [];

  const renderItem = useCallback(
    ({ item, index }: { item: FeedPost; index: number }) => (
      <PostItem item={item} index={index} />
    ),
    []
  );

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: "#0a0a0a" }]}>
      <View style={[styles.header, { top: topPad || insets.top }]}>
        <Text style={[styles.headerLogo, { color: colors.primary }]}>kiln</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push("/chat/inbox" as any)} hitSlop={8}>
            <Feather name="send" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="video-off" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySub}>Be the first — share your craft.</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          pagingEnabled
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPad }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerLogo: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.5,
  },
  headerRight: { flexDirection: "row", gap: 18 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "rgba(255,255,255,0.7)",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  postContainer: {
    height: SCREEN_HEIGHT,
    position: "relative",
    backgroundColor: "#111",
  },
  thumbnail: { ...StyleSheet.absoluteFillObject },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
  },
  postMeta: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 80,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#191615" },
  authorName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  tag: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  caption: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },
  actions: {
    position: "absolute",
    right: 16,
    bottom: 110,
    alignItems: "center",
    gap: 20,
  },
  actionBtn: { alignItems: "center", gap: 4 },
  actionCount: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
