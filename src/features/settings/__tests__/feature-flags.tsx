import { screen, userEvent, within } from "@testing-library/react-native";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import Colors from "@/constants/colors";
import { FeatureFlagsContext } from "@/state/feature-flags/context";
import type { RemoteFlags } from "@/state/feature-flags/context";
import { FEATURE_FLAGS } from "@/state/feature-flags/keys";
import { setOverrides } from "@/state/feature-flags/overrides";
import { FeatureFlagsScreen } from "../screens/feature-flags";

const renderScreen = (value: {
  flags: RemoteFlags | null;
  isLoading: boolean;
}) =>
  renderRouter(
    {
      _layout: () => (
        <ThemeProvider
          value={{
            ...DefaultTheme,
            dark: false,
            colors: { ...DefaultTheme.colors, ...Colors.light },
          }}
        >
          <FeatureFlagsContext.Provider value={value}>
            <Stack />
          </FeatureFlagsContext.Provider>
        </ThemeProvider>
      ),
      index: FeatureFlagsScreen,
    },
    { initialUrl: "/" }
  );

describe("Settings > Development > Feature flags", () => {
  afterEach(() => {
    setOverrides({ keys: FEATURE_FLAGS, value: "remote" });
  });

  test("lists flags on for this device first and counts them", async () => {
    await renderScreen({
      flags: { recaps: true, people: true },
      isLoading: false,
    });
    jest.useRealTimers();

    expect(await screen.findByText("On (2)")).toBeOnTheScreen();
    expect(screen.getByText(`Off (${FEATURE_FLAGS.length - 2})`)).toBeTruthy();
    expect(screen.getByText(`2 of ${FEATURE_FLAGS.length}`)).toBeTruthy();
    expect(screen.getByText("Loaded")).toBeTruthy();
  });

  test("override moves a flag to On, Reset All Overrides moves it back", async () => {
    await renderScreen({ flags: {}, isLoading: false });
    jest.useRealTimers();

    await userEvent.press(
      within(await screen.findByTestId("feature-flag-photos-picker")).getByRole(
        "menuitem",
        { name: "On" }
      )
    );

    expect(screen.getByText("On (1)")).toBeOnTheScreen();
    expect(
      screen.getByTestId("feature-flags-override-count")
    ).toHaveTextContent("Overrides1");

    await userEvent.press(screen.getByTestId("feature-flag-all-remote"));

    expect(screen.queryByText("On (1)")).toBeNull();
  });

  test("without remote flags, the overview says why every default is Off", async () => {
    await renderScreen({ flags: null, isLoading: false });
    jest.useRealTimers();

    expect(await screen.findByText("Not Loaded")).toBeOnTheScreen();
    expect(
      screen.queryByTestId("feature-flag-app-lock-bypass-picker")
    ).toBeNull();
  });
});
