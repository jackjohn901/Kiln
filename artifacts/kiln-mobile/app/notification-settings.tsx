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
  notif_email_paused: boolean;
  notif_email_digest: boolean;
  notif_email_follows: boolean;
  notif_email_comments: boolean;
  notif_email_new_sale: boolean;
  notif_email_new_commission: boolean;
  notif_email_new_patron: boolean;
  notif_email_outbid: boolean;
  notif_email_mentions: boolean;
  notif_sms_paused: boolean;
  notif_sms_outbid: boolean;
  notif_sms_drops: boolean;
  notif_sms_shipped: boolean;
}

const DEFAULTS: NotifSettings = {
  notif_likes: true,
  notif_comments: true,
  notif_follows: true,
  notif_commissions: true,
  notif_workshops: true,
  notif_drops: true,
  notif_email_paused: false,
  notif_email_digest: false,
  notif_email_follows: false,
  notif_email_comments: false,
  notif_email_new_sale: true,
  notif_email_new_commission: true,
  notif_email_new_patron: true,
  notif_email_outbid: true,
  notif_email_mentions: true,
  notif_sms_paused: false,
  notif_sms_outbid: true,
  notif_sms_drops: true,
  notif_sms_shipped: true,
};

// SNOOZE_OPTIONS: label → duration in milliseconds (null = indefinite)
const SNOOZE_OPTIONS: { label: string; ms: number | null }[] = [
  { label: "1 day", ms: 24 * 60 * 60 * 1000 },
  { label: "3 days", ms: 3 * 24 * 60 * 60 * 1000 },
  { label: "1 week", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "Indefinitely", ms: null },
];

function smsSnoozeCountdown(resumeAt: string | null): string | null {
  if (!resumeAt) return null;
  const ms = new Date(resumeAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) return hours <= 1 ? "less than 1 hour" : `${hours} hours`;
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return days === 1 ? "1 day" : `${days} days`;
}

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
  const [saveError, setSaveError] = useState(false);
  const [notifEmail, setNotifEmail] = useState("");
  const [emailPausedAt, setEmailPausedAt] = useState<string | null>(null);
  const [emailBounced, setEmailBounced] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [emailValidationError, setEmailValidationError] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [phoneValidationError, setPhoneValidationError] = useState(false);
  const [smsResumeAt, setSmsResumeAt] = useState<string | null>(null);
  const [smsSnoozePickerOpen, setSmsSnoozePickerOpen] = useState(false);

  const checkOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.6)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;
  const errorScale = useRef(new Animated.Value(0.6)).current;

  const emailSavedOpacity = useRef(new Animated.Value(0)).current;
  const emailSavedScale = useRef(new Animated.Value(0.6)).current;
  const emailErrorOpacity = useRef(new Animated.Value(0)).current;
  const emailErrorScale = useRef(new Animated.Value(0.6)).current;

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

  useEffect(() => {
    if (saveError) {
      Animated.parallel([
        Animated.timing(errorOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(errorScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }),
      ]).start();
    } else {
      Animated.timing(errorOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        errorScale.setValue(0.6);
      });
    }
  }, [saveError, errorOpacity, errorScale]);

  useEffect(() => {
    if (emailSaved) {
      Animated.parallel([
        Animated.timing(emailSavedOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(emailSavedScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }),
      ]).start();
    } else {
      Animated.timing(emailSavedOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        emailSavedScale.setValue(0.6);
      });
    }
  }, [emailSaved, emailSavedOpacity, emailSavedScale]);

  useEffect(() => {
    if (emailError) {
      Animated.parallel([
        Animated.timing(emailErrorOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(emailErrorScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }),
      ]).start();
    } else {
      Animated.timing(emailErrorOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        emailErrorScale.setValue(0.6);
      });
    }
  }, [emailError, emailErrorOpacity, emailErrorScale]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSettingsRef = useRef<NotifSettings>(DEFAULTS);
  const hasPendingSaveRef = useRef(false);
  const mountedRef = useRef(true);
  const smsResumeAtRef = useRef<string | null>(null);
  const phoneSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiGet<{ settings?: Partial<NotifSettings>; contactEmail?: string | null; contactEmailBounced?: boolean; notifEmailPausedAt?: string | null; phoneNumber?: string | null; notifSmsResumeAt?: string | null }>("/api/me/settings")
      .then((data) => {
        if (data.settings) {
          const merged = { ...DEFAULTS, ...data.settings };
          setSettings(merged);
          latestSettingsRef.current = merged;
        }
        if (data.contactEmail) setNotifEmail(data.contactEmail);
        if (data.contactEmailBounced) setEmailBounced(true);
        if (data.notifEmailPausedAt) setEmailPausedAt(data.notifEmailPausedAt);
        if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
        if (data.notifSmsResumeAt) {
          setSmsResumeAt(data.notifSmsResumeAt);
          smsResumeAtRef.current = data.notifSmsResumeAt;
        }
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
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      if (emailErrorTimerRef.current) {
        clearTimeout(emailErrorTimerRef.current);
      }
      if (phoneSavedTimerRef.current) {
        clearTimeout(phoneSavedTimerRef.current);
      }
      if (phoneErrorTimerRef.current) {
        clearTimeout(phoneErrorTimerRef.current);
      }
    };
  }, []);

  const performSave = useCallback(async () => {
    try {
      await apiPatch("/api/me/settings", { settings: latestSettingsRef.current });
      if (!mountedRef.current) return;
      setSaveError(false);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setSaved(false);
      }, 1800);
    } catch {
      if (!mountedRef.current) return;
      setSaved(false);
      setSaveError(true);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setSaveError(false);
      }, 3000);
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setSaveError(false);
    performSave();
  }, [performSave]);

  const scheduleAutoSave = useCallback((nextSettings: NotifSettings) => {
    latestSettingsRef.current = nextSettings;
    hasPendingSaveRef.current = true;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      hasPendingSaveRef.current = false;
      debounceRef.current = null;
      await performSave();
    }, 400);
  }, [performSave]);

  const set = (key: keyof NotifSettings) => (value: boolean) => {
    setSaved(false);
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      scheduleAutoSave(next);
      return next;
    });
  };

  const emailSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAttemptedEmailRef = useRef<string>("");

  const saveNotifEmail = useCallback((email: string) => {
    const trimmed = email.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailValidationError(true);
      return;
    }
    setEmailValidationError(false);
    lastAttemptedEmailRef.current = trimmed;
    apiPatch("/api/me/settings", { contactEmail: trimmed })
      .then(() => {
        if (!mountedRef.current) return;
        setNotifEmail(trimmed);
        setEmailBounced(false);
        setEmailError(false);
        setEmailSaved(true);
        if (emailSavedTimerRef.current) clearTimeout(emailSavedTimerRef.current);
        emailSavedTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setEmailSaved(false);
        }, 1800);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setEmailSaved(false);
        setEmailError(true);
        if (emailErrorTimerRef.current) clearTimeout(emailErrorTimerRef.current);
        emailErrorTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setEmailError(false);
        }, 3000);
      });
  }, []);

  const handleEmailRetry = useCallback(() => {
    if (emailErrorTimerRef.current) {
      clearTimeout(emailErrorTimerRef.current);
      emailErrorTimerRef.current = null;
    }
    setEmailError(false);
    saveNotifEmail(lastAttemptedEmailRef.current);
  }, [saveNotifEmail]);

  const flashSaved = useCallback(() => {
    setSaveError(false);
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setSaved(false);
    }, 1800);
  }, []);

  const flashSaveError = useCallback(() => {
    setSaved(false);
    setSaveError(true);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setSaveError(false);
    }, 3000);
  }, []);

  // Snooze all SMS notifications for a chosen period (or indefinitely when ms is null).
  // Persists notif_sms_paused in settings + the resume timestamp in one request, and
  // reverts the optimistic local state if the save fails so the UI stays honest.
  const applySmsSnooze = useCallback((ms: number | null) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      hasPendingSaveRef.current = false;
    }
    const resumeAt = ms !== null ? new Date(Date.now() + ms).toISOString() : null;
    const prevSettings = latestSettingsRef.current;
    const prevResumeAt = smsResumeAtRef.current;
    const next = { ...prevSettings, notif_sms_paused: true };
    latestSettingsRef.current = next;
    setSettings(next);
    setSmsResumeAt(resumeAt);
    smsResumeAtRef.current = resumeAt;
    setSmsSnoozePickerOpen(false);
    setSaved(false);
    apiPatch("/api/me/settings", { settings: next, notifSmsResumeAt: resumeAt })
      .then(() => {
        if (!mountedRef.current) return;
        flashSaved();
      })
      .catch(() => {
        if (!mountedRef.current) return;
        latestSettingsRef.current = prevSettings;
        setSettings(prevSettings);
        setSmsResumeAt(prevResumeAt);
        smsResumeAtRef.current = prevResumeAt;
        flashSaveError();
      });
  }, [flashSaved, flashSaveError]);

  const clearSmsSnooze = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      hasPendingSaveRef.current = false;
    }
    const prevSettings = latestSettingsRef.current;
    const prevResumeAt = smsResumeAtRef.current;
    const next = { ...prevSettings, notif_sms_paused: false };
    latestSettingsRef.current = next;
    setSettings(next);
    setSmsResumeAt(null);
    smsResumeAtRef.current = null;
    setSmsSnoozePickerOpen(false);
    setSaved(false);
    apiPatch("/api/me/settings", { settings: next, notifSmsResumeAt: null })
      .then(() => {
        if (!mountedRef.current) return;
        flashSaved();
      })
      .catch(() => {
        if (!mountedRef.current) return;
        latestSettingsRef.current = prevSettings;
        setSettings(prevSettings);
        setSmsResumeAt(prevResumeAt);
        smsResumeAtRef.current = prevResumeAt;
        flashSaveError();
      });
  }, [flashSaved, flashSaveError]);

  const lastAttemptedPhoneRef = useRef<string>("");

  const savePhoneNumber = useCallback((phone: string) => {
    const trimmed = phone.trim();
    if (trimmed && !/^\+?[\d\s\-().]{7,20}$/.test(trimmed)) {
      setPhoneValidationError(true);
      return;
    }
    setPhoneValidationError(false);
    lastAttemptedPhoneRef.current = trimmed;
    apiPatch("/api/me/settings", { phoneNumber: trimmed })
      .then(() => {
        if (!mountedRef.current) return;
        setPhoneNumber(trimmed);
        setPhoneError(false);
        setPhoneSaved(true);
        if (phoneSavedTimerRef.current) clearTimeout(phoneSavedTimerRef.current);
        phoneSavedTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setPhoneSaved(false);
        }, 1800);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setPhoneSaved(false);
        setPhoneError(true);
        if (phoneErrorTimerRef.current) clearTimeout(phoneErrorTimerRef.current);
        phoneErrorTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setPhoneError(false);
        }, 3000);
      });
  }, []);

  const handlePhoneRetry = useCallback(() => {
    if (phoneErrorTimerRef.current) {
      clearTimeout(phoneErrorTimerRef.current);
      phoneErrorTimerRef.current = null;
    }
    setPhoneError(false);
    savePhoneNumber(lastAttemptedPhoneRef.current);
  }, [savePhoneNumber]);

  const hasPhone = phoneNumber.trim().length > 0;
  const smsPaused = settings.notif_sms_paused;

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
          <Animated.View style={{ opacity: checkOpacity, transform: [{ scale: checkScale }], position: "absolute", right: 0 }}>
            <Feather name="check" size={18} color={colors.primary} />
          </Animated.View>
          <Animated.View style={{ opacity: errorOpacity, transform: [{ scale: errorScale }], flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Feather name="x" size={14} color="#ef4444" />
            <Text style={[styles.errorLabel, { color: "#ef4444" }]}>Couldn't save</Text>
            <Pressable onPress={handleRetry} hitSlop={8}>
              <Text style={[styles.errorLabel, { color: colors.primary }]}> Retry</Text>
            </Pressable>
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
            {!notifEmail.trim() && (
              <View style={styles.emailWarning}>
                <Feather name="alert-triangle" size={13} color="#f59e0b" style={styles.emailWarningIcon} />
                <Text style={styles.emailWarningText}>
                  No notification email set — add one below so you don't miss important alerts.
                </Text>
              </View>
            )}
            {notifEmail.trim() && settings.notif_email_paused && (
              <View style={styles.emailPausedBanner}>
                <Feather name="alert-triangle" size={13} color="#f59e0b" style={styles.emailWarningIcon} />
                <Text style={styles.emailPausedText}>
                  {`Emails are paused indefinitely${emailPausedAt ? ` since ${new Date(emailPausedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: new Date(emailPausedAt).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })}` : ""} — re-enable via the toggle to resume.`}
                </Text>
              </View>
            )}
            {notifEmail.trim() && emailBounced && (
              <View style={styles.emailBouncedBanner}>
                <Feather name="alert-octagon" size={13} color="#ef4444" style={styles.emailWarningIcon} />
                <Text style={styles.emailBouncedText}>
                  The address below couldn't be delivered to. Please update it with a working email.
                </Text>
              </View>
            )}
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
            <ToggleRow
              label="Mention alerts"
              desc="Email when someone @mentions you in a comment or post"
              value={settings.notif_email_mentions}
              onChange={set("notif_email_mentions")}
              colors={colors}
            />
            <View style={[styles.emailInputRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={styles.emailInputHeader}>
                <Text style={[styles.toggleLabel, { color: colors.foreground, flex: 1 }]}>Notification email address</Text>
                <View style={styles.emailStatusContainer}>
                  <Animated.Text
                    style={[styles.savedLabel, styles.emailStatusAbsolute, { color: colors.primary, opacity: emailSavedOpacity, transform: [{ scale: emailSavedScale }] }]}
                  >
                    Saved ✓
                  </Animated.Text>
                  <Animated.View
                    style={[styles.emailStatusAbsolute, { opacity: emailErrorOpacity, transform: [{ scale: emailErrorScale }], flexDirection: "row", alignItems: "center", gap: 3 }]}
                  >
                    <Text style={[styles.savedLabel, { color: "#ef4444" }]}>Couldn't save</Text>
                    <Pressable onPress={handleEmailRetry} hitSlop={8}>
                      <Text style={[styles.savedLabel, { color: colors.primary }]}>Retry</Text>
                    </Pressable>
                  </Animated.View>
                </View>
              </View>
              <Text style={[styles.toggleDesc, { color: colors.mutedForeground, marginBottom: 8 }]}>
                Where we send email alerts. Never shown publicly.
              </Text>
              <TextInput
                value={notifEmail}
                onChangeText={(text) => {
                  setNotifEmail(text);
                  if (emailBounced) setEmailBounced(false);
                  if (emailValidationError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())) setEmailValidationError(false);
                }}
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
                    borderColor: emailValidationError || emailBounced ? "#ef4444" : colors.border,
                  },
                ]}
              />
              {emailValidationError && (
                <Text style={[styles.toggleDesc, { color: "#ef4444", marginTop: 4 }]}>
                  Please enter a valid email address.
                </Text>
              )}
              {!emailValidationError && emailBounced && (
                <Text style={[styles.toggleDesc, { color: "#ef4444", marginTop: 4 }]}>
                  This address is undeliverable. Update it to restore email notifications.
                </Text>
              )}
            </View>
          </View>

          <SectionHeader label="SMS" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Snooze all SMS notifications */}
            <View
              style={[
                styles.toggleRow,
                { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: "column", alignItems: "stretch", gap: 10 },
              ]}
            >
              <View style={styles.smsSnoozeHeader}>
                <View style={styles.toggleText}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Snooze all SMS notifications</Text>
                  <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>
                    {smsPaused
                      ? smsResumeAt
                        ? (() => { const cd = smsSnoozeCountdown(smsResumeAt); return cd ? `Resuming in ${cd}` : "Resuming soon\u2026"; })()
                        : "Paused indefinitely"
                      : hasPhone
                        ? "Auto-resumes after the chosen period"
                        : "Add a phone number below to enable snoozing"}
                  </Text>
                </View>
                {smsPaused ? (
                  <Pressable
                    onPress={clearSmsSnooze}
                    hitSlop={6}
                    style={[styles.snoozePill, { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.4)" }]}
                  >
                    <Text style={[styles.snoozePillText, { color: "#ef4444" }]}>Resume now</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => hasPhone && setSmsSnoozePickerOpen((v) => !v)}
                    disabled={!hasPhone}
                    hitSlop={6}
                    style={[
                      styles.snoozePill,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        opacity: hasPhone ? 1 : 0.5,
                      },
                    ]}
                  >
                    <Text style={[styles.snoozePillText, { color: hasPhone ? colors.foreground : colors.mutedForeground }]}>Snooze</Text>
                  </Pressable>
                )}
              </View>
              {smsSnoozePickerOpen && !smsPaused && (
                <View style={styles.snoozePickerRow}>
                  {SNOOZE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.label}
                      onPress={() => applySmsSnooze(opt.ms)}
                      style={[styles.snoozeOption, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                      <Text style={[styles.snoozeOptionText, { color: colors.foreground }]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => setSmsSnoozePickerOpen(false)} style={styles.snoozeCancel}>
                    <Text style={[styles.snoozeOptionText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {smsPaused && (
              <View style={styles.smsPausedBanner}>
                <Feather name="alert-triangle" size={13} color="#38bdf8" style={styles.emailWarningIcon} />
                <Text style={styles.smsPausedText}>
                  {hasPhone
                    ? smsResumeAt
                      ? `SMS snoozed until ${new Date(smsResumeAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: new Date(smsResumeAt).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })} — no texts will be sent even if individual types are enabled below.`
                      : "SMS is paused indefinitely — tap \u201cResume now\u201d above to re-enable."
                    : "No phone number saved — add one below before pausing has any effect."}
                </Text>
              </View>
            )}

            <View style={smsPaused ? { opacity: 0.4 } : undefined} pointerEvents={smsPaused ? "none" : "auto"}>
              <ToggleRow
                label="Outbid alerts"
                desc="Text when someone outbids you in an auction"
                value={settings.notif_sms_outbid}
                onChange={set("notif_sms_outbid")}
                colors={colors}
              />
              <ToggleRow
                label="Drop waitlist confirmations"
                desc="Text when you join a drop waitlist"
                value={settings.notif_sms_drops}
                onChange={set("notif_sms_drops")}
                colors={colors}
              />
              <ToggleRow
                label="Order shipped"
                desc="Text when a seller marks your order as shipped"
                value={settings.notif_sms_shipped}
                onChange={set("notif_sms_shipped")}
                colors={colors}
              />
            </View>

            <View style={[styles.emailInputRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={styles.emailInputHeader}>
                <Text style={[styles.toggleLabel, { color: colors.foreground, flex: 1 }]}>Mobile number</Text>
                <View style={styles.emailStatusContainer}>
                  {phoneSaved && (
                    <Text style={[styles.savedLabel, styles.emailStatusAbsolute, { color: colors.primary }]}>Saved ✓</Text>
                  )}
                  {phoneError && (
                    <View style={[styles.emailStatusAbsolute, { flexDirection: "row", alignItems: "center", gap: 3 }]}>
                      <Text style={[styles.savedLabel, { color: "#ef4444" }]}>Couldn't save</Text>
                      <Pressable onPress={handlePhoneRetry} hitSlop={8}>
                        <Text style={[styles.savedLabel, { color: colors.primary }]}>Retry</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.toggleDesc, { color: colors.mutedForeground, marginBottom: 8 }]}>
                Include country code (e.g. +1 555 123 4567). Never shown publicly.
              </Text>
              <TextInput
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (phoneValidationError && /^\+?[\d\s\-().]{7,20}$/.test(text.trim())) setPhoneValidationError(false);
                }}
                onBlur={() => savePhoneNumber(phoneNumber)}
                placeholder="+1 555 123 4567"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="phone-pad"
                style={[
                  styles.emailInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.background,
                    borderColor: phoneValidationError ? "#ef4444" : colors.border,
                  },
                ]}
              />
              {phoneValidationError && (
                <Text style={[styles.toggleDesc, { color: "#ef4444", marginTop: 4 }]}>
                  Please enter a valid phone number with country code.
                </Text>
              )}
              {!phoneValidationError && !hasPhone && !smsPaused && (
                <Text style={[styles.toggleDesc, { color: "#f59e0b", marginTop: 4 }]}>
                  Add a phone number above to receive SMS alerts.
                </Text>
              )}
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
  headerRight: { width: 120, alignItems: "flex-end", justifyContent: "center" },
  errorLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
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
  emailStatusContainer: {
    position: "relative",
    height: 18,
    minWidth: 120,
    alignItems: "flex-end",
  },
  emailStatusAbsolute: {
    position: "absolute",
    right: 0,
  },
  emailInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  emailWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "rgba(245, 158, 11, 0.10)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(245, 158, 11, 0.25)",
  },
  emailPausedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "rgba(245, 158, 11, 0.10)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(245, 158, 11, 0.25)",
  },
  emailPausedText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: "#fbbf24",
  },
  emailBouncedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "rgba(239, 68, 68, 0.10)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(239, 68, 68, 0.25)",
  },
  emailBouncedText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: "#ef4444",
  },
  emailWarningIcon: {
    marginTop: 1,
  },
  emailWarningText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: "#fbbf24",
  },
  smsSnoozeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  snoozePill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  snoozePillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  snoozePickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  snoozeOption: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  snoozeOptionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  snoozeCancel: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  smsPausedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "rgba(56, 189, 248, 0.10)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(56, 189, 248, 0.25)",
  },
  smsPausedText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: "#38bdf8",
  },
});
