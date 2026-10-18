import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import Colors from "@/constants/Colors";
import { LogsProvider, STORAGE_KEY as LOGS_KEY } from "@/features/logs";
import { PeopleProvider } from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { LaunchSplash } from "@/shell/LaunchSplash";
import { getExitDelay } from "@/shell/launchSplashTiming";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";

// oxlint-disable-next-line anti-slop/no-module-mocking -- load errors are reported through the Sentry SDK imported directly in state/persisted
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

const renderApp = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider options={{ enabled: false }}>
          <LogsProvider>
            <TagsProvider>
              <PeopleProvider>
                <Text>Calendar</Text>
                <LaunchSplash />
              </PeopleProvider>
            </TagsProvider>
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

// The overlay is decorative and hidden from screen readers.
const HIDDEN = { includeHiddenElements: true };
const _console_error = console.error;

describe("<LaunchSplash>", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = _console_error;
  });

  test("user sees the standby while stored data loads, then the app", async () => {
    await renderApp();

    expect(screen.getByTestId("launch-splash", HIDDEN)).toBeOnTheScreen();
    expect(screen.getByText("Calendar")).toBeOnTheScreen();

    await waitFor(
      () => expect(screen.queryByTestId("launch-splash", HIDDEN)).toBeNull(),
      { timeout: 3000 }
    );
  });

  test("standby leaves when a store fails, so the error screen is reachable", async () => {
    await AsyncStorage.setItem(LOGS_KEY, "🐇");

    await renderApp();

    await waitFor(
      () => expect(screen.queryByTestId("launch-splash", HIDDEN)).toBeNull(),
      { timeout: 3000 }
    );
    expect(await AsyncStorage.getItem(LOGS_KEY)).toBe("🐇");
  });
});

describe("getExitDelay()", () => {
  test("data ready before the first turn: standby leaves at once", () => {
    expect(getExitDelay(0, false)).toBe(0);
    expect(getExitDelay(120, false)).toBe(0);
  });

  test("data ready mid-turn: standby finishes the turn, then leaves", () => {
    expect(getExitDelay(300, false)).toBe(220);
    expect(getExitDelay(520 + 400, false)).toBe(120);
  });

  test("data ready during a later rest: standby leaves at once", () => {
    expect(getExitDelay(2 * 520 + 50, false)).toBe(0);
  });

  test("reduced motion: standby never waits", () => {
    expect(getExitDelay(300, true)).toBe(0);
  });
});
