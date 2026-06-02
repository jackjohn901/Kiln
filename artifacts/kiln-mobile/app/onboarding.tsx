import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  ZoomIn,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

export const ONBOARDING_DONE_KEY = "kiln:onboarding_done";

type Goal = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  blurb: string;
};

const GOALS: Goal[] = [
  { id: "share", icon: "video", title: "Share my process", blurb: "Post reels of work in progress" },
  { id: "sell", icon: "shopping-bag", title: "Sell my work", blurb: "Reach buyers who love craft" },
  { id: "learn", icon: "book-open", title: "Learn & connect", blurb: "Join guilds, take workshops" },
  { id: "support", icon: "heart", title: "Support artists", blurb: "Follow and patron creators" },
];

const GOAL_LINE: Record<string, string> = {
  share: "The world is about to see how it's really made.",
  sell: "Your next collector is already scrolling.",
  learn: "Every master was once a beginner. Welcome in.",
  support: "Craft survives because of people like you.",
};

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);

  const firstName = user?.firstName?.trim() || (user?.email ? user.email.split("@")[0] : "") || "maker";

  async function finish() {
    try {
      await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "1");
    } catch {
      // Non-fatal: if persistence fails the worst case is onboarding shows again.
    }
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
    } catch {
      // Review prompt is best-effort; never block entry to the app.
    }
    router.replace("/(tabs)");
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 24);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: insets.bottom + 24 }]}>
      <LinearGradient
        colors={[`${colors.primary}26`, "transparent"]}
        style={styles.topGradient}
      />

      {/* progress dots */}
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i <= step ? colors.primary : colors.border },
            ]}
          />
        ))}
      </View>

      {step === 0 && (
        <Animated.View
          key="welcome"
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(200)}
          style={styles.stepInner}
        >
          <Animated.View entering={ZoomIn.delay(120).springify()} style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
            <Feather name="wind" size={40} color={colors.primaryForeground} />
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(260)} style={[styles.bigTitle, { color: colors.foreground }]}>
            Welcome to Kiln,{"\n"}{firstName}.
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(420)} style={[styles.sub, { color: colors.mutedForeground }]}>
            A home for makers — where the process is the point and your craft finds its people.
          </Animated.Text>
        </Animated.View>
      )}

      {step === 1 && (
        <Animated.View
          key="goal"
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(200)}
          style={styles.stepInner}
        >
          <Animated.Text entering={FadeInUp} style={[styles.title, { color: colors.foreground }]}>
            What brings you here?
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(120)} style={[styles.sub, { color: colors.mutedForeground, marginBottom: 24 }]}>
            Pick one — we'll shape your feed around it.
          </Animated.Text>
          <View style={styles.goalGrid}>
            {GOALS.map((g, i) => {
              const selected = goal?.id === g.id;
              return (
                <Animated.View key={g.id} entering={FadeInDown.delay(160 + i * 80)} style={styles.goalWrap}>
                  <Pressable
                    onPress={() => setGoal(g)}
                    style={[
                      styles.goalCard,
                      {
                        backgroundColor: selected ? `${colors.primary}1f` : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.goalIcon, { backgroundColor: selected ? colors.primary : `${colors.primary}22` }]}>
                      <Feather name={g.icon} size={20} color={selected ? colors.primaryForeground : colors.primary} />
                    </View>
                    <Text style={[styles.goalTitle, { color: colors.foreground }]}>{g.title}</Text>
                    <Text style={[styles.goalBlurb, { color: colors.mutedForeground }]}>{g.blurb}</Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      )}

      {step === 2 && goal && (
        <Animated.View
          key="summary"
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(200)}
          style={styles.stepInner}
        >
          <Animated.View entering={ZoomIn.springify()} style={[styles.summaryIcon, { backgroundColor: colors.primary }]}>
            <Feather name={goal.icon} size={44} color={colors.primaryForeground} />
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(220)} style={[styles.title, { color: colors.foreground, textAlign: "center" }]}>
            You're all set, {firstName}.
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(380)} style={[styles.line, { color: colors.primary }]}>
            {GOAL_LINE[goal.id]}
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(540)} style={[styles.sub, { color: colors.mutedForeground, textAlign: "center" }]}>
            Your feed is warming up. Let's get you in.
          </Animated.Text>
        </Animated.View>
      )}

      {/* actions */}
      <View style={styles.actions}>
        {step < 2 ? (
          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: step === 1 && !goal ? 0.5 : 1 },
            ]}
            disabled={step === 1 && !goal}
            onPress={() => setStep((s) => s + 1)}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
              {step === 0 ? "Let's go" : "Continue"}
            </Text>
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          </Pressable>
        ) : (
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={finish}>
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Enter Kiln</Text>
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  topGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 260 },
  dots: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 8 },
  dot: { height: 6, width: 22, borderRadius: 3 },
  stepInner: { flex: 1, justifyContent: "center" },
  logoIcon: {
    height: 84, width: 84, borderRadius: 24, alignItems: "center", justifyContent: "center",
    alignSelf: "flex-start", marginBottom: 28,
  },
  bigTitle: { fontFamily: "Inter_700Bold", fontSize: 34, lineHeight: 40, marginBottom: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 8 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 16, lineHeight: 23 },
  goalGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  goalWrap: { width: "48%", marginBottom: 14 },
  goalCard: { borderWidth: 1.5, borderRadius: 18, padding: 16, minHeight: 132 },
  goalIcon: { height: 40, width: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  goalTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 4 },
  goalBlurb: { fontFamily: "Inter_400Regular", fontSize: 12.5, lineHeight: 17 },
  summaryIcon: {
    height: 100, width: 100, borderRadius: 30, alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 28,
  },
  line: { fontFamily: "Inter_600SemiBold", fontSize: 19, lineHeight: 26, textAlign: "center", marginVertical: 14 },
  actions: { gap: 12 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 54, borderRadius: 16,
  },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
});
