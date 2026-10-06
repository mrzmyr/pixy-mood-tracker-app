import { render, screen, waitFor } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { setHealthSourceOverride } from "@/features/health";
import { StepsScreen } from "../screens/Steps";

let mockIsPhotosEnabled = true;
let mockIsHealthFlagOn = false;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the photos and apple-health flags come from PostHog after consent; each test picks on or off.
jest.mock("@/state/featureFlags", () => ({
  useFeatureFlag: (flag: string) =>
    (flag === "photos" && mockIsPhotosEnabled) ||
    (flag === "apple-health" && mockIsHealthFlagOn),
}));

const renderSteps = () =>
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
          <StepsScreen />
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

describe("Settings > Check-in", () => {
  afterEach(() => {
    mockIsPhotosEnabled = true;
    mockIsHealthFlagOn = false;
    setHealthSourceOverride(null);
  });

  test("flag on: shows the Photos toggle, on for new installs", async () => {
    await renderSteps();

    await waitFor(() => {
      expect(screen.getByTestId("step-photos-enabled").props.value).toBe(true);
    });
    expect(screen.getAllByText("Photos").length).toBeGreaterThan(0);
  });

  test("flag off: no Photos toggle", async () => {
    mockIsPhotosEnabled = false;
    await renderSteps();

    expect(screen.queryByTestId("step-photos-enabled")).toBeNull();
    expect(screen.getByTestId("step-emotions-enabled")).toBeTruthy();
  });

  test("apple-health flag on: Sleep opens its page instead of a switch", async () => {
    mockIsHealthFlagOn = true;
    setHealthSourceOverride({
      isAvailable: () => true,
      requestSleepAccess: () => Promise.resolve(),
      getSleepSamples: () => Promise.resolve([]),
    });
    await renderSteps();

    expect(screen.getByTestId("step-sleep")).toBeTruthy();
    expect(screen.queryByTestId("step-sleep-enabled")).toBeNull();
  });

  test("apple-health flag off: Sleep keeps its switch", async () => {
    await renderSteps();

    expect(screen.getByTestId("step-sleep-enabled")).toBeTruthy();
    expect(screen.queryByTestId("step-sleep")).toBeNull();
  });
});
