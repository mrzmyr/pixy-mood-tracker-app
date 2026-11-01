import { Stack } from "expo-router";
import { Platform, View } from "react-native";
import { BackButton } from "@/shell/back-button";
import { StorageLoadGate } from "@/shell/storage-load-gate";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import useFormBackground from "@/hooks/use-form-background";
import { DEV_TOOLS } from "@/dev";
import { useCanOverrideFeatureFlags } from "@/state/feature-flags";
import { QuickCheckInNotificationSync } from "@/features/quickcheckin";
import { WidgetSync } from "@/features/widget";
import { LoggerRecoveryPrompt } from "@/features/logger";
import { CalendarScreenReaderTitle } from "@/features/calendar";
import { HAS_FLOATING_HEADER } from "@/constants/floating-header";
import { getModalRouteOptions } from "@/components/modal-route-options";

const renderHeaderLeft = () => <BackButton testID="settings-back-button" />;

// Report screens draw a gradient banner under the header and refine these
// options while scrolling (see `useReportHeader`).
const reportHeaderOptions = {
  headerTransparent: true,
  headerTitle: "",
  headerShadowVisible: false,
};

/**
 * Quick check-in: iOS page sheet with a transparent native bar (Liquid Glass
 * close and save on iOS 26, blur before). The screen sets its bar items.
 * Android and web draw their header in the screen.
 */
const getQuickCheckInOptions = (
  headerTintColor: string,
  backgroundColor: string
) =>
  Platform.OS === "ios"
    ? {
        presentation: "modal" as const,
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerTintColor,
        ...(!HAS_FLOATING_HEADER && {
          headerBlurEffect: "systemChromeMaterial" as const,
        }),
      }
    : getModalRouteOptions({ textColor: headerTintColor, backgroundColor });

/**
 * iOS top-level screens: 34pt title that collapses into the inline title on
 * scroll. The screen's first child must be a ScrollView with
 * `contentInsetAdjustmentBehavior="automatic"`. Android and web keep the
 * regular header.
 *
 * iOS 26+ needs an unset header background: with a background color, the
 * large title is invisible (expo-router `useHeaderConfigProps`). The bar then
 * stays transparent and shows the screen background. Older iOS paints both
 * bar states in the screen background.
 */
const largeTitleOptions = (backgroundColor: string) => {
  if (Platform.OS !== "ios") {
    return {};
  }
  return {
    headerLargeTitleEnabled: true,
    headerLargeTitleShadowVisible: false,
    ...(HAS_FLOATING_HEADER
      ? { headerStyle: undefined }
      : {
          headerStyle: { backgroundColor },
          headerLargeStyle: { backgroundColor },
        }),
  };
};

/**
 * Feedback form: iOS form sheet (Liquid Glass header on iOS 26), Android
 * full-screen dialog with the Material top app bar. Header items live in
 * the screen (`Stack.Toolbar`).
 */
const getFeedbackOptions = <T extends object>({
  defaultOptions,
  textColor,
  backgroundColor,
}: {
  defaultOptions: T;
  textColor: string;
  backgroundColor: string;
}) =>
  Platform.OS === "ios"
    ? {
        presentation: "formSheet" as const,
        headerTintColor: textColor,
        // Always transparent, so the screen offsets content by the header
        // height on every iOS version. expo-router sets it on iOS 26 only.
        headerTransparent: true,
        // Before iOS 26 no Liquid Glass: blur keeps the title readable.
        ...(!HAS_FLOATING_HEADER && {
          headerBlurEffect: "systemChromeMaterial" as const,
        }),
      }
    : {
        ...defaultOptions,
        presentation: "modal" as const,
        headerStyle: { backgroundColor },
        headerShadowVisible: false,
      };

/**
 * Native grouped list screens: the list starts below the bar, so no divider
 * line. Bar and list share one background (Android: Material surface).
 */
const formHeaderOptions = <T extends object>(
  pageOptions: T,
  backgroundColor: string
) => ({
  ...pageOptions,
  headerStyle: { backgroundColor },
  headerShadowVisible: false,
});

/** Native back button without title, bar in the screen background. */
const getDefaultOptions = (textColor: string, backgroundColor: string) => ({
  headerTintColor: textColor,
  headerBackTitle: "",
  headerBackButtonDisplayMode: "minimal" as const,
  headerBackButtonMenuEnabled: false,
  headerStyle: { backgroundColor },
  headerShadowVisible: Platform.OS !== "web",
});

/**
 * Calendar page options. Title stays the iOS back button label; the header
 * shows none but exposes the screen name to screen readers. Onboarding hands
 * off to the calendar with a cross-fade.
 */
const getCalendarOptions = (textColor: string, backgroundColor: string) => ({
  title: t("calendar"),
  animation: "fade" as const,
  headerTitle: CalendarScreenReaderTitle,
  headerTintColor: textColor,
  headerShadowVisible: false,
  ...(HAS_FLOATING_HEADER
    ? {
        headerTransparent: true,
        scrollEdgeEffects: { top: "soft" as const },
      }
    : { headerStyle: { backgroundColor } }),
});

/** Root app stack keeps prior modal presentation and header titles. */
const AppLayout = () => {
  const colors = useColors();
  const formBackground = useFormBackground();
  const canOverrideFeatureFlags = useCanOverrideFeatureFlags();
  const defaultOptions = getDefaultOptions(colors.text, colors.background);
  const feedbackOptions = getFeedbackOptions({
    defaultOptions,
    textColor: colors.text,
    backgroundColor: colors.feedbackBackground,
  });
  const requestOptions = getFeedbackOptions({
    defaultOptions,
    textColor: colors.text,
    backgroundColor: formBackground,
  });
  const modalRouteOptions = getModalRouteOptions({
    textColor: colors.text,
    backgroundColor: colors.background,
  });
  // Logger and interventions: no swipe down, so a half-done flow only
  // closes through the close button.
  const flowModalOptions = {
    ...getModalRouteOptions({
      textColor: colors.text,
      backgroundColor: colors.logBackground,
    }),
    gestureEnabled: false,
  };
  // iOS and Android render the native back button. Web has none.
  const pageOptions =
    Platform.OS === "web"
      ? { ...defaultOptions, headerLeft: renderHeaderLeft }
      : defaultOptions;

  const settingsFormOptions = formHeaderOptions(pageOptions, formBackground);

  return (
    <StorageLoadGate>
      <WidgetSync />
      <LoggerRecoveryPrompt />
      <QuickCheckInNotificationSync />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack screenOptions={{ navigationBarColor: colors.tabsBackground }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="calendar"
            options={getCalendarOptions(colors.text, colors.calendarBackground)}
          />
          <Stack.Screen
            name="statistics/index"
            options={{
              ...pageOptions,
              title: t("statistics"),
              headerStyle: { backgroundColor: colors.statisticsBackground },
              ...largeTitleOptions(colors.statisticsBackground),
            }}
          />
          <Stack.Screen
            name="settings/index"
            options={{ ...settingsFormOptions, title: t("settings") }}
          />
          <Stack.Screen
            name="onboarding"
            // Full page over the app: the sky fills the screen edge to edge.
            options={{
              headerShown: false,
              animation: "fade",
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="logs/create/[dateTime]"
            options={flowModalOptions}
          />
          <Stack.Screen
            name="logs/voice"
            options={{ ...modalRouteOptions, gestureEnabled: false }}
          />
          <Stack.Screen
            name="days/[date]"
            options={{
              // Day view sets its title and close button (see `LogList`).
              presentation: "modal",
              headerShown: true,
              headerTintColor: colors.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.logBackground },
              ...(HAS_FLOATING_HEADER
                ? {
                    headerTransparent: true,
                    scrollEdgeEffects: { top: "soft" as const },
                  }
                : { headerStyle: { backgroundColor: colors.logBackground } }),
            }}
          />
          <Stack.Screen name="feedback" options={feedbackOptions} />
          <Stack.Screen name="request" options={requestOptions} />
          <Stack.Screen
            name="check-in/[id]"
            options={getQuickCheckInOptions(colors.text, colors.background)}
          />
          <Stack.Screen name="interventions/[id]" options={flowModalOptions} />
          <Stack.Screen name="logs/[id]/edit" options={flowModalOptions} />
          <Stack.Screen
            name="photos/[id]"
            options={{
              // Transparent: the screen below shows through while a swipe
              // closes the viewer.
              presentation: "transparentModal",
              animation: "fade",
              headerShown: false,
            }}
          />
          <Stack.Screen name="tags/index" options={modalRouteOptions} />
          <Stack.Screen name="tags/create" options={modalRouteOptions} />
          <Stack.Screen name="tags/[id]" options={modalRouteOptions} />
          <Stack.Screen
            name="tags/categories/index"
            options={modalRouteOptions}
          />
          <Stack.Screen
            name="tags/categories/[id]"
            options={modalRouteOptions}
          />
          <Stack.Screen name="people/create" options={modalRouteOptions} />
          <Stack.Screen name="people/import" options={modalRouteOptions} />
          <Stack.Screen name="people/[id]" options={modalRouteOptions} />
          <Stack.Screen name="profile" options={modalRouteOptions} />
          <Stack.Screen
            name="statistics/highlights"
            options={{ ...pageOptions, title: t("statistics_highlights") }}
          />
          <Stack.Screen
            name="statistics/month/[date]"
            options={{
              ...pageOptions,
              title: t("month_report"),
              ...reportHeaderOptions,
            }}
          />
          <Stack.Screen
            name="statistics/year/[date]"
            options={{
              ...pageOptions,
              title: t("year_report"),
              ...reportHeaderOptions,
            }}
          />
          <Stack.Screen
            name="+not-found"
            options={{ ...pageOptions, title: t("not_found_title") }}
          />
          <Stack.Screen
            name="recaps/story/[date]"
            // oxlint-disable-next-line pixy-standards/modal-route-shows-header -- media overlay: stories draw their own close.
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="recaps/[kind]/[date]"
            options={{ ...pageOptions, title: t("recaps") }}
          />
          <Stack.Screen
            name="settings/colors"
            options={{ ...pageOptions, title: t("colors") }}
          />
          <Stack.Screen
            name="settings/app-lock"
            options={{ ...settingsFormOptions, title: t("app_lock") }}
          />
          <Stack.Screen
            name="settings/app-icon"
            options={{ ...pageOptions, title: t("app_icon") }}
          />
          <Stack.Screen
            name="settings/licenses"
            options={{ ...pageOptions, title: t("licenses") }}
          />
          <Stack.Screen
            name="settings/steps/index"
            options={{ ...settingsFormOptions, title: t("steps") }}
          />
          <Stack.Screen
            name="settings/data"
            options={{ ...pageOptions, title: t("data") }}
          />
          <Stack.Screen
            name="settings/reminder"
            options={{ ...settingsFormOptions, title: t("reminders") }}
          />
          <Stack.Screen
            name="settings/privacy"
            options={{ ...pageOptions, title: t("privacy") }}
          />
          <Stack.Screen
            name="settings/development-tools"
            options={{
              ...pageOptions,
              title: t("settings_development_statistics"),
            }}
          />
          <Stack.Screen
            name="settings/steps/tags/index"
            options={{
              ...settingsFormOptions,
              title: t("tags"),
              ...largeTitleOptions(colors.background),
            }}
          />
          <Stack.Screen
            name="settings/steps/tags/categories"
            options={{ ...settingsFormOptions, title: t("tag_categories") }}
          />
          <Stack.Screen
            name="settings/steps/tags/archive"
            options={{ ...pageOptions, title: t("archive_tag") }}
          />
          <Stack.Screen
            name="settings/steps/people/index"
            options={{
              ...settingsFormOptions,
              title: t("people"),
              ...largeTitleOptions(colors.background),
            }}
          />
          <Stack.Screen
            name="settings/steps/sleep/index"
            options={{ ...pageOptions, title: t("logger_step_sleep") }}
          />
          <Stack.Screen
            name="settings/steps/people/archive"
            options={{ ...pageOptions, title: t("people_archive") }}
          />
          <Stack.Protected guard={canOverrideFeatureFlags}>
            <Stack.Screen
              name="settings/feature-flags"
              options={{ ...pageOptions, title: "Feature flags" }}
            />
          </Stack.Protected>
          <Stack.Protected guard={DEV_TOOLS !== null}>
            <Stack.Screen
              name="dev/fixtures"
              options={{ ...pageOptions, title: "Test data" }}
            />
            <Stack.Screen
              name="dev/fixture"
              options={{ ...pageOptions, headerShown: false }}
            />
            <Stack.Screen
              name="dev/fake-files"
              options={{ ...pageOptions, headerShown: false }}
            />
            <Stack.Screen
              name="dev/fake-contacts"
              options={{ ...pageOptions, headerShown: false }}
            />
            <Stack.Screen
              name="dev/feature-flag"
              options={{ ...pageOptions, headerShown: false }}
            />
            <Stack.Screen
              name="dev/playground/index"
              options={{ ...pageOptions, title: "Playground" }}
            />
            <Stack.Screen
              name="dev/playground/recap-story"
              options={{ headerShown: false, animation: "fade" }}
            />
          </Stack.Protected>
        </Stack>
      </View>
    </StorageLoadGate>
  );
};

export default AppLayout;
