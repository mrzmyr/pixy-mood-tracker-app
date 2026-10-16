import { render, screen, waitFor, within } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { StepsScreen } from "../screens/Steps";

let mockIsPhotosEnabled = true;
let mockIsMenstruationEnabled = false;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the photos flag comes from PostHog after consent; each test picks on or off.
jest.mock("@/state/featureFlags", () => ({
  useFeatureFlag: (flag: string) =>
    (flag === "photos" && mockIsPhotosEnabled) ||
    (flag === "menstruation" && mockIsMenstruationEnabled),
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
    mockIsMenstruationEnabled = false;
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

  test("steps with a page show their status in the same row as the title", async () => {
    await renderSteps();

    const row = screen.getByTestId("step-tags");
    await waitFor(() => {
      expect(within(row).getByText(/^(?:On|Off)$/u)).toBeTruthy();
    });
    expect(within(row).getByText("Tags")).toBeTruthy();
  });
});

test("menstruation flag on offers an opt-in switch; flag off hides it", async () => {
  mockIsMenstruationEnabled = true;
  const view = await renderSteps();
  await waitFor(() =>
    expect(screen.getByTestId("step-menstruation-enabled").props.value).toBe(
      false
    )
  );
  await view.unmount();
  mockIsMenstruationEnabled = false;
  await renderSteps();
  expect(screen.queryByTestId("step-menstruation-enabled")).toBeNull();
});
