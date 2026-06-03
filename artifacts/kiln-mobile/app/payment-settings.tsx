import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPatch } from "@/lib/api";

interface ArtistPayments {
  stripeLink: string;
  venmo: string;
  cashapp: string;
  paypalMe: string;
  notes: string;
  processingWindow?: number;
  processingWindowLabel?: string;
}

const EMPTY_PAYMENTS: ArtistPayments = {
  stripeLink: "",
  venmo: "",
  cashapp: "",
  paypalMe: "",
  notes: "",
  processingWindow: undefined,
  processingWindowLabel: undefined,
};

function PayField({
  label,
  placeholder,
  hint,
  value,
  onChange,
  colors,
}: {
  label: string;
  placeholder: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.payField}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>{hint}</Text>
    </View>
  );
}

export default function PaymentSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [payments, setPayments] = useState<ArtistPayments>(EMPTY_PAYMENTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const errorOpacity = useRef(new Animated.Value(0)).current;
  const errorScale = useRef(new Animated.Value(0.6)).current;
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

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
    apiGet<{ paymentSettings?: ArtistPayments }>("/api/me/settings")
      .then((data) => {
        if (data.paymentSettings) {
          setPayments((p) => ({ ...p, ...data.paymentSettings }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const performSave = useCallback(async () => {
    setSaving(true);
    try {
      await apiPatch("/api/me/settings", { paymentSettings: payments });
      if (!mountedRef.current) return;
      setSaveError(false);
      setSaved(true);
      setTimeout(() => { if (mountedRef.current) setSaved(false); }, 1800);
    } catch {
      if (!mountedRef.current) return;
      setSaved(false);
      setSaveError(true);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setSaveError(false);
      }, 3000);
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [payments]);

  const savePayments = performSave;

  const handleRetry = useCallback(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setSaveError(false);
    performSave();
  }, [performSave]);

  const previewLabel = payments.processingWindowLabel?.trim() ?? "";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Payment Methods</Text>
        <View style={styles.headerRight}>
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.howItWorks}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                HOW IT WORKS
              </Text>
              <Text style={[styles.howItWorksText, { color: colors.mutedForeground }]}>
                Kiln is free — buyers pay you directly using the methods below. Add at least one so
                buyers can complete purchases from your listings.
              </Text>
            </View>

            <View style={styles.fields}>
              <PayField
                label="Stripe payment link"
                placeholder="https://buy.stripe.com/..."
                hint="Create a payment link at dashboard.stripe.com → Payment Links"
                value={payments.stripeLink}
                onChange={(v) => setPayments((p) => ({ ...p, stripeLink: v }))}
                colors={colors}
              />
              <PayField
                label="Venmo"
                placeholder="@yourhandle"
                hint="Your Venmo @username"
                value={payments.venmo}
                onChange={(v) => setPayments((p) => ({ ...p, venmo: v }))}
                colors={colors}
              />
              <PayField
                label="Cash App"
                placeholder="$yourcashtag"
                hint="Your Cash App $cashtag"
                value={payments.cashapp}
                onChange={(v) => setPayments((p) => ({ ...p, cashapp: v }))}
                colors={colors}
              />
              <PayField
                label="PayPal.me"
                placeholder="paypal.me/yourname"
                hint="Your PayPal.me link or username"
                value={payments.paypalMe}
                onChange={(v) => setPayments((p) => ({ ...p, paypalMe: v }))}
                colors={colors}
              />

              <View style={styles.payField}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  Delivery estimate
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                  value={payments.processingWindowLabel ?? ""}
                  onChangeText={(v) =>
                    setPayments((p) => ({ ...p, processingWindowLabel: v || undefined }))
                  }
                  placeholder="e.g. 2–3 weeks after firing"
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={80}
                />
                <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                  Buyers see this estimate at checkout. Leave blank to show the default
                  "3–5 business days".
                </Text>

                {previewLabel.length > 0 && (
                  <View style={styles.previewContainer}>
                    <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>
                      Buyer preview
                    </Text>
                    <View
                      style={[
                        styles.previewCard,
                        {
                          borderColor: "rgba(245,158,11,0.3)",
                          backgroundColor: "rgba(245,158,11,0.08)",
                        },
                      ]}
                    >
                      <Feather
                        name="alert-triangle"
                        size={14}
                        color="#F59E0B"
                        style={styles.previewIcon}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.previewTitle}>Manual payout artist</Text>
                        <Text style={styles.previewBody}>
                          This artist manages payouts manually. Your order will be processed
                          within {previewLabel}.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.payField}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  Note to buyers (optional)
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    styles.textArea,
                    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                  value={payments.notes}
                  onChangeText={(v) => setPayments((p) => ({ ...p, notes: v }))}
                  placeholder='e.g. "Please include artwork title in payment note"'
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
              ]}
              onPress={savePayments}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                  {saved ? "Saved!" : "Save payment methods"}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
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
  content: { padding: 16, gap: 16 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 20,
  },
  howItWorks: { gap: 4 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  howItWorksText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  fields: { gap: 16 },
  payField: { gap: 4 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  textArea: { height: 70, textAlignVertical: "top" },
  fieldHint: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 15 },
  previewContainer: { marginTop: 8, gap: 6 },
  previewLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
  previewCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  previewIcon: { marginTop: 1 },
  previewTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#FCD34D",
    marginBottom: 2,
  },
  previewBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(252,211,77,0.7)",
    lineHeight: 17,
  },
  saveBtn: {
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
});
