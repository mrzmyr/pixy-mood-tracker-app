import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { userEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import Colors from "@/constants/Colors";
import { AnalyticsProvider } from "@/state/analytics";
import {
  CalendarFiltersProvider,
  useCalendarFilters,
} from "@/features/calendar";
import { LogsProvider } from "@/features/logs";
import { SettingsProvider } from "@/state/settings";
import { TagDistributionContent } from "@/features/statistics";
import type { TagsDistributionData } from "@/features/statistics";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual("react-native");
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: View,
    SafeAreaInsetsContext: jest.requireActual("react").createContext(insets),
    SafeAreaFrameContext: jest.requireActual("react").createContext(frame),
    initialWindowMetrics: { insets, frame },
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
  };
});

const data: TagsDistributionData = {
  tags: [
    {
      id: "tag-work",
      details: {
        id: "tag-work",
        title: "Work",
        color: "slate",
        isArchived: false,
      },
      count: 3,
    },
  ],
};

const Calendar = () => {
  const calendarFilters = useCalendarFilters();
  return (
    <Text>{`Calendar filtered by ${calendarFilters.data.tagIds.join(",")}`}</Text>
  );
};

const renderApp = async () => {
  const result = await renderRouter(
    {
      _layout: () => (
        <ThemeProvider
          value={{
            ...DefaultTheme,
            colors: { ...DefaultTheme.colors, ...Colors.light },
          }}
        >
          <SettingsProvider>
            <AnalyticsProvider>
              <LogsProvider>
                <CalendarFiltersProvider>
                  <Stack />
                </CalendarFiltersProvider>
              </LogsProvider>
            </AnalyticsProvider>
          </SettingsProvider>
        </ThemeProvider>
      ),
      calendar: Calendar,
      "statistics/highlights": () => <TagDistributionContent data={data} />,
    },
    { initialUrl: "/statistics/highlights" }
  );
  jest.useRealTimers();
  return result;
};

describe("Tags distribution in Statistics Highlights", () => {
  test("user taps a tag and lands on the Calendar filtered by that tag", async () => {
    const result = await renderApp();
    await userEvent.press(await result.findByText("3x Work"));
    expect(
      await result.findByText("Calendar filtered by tag-work")
    ).toBeOnTheScreen();
  });
});
