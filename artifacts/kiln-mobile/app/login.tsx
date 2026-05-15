import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { router } from "expo-router";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, isLoading, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    router.replace("/(tabs)");
    return null;
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[`${colors.primary}22`, "transparent"]}
        style={styles.topGradient}
      />

      <View style={[styles.inner, { paddingTop: topPad + 40, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.logoArea}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Feather name="wind" size={32} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.logoText, { color: colors.foreground }]}>kiln</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Where craft meets community
          </Text>
        </View>

        <View style={styles.features}>
          {[
            { icon: "video" as const, text: "Share your craft process with the world" },
            { icon: "users" as const, text: "Connect with artists in your medium" },
            { icon: "star" as const, text: "Support creators through patronage" },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}22` }]}>
                <Feather name={icon} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground }]}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
            onPress={login}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>
                Sign In to Kiln
              </Text>
            )}
          </Pressable>
          <Text style={[styles.legal, { color: colors.mutedForeground }]}>
            By signing in you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 300 },
  inner: { flex: 1, paddingHorizontal: 32, justifyContent: "space-between" },
  logoArea: { alignItems: "center", gap: 12 },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "Inter_700Bold",
    fontSize: 42,
    letterSpacing: -1.5,
  },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 16 },
  features: { gap: 20 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontFamily: "Inter_500Medium", fontSize: 15, flex: 1 },
  actions: { gap: 16 },
  loginBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
  },
  loginBtnText: { fontFamily: "Inter_700Bold", fontSize: 17 },
  legal: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
