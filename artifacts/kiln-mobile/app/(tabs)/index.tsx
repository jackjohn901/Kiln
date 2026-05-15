import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useGetFeed } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost, relativeTime } from "@/lib/api";
import { useWebSocket } from "@/lib/useWebSocket";
import { router } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  caption: string;
  technique?: string | null;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  createdAt: string;
}

function CommentsSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => apiGet<{ comments: Comment[] }>(`/api/posts/${postId}/comments`),
  });

  const comments = data?.comments ?? [];

  const submit = async () => {
    if (!draft.trim() || submitting) return;
    const text = draft.trim();
    setDraft("");
    setSubmitting(true);
    try {
      await apiPost(`/api/posts/${postId}/comments`, { text });
      refetch();
    } catch {
      setDraft(text);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.sheet, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
      <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
          Comments {comments.length > 0 ? `(${comments.length})` : ""}
        </Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.sheetCenter}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.commentList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <View style={[styles.commentAvatar, { backgroundColor: colors.primary }]}>
                {item.authorAvatarUrl ? (
                  <Image source={{ uri: item.authorAvatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Text style={[styles.commentAvatarText, { color: colors.primaryForeground }]}>
                    {item.authorName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.commentBody}>
                <View style={styles.commentMeta}>
                  <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{item.authorName}</Text>
                  <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>{relativeTime(item.createdAt)}</Text>
                </View>
                <Text style={[styles.commentText, { color: colors.foreground }]}>{item.text}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.sheetCenter}>
              <Feather name="message-circle" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyComments, { color: colors.mutedForeground }]}>No comments yet — be first</Text>
            </View>
          }
        />
      )}

      {isAuthenticated ? (
        <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={[styles.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="Add a comment…"
            placeholderTextColor={colors.mutedForeground}
            value={draft}
            onChangeText={setDraft}
            returnKeyType="send"
            onSubmitEditing={submit}
          />
          <Pressable
            onPress={submit}
            style={[styles.composerBtn, { backgroundColor: draft.trim() ? colors.primary : colors.secondary }]}
          >
            {submitting
              ? <ActivityIndicator size="small" color={colors.primaryForeground} />
              : <Feather name="send" size={16} color={draft.trim() ? colors.primaryForeground : colors.mutedForeground} />
            }
          </Pressable>
        </View>
      ) : (
        <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8, justifyContent: "center" }]}>
          <Text style={[styles.signInPrompt, { color: colors.mutedForeground }]}>Sign in to comment</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function PostActions({ post, onLike, onSave, onComment }: {
  post: FeedPost & { isLiked: boolean; isSaved: boolean };
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
}) {
  return (
    <View style={styles.actions}>
      <Pressable style={styles.actionBtn} onPress={onLike} hitSlop={8}>
        <Feather name="heart" size={26} color={post.isLiked ? "#E05D5D" : "#fff"} />
        <Text style={styles.actionCount}>
          {post.likeCount > 999 ? `${Math.floor(post.likeCount / 1000)}k` : post.likeCount}
        </Text>
      </Pressable>
      <Pressable style={styles.actionBtn} onPress={onComment} hitSlop={8}>
        <Feather name="message-circle" size={26} color="#fff" />
        <Text style={styles.actionCount}>{post.commentCount}</Text>
      </Pressable>
      <Pressable style={styles.actionBtn} onPress={onSave} hitSlop={8}>
        <Feather name="bookmark" size={26} color={post.isSaved ? "#D87F31" : "#fff"} />
        <Text style={styles.actionCount}>{post.saveCount}</Text>
      </Pressable>
    </View>
  );
}

function PostItem({ item, isActive, onComment }: {
  item: FeedPost;
  isActive: boolean;
  onComment: () => void;
}) {
  const colors = useColors();
  const videoRef = useRef<Video>(null);
  const [liked, setLiked] = useState(item.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [saved, setSaved] = useState(item.isSaved ?? false);

  React.useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isActive]);

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
    apiPost(`/api/posts/${item.id}/save`).catch(() => setSaved(!nowSaved));
  }, [saved, item.id]);

  return (
    <View style={[styles.postContainer, { width: SCREEN_WIDTH }]}>
      {item.videoUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: item.videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping
          isMuted={false}
        />
      ) : item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" transition={300} />
      ) : (
        <View style={[styles.thumbnail, { backgroundColor: "#222" }]} />
      )}

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.gradient}
        locations={[0.4, 1]}
      />

      <View style={styles.postMeta}>
        <Pressable
          style={styles.authorRow}
          onPress={() => router.push(`/profile/${item.authorId}` as any)}
          hitSlop={4}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {item.authorAvatarUrl ? (
              <Image source={{ uri: item.authorAvatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{item.authorName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.authorName}>{item.authorName}</Text>
          {item.technique ? (
            <View style={[styles.tag, { borderColor: colors.primary }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{item.technique}</Text>
            </View>
          ) : null}
        </Pressable>
        <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
      </View>

      <PostActions
        post={{ ...item, isLiked: liked, likeCount, isSaved: saved }}
        onLike={handleLike}
        onSave={handleSave}
        onComment={onComment}
      />

      {item.videoUrl && (
        <View style={styles.videoIndicator}>
          <Feather name="play-circle" size={14} color="rgba(255,255,255,0.7)" />
        </View>
      )}
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const flatRef = useRef<FlatList>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useWebSocket();

  const { data, isLoading } = useGetFeed(
    { limit: 20 },
    { query: { enabled: true } as any }
  );

  const posts: FeedPost[] = data?.posts ?? [];

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FeedPost; index: number }) => (
      <PostItem
        item={item}
        isActive={index === activeIndex}
        onComment={() => setCommentPostId(item.id)}
      />
    ),
    [activeIndex]
  );

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: "#0a0a0a" }]}>
      <View style={[styles.header, { top: topPad || insets.top }]}>
        <Text style={[styles.headerLogo, { color: colors.primary }]}>kiln</Text>
        <Pressable onPress={() => router.push("/chat/inbox" as any)} hitSlop={8}>
          <Feather name="send" size={22} color="#fff" />
        </Pressable>
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
          viewabilityConfig={viewabilityConfig.current}
          onViewableItemsChanged={onViewableItemsChanged}
          contentContainerStyle={{ paddingBottom: bottomPad }}
        />
      )}

      <Modal
        visible={commentPostId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentPostId(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCommentPostId(null)} />
        {commentPostId ? (
          <CommentsSheet postId={commentPostId} onClose={() => setCommentPostId(null)} />
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: "absolute", left: 0, right: 0, zIndex: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 10,
  },
  headerLogo: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: "rgba(255,255,255,0.7)" },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 15, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  postContainer: { height: SCREEN_HEIGHT, position: "relative", backgroundColor: "#111" },
  thumbnail: { ...StyleSheet.absoluteFillObject },
  gradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.55 },
  postMeta: { position: "absolute", bottom: 100, left: 16, right: 80 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#191615" },
  authorName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  tag: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  caption: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 20 },
  actions: { position: "absolute", right: 16, bottom: 110, alignItems: "center", gap: 20 },
  actionBtn: { alignItems: "center", gap: 4 },
  actionCount: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  videoIndicator: {
    position: "absolute", top: 16, right: 16,
    backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 12,
    padding: 6,
  },
  modalBackdrop: { flex: 0, height: "40%", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 8, marginBottom: 4 },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  sheetCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  commentList: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  commentRow: { flexDirection: "row", gap: 10 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentAvatarText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  commentAuthor: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  commentTime: { fontFamily: "Inter_400Regular", fontSize: 11 },
  commentText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  emptyComments: { fontFamily: "Inter_400Regular", fontSize: 14 },
  composer: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1, borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: "Inter_400Regular",
  },
  composerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  signInPrompt: { fontFamily: "Inter_400Regular", fontSize: 14 },
});
