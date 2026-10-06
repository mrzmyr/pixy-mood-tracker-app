import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, BackHandler, Keyboard } from "react-native";
import type { AppStateStatus } from "react-native";
import { createMissingProviderError } from "@/lib/errors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useRemoteFeatureFlag } from "@/state/featureFlags";
import { useSettings, useSettingsLoad } from "@/state/settings";
import { authenticate, getUnlockMethod } from "./deviceAuth";
import type { UnlockMethod, UnlockResult } from "./deviceAuth";
import { isLockDue } from "./lockTiming";

interface AppLockValue {
  /** Setting is on. The lock screen shows only while `isLocked`. */
  isEnabled: boolean;
  /** Lock screen with Unlock button shows. */
  isLocked: boolean;
  /** App is not in front: the lock screen hides content without a button. */
  isCovered: boolean;
  /** `null` until read from the device. */
  unlockMethod: UnlockMethod | null;
  /** Last unlock attempt failed with an error, not a cancel. */
  hasFailed: boolean;
  unlock: () => Promise<void>;
  /** Turns the lock on or off after a successful OS prompt. */
  setEnabled: (enabled: boolean) => Promise<UnlockResult>;
}

const AppLockContext = createContext<AppLockValue | null>(null);

/** Errors that mean the device has no passcode or biometrics anymore. */
const NO_AUTH_ERRORS = new Set([
  "not_enrolled",
  "passcode_not_set",
  "not_available",
]);

/**
 * App lock state. Locks on launch and after `LOCK_AFTER_MS` away when
 * `appLockEnabled` is on, and asks for the OS prompt once per lock. Works
 * without the `app-lock` feature flag, so turning the flag off never opens a
 * locked app. The PostHog flag `app-lock-bypass` opens it for a targeted
 * person, for support. Render `AppLockScreen` once at the root.
 */
export const AppLockProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { settings, setSettings } = useSettings();
  const isSettingsReady = useSettingsLoad().status === "ready";
  const analytics = useAnalytics();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [unlockMethod, setUnlockMethod] = useState<UnlockMethod | null>(null);
  const leftAt = useRef<number | null>(null);
  const hasPrompted = useRef(false);
  // Guards against a second prompt before React renders `isAuthenticating`.
  const isPrompting = useRef(false);

  // Support backdoor: PostHog flag targeted at one person. The stored
  // setting stays, so the lock comes back when the flag goes off.
  const isBypassed = useRemoteFeatureFlag("app-lock-bypass");
  const isEnabled = isSettingsReady && settings.appLockEnabled;
  const isLocked = isEnabled && !isUnlocked && !isBypassed;
  const isCovered =
    isEnabled && !isBypassed && appState !== "active" && !isAuthenticating;

  // `authenticate` never throws, so the flags always reset.
  const runPrompt = useCallback(async (): Promise<UnlockResult> => {
    isPrompting.current = true;
    setIsAuthenticating(true);
    const result = await authenticate(t("app_lock_prompt"));
    isPrompting.current = false;
    // The OS prompt leaves the app `inactive` while it fades out. Keep the
    // cover off until the app is back in front, else it flashes.
    if (AppState.currentState === "active") {
      setIsAuthenticating(false);
    }
    return result;
  }, []);

  const refreshUnlockMethod = useCallback(async () => {
    setUnlockMethod(await getUnlockMethod());
  }, []);

  const unlock = useCallback(async () => {
    if (isPrompting.current) {
      return;
    }
    setHasFailed(false);
    const result = await runPrompt();
    if (result.status === "unlocked") {
      setIsUnlocked(true);
      return;
    }
    if (result.status === "cancelled") {
      return;
    }
    // Passcode removed while the lock was on: the phone itself is open, so
    // the lock protects nothing and would only keep the user from their data.
    if (
      NO_AUTH_ERRORS.has(String(result.error.status)) &&
      (await getUnlockMethod()) === "none"
    ) {
      setIsUnlocked(true);
      return;
    }
    setHasFailed(true);
    analytics.track("app:unlock_failed", {
      status: String(result.error.status),
    });
    console.warn(result.error);
  }, [runPrompt, analytics]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      const result = await runPrompt();
      if (result.status === "unlocked") {
        setIsUnlocked(true);
        setSettings((current) => ({ ...current, appLockEnabled: enabled }));
        analytics.track("settings:app_lock_toggled", { enabled });
      }
      return result;
    },
    [runPrompt, setSettings, analytics]
  );

  const onAppStateChange = useEffectEvent((next: AppStateStatus) => {
    setAppState(next);
    if (next === "background") {
      if (leftAt.current === null) {
        leftAt.current = Date.now();
      }
      return;
    }
    if (next !== "active") {
      return;
    }
    if (!isPrompting.current) {
      setIsAuthenticating(false);
    }
    void refreshUnlockMethod();
    if (isLockDue(leftAt.current, Date.now())) {
      setIsUnlocked(false);
      setHasFailed(false);
      hasPrompted.current = false;
    }
    leftAt.current = null;
  });

  useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      const method = await getUnlockMethod();
      if (isCurrent) {
        setUnlockMethod(method);
      }
    };
    void load();
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => {
      isCurrent = false;
      subscription.remove();
    };
  }, []);

  // One automatic prompt per lock. After a cancel, the Unlock button asks again.
  const onLocked = useEffectEvent(() => {
    Keyboard.dismiss();
    if (!hasPrompted.current) {
      hasPrompted.current = true;
      void unlock();
    }
  });

  useEffect(() => {
    if (isLocked && appState === "active") {
      // oxlint-disable-next-line react-doctor/no-chain-state-updates -- Opens the OS prompt, an external system; its result sets state later.
      onLocked();
    }
  }, [isLocked, appState]);

  const onBypassed = useEffectEvent(() => {
    analytics.track("app:app_lock_bypassed");
  });

  useEffect(() => {
    if (isEnabled && isBypassed) {
      onBypassed();
    }
  }, [isEnabled, isBypassed]);

  // Android back would navigate the screens under the lock screen.
  useEffect(() => {
    if (!isLocked) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true
    );
    return () => subscription.remove();
  }, [isLocked]);

  const value = useMemo(
    () => ({
      isEnabled,
      isLocked,
      isCovered,
      unlockMethod,
      hasFailed,
      unlock,
      setEnabled,
    }),
    [
      isEnabled,
      isLocked,
      isCovered,
      unlockMethod,
      hasFailed,
      unlock,
      setEnabled,
    ]
  );

  return (
    <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>
  );
};

/** App lock state from `AppLockProvider`. */
export const useAppLock = (): AppLockValue => {
  const value = useContext(AppLockContext);
  if (!value) {
    throw createMissingProviderError("useAppLock", "AppLockProvider");
  }
  return value;
};
