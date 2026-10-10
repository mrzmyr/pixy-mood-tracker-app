import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, within } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import * as Localization from "expo-localization";
import { Platform, View } from "react-native";
import Colors from "@/constants/Colors";
import CalendarHeader from "@/features/calendar/screens/Calendar/CalendarHeader";
import { TagPeaksCard } from "@/features/statistics/screens/Statistics/TagPeaksCards";
import { MoodPeaksContent } from "@/features/statistics/screens/Statistics/MoodPeaksCards";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import { AnalyticsProvider } from "@/state/analytics";
import { LogsProvider } from "@/features/logs";

const CalendarViews = () => (
  <ThemeProvider
    value={{
      ...DefaultTheme,
      colors: { ...DefaultTheme.colors, ...Colors.light },
    }}
  >
    <SettingsProvider>
      <AnalyticsProvider>
        <LogsProvider>
          <View testID="calendar-weekdays">
            <CalendarHeader />
          </View>
          <View testID="mood-weekdays">
            <MoodPeaksContent
              data={{ days: [] }}
              startDate="2026-10-03"
              endDate="2026-10-03"
            />
          </View>
          <View testID="tag-weekdays">
            <TagPeaksCard
              tag={{ id: "test-tag", title: "Work", color: "blue", items: [] }}
              startDate="2026-10-03"
              endDate="2026-10-03"
            />
          </View>
        </LogsProvider>
      </AnalyticsProvider>
    </SettingsProvider>
  </ThemeProvider>
);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(Localization, "useCalendars").mockReturnValue([
    {
      calendar: Localization.CalendarIdentifier.GREGORY,
      timeZone: "Europe/Berlin",
      uses24hourClock: true,
      firstWeekday: Localization.Weekday.MONDAY,
    },
  ]);
});
afterEach(() => jest.restoreAllMocks());

const assertFirstDay = (
  screen: Awaited<ReturnType<typeof render>>,
  day: string
) => {
  for (const id of ["calendar-weekdays", "mood-weekdays", "tag-weekdays"]) {
    expect(
      within(screen.getByTestId(id)).getAllByText(
        /Mon|Tue|Wed|Thu|Fri|Sat|Sun/u
      )[0]
    ).toHaveTextContent(day);
  }
};

test("device changes update calendar and weekly stats together", async () => {
  const screen = await render(<CalendarViews />);
  assertFirstDay(screen, "Mon");
  const calendars = Localization.useCalendars();
  jest
    .mocked(Localization.useCalendars)
    .mockReturnValue([
      { ...calendars[0], firstWeekday: Localization.Weekday.SUNDAY },
    ]);
  await screen.rerender(<CalendarViews />);
  assertFirstDay(screen, "Sun");
  await screen.unmount();
  const restarted = await render(<CalendarViews />);
  assertFirstDay(restarted, "Sun");
});

test("stored app choice cannot override device calendar", async () => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ weekStart: "sunday" })
  );
  const screen = await render(<CalendarViews />);
  assertFirstDay(screen, "Mon");
});

test.each([
  { firstWeekday: 1, expected: "Mon" },
  { firstWeekday: 7, expected: "Sun" },
])(
  "web Intl weekday $firstWeekday maps to $expected",
  async ({ firstWeekday, expected }) => {
    jest.replaceProperty(Platform, "OS", "web");
    const calendars = Localization.useCalendars();
    jest
      .mocked(Localization.useCalendars)
      .mockReturnValue([{ ...calendars[0], firstWeekday }]);
    const screen = await render(<CalendarViews />);
    assertFirstDay(screen, expected);
  }
);
