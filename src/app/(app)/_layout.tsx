import { Stack } from "expo-router";
import dayjs from "dayjs";
import { Platform, View } from "react-native";
import { BackButton } from "@/shell/BackButton";
import { StorageLoadGate } from "@/shell/StorageLoadGate";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { DEV_TOOLS } from "@/dev";
import { HAS_FLOATING_HEADER } from "@/features/calendar";

const renderHeaderLeft = () =>
  Platform.OS === "ios" ? null : <BackButton testID="settings-back-button" />;

const modalOptions = { presentation: "modal" as const, headerShown: false };

/** Root app stack keeps prior modal presentation and header titles. */
const AppLayout = () => {
  const colors = useColors();
  const defaultOptions = {
    headerTintColor: colors.text,
    headerBackTitle: "",
    headerBackButtonDisplayMode: "minimal" as const,
    headerBackButtonMenuEnabled: false,
    headerStyle: { backgroundColor: colors.background },
    headerShadowVisible: Platform.OS !== "web",
  };
  const pageOptions = { ...defaultOptions, headerLeft: renderHeaderLeft };

  return (
    <StorageLoadGate>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack screenOptions={{ navigationBarColor: colors.tabsBackground }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="calendar"
            options={{
              // Title stays the iOS back button label. The header shows none.
              title: t("calendar"),
              headerTitle: "",
              headerTintColor: colors.text,
              headerShadowVisible: false,
              ...(HAS_FLOATING_HEADER
                ? {
                    headerTransparent: true,
                    scrollEdgeEffects: { top: "soft" as const },
                  }
                : {
                    headerStyle: {
                      backgroundColor: colors.calendarBackground,
                    },
                  }),
            }}
          />
          <Stack.Screen
            name="statistics/index"
            options={{
              ...pageOptions,
              title: t("statistics"),
              headerStyle: { backgroundColor: colors.statisticsBackground },
            }}
          />
          <Stack.Screen
            name="settings/index"
            options={{ ...pageOptions, title: t("settings") }}
          />
          <Stack.Screen
            name="onboarding"
            options={{ ...modalOptions, gestureEnabled: false }}
          />
          <Stack.Screen
            name="logs/create/[dateTime]"
            options={{ ...modalOptions, gestureEnabled: false }}
          />
          <Stack.Screen name="days/[date]" options={modalOptions} />
          <Stack.Screen
            name="interventions/[id]"
            options={{ ...modalOptions, gestureEnabled: false }}
          />
          <Stack.Screen
            name="logs/[id]/edit"
            options={{ ...modalOptions, gestureEnabled: false }}
          />
          <Stack.Screen name="tags/index" options={modalOptions} />
          <Stack.Screen name="tags/create" options={modalOptions} />
          <Stack.Screen name="tags/[id]" options={modalOptions} />
          <Stack.Screen
            name="statistics/highlights"
            options={{ ...pageOptions, title: t("statistics_highlights") }}
          />
          <Stack.Screen
            name="statistics/month/[date]"
            options={{
              ...pageOptions,
              title: t("month_report"),
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="statistics/year/[date]"
            options={{
              ...pageOptions,
              title: dayjs().format("YYYY"),
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="settings/colors"
            options={{ ...pageOptions, title: t("colors") }}
          />
          <Stack.Screen
            name="settings/licenses"
            options={{ ...pageOptions, title: t("licenses") }}
          />
          <Stack.Screen
            name="settings/steps"
            options={{ ...pageOptions, title: t("steps") }}
          />
          <Stack.Screen
            name="settings/data"
            options={{ ...pageOptions, title: t("data") }}
          />
          <Stack.Screen
            name="settings/reminder"
            options={{ ...pageOptions, title: t("reminder") }}
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
            name="settings/tags/index"
            options={{ ...pageOptions, title: t("tags") }}
          />
          <Stack.Screen
            name="settings/tags/archive"
            options={{ ...pageOptions, title: t("archive_tag") }}
          />
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
              name="dev/feature-flags"
              options={{ ...pageOptions, title: "Feature flags" }}
            />
            <Stack.Screen
              name="dev/feature-flag"
              options={{ ...pageOptions, headerShown: false }}
            />
          </Stack.Protected>
        </Stack>
      </View>
    </StorageLoadGate>
  );
};

export default AppLayout;
