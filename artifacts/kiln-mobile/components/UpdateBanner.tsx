import { Pressable, Text, View, StyleSheet, Animated } from "react-native";
import { useEffect, useRef } from "react";
import type { AppUpdateState } from "@/hooks/useAppUpdates";

interface Props {
  updateState: AppUpdateState;
}

export function UpdateBanner({ updateState }: Props) {
  const { isReadyToReload, applyUpdate, dismissUpdate } = updateState;
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isReadyToReload ? 0 : -80,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [isReadyToReload, translateY]);

  if (!isReadyToReload) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <View style={styles.inner}>
        <Text style={styles.message}>Update ready</Text>
        <View style={styles.actions}>
          <Pressable onPress={applyUpdate} style={styles.refreshButton}>
            <Text style={styles.refreshText}>Refresh now</Text>
          </Pressable>
          <Pressable onPress={dismissUpdate} style={styles.dismissButton}>
            <Text style={styles.dismissText}>Later</Text>
          </Pressable>
        </View>
      </View>
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
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#D87F31",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  message: {
    color: "#191615",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  refreshButton: {
    backgroundColor: "#191615",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  refreshText: {
    color: "#E6E1DB",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  dismissButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dismissText: {
    color: "#191615",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    opacity: 0.7,
  },
});
