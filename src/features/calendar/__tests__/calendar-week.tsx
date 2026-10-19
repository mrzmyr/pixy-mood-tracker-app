import { DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Profiler } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { _generateItem } from "@/testing/log-item";
import { LogsProvider, useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import {
  CalendarFiltersProvider,
  useCalendarFilters,
  useCalendarFiltersSheet,
} from "../filters";
import CalendarWeek from "../screens/calendar/calendar-week";

// oxlint-disable-next-line anti-slop/no-module-mocking -- jest.setup.js stubs flash-list without useMappingHelper; outside a list it returns the item key.
jest.mock("@shopify/flash-list", () => ({
  __esModule: true,
  useMappingHelper: () => ({ getMappingKey: (key: string) => key }),
}));

const goodDay = _generateItem({ date: "2022-01-03", rating: "good" });
const badDay = _generateItem({ date: "2022-01-05", rating: "bad" });
// Stable reference: in the app, `itemMap` only changes when the logs change.
const itemMap = {
  "2022-01-03": [goodDay],
  "2022-01-05": [badDay],
} satisfies Record<string, LogItem[]>;

const SheetButtons = () => {
  const filtersSheet = useCalendarFiltersSheet();
  const calendarFilters = useCalendarFilters();
  const logUpdater = useLogUpdater();
  return (
    <>
      <Pressable onPress={() => logUpdater.updateLogs([goodDay, badDay])}>
        <Text>Load entries</Text>
      </Pressable>
      <Pressable onPress={() => filtersSheet.open()}>
        <Text>Open filters</Text>
      </Pressable>
      <Pressable onPress={() => filtersSheet.close()}>
        <Text>Close filters</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          calendarFilters.set({
            text: "",
            ratings: ["good"],
            tagIds: [],
            personIds: [],
          })
        }
      >
        <Text>Filter good</Text>
      </Pressable>
    </>
  );
};

const renderWeek = (onRender: () => void) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <SettingsProvider>
          <AnalyticsProvider>
            <LogsProvider>
              <CalendarFiltersProvider>
                <SheetButtons />
                <Profiler id="week" onRender={onRender}>
                  <CalendarWeek
                    startDate="2022-01-02"
                    endDate="2022-01-08"
                    height={48}
                    itemMap={itemMap}
                  />
                </Profiler>
              </CalendarFiltersProvider>
            </LogsProvider>
          </AnalyticsProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );

const backgroundOf = (date: string) =>
  StyleSheet.flatten(screen.getByTestId(`calendar-day-${date}`).props.style)
    .backgroundColor;

describe("CalendarWeek", () => {
  test("does not re-render when the filter sheet opens or closes", async () => {
    const onRender = jest.fn();
    await renderWeek(onRender);
    await act(async () => {});
    onRender.mockClear();

    await userEvent.press(screen.getByText("Open filters"));
    await userEvent.press(screen.getByText("Close filters"));

    expect(onRender).not.toHaveBeenCalled();
  });

  test("dims only days without a matching entry when a filter applies", async () => {
    await renderWeek(jest.fn());
    await act(async () => {});
    await userEvent.press(screen.getByText("Load entries"));
    const matchedBefore = backgroundOf("2022-01-03");

    await userEvent.press(screen.getByText("Filter good"));

    expect(backgroundOf("2022-01-03")).toBe(matchedBefore);
    expect(backgroundOf("2022-01-05")).toBe(
      Colors.light.calendarItemBackgroundFuture
    );
  });
});
