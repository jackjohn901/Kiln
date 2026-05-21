import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPatch } from "@/lib/api";

interface NotifSettings {
  notif_likes: boolean;
  notif_comments: boolean;
  notif_follows: boolean;
  notif_commissions: boolean;
  notif_workshops: boolean;
  notif_drops: boolean;
  notif_email_digest: boolean;
  notif_email_follows: boolean;
  notif_email_comments: boolean;
  notif_email_new_sale: boolean;
  notif_email_new_commission: boolean;
  notif_email_new_patron: boolean;
  notif_email_outbid: boolean;
}

const DEFAULTS: NotifSettings = {
  notif_likes: true,
  notif_comments: true,
  notif_follows: true,
  notif_commissions: true,
  notif_workshops: true,
  notif_drops: true,
  notif_email_digest: false,
  notif_email_follows: false,
  notif_email_comments: false,
  notif_email_new_sale: true,
  notif_email_new_commission: true,
  notif_email_new_patron: true,
  notif_email_outbid: true,
};

function ToggleRow({
  label,
  desc,
  value,
  onChange,
  colors,
  isLast,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: ReturnType<typeof useColors>;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.toggleRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.toggleText}>
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
        {desc ? (
          <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>{desc}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.primaryForeground}
      />
    </View>
  );
}

function SectionHeader({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{label}</Text>
  );
}

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [settings, setSettings] = useState<NotifSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [notifEmail, setNotifEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);

  const checkOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (saved) {
      Animated.parallel([
        Animated.timing(checkOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }),
      ]).start();
    } else {
      Animated.timing(checkOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        checkScale.setValue(0.6);
      });
    }
  }, [saved, checkOpacity, checkScale]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSettingsRef = useRef<NotifSettings>(DEFAULTS);
  const hasPendingSaveRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    apiGet<{ settings?: Partial<NotifSettings>; contactEmail?: string | null }>("/api/me/settings")
      .then((data) => {
        if (data.settings) {
          const merged = { ...DEFAULTS, ...data.settings };
          setSettings(merged);
          latestSettingsRef.current = merged;
        }
        if (data.contactEmail) setNotifEmail(data.contactEmail);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => {
      mountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        if (hasPendingSaveRef.current) {
          apiPatch("/api/me/settings", { settings: latestSettingsRef.current }).catch(() => {});
          hasPendingSaveRef.current = false;
        }
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const scheduleAutoSave = useCallback((nextSettings: NotifSettings) => {
    latestSettingsRef.current = nextSettings;
    hasPendingSaveRef.current = true;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      hasPendingSaveRef.current = false;
      debounceRef.current = null;
      try {
        await apiPatch("/api/me/settings", { settings: latestSettingsRef.current });
        if (!mountedRef.current) return;
        setSaved(true);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setSaved(false);
        }, 1800);
      } catch {
      }
    }, 400);
  }, []);

  const set = (key: keyof NotifSettings) => (value: boolean) => {
    setSaved(false);
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      scheduleAutoSave(next);
      return next;
    });
  };

  const emailSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveNotifEmail = useCallback((email: string) => {
    apiPatch("/api/me/settings", { contactEmail: email })
      .then(() => {
        if (!mountedRef.current) return;
        setEmailSaved(true);
        if (emailSavedTimerRef.current) clearTimeout(emailSavedTimerRef.current);
        emailSavedTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setEmailSaved(false);
        }, 1800);
      })
      .catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        <View style={styles.headerRight}>
          <Animated.View style={{ opacity: checkOpacity, transform: [{ scale: checkScale }] }}>
            <Feather name="check" size={18} color={colors.primary} />
          </Animated.View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 100 : 40) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader label="ACTIVITY" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ToggleRow
              label="Likes"
              desc="When someone likes your posts"
              value={settings.notif_likes}
              onChange={set("notif_likes")}
              colors={colors}
            />
            <ToggleRow
              label="Comments"
              desc="Replies to your posts"
              value={settings.notif_comments}
              onChange={set("notif_comments")}
              colors={colors}
            />
            <ToggleRow
              label="New followers"
              value={settings.notif_follows}
              onChange={set("notif_follows")}
              colors={colors}
            />
            <ToggleRow
              label="Commission requests"
              desc="New inquiries from collectors"
              value={settings.notif_commissions}
              onChange={set("notif_commissions")}
              colors={colors}
              isLast
            />
          </View>

          <SectionHeader label="EVENTS" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ToggleRow
              label="Workshop updates"
              desc="Bookings and reminders"
              value={settings.notif_workshops}
              onChange={set("notif_workshops")}
              colors={colors}
            />
            <ToggleRow
              label="Drop alerts"
              desc="New drops from artists you follow"
              value={settings.notif_drops}
              onChange={set("notif_drops")}
              colors={colors}
              isLast
            />
          </View>

          <SectionHeader label="EMAIL" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ToggleRow
              label="Weekly digest"
              desc="Top posts, opportunities, and updates"
              value={settings.notif_email_digest}
              onChange={set("notif_email_digest")}
              colors={colors}
            />
            <ToggleRow
              label="New follower alerts"
              desc="Email when someone follows you"
              value={settings.notif_email_follows}
              onChange={set("notif_email_follows")}
              colors={colors}
            />
            <ToggleRow
              label="Comment alerts"
              desc="Email when someone comments on your posts"
              value={settings.notif_email_comments}
              onChange={set("notif_email_comments")}
              colors={colors}
            />
            <ToggleRow
              label="New sale alerts"
              desc="Email when a buyer completes a purchase"
              value={settings.notif_email_new_sale}
              onChange={set("notif_email_new_sale")}
              colors={colors}
            />
            <ToggleRow
              label="New commission requests"
              desc="Email when a collector sends an inquiry"
              value={settings.notif_email_new_commission}
              onChange={set("notif_email_new_commission")}
              colors={colors}
            />
            <ToggleRow
              label="New patron alerts"
              desc="Email when someone subscribes to your tiers"
              value={settings.notif_email_new_patron}
              onChange={set("notif_email_new_patron")}
              colors={colors}
            />
            <ToggleRow
              label="Outbid alerts"
              desc="Email when someone outbids you in an auction"
              value={settings.notif_email_outbid}
              onChange={set("notif_email_outbid")}
              colors={colors}
            />
            <View style={[styles.emailInputRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={styles.emailInputHeader}>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Notification email address</Text>
                {emailSaved && (
                  <Text style={[styles.savedLabel, { color: colors.primary }]}>Saved ✓</Text>
                )}
              </View>
              <Text style={[styles.toggleDesc, { color: colors.mutedForeground, marginBottom: 8 }]}>
                Where we send email alerts. Never shown publicly.
              </Text>
              <TextInput
                value={notifEmail}
                onChangeText={setNotifEmail}
                onBlur={() => saveNotifEmail(notifEmail)}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={[
                  styles.emailInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 34, alignItems: "flex-start" },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  headerRight: { width: 34, alignItems: "flex-end" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 8 },
  sectionHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  toggleDesc: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 },
  emailInputRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emailInputHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  savedLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  emailInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
});
