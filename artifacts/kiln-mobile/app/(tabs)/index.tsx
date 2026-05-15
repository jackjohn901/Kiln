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
  ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetFeed } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { router } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CRAFTS = ["Ceramics", "Glasswork", "Weaving", "Woodwork", "Metalwork", "Pottery"];
const PLACEHOLDER_THUMBS = [
  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600",
  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600",
  "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600",
  "https://images.unsplash.com/photo-1464790719320-516ecd75af6c?w=600",
];

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
      <Pressable
        style={styles.actionBtn}
        onPress={onLike}
        hitSlop={8}
      >
        <Feather
          name="heart"
          size={26}
          color={post.isLiked ? colors.primary : "#fff"}
        />
        <Text style={[styles.actionCount, { color: "#fff" }]}>
          {post.likeCount > 999 ? `${Math.floor(post.likeCount / 1000)}k` : post.likeCount}
        </Text>
      </Pressable>
      <Pressable style={styles.actionBtn} onPress={onComment} hitSlop={8}>
        <Feather name="message-circle" size={26} color="#fff" />
        <Text style={[styles.actionCount, { color: "#fff" }]}>{post.commentCount}</Text>
      </Pressable>
      <Pressable style={styles.actionBtn} onPress={onSave} hitSlop={8}>
        <Feather
          name="bookmark"
          size={26}
          color={post.isSaved ? colors.primary : "#fff"}
        />
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
  const thumb = item.thumbnailUrl ?? PLACEHOLDER_THUMBS[index % PLACEHOLDER_THUMBS.length];

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  }, [liked]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaved((v) => !v);
  }, []);

  return (
    <View style={[styles.postContainer, { width: SCREEN_WIDTH }]}>
      <Image
        source={{ uri: thumb }}
        style={styles.thumbnail}
        contentFit="cover"
        transition={300}
      />
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
              <Text style={[styles.tagText, { color: colors.primary }]}>
                {item.technique}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.caption} numberOfLines={3}>
          {item.caption}
        </Text>
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

const DEMO_POSTS: FeedPost[] = CRAFTS.map((craft, i) => ({
  id: `demo-${i}`,
  authorId: `artist-${i}`,
  authorName: ["Elena Vasquez", "Marco Chen", "Zoe Nakamura", "Felix Okafor", "Aria Patel", "Sam Rivera"][i],
  thumbnailUrl: PLACEHOLDER_THUMBS[i % PLACEHOLDER_THUMBS.length],
  caption: [
    "Just finished this piece after 3 weeks at the wheel. The glaze oxidation turned out even better than expected.",
    "New glass panel commission complete. Natural light changes everything about this piece.",
    "Warp and weft — finally nailed the twill variation I've been experimenting with.",
    "Off the lathe after 8 hours. Cherry burl never disappoints.",
    "Forged and finished. This Damascus blade took 400 folds to get right.",
    "High-fire reduction kiln results just came out. Worth every minute of the wait.",
  ][i],
  technique: craft,
  likeCount: Math.floor(Math.random() * 2000) + 100,
  commentCount: Math.floor(Math.random() * 200) + 5,
  saveCount: Math.floor(Math.random() * 500) + 20,
}));

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const flatRef = useRef<FlatList>(null);

  const { data, isLoading } = useGetFeed(
    { limit: 20 },
    { query: { enabled: isAuthenticated } as any }
  );

  const posts: FeedPost[] =
    data?.posts && data.posts.length > 0 ? data.posts : DEMO_POSTS;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 });

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
          <Pressable
            onPress={() => router.push("/chat/inbox" as any)}
            hitSlop={8}
          >
            <Feather name="send" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
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
          viewabilityConfig={viewabilityConfig.current}
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  postContainer: {
    height: SCREEN_HEIGHT,
    position: "relative",
    backgroundColor: "#111",
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
  },
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
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#191615",
  },
  authorName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  tag: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
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
  actionBtn: {
    alignItems: "center",
    gap: 4,
  },
  actionCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
});
