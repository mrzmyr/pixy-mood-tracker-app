import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { Onboarding } from "@/features/onboarding";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";

const renderOnboarding = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider
        value={{
          ...DefaultTheme,
          colors: { ...DefaultTheme.colors, ...Colors.light },
        }}
      >
        <SettingsProvider>
          <AnalyticsProvider options={{ enabled: true }}>
            <Onboarding needsConsent />
          </AnalyticsProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );

describe("Onboarding skip in a consent region", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("lands on the privacy slide instead of finishing", async () => {
    const result = await renderOnboarding();

    await userEvent.press(await result.findByText("Start"));
    await userEvent.press(await result.findByText("Skip"));

    expect(await result.findByTestId("analytics-consent-allow")).toBeTruthy();
  });
});
