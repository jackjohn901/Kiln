import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

interface ShippingSettings {
  offerFreeShipping: boolean;
  domesticRate: number;
  internationalRate: number;
  perItemRate: number;
  freeThreshold: number;
  offerLocalPickup: boolean;
}

const EMPTY_SHIPPING: ShippingSettings = {
  offerFreeShipping: false,
  domesticRate: 0,
  internationalRate: 0,
  perItemRate: 0,
  freeThreshold: 0,
  offerLocalPickup: false,
};

function RateField({
  label,
  hint,
  value,
  onChange,
  colors,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.rateInputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.dollarSign, { color: colors.mutedForeground }]}>$</Text>
        <TextInput
          style={[styles.rateInput, { color: colors.foreground }]}
          value={value === 0 ? "" : String(value)}
          onChangeText={(v) => {
            const n = parseFloat(v);
            onChange(isNaN(n) ? 0 : n);
          }}
          placeholder="0"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
        />
      </View>
      {hint ? (
        <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

export default function ShippingSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [shipping, setShipping] = useState<ShippingSettings>(EMPTY_SHIPPING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avgListingPrice, setAvgListingPrice] = useState<number | null>(null);
  const [samplePrice, setSamplePrice] = useState<number>(45);

  useEffect(() => {
    apiGet<{ shippingSettings?: Partial<ShippingSettings> }>("/api/me/settings")
      .then((data) => {
        if (data.shippingSettings) {
          setShipping((s) => ({ ...s, ...data.shippingSettings }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiGet<{ listings: Array<{ price: number; status?: string }> }>("/api/me/listings")
      .then((data) => {
        if (!data?.listings?.length) return;
        const active = data.listings.filter((l) => !l.status || l.status === "active" || l.status === "live");
        const source = active.length > 0 ? active : data.listings;
        const avg = Math.round(source.reduce((sum, l) => sum + l.price, 0) / source.length);
        setAvgListingPrice(avg);
        setSamplePrice(avg);
      })
      .catch(() => {});
  }, []);

  const saveShipping = async () => {
    setSaving(true);
    try {
      await apiPatch("/api/me/settings", { shippingSettings: shipping });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {
      Alert.alert("Error", "Could not save shipping settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Shipping Rates</Text>
        <View style={{ width: 34 }} />
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
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.howItWorks}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                HOW IT WORKS
              </Text>
              <Text style={[styles.howItWorksText, { color: colors.mutedForeground }]}>
                Buyers see your shipping rates at checkout. You arrange shipping directly with each
                buyer after payment.
              </Text>
            </View>

            <View style={styles.fields}>
              <View
                style={[styles.toggleRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleTitle, { color: colors.foreground }]}>
                    Offer free shipping
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
                    Waive shipping on all orders
                  </Text>
                </View>
                <Switch
                  value={shipping.offerFreeShipping}
                  onValueChange={(v) => setShipping((s) => ({ ...s, offerFreeShipping: v }))}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              {!shipping.offerFreeShipping && (
                <>
                  <RateField
                    label="Domestic rate (USA)"
                    hint="Per order, not per item"
                    value={shipping.domesticRate}
                    onChange={(v) => setShipping((s) => ({ ...s, domesticRate: v }))}
                    colors={colors}
                  />
                  <RateField
                    label="Per additional item"
                    hint="Added for each item beyond the first. Set to 0 to disable."
                    value={shipping.perItemRate}
                    onChange={(v) => setShipping((s) => ({ ...s, perItemRate: v }))}
                    colors={colors}
                  />
                  <RateField
                    label="International rate"
                    value={shipping.internationalRate}
                    onChange={(v) => setShipping((s) => ({ ...s, internationalRate: v }))}
                    colors={colors}
                  />
                  <RateField
                    label="Free shipping threshold"
                    hint="Orders over this amount ship free. Set to 0 to disable."
                    value={shipping.freeThreshold}
                    onChange={(v) => setShipping((s) => ({ ...s, freeThreshold: v }))}
                    colors={colors}
                  />
                </>
              )}

              <View style={[styles.toggleRow, { borderBottomColor: "transparent" }]}>
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleTitle, { color: colors.foreground }]}>
                    Offer free local pickup
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
                    Let local buyers skip shipping
                  </Text>
                </View>
                <Switch
                  value={shipping.offerLocalPickup}
                  onValueChange={(v) => setShipping((s) => ({ ...s, offerLocalPickup: v }))}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Buyer preview */}
            <View style={styles.previewSection}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={[styles.previewHeading, { color: colors.mutedForeground, marginBottom: 0 }]}>
                  Buyer preview
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Sample order:</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.card, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>$</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={String(samplePrice)}
                      onChangeText={(v) => {
                        const n = parseInt(v, 10);
                        if (!isNaN(n)) setSamplePrice(Math.max(0, Math.min(9999, n)));
                        else if (v === "") setSamplePrice(0);
                      }}
                      style={{ fontSize: 11, color: colors.foreground, minWidth: 40, textAlign: "right" }}
                    />
                  </View>
                </View>
              </View>
              <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                {(
                  [
                    { label: "Domestic buyer (USA)", flag: "🇺🇸", type: "domestic" as const },
                    { label: "International buyer", flag: "🌍", type: "international" as const },
                  ] as const
                ).map(({ label, flag, type }, idx) => {
                  const sampleTotal = samplePrice;
                  const sampleLabel = `$${samplePrice} order${avgListingPrice != null ? ` · avg. $${avgListingPrice}` : ""}`;
                  const baseRate = type === "domestic" ? shipping.domesticRate : shipping.internationalRate;
                  let cost: string;
                  let multiItemCost: string | null = null;
                  if (shipping.offerFreeShipping) {
                    cost = "Free shipping";
                  } else if (shipping.freeThreshold > 0 && sampleTotal >= shipping.freeThreshold) {
                    cost = "Free shipping";
                  } else {
                    cost = baseRate === 0 ? "Free shipping" : `$${baseRate.toFixed(2)}`;
                    if (shipping.perItemRate > 0 && cost !== "Free shipping") {
                      multiItemCost = `$${(baseRate + shipping.perItemRate).toFixed(2)}`;
                    }
                  }
                  const isFree = cost === "Free shipping";
                  return (
                    <View
                      key={type}
                      style={[
                        styles.previewRow,
                        idx === 0 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border } : undefined,
                      ]}
                    >
                      <View style={styles.previewRowLeft}>
                        <Text style={styles.previewFlag}>{flag}</Text>
                        <View>
                          <Text style={[styles.previewRowLabel, { color: colors.foreground }]}>{label}</Text>
                          <Text style={[styles.previewRowSub, { color: colors.mutedForeground }]}>{sampleLabel}</Text>
                        </View>
                      </View>
                      {multiItemCost ? (
                        <View style={{ alignItems: "flex-end", gap: 2 }}>
                          <Text style={[styles.previewRowSub, { color: colors.mutedForeground }]}>
                            1 item: <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>{cost}</Text>
                          </Text>
                          <Text style={[styles.previewRowSub, { color: colors.mutedForeground }]}>
                            2 items: <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>{multiItemCost}</Text>
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.previewCost, { color: isFree ? "#34D399" : colors.foreground }]}>
                          {cost}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
              {!shipping.offerFreeShipping && shipping.freeThreshold > 0 && (
                <Text style={[styles.previewNote, { color: colors.mutedForeground }]}>
                  Orders over ${shipping.freeThreshold.toFixed(0)} qualify for free shipping
                </Text>
              )}
            </View>

            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
              ]}
              onPress={saveShipping}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                  {saved ? "Saved!" : "Save shipping rates"}
                </Text>
              )}
            </Pressable>
          </View>

          <View
            style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
              <Text style={[styles.tipBold, { color: colors.foreground }]}>Tip: </Text>
              For large or fragile work, include packaging materials, insurance, and your time in
              the shipping rate. White glove and crated delivery can cost $150–$500+ for large
              sculptures.
            </Text>
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
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleInfo: { flex: 1, gap: 2, paddingRight: 12 },
  toggleTitle: { fontFamily: "Inter_500Medium", fontSize: 14 },
  toggleSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  field: { gap: 4 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  rateInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  dollarSign: { fontFamily: "Inter_400Regular", fontSize: 14 },
  rateInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  fieldHint: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 15 },
  saveBtn: {
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  tipCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  tipText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  tipBold: { fontFamily: "Inter_500Medium" },
  previewSection: { gap: 8 },
  previewHeading: { fontFamily: "Inter_500Medium", fontSize: 11 },
  previewCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  previewRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewFlag: { fontSize: 18 },
  previewRowLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  previewRowSub: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 },
  previewCost: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  previewNote: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 15 },
});
