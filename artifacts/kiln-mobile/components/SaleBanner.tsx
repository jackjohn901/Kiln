import { Pressable, Text, View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import type { SaleEvent } from "@/lib/useWebSocket";

interface Props {
  sale: SaleEvent | null;
  onDismiss: () => void;
  onView: () => void;
}

const AUTO_DISMISS_MS = 6000;

export function SaleBanner({ sale, onDismiss, onView }: Props) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sale) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, AUTO_DISMISS_MS);
    } else {
      Animated.spring(translateY, {
        toValue: -100,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sale, translateY, onDismiss]);

  if (!sale) return null;

  const bodyText = sale.text.replace(/^New sale:\s*/i, "");

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <Pressable onPress={onView} style={styles.inner}>
        <View style={styles.dot} />
        <View style={styles.textBlock}>
          <Text style={styles.title}>New Sale!</Text>
          <Text style={styles.body} numberOfLines={2}>
            <Text style={styles.fromName}>{sale.fromName}</Text>
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
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 56,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: "#1a2e1a",
    borderBottomWidth: 1,
    borderBottomColor: "#2d5a2d",
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
