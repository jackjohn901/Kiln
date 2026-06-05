import {
  Pressable,
  Text,
  View,
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
} from "react-native";
import { useEffect, useRef } from "react";
import type { SaleEvent } from "@/lib/useWebSocket";

interface Props {
  sale: SaleEvent | null;
  onDismiss: () => void;
  onView: () => void;
  onAnimatedOut?: () => void;
}

export const AUTO_DISMISS_MS = 6000;

/** Duration of the slide-out (dismiss) timing animation in ms. */
export const SLIDE_OUT_MS = 300;

/**
 * Off-screen translateX distance. Large enough to clear the card width on any
 * device without needing a runtime Dimensions call.
 */
const OFFSCREEN_X = 420;

/**
 * Minimum rightward drag distance (px) past which a release dismisses the
 * banner even if the swipe was slow.
 */
const SWIPE_DISMISS_THRESHOLD = 80;

/**
 * Minimum rightward fling velocity (px/ms) past which a release dismisses the
 * banner even if the drag was short.
 */
const SWIPE_VELOCITY_THRESHOLD = 0.3;

export function SaleBanner({ sale, onDismiss, onView, onAnimatedOut }: Props) {
  const translateX = useRef(new Animated.Value(OFFSCREEN_X)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const onAnimatedOutRef = useRef(onAnimatedOut);
  onAnimatedOutRef.current = onAnimatedOut;

  // Set when a swipe has already animated the banner off-screen with velocity,
  // so the slide-out effect below doesn't replay the timing animation.
  const dismissedBySwipeRef = useRef(false);

  const startAutoDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onDismissRef.current();
    }, AUTO_DISMISS_MS);
  };

  // Created once; reads everything it needs through stable refs.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) =>
        g.dx > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => {
        // Pause auto-dismiss while the user is interacting.
        if (timerRef.current) clearTimeout(timerRef.current);
      },
      onPanResponderMove: (_evt, g) => {
        // Only allow rightward drag (the dismiss direction).
        translateX.setValue(Math.max(0, g.dx));
      },
      onPanResponderRelease: (_evt, g) => {
        const dragged = Math.max(0, g.dx);
        const shouldDismiss =
          dragged > SWIPE_DISMISS_THRESHOLD ||
          g.vx > SWIPE_VELOCITY_THRESHOLD;

        if (shouldDismiss) {
          // Feed the fling velocity into the slide-out: faster swipe → shorter
          // remaining travel time, for a natural hand-off from finger to motion.
          const remaining = OFFSCREEN_X - dragged;
          const velocity = Math.max(Math.abs(g.vx), 0.1);
          const duration = Math.max(
            120,
            Math.min(SLIDE_OUT_MS, remaining / velocity),
          );
          dismissedBySwipeRef.current = true;
          Animated.timing(translateX, {
            toValue: OFFSCREEN_X,
            duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) onDismissRef.current();
          });
        } else {
          // Not far/fast enough — settle back and re-arm auto-dismiss.
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
          startAutoDismiss();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start();
        startAutoDismiss();
      },
    }),
  ).current;

  useEffect(() => {
    if (sale) {
      dismissedBySwipeRef.current = false;
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      startAutoDismiss();
    } else if (dismissedBySwipeRef.current) {
      // A swipe already animated the banner off-screen with its own velocity;
      // skip the timing replay and just signal completion.
      dismissedBySwipeRef.current = false;
      onAnimatedOutRef.current?.();
    } else {
      Animated.timing(translateX, {
        toValue: OFFSCREEN_X,
        duration: SLIDE_OUT_MS,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onAnimatedOutRef.current?.();
        }
      });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sale, translateX]);

  const bodyText = sale ? sale.text.replace(/^New sale:\s*/i, "") : "";

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateX }] }]}
      pointerEvents={sale ? "box-none" : "none"}
    >
      <View style={styles.inner} {...panResponder.panHandlers}>
        <Pressable onPress={onView} style={styles.content}>
          <View style={styles.dot} />
          <View style={styles.textBlock}>
            <Text style={styles.title}>New Sale!</Text>
            <Text style={styles.body} numberOfLines={2}>
              <Text style={styles.fromName}>{sale?.fromName ?? ""}</Text>
              {bodyText ? ` — ${bodyText}` : ""}
            </Text>
          </View>
        </Pressable>
        <View style={styles.actions}>
          <Pressable onPress={onView} style={styles.viewButton} hitSlop={8}>
            <Text style={styles.viewText}>View</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            style={styles.dismissButton}
            hitSlop={8}
          >
            <Text style={styles.dismissText}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 56,
    right: 12,
    zIndex: 9999,
    maxWidth: 340,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#1a2e1a",
    borderWidth: 1,
    borderColor: "#2d5a2d",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80",
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: "#4ade80",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
  },
  body: {
    color: "#a3c9a3",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  fromName: {
    fontFamily: "Inter_600SemiBold",
    color: "#d4edd4",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  viewButton: {
    backgroundColor: "#2d5a2d",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  viewText: {
    color: "#4ade80",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  dismissButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  dismissText: {
    color: "#6b9e6b",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
