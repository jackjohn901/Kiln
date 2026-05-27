import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
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

interface Workshop {
  id: string;
  title: string;
  artistId: string;
  artistName: string | null;
  medium: string | null;
  description: string | null;
  date: string | null;
  location: string | null;
  isOnline: boolean;
  price: number;
  spotsTotal: number;
  spotsRemaining: number;
  durationHours: number | null;
  coverImageUrl: string | null;
  isBooked: boolean;
  level: string | null;
}

function formatPrice(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatDate(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

function buildGcalUrl(workshop: Workshop): string {
  const details = `Workshop with ${workshop.artistName ?? "artist"} on Kiln.`;
  const location = workshop.isOnline ? "Online" : (workshop.location ?? "");

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  let datesParam = "";
  if (workshop.date) {
    const start = new Date(workshop.date);
    if (!isNaN(start.getTime())) {
      const durationMs = workshop.durationHours
        ? workshop.durationHours * 60 * 60 * 1000
        : 6 * 60 * 60 * 1000;
      datesParam = `${fmt(start)}/${fmt(new Date(start.getTime() + durationMs))}`;
    }
  }

  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: workshop.title,
    details,
    ...(datesParam ? { dates: datesParam } : {}),
    ...(location ? { location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

const MEDIA = ["All", "Ceramics", "Glass", "Metal", "Wood", "Pottery"];

export default function WorkshopsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [medium, setMedium] = useState("All");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [justBooked, setJustBooked] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiGet<{ workshops: Workshop[] }>("/api/workshops")
      .then((d) => setWorkshops(d.workshops ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleBook(id: string) {
    if (!isAuthenticated) return;
    setBookingId(id);
    try {
      await apiPost(`/api/workshops/${id}/book`, {});
      setWorkshops((prev) =>
        prev.map((w) =>
          w.id === id
            ? { ...w, isBooked: true, spotsRemaining: Math.max(0, w.spotsRemaining - 1) }
            : w
        )
      );
      setJustBooked((prev) => new Set(prev).add(id));
    } catch {}
    setBookingId(null);
  }

  const filtered =
    medium === "All"
      ? workshops
      : workshops.filter((w) => w.medium?.toLowerCase().includes(medium.toLowerCase()));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Workshops</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Hands-on classes from working artists</Text>
      </View>

      <View style={styles.filterRow}>
        <FlatList
          data={MEDIA}
          keyExtractor={(i) => i}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setMedium(item)}
              style={[
                styles.chip,
                {
                  backgroundColor: medium === item ? colors.primary : colors.card,
                  borderColor: medium === item ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: medium === item ? "#1a1a1a" : colors.foreground }]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="book-open" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No workshops found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, gap: 14 }}
          renderItem={({ item }) => {
            const soldOut = item.spotsRemaining <= 0;
            const isJustBooked = justBooked.has(item.id);
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {item.coverImageUrl ? (
                  <Image source={{ uri: item.coverImageUrl }} style={styles.coverImage} contentFit="cover" />
                ) : (
                  <View style={[styles.coverPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="book-open" size={28} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  {item.level && (
                    <Text style={[styles.level, { color: colors.primary }]}>{item.level}</Text>
                  )}
                  <Text style={[styles.workshopTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.artistName, { color: colors.mutedForeground }]}>by {item.artistName}</Text>
                  {item.description && (
                    <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <View style={styles.meta}>
                    {item.date && (
                      <View style={styles.metaItem}>
                        <Feather name="calendar" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{formatDate(item.date)}</Text>
                      </View>
                    )}
                    <View style={styles.metaItem}>
                      <Feather name={item.isOnline ? "video" : "map-pin"} size={11} color={colors.mutedForeground} />
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                        {item.isOnline ? "Online" : item.location}
                      </Text>
                    </View>
                    {item.durationHours && (
                      <View style={styles.metaItem}>
                        <Feather name="clock" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.durationHours}h session</Text>
                      </View>
                    )}
                    <View style={styles.metaItem}>
                      <Feather name="users" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                        {item.spotsRemaining} of {item.spotsTotal} spots left
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(item.price)}</Text>
                    <Pressable
                      style={[
                        styles.bookBtn,
                        {
                          backgroundColor: soldOut || item.isBooked ? colors.muted : colors.primary,
                          opacity: bookingId === item.id ? 0.7 : 1,
                        },
                      ]}
                      onPress={() => handleBook(item.id)}
                      disabled={soldOut || item.isBooked || bookingId === item.id}
                    >
                      <Text
                        style={[
                          styles.bookBtnText,
                          { color: soldOut || item.isBooked ? colors.mutedForeground : "#1a1a1a" },
                        ]}
                      >
                        {item.isBooked ? "Booked" : soldOut ? "Sold out" : "Book"}
                      </Text>
                    </Pressable>
                  </View>

                  {item.isBooked && (
                    <View
                      style={[
                        styles.calendarSection,
                        { borderTopColor: colors.border, backgroundColor: isJustBooked ? colors.muted : "transparent" },
                      ]}
                    >
                      {isJustBooked && (
                        <View style={styles.confirmedRow}>
                          <Feather name="check-circle" size={13} color="#34d399" />
                          <Text style={styles.confirmedText}>You're booked!</Text>
                        </View>
                      )}
                      <Text style={[styles.calendarLabel, { color: colors.mutedForeground }]}>Add to calendar:</Text>
                      <View style={styles.calendarButtons}>
                        <Pressable
                          style={[styles.calBtn, styles.gcalBtn]}
                          onPress={() => Linking.openURL(buildGcalUrl(item))}
                        >
                          <Feather name="calendar" size={13} color="#fff" />
                          <Text style={styles.gcalBtnText}>Google Calendar</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.calBtn, styles.icsBtn, { borderColor: colors.border }]}
                          onPress={() => Linking.openURL(`${getApiBase()}/api/workshops/${item.id}/calendar.ics`)}
                        >
                          <Feather name="download" size={13} color={colors.foreground} />
                          <Text style={[styles.icsBtnText, { color: colors.foreground }]}>Download .ics</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
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
  filterRow: { paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 14 },
  card: { borderRadius: 14, overflow: "hidden", borderWidth: 1 },
  coverImage: { width: "100%", height: 160 },
  coverPlaceholder: { width: "100%", height: 120, alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 14 },
  level: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  workshopTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  artistName: { fontSize: 12, marginTop: 2 },
  description: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  price: { fontSize: 18, fontWeight: "700" },
  bookBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  bookBtnText: { fontSize: 13, fontWeight: "700" },
  calendarSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderRadius: 10, paddingHorizontal: 2 },
  confirmedRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  confirmedText: { fontSize: 13, fontWeight: "600", color: "#34d399" },
  calendarLabel: { fontSize: 11, marginBottom: 8 },
  calendarButtons: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  calBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  gcalBtn: { backgroundColor: "#2563eb" },
  gcalBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  icsBtn: { borderWidth: 1, backgroundColor: "transparent" },
  icsBtnText: { fontSize: 12, fontWeight: "600" },
});
