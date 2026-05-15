import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { router } from "expo-router";

const TECHNIQUES = ["Ceramics", "Glasswork", "Weaving", "Woodwork", "Metalwork", "Pottery", "Fiber", "Printmaking", "Sculpture"];

const AUTH_TOKEN_KEY = "auth_session_token";

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

async function requestUploadUrl(
  name: string,
  size: number,
  contentType: string,
  token: string,
): Promise<{ uploadURL: string; objectPath: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, size, contentType }),
  });
  if (!res.ok) throw new Error(`Upload URL request failed: ${res.status}`);
  return res.json();
}

async function uploadFileToGcs(uploadURL: string, uri: string, contentType: string): Promise<void> {
  const fileRes = await fetch(uri);
  const blob = await fileRes.blob();
  const uploadRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
}

async function createPost(params: {
  caption: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  technique?: string;
  isPatronOnly: boolean;
  token: string;
}): Promise<void> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      caption: params.caption,
      videoUrl: params.videoUrl ?? null,
      thumbnailUrl: params.thumbnailUrl ?? null,
      technique: params.technique ?? null,
      isPatronOnly: params.isPatronOnly,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Post failed: ${res.status}`);
  }
}

interface MediaAsset {
  uri: string;
  mimeType?: string;
  fileSize?: number;
  type?: "image" | "video";
  fileName?: string;
}

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, login } = useAuth();

  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [caption, setCaption] = useState("");
  const [technique, setTechnique] = useState("");
  const [isPatronOnly, setIsPatronOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia({
        uri: asset.uri,
        mimeType: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"),
        fileSize: asset.fileSize,
        type: asset.type as "image" | "video",
        fileName: asset.fileName ?? `upload-${Date.now()}`,
      });
    }
  };

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to record video.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia({
        uri: asset.uri,
        mimeType: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"),
        fileSize: asset.fileSize,
        type: asset.type as "image" | "video",
        fileName: asset.fileName ?? `upload-${Date.now()}`,
      });
    }
  };

  const handlePost = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }
    if (!caption.trim()) {
      Alert.alert("Caption required", "Please add a caption to your post.");
      return;
    }

    const token = await getToken();
    if (!token) {
      Alert.alert("Not signed in", "Please sign in to post.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);

    try {
      let videoUrl: string | undefined;
      let thumbnailUrl: string | undefined;

      if (media) {
        setUploadProgress("Uploading media…");
        const contentType = media.mimeType ?? "image/jpeg";
        const name = media.fileName ?? `upload-${Date.now()}`;
        const size = media.fileSize ?? 0;

        const { uploadURL, objectPath } = await requestUploadUrl(name, size, contentType, token);
        await uploadFileToGcs(uploadURL, media.uri, contentType);

        if (media.type === "video") {
          videoUrl = objectPath;
        } else {
          thumbnailUrl = objectPath;
        }
      }

      setUploadProgress("Publishing…");
      await createPost({
        caption: caption.trim(),
        videoUrl,
        thumbnailUrl,
        technique: technique || undefined,
        isPatronOnly,
        token,
      });

      setMedia(null);
      setCaption("");
      setTechnique("");
      setIsPatronOnly(false);
      setUploadProgress(null);

      Alert.alert("Posted!", "Your post is now live.", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (err: any) {
      Alert.alert("Failed to post", err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.authWall, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="lock" size={48} color={colors.mutedForeground} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Sign in to create</Text>
        <Text style={[styles.authSub, { color: colors.mutedForeground }]}>
          Share your craft process with the community
        </Text>
        <Pressable
          style={[styles.authBtn, { backgroundColor: colors.primary }]}
          onPress={login}
        >
          <Text style={[styles.authBtnText, { color: colors.primaryForeground }]}>
            Sign In
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 8, paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 80) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>New Post</Text>

        {/* Media picker */}
        {media ? (
          <Pressable style={styles.mediaPicked} onPress={pickMedia}>
            <Image
              source={{ uri: media.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            {media.type === "video" && (
              <View style={styles.videoBadge}>
                <Feather name="film" size={14} color="#fff" />
                <Text style={styles.videoBadgeText}>Video</Text>
              </View>
            )}
            <View style={styles.mediaOverlay}>
              <Feather name="edit-2" size={18} color="#fff" />
              <Text style={styles.mediaOverlayText}>Change</Text>
            </View>
          </Pressable>
        ) : (
          <View style={[styles.mediaEmpty, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Pressable style={[styles.mediaPickBtn, { backgroundColor: colors.secondary }]} onPress={openCamera}>
              <Feather name="video" size={22} color={colors.primary} />
              <Text style={[styles.mediaPickBtnText, { color: colors.foreground }]}>Camera</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Pressable style={[styles.mediaPickBtn, { backgroundColor: colors.secondary }]} onPress={pickMedia}>
              <Feather name="image" size={22} color={colors.primary} />
              <Text style={[styles.mediaPickBtnText, { color: colors.foreground }]}>Library</Text>
            </Pressable>
          </View>
        )}

        {/* Caption */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Caption</Text>
        <TextInput
          style={[
            styles.captionInput,
            { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border },
          ]}
          placeholder="Describe your process, materials, or story…"
          placeholderTextColor={colors.mutedForeground}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
          {caption.length}/500
        </Text>

        {/* Technique selector */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Craft Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {TECHNIQUES.map((t) => {
            const selected = technique === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTechnique(selected ? "" : t)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Patron only toggle */}
        <Pressable
          style={[
            styles.patronRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsPatronOnly((v) => !v);
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.patronTitle, { color: colors.foreground }]}>Patron exclusive</Text>
            <Text style={[styles.patronSub, { color: colors.mutedForeground }]}>
              Only your supporters can view this post
            </Text>
          </View>
          <View
            style={[
              styles.toggle,
              { backgroundColor: isPatronOnly ? colors.primary : colors.muted },
            ]}
          >
            <View
              style={[
                styles.toggleKnob,
                { transform: [{ translateX: isPatronOnly ? 18 : 2 }] },
              ]}
            />
          </View>
        </Pressable>

        {/* Post button */}
        <Pressable
          style={[
            styles.postBtn,
            { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 },
          ]}
          onPress={handlePost}
          disabled={submitting}
        >
          {submitting ? (
            <View style={{ alignItems: "center", gap: 6 }}>
              <ActivityIndicator color={colors.primaryForeground} />
              {uploadProgress && (
                <Text style={[styles.progressText, { color: colors.primaryForeground }]}>
                  {uploadProgress}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.postBtnText, { color: colors.primaryForeground }]}>
              Share Post
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 14 },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 4 },
  mediaEmpty: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    flexDirection: "row",
    overflow: "hidden",
  },
  mediaPickBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mediaPickBtnText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  divider: { width: 1 },
  mediaPicked: {
    height: 240,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  videoBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  videoBadgeText: { color: "#fff", fontFamily: "Inter_500Medium", fontSize: 12 },
  mediaOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mediaOverlayText: { color: "#fff", fontFamily: "Inter_500Medium", fontSize: 13 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 },
  captionInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
  },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "right" },
  chips: { gap: 8 },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  patronRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  patronTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  patronSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  postBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
    minHeight: 54,
    justifyContent: "center",
  },
  postBtnText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  progressText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  authWall: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  authTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  authSub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
  authBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  authBtnText: { fontFamily: "Inter_700Bold", fontSize: 16 },
});
