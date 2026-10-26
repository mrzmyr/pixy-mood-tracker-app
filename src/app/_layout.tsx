import * as Sentry from "@sentry/react-native";
import { useLocales } from "expo-localization";
import { ObserveRoot } from "expo-observe";
import type { ObserveErrorBoundaryFallbackProps } from "expo-observe";
import {
  Stack,
  ThemeProvider,
  useRootNavigationState,
  useRouter,
  usePathname,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useEffectEvent } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";
import Providers from "@/shell/providers";
import { ToastHost } from "@/components/toast";
import { SENTRY_DSN } from "@/constants/api";
import { APP_VARIANT } from "@/constants/app-variant";
import { configureObserve } from "@/lib/observe";
import { scrubBreadcrumb, scrubEvent } from "@/lib/sentry-scrub";
import { CAN_REPORT_TELEMETRY } from "@/lib/telemetry";
import { applyLocale, getLocale } from "@/lib/translation";
import { useSettings, useSettingsLoad } from "@/state/settings";
import { useStartupInteractive } from "@/shell/startup-interactive";
import { useStorageLoadEvent } from "@/shell/storage-load-event";
import { useUsageSummarySync } from "@/shell/usage-summary";
import { useScreenTracking } from "@/shell/screen-tracking";
import { LaunchSplash } from "@/shell/launch-splash";
import { AppErrorScreen } from "@/shell/app-error-screen";
import { getNavigationTheme } from "@/shell/navigation-theme";
import { AppLockScreen } from "@/features/applock";
import {
  useReminderSync,
  useReminderTapTracking,
} from "@/features/notifications";
import {
  useRecapNotificationSync,
  useRecapNotificationTaps,
} from "@/features/recaps";
import {
  useQuickCheckInNotificationTaps,
  useQuickCheckInReminderSync,
} from "@/features/quickcheckin";

// Configure before first render; each app variant reports to its own project.
// Same gate as Observe: real devices on shipped variants only.
// Scrubbers keep user data out of reports (TELEMETRY.md).
if (CAN_REPORT_TELEMETRY) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_VARIANT,
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent,
  });
}
enableScreens();
// Drop startup metrics until stored settings confirm analytics consent.
configureObserve({ consent: false });

const AppShell = () => {
  const { hasActionDone } = useSettings();
  const isSettingsReady = useSettingsLoad().status === "ready";
  const router = useRouter();
  const pathname = usePathname();
  const rootState = useRootNavigationState();
  useStartupInteractive();
  useStorageLoadEvent();
  useScreenTracking();
  useUsageSummarySync();
  useReminderTapTracking();
  useReminderSync();
  useRecapNotificationTaps();
  useRecapNotificationSync();
  useQuickCheckInNotificationTaps();
  useQuickCheckInReminderSync();

  const onSettingsLoaded = useEffectEvent(() => {
    // Fixture links replace fresh state, and dev links pick their own route.
    if (
      !hasActionDone("onboarding") &&
      pathname !== "/dev/fixture" &&
      pathname !== "/dev/fake-files" &&
      pathname !== "/dev/fake-contacts" &&
      pathname !== "/dev/feature-flag"
    ) {
      router.replace("/onboarding");
    }
  });

  useEffect(() => {
    if (isSettingsReady && rootState?.key) {
      onSettingsLoaded();
    }
  }, [isSettingsReady, rootState?.key]);

  return <Stack screenOptions={{ headerShown: false }} />;
};

/** Root shell mounts Router immediately while stores load. */
const RootLayout = () => {
  const scheme = useColorScheme();
  // Android 13+ keeps the app running after a per-app language change.
  // Translate with the new locale, then remount screens to show it.
  const [{ languageTag }] = useLocales();
  if (getLocale() !== languageTag) {
    applyLocale(languageTag);
  }
  const theme = getNavigationTheme(scheme);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        <Providers>
          <AppShell key={languageTag} />
          <ToastHost />
          <StatusBar />
          <LaunchSplash />
          <AppLockScreen />
        </Providers>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

// The boundary calls the fallback as a plain function; render a component so
// the screen can use hooks.
const renderAppError = (props: ObserveErrorBoundaryFallbackProps) => (
  <AppErrorScreen {...props} />
);

/**
 * Observe wrapper preserves startup metrics policy around the Router shell.
 * Its error boundary shows a recovery screen instead of a blank app when any
 * screen throws while rendering.
 */
const ObservedRootLayout = () => (
  <ObserveRoot errorBoundaryFallback={renderAppError}>
    <RootLayout />
  </ObserveRoot>
);

export default ObservedRootLayout;
