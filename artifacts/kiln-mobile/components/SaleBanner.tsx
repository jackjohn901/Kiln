import {
  Pressable,
  Text,
  View,
  StyleSheet,
  Animated,
  Easing,
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

export function SaleBanner({ sale, onDismiss, onView, onAnimatedOut }: Props) {
  const translateX = useRef(new Animated.Value(OFFSCREEN_X)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const onAnimatedOutRef = useRef(onAnimatedOut);
  onAnimatedOutRef.current = onAnimatedOut;

  useEffect(() => {
    if (sale) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onDismissRef.current();
      }, AUTO_DISMISS_MS);
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
      <Pressable onPress={onView} style={styles.inner}>
        <View style={styles.dot} />
        <View style={styles.textBlock}>
          <Text style={styles.title}>New Sale!</Text>
          <Text style={styles.body} numberOfLines={2}>
            <Text style={styles.fromName}>{sale?.fromName ?? ""}</Text>
            {bodyText ? ` — ${bodyText}` : ""}
          </Text>
        </View>
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
      </Pressable>
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
