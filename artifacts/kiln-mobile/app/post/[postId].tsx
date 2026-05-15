import React, { useCallback, useState } from "react";
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
} from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost, relativeTime } from "@/lib/api";

const { width: W, height: H } = Dimensions.get("window");

interface Post {
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
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  createdAt: string;
}

export default function PostDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: postData, isLoading: postLoading } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => apiGet<{ post: Post }>(`/api/posts/${postId}`),
    enabled: !!postId,
  });

  const { data: commentsData, isLoading: commentsLoading, refetch: refetchComments } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => apiGet<{ comments: Comment[] }>(`/api/posts/${postId}/comments`),
    enabled: !!postId,
  });

  const post = postData?.post;
  const comments = commentsData?.comments ?? [];

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sync likeCount from fetched post
  React.useEffect(() => {
    if (post) setLikeCount(post.likeCount);
  }, [post?.likeCount]);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikeCount((c) => (nowLiked ? c + 1 : c - 1));
    apiPost(`/api/posts/${postId}/like`).catch(() => {
      setLiked(!nowLiked);
      setLikeCount((c) => (nowLiked ? c - 1 : c + 1));
    });
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaved((s) => !s);
    apiPost(`/api/posts/${postId}/save`).catch(() => setSaved((s) => !s));
  };

  const submitComment = async () => {
    if (!draft.trim() || submitting || !isAuthenticated) return;
    const text = draft.trim();
    setDraft("");
    setSubmitting(true);
    try {
      await apiPost(`/api/posts/${postId}/comments`, { text });
      refetchComments();
    } catch {
      setDraft(text);
    } finally {
      setSubmitting(false);
    }
  };

  if (postLoading || !post) {
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.topBar, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.foreground }]}>Post</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Media */}
            <View style={styles.mediaBox}>
              {post.videoUrl ? (
                <Video
                  source={{ uri: post.videoUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping
                  isMuted={false}
                />
              ) : post.thumbnailUrl ? (
                <Image source={{ uri: post.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: "#222", alignItems: "center", justifyContent: "center" }]}>
                  <Feather name="image" size={40} color="#555" />
                </View>
              )}
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.mediaGrad} />
              {post.technique && (
                <View style={[styles.techTag, { borderColor: colors.primary }]}>
                  <Text style={[styles.techText, { color: colors.primary }]}>{post.technique}</Text>
                </View>
              )}
            </View>

            {/* Author + actions */}
            <View style={styles.authorArea}>
              <Pressable
                style={styles.authorRow}
                onPress={() => router.push(`/profile/${post.authorId}` as any)}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  {post.authorAvatarUrl ? (
                    <Image source={{ uri: post.authorAvatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                      {post.authorName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={[styles.authorName, { color: colors.foreground }]}>{post.authorName}</Text>
              </Pressable>

              <View style={styles.actionsRow}>
                <Pressable style={styles.actionBtn} onPress={handleLike} hitSlop={8}>
                  <Feather name="heart" size={22} color={liked ? "#E05D5D" : colors.foreground} />
                  <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>{likeCount}</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={handleSave} hitSlop={8}>
                  <Feather name="bookmark" size={22} color={saved ? "#D87F31" : colors.foreground} />
                  <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>{post.saveCount}</Text>
                </Pressable>
                <View style={styles.actionBtn}>
                  <Feather name="message-circle" size={22} color={colors.foreground} />
                  <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>{comments.length}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.caption, { color: colors.foreground }]}>{post.caption}</Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.commentsHeader, { color: colors.foreground }]}>
              Comments {comments.length > 0 ? `(${comments.length})` : ""}
            </Text>
          </View>
        }
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
          commentsLoading ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <View style={[styles.center, { paddingVertical: 24 }]}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No comments yet — be first</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      />

      {isAuthenticated && (
        <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={[styles.composerInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="Add a comment…"
            placeholderTextColor={colors.mutedForeground}
            value={draft}
            onChangeText={setDraft}
            returnKeyType="send"
            onSubmitEditing={submitComment}
          />
          <Pressable
            onPress={submitComment}
            style={[styles.composerBtn, { backgroundColor: draft.trim() ? colors.primary : colors.secondary }]}
          >
            {submitting
              ? <ActivityIndicator size="small" color={colors.primaryForeground} />
              : <Feather name="send" size={16} color={draft.trim() ? colors.primaryForeground : colors.mutedForeground} />
            }
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  mediaBox: { width: W, aspectRatio: 4 / 3, backgroundColor: "#111", position: "relative" },
  mediaGrad: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80 },
  techTag: {
    position: "absolute", bottom: 12, left: 12,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  techText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  authorArea: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  authorName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  actionsRow: { flexDirection: "row", gap: 20 },
  actionBtn: { alignItems: "center", gap: 3 },
  actionCount: { fontFamily: "Inter_400Regular", fontSize: 11 },
  caption: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
  commentsHeader: { fontFamily: "Inter_700Bold", fontSize: 15, paddingHorizontal: 16, paddingBottom: 8 },
  commentRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentAvatarText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  commentAuthor: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  commentTime: { fontFamily: "Inter_400Regular", fontSize: 11 },
  commentText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
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
});
