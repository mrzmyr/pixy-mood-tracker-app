import { render, screen, waitFor } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { StepsScreen } from "../screens/Steps";

let mockIsPhotosEnabled = true;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the photos flag comes from PostHog after consent; each test picks on or off.
jest.mock("@/state/featureFlags", () => ({
  useFeatureFlag: () => mockIsPhotosEnabled,
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
  });

  test("flag on: shows the Add photo toggle, on for new installs", async () => {
    await renderSteps();

    await waitFor(() => {
      expect(screen.getByTestId("step-photos-enabled").props.value).toBe(true);
    });
    expect(screen.getAllByText("Add photo").length).toBeGreaterThan(0);
  });

  test("flag off: no Add photo toggle", async () => {
    mockIsPhotosEnabled = false;
    await renderSteps();

    expect(screen.queryByTestId("step-photos-enabled")).toBeNull();
    expect(screen.getByTestId("step-tags-enabled")).toBeTruthy();
  });
});
