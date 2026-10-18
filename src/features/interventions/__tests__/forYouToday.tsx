import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { _generateItem } from "@/testing/logItem";
import Colors from "@/constants/Colors";
import { LogsProvider, STORAGE_KEY, useLogLoad } from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { ForYouToday } from "../components/ForYouToday";

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature flags come from PostHog after consent; this test turns on only interventions.
jest.mock("@/state/featureFlags", () => ({
  useFeatureFlag: (flag: string) => flag === "interventions",
}));

const LogsLoaded = ({ children }: { children: React.ReactNode }) =>
  useLogLoad().status === "ready" ? children : null;

// Created once, like the footer a compiled calendar screen caches: the
// parent never hands ForYouToday a new element.
const cachedFooter = <ForYouToday />;

describe("For You Today", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("disappears at midnight while its parent does not re-render", async () => {
    jest.useFakeTimers({
      now: new Date(2026, 9, 8, 23, 0),
      advanceTimers: true,
    });
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        items: [
          _generateItem({
            date: "2026-10-08",
            dateTime: new Date(2026, 9, 8, 21, 0).toISOString(),
            emotions: ["anxious"],
          }),
        ],
      })
    );

    await render(
      <ThemeProvider
        value={{
          ...DefaultTheme,
          dark: false,
          colors: { ...DefaultTheme.colors, ...Colors.light },
        }}
      >
        <SettingsProvider>
          <AnalyticsProvider>
            <LogsProvider>
              <LogsLoaded>{cachedFooter}</LogsLoaded>
            </LogsProvider>
          </AnalyticsProvider>
        </SettingsProvider>
      </ThemeProvider>
    );
    expect(await screen.findByTestId("for-you-today")).toBeTruthy();

    await act(() => jest.advanceTimersByTime(60 * 60 * 1000 + 1000));

    expect(screen.queryByTestId("for-you-today")).toBeNull();
  });
});
