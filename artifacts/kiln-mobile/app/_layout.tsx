import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UpdateBanner } from "@/components/UpdateBanner";
import { SaleNotificationListener } from "@/components/SaleNotificationListener";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useAppUpdates } from "@/hooks/useAppUpdates";
import { ONBOARDING_DONE_KEY } from "@/app/onboarding";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);
setAuthTokenGetter(() => SecureStore.getItemAsync("auth_session_token"));

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

/**
 * Global overlays that must survive tab and stack navigation.
 *
 * These components are rendered as siblings to the <Stack> navigator, not
 * inside any screen, so they never unmount when the user switches tabs or
 * pushes/pops a screen. This is intentional:
 *
 * - SaleNotificationListener: manages a WebSocket subscription and a queue of
 *   incoming sale events. If it were mounted inside a tab screen it would
 *   unmount on navigation, dropping the queue and any mid-display banner.
 *   Keeping it here at root ensures banners continue to show and queue
 *   correctly regardless of which screen the artist is on.
 *
 * - UpdateBanner: similar reasoning — OTA update state must persist across
 *   the full session.
 */
function RootOverlays() {
  const updateState = useAppUpdates();
  return (
    <>
      <UpdateBanner updateState={updateState} />
      <SaleNotificationListener />
    </>
  );
}

/**
 * Sends freshly-authenticated, first-time users into the onboarding flow once.
 *
 * Runs after auth resolves: if the user is signed in, hasn't completed
 * onboarding, and isn't already on the onboarding screen, it routes them there.
 * The `kiln:onboarding_done` flag (set when onboarding finishes) makes this
 * fire at most once per install. A ref guards against re-triggering while the
 * async storage read is in flight.
 */
function useOnboardingGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const onOnboarding = segments[0] === "onboarding";
  const checking = useRef(false);
  const handled = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || onOnboarding || handled.current || checking.current) return;
    checking.current = true;
    const authedAtStart = isAuthenticated;
    AsyncStorage.getItem(ONBOARDING_DONE_KEY)
      .then((done) => {
        // Mark the gate resolved for this sign-in regardless of outcome so we
        // never re-read storage on later navigation. Guard against a sign-out
        // that happened while the read was in flight (stale completion).
        handled.current = true;
        if (!done && authedAtStart) {
          router.replace("/onboarding");
        }
      })
      .catch((err) => {
        console.warn("Onboarding gate: failed to read flag", err);
      })
      .finally(() => {
        checking.current = false;
      });
  }, [isAuthenticated, isLoading, onOnboarding]);

  // Reset when the user signs out so a future sign-in can re-evaluate.
  useEffect(() => {
    if (!isAuthenticated) handled.current = false;
  }, [isAuthenticated]);
}

function RootLayoutNav() {
  useOnboardingGate();
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="chat/[threadId]" options={{ headerShown: true, headerTitle: "", headerBackTitle: "Back" }} />
      </Stack>
      {/*
       * RootOverlays is intentionally rendered outside <Stack> so its
       * component subtree — and the WebSocket connection + sale queue inside
       * SaleNotificationListener — are never torn down by navigation events.
       */}
      <RootOverlays />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
