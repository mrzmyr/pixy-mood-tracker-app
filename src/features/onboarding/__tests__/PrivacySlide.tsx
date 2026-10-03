import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, userEvent, waitFor } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { PrivacySlide } from "../screens/Onboarding/PrivacySlide";
import { AnalyticsProvider } from "@/state/analytics";
import { INITIAL_STATE } from "@/constants/Settings";
import { SettingsProvider, STORAGE_KEY, useSettings } from "@/state/settings";

const AnalyticsSetting = () => {
  const { settings } = useSettings();
  return (
    <Text testID="analytics-setting">
      {settings.loaded ? String(settings.analyticsEnabled) : "loading"}
    </Text>
  );
};

const renderSlide = async (needsConsent: boolean) => {
  const onPress = jest.fn();
  const result = await render(
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
            <PrivacySlide onPress={onPress} needsConsent={needsConsent} />
            <AnalyticsSetting />
          </AnalyticsProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
  return { ...result, onPress };
};

describe("PrivacySlide", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  test("turns analytics on when the user shares", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: false })
    );
    const result = await renderSlide(true);
    await waitFor(() =>
      expect(result.getByTestId("analytics-setting")).toHaveTextContent("false")
    );
    await waitFor(() =>
      expect(result.getByTestId("analytics-setting")).not.toHaveTextContent(
        "loading"
      )
    );

    await userEvent.press(result.getByTestId("analytics-consent-allow"));

    expect(result.onPress).toHaveBeenCalled();
    await waitFor(() =>
      expect(result.getByTestId("analytics-setting")).toHaveTextContent("true")
    );
  });

  test("turns analytics off when the user does not share", async () => {
    const result = await renderSlide(true);
    await waitFor(() =>
      expect(result.getByTestId("analytics-setting")).not.toHaveTextContent(
        "loading"
      )
    );

    await userEvent.press(result.getByTestId("analytics-consent-deny"));

    expect(result.onPress).toHaveBeenCalled();
    await waitFor(() =>
      expect(result.getByTestId("analytics-setting")).toHaveTextContent("false")
    );
  });

  test("shows one button outside consent regions", async () => {
    const result = await renderSlide(false);

    expect(result.queryByTestId("analytics-consent-allow")).toBeNull();
    expect(result.getByText("Hey, this is Moritz 👋")).toBeTruthy();
    expect(result.getByText("Anonymous usage data is on.")).toBeTruthy();
    await userEvent.press(result.getByText("Understood"));
    expect(result.onPress).toHaveBeenCalled();
  });
});
