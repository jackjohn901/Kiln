import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";

interface Guild {
  id: string;
  name: string;
  technique: string;
  description: string | null;
  coverImageUrl: string | null;
  memberCount: number;
  postCount: number;
  isMember: boolean;
}

function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

export default function GuildsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ guilds: Guild[] }>("/api/guilds")
      .then((d) => setGuilds(d.guilds ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleMembership(guild: Guild) {
    if (!isAuthenticated) return;
    setJoiningId(guild.id);
    try {
      if (guild.isMember) {
        await apiPost(`/api/guilds/${guild.id}/leave`, {});
        setGuilds((prev) => prev.map((g) => g.id === guild.id ? { ...g, isMember: false, memberCount: Math.max(0, g.memberCount - 1) } : g));
      } else {
        await apiPost(`/api/guilds/${guild.id}/join`, {});
        setGuilds((prev) => prev.map((g) => g.id === guild.id ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g));
      }
    } catch {}
    setJoiningId(null);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Craft Guilds</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Technique-based communities for craft artists</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : guilds.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No guilds yet</Text>
        </View>
      ) : (
        <FlatList
          data={guilds}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, gap: 12 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardRow}>
                {item.coverImageUrl ? (
                  <Image source={{ uri: item.coverImageUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="users" size={20} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={styles.cardContent}>
                  <Text style={[styles.guildName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.technique, { color: colors.primary }]}>{item.technique}</Text>
                  {item.description && (
                    <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>{item.description}</Text>
                  )}
                  <View style={styles.stats}>
                    <View style={styles.statItem}>
                      <Feather name="users" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.statText, { color: colors.mutedForeground }]}>{fmt(item.memberCount)} members</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Feather name="image" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.statText, { color: colors.mutedForeground }]}>{fmt(item.postCount)} posts</Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  style={[styles.joinBtn, { backgroundColor: item.isMember ? colors.muted : colors.primary, opacity: joiningId === item.id ? 0.7 : 1 }]}
                  onPress={() => toggleMembership(item)}
                  disabled={joiningId === item.id}
                >
                  <Text style={[styles.joinBtnText, { color: item.isMember ? colors.mutedForeground : "#1a1a1a" }]}>
                    {item.isMember ? "Joined" : "Join"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Georgia" : "serif" },
  subtitle: { fontSize: 12, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 12 },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1, gap: 2 },
  guildName: { fontSize: 15, fontWeight: "700" },
  technique: { fontSize: 11, fontWeight: "600" },
  description: { fontSize: 12, lineHeight: 16, marginTop: 3 },
  stats: { flexDirection: "row", gap: 12, marginTop: 6 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11 },
  joinBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, alignSelf: "center" },
  joinBtnText: { fontSize: 12, fontWeight: "700" },
});
