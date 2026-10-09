import * as Sentry from "@sentry/react-native";
import { useLocales } from "expo-localization";
import { Observe, ObserveRoot } from "expo-observe";
import {
  Stack,
  ThemeProvider,
  DefaultTheme,
  useRootNavigationState,
  useRouter,
  usePathname,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useEffectEvent } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";
import Providers from "@/shell/Providers";
import { SENTRY_DSN } from "@/constants/API";
import { APP_VARIANT, HAS_APP_VARIANT } from "@/constants/AppVariant";
import Colors from "@/constants/Colors";
import { applyLocale, getLocale, initializeDayjs } from "@/lib/translation";
import { useSettings } from "@/state/settings";
import { useUsageSummarySync } from "@/shell/usageSummary";
import { useScreenTracking } from "@/shell/screenTracking";

// Configure before first render; each app variant reports to its own project.
if (HAS_APP_VARIANT) {
  Sentry.init({ dsn: SENTRY_DSN, environment: APP_VARIANT });
}
enableScreens();
// Drop startup metrics until stored settings confirm analytics consent.
Observe.configure({ dispatchingEnabled: false });

const AppShell = () => {
  const { settings, hasActionDone } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const rootState = useRootNavigationState();
  useScreenTracking();
  useUsageSummarySync();

  const onSettingsLoaded = useEffectEvent(() => {
    // Fixture links replace fresh state, and dev links pick their own route.
    if (
      !hasActionDone("onboarding") &&
      pathname !== "/dev/fixture" &&
      pathname !== "/dev/fake-files" &&
      pathname !== "/dev/feature-flag"
    ) {
      router.replace("/onboarding");
    }
  });

  useEffect(() => {
    initializeDayjs();
    if (settings.loaded && rootState?.key) {
      onSettingsLoaded();
    }
  }, [settings.loaded, rootState?.key]);

  return <Stack screenOptions={{ headerShown: false }} />;
};

/** Root shell mounts Router immediately while stores load. */
const RootLayout = () => {
  const scheme = useColorScheme();
  // Android 13+ keeps the app running after a per-app language change.
  // Translate with the new locale, then remount screens to show it.
  const [{ languageTag, regionCode }] = useLocales();
  if (getLocale() !== languageTag) {
    applyLocale(languageTag, regionCode);
  }
  const colors = scheme === "dark" ? Colors.dark : Colors.light;
  const theme = {
    ...DefaultTheme,
    dark: scheme === "dark",
    colors: {
      ...DefaultTheme.colors,
      ...colors,
      primary: colors.tint,
      card: colors.background,
      border: colors.headerBorder,
      notification: colors.tint,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        <Providers>
          <AppShell key={languageTag} />
          <StatusBar />
        </Providers>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

/** Observe wrapper preserves startup metrics policy around the Router shell. */
const ObservedRootLayout = ObserveRoot.wrap(RootLayout);

export default ObservedRootLayout;
