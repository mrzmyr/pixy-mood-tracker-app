import dayjs from "dayjs";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useEffectEvent } from "react";
import { Platform, Settings } from "react-native";
import { z } from "zod";
import { useAnalytics } from "@/state/analytics";

/** `UserDefaults` key. `plugins/LogMoodIntent.swift` writes it in ms. */
const LOG_MOOD_REQUESTED_AT_KEY = "pixyLogMoodRequestedAt";

/** Older requests come from a launch that never opened the logger. */
const MAX_REQUEST_AGE_MS = 60_000;

/** Request time in ms, 0 when none. `UserDefaults` holds any value type. */
const readRequestedAt = () => {
  const result = z.number().safeParse(Settings.get(LOG_MOOD_REQUESTED_AT_KEY));
  return result.success ? result.data : 0;
};

/** True when the "Log Mood" intent ran within the last minute. */
const isLogMoodRequestFresh = (requestedAt: number, now: number) =>
  now - requestedAt >= 0 && now - requestedAt <= MAX_REQUEST_AGE_MS;

/**
 * Opens the logger when the iOS "Log Mood" App Intent runs (Shortcuts, Siri,
 * Action Button). Waits for `isReady`: settings loaded, onboarding done,
 * router mounted.
 */
export const useLogMoodShortcut = ({ isReady }: { isReady: boolean }) => {
  const router = useRouter();
  const pathname = usePathname();
  const analytics = useAnalytics();

  const onLogMoodRequested = useEffectEvent(() => {
    const requestedAt = readRequestedAt();
    if (requestedAt === 0) {
      return;
    }
    // Consume first, so a request opens the logger once.
    Settings.set({ [LOG_MOOD_REQUESTED_AT_KEY]: 0 });
    if (
      !isLogMoodRequestFresh(requestedAt, Date.now()) ||
      pathname.startsWith("/logs/create/")
    ) {
      return;
    }
    analytics.track("logger:shortcut_opened");
    router.push({
      pathname: "/logs/create/[dateTime]",
      params: { dateTime: dayjs().toISOString() },
    });
  });

  useEffect(() => {
    if (Platform.OS !== "ios" || !isReady) {
      return;
    }
    // Cold start: the intent wrote the key before JavaScript read settings.
    onLogMoodRequested();
    // Warm start: the intent writes the key while the app runs.
    const watchId = Settings.watchKeys(
      LOG_MOOD_REQUESTED_AT_KEY,
      onLogMoodRequested
    );
    return () => Settings.clearWatch(watchId);
  }, [isReady]);
};
