import { render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { setHealthSourceOverride } from "@/features/health";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { SettingsSleepScreen } from "../screens/Sleep";

let mockIsHealthFlagOn = false;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the apple-health flag comes from PostHog after consent; each test picks on or off.
jest.mock("@/state/featureFlags", () => ({
  useFeatureFlag: (flag: string) =>
    flag === "apple-health" && mockIsHealthFlagOn,
}));

const renderSleep = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider>
          <SettingsSleepScreen />
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

describe("Settings > Check-in > Sleep", () => {
  beforeAll(() => {
    setHealthSourceOverride({
      isAvailable: () => true,
      requestSleepAccess: () => Promise.resolve(),
      getSleepSamples: () => Promise.resolve([]),
    });
  });

  afterAll(() => {
    setHealthSourceOverride(null);
  });

  afterEach(() => {
    mockIsHealthFlagOn = false;
  });

  test("apple-health flag on: shows the Auto Fill switch", async () => {
    mockIsHealthFlagOn = true;
    await renderSleep();

    expect(await screen.findByTestId("health-sleep-enabled")).toBeTruthy();
    expect(screen.getByTestId("step-sleep-enabled")).toBeTruthy();
  });

  test("apple-health flag off: shows only the step switch", async () => {
    await renderSleep();

    expect(await screen.findByTestId("step-sleep-enabled")).toBeTruthy();
    expect(screen.queryByTestId("health-sleep-enabled")).toBeNull();
  });
});
