import { render } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { SlidePhotos } from "../slides/SlidePhotos";
import { TemporaryLogProvider } from "../temporaryLog";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe("SlidePhotos", () => {
  test("shows library and camera buttons before the draft initializes", async () => {
    const result = await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ThemeProvider
          value={{
            ...DefaultTheme,
            colors: { ...DefaultTheme.colors, ...Colors.light },
          }}
        >
          <SettingsProvider>
            <AnalyticsProvider options={{ enabled: false }}>
              <TemporaryLogProvider>
                <SlidePhotos
                  mode="create"
                  onDisableStep={jest.fn()}
                  showDisable={true}
                />
              </TemporaryLogProvider>
            </AnalyticsProvider>
          </SettingsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );

    expect(result.getByText("Add a photo of your day")).toBeTruthy();
    expect(result.getByText("Choose from library")).toBeTruthy();
    expect(result.getByText("Take photo")).toBeTruthy();
    expect(
      result.getByText("Up to 6 photos. Photos stay on your device.")
    ).toBeTruthy();
    expect(result.getByText("I don't add photos")).toBeTruthy();
  });
});
