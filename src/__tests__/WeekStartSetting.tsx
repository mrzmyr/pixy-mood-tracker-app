import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  render,
  userEvent,
  waitFor,
  within,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import * as Localization from "expo-localization";
import { View } from "react-native";
import Colors from "@/constants/Colors";
import { WeekStartSetting } from "@/features/settings/screens/Settings/WeekStartSetting";
import CalendarHeader from "@/features/calendar/screens/Calendar/CalendarHeader";
import { MoodPeaksContent } from "@/features/statistics/screens/Statistics/MoodPeaksCards";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import { AnalyticsProvider } from "@/state/analytics";
import { LogsProvider } from "@/features/logs";

// oxlint-disable-next-line anti-slop/no-module-mocking -- native sheets have no Jest view; render their content only while presented.
jest.mock("@expo/ui", () => ({
  BottomSheet: ({
    isPresented,
    children,
  }: {
    isPresented: boolean;
    children: React.ReactNode;
  }) => (isPresented ? children : null),
  RNHostView: ({ children }: { children: React.ReactNode }) => children,
}));

const Settings = () => (
  <ThemeProvider
    value={{
      ...DefaultTheme,
      colors: { ...DefaultTheme.colors, ...Colors.light },
    }}
  >
    <SettingsProvider>
      <AnalyticsProvider>
        <LogsProvider>
          <WeekStartSetting />
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
        </LogsProvider>
      </AnalyticsProvider>
    </SettingsProvider>
  </ThemeProvider>
);

const renderSettings = () => render(<Settings />);

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

test("choosing Sunday updates calendar and weekly stats, survives restart", async () => {
  const screen = await renderSettings();
  const calendar = within(screen.getByTestId("calendar-weekdays"));
  const mood = within(screen.getByTestId("mood-weekdays"));
  expect(
    calendar.getAllByText(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/u)[0]
  ).toHaveTextContent("Mon");
  expect(
    mood.getAllByText(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/u)[0]
  ).toHaveTextContent("Mon");

  await userEvent.press(screen.getByTestId("week-start"));
  expect(screen.getByTestId("week-start-system")).toBeChecked();
  await userEvent.press(screen.getByTestId("week-start-sunday"));

  expect(
    calendar.getAllByText(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/u)[0]
  ).toHaveTextContent("Sun");
  expect(
    mood.getAllByText(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/u)[0]
  ).toHaveTextContent("Sun");
  await waitFor(async () =>
    expect(
      JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "{}")
    ).toMatchObject({ weekStart: "sunday" })
  );

  await screen.unmount();
  const restarted = await renderSettings();
  await waitFor(() =>
    expect(
      within(restarted.getByTestId("calendar-weekdays")).getAllByText(
        /Mon|Tue|Wed|Thu|Fri|Sat|Sun/u
      )[0]
    ).toHaveTextContent("Sun")
  );
  await userEvent.press(restarted.getByTestId("week-start"));
  expect(restarted.getByTestId("week-start-sunday")).toBeChecked();
  await userEvent.press(restarted.getByTestId("week-start-system"));
  expect(
    within(restarted.getByTestId("calendar-weekdays")).getAllByText(
      /Mon|Tue|Wed|Thu|Fri|Sat|Sun/u
    )[0]
  ).toHaveTextContent("Mon");
});

test("dismissing picker preserves choice", async () => {
  const screen = await renderSettings();
  await userEvent.press(screen.getByTestId("week-start"));
  await userEvent.press(screen.getByTestId("week-start-cancel"));
  await userEvent.press(screen.getByTestId("week-start"));
  expect(screen.getByTestId("week-start-system")).toBeChecked();
});

test("system choice reacts to changed device calendar", async () => {
  const screen = await renderSettings();
  const calendars = Localization.useCalendars();
  jest
    .mocked(Localization.useCalendars)
    .mockReturnValue([
      { ...calendars[0], firstWeekday: Localization.Weekday.SUNDAY },
    ]);
  await screen.rerender(<Settings />);
  expect(
    within(screen.getByTestId("calendar-weekdays")).getAllByText(
      /Mon|Tue|Wed|Thu|Fri|Sat|Sun/u
    )[0]
  ).toHaveTextContent("Sun");
});
