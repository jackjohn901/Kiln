import * as Updates from "expo-updates";
import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "ready"
  | "error";

export interface AppUpdateState {
  status: UpdateStatus;
  isReadyToReload: boolean;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

/**
 * Silently checks for OTA updates on launch and whenever the app comes
 * back to the foreground. Downloads in the background without interrupting
 * the user. Shows a gentle banner when ready — user can tap to refresh
 * or ignore it and get the update on their next cold launch.
 *
 * User content (AsyncStorage, SecureStore, local state) is never affected
 * by an OTA update — only the JavaScript bundle is replaced.
 */
export function useAppUpdates(): AppUpdateState {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [isReadyToReload, setIsReadyToReload] = useState(false);
  const hasChecked = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  async function checkAndDownload() {
    if (!Updates.isEnabled) return;

    try {
      setStatus("checking");
      const result = await Updates.checkForUpdateAsync();

      if (!result.isAvailable) {
        setStatus("idle");
        return;
      }

      setStatus("downloading");
      await Updates.fetchUpdateAsync();
      setStatus("ready");
      setIsReadyToReload(true);
    } catch {
      setStatus("error");
    }
  }

  async function applyUpdate() {
    try {
      await Updates.reloadAsync();
    } catch {
      setStatus("error");
    }
  }

  function dismissUpdate() {
    setIsReadyToReload(false);
    setStatus("idle");
  }

  useEffect(() => {
    if (!hasChecked.current) {
      hasChecked.current = true;
      checkAndDownload();
    }

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const wasBackground =
          appState.current === "background" ||
          appState.current === "inactive";
        const isNowActive = nextState === "active";

        if (wasBackground && isNowActive && status === "idle") {
          checkAndDownload();
        }

        appState.current = nextState;
      }
    );

    return () => subscription.remove();
  }, [status]);

  return { status, isReadyToReload, applyUpdate, dismissUpdate };
}
