import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { userEvent, waitFor } from "@testing-library/react-native";
import dayjs from "dayjs";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { Pressable, Text } from "react-native";
import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import { DATE_FORMAT } from "@/constants/Config";
import { useCalendarNavigation } from "../navigation";
import { LogsProvider, STORAGE_KEY as LOGS_KEY } from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
} from "@/state/settings";

const { capture: mockCapture } = getPostHogTestClient();
const today = dayjs().format(DATE_FORMAT);
const twoDaysAgo = dayjs().subtract(2, "day").format(DATE_FORMAT);
const twoDaysAgoNoon = dayjs(twoDaysAgo).hour(12).toISOString();

const Days = () => {
  const calendarNavigation = useCalendarNavigation();
  return (
    <>
      <Pressable
        onPress={() =>
          calendarNavigation.openDay({ date: today, source: "calendar" })
        }
      >
        <Text>Open today</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          calendarNavigation.openDay({ date: twoDaysAgo, source: "mood_peaks" })
        }
      >
        <Text>Open two days ago</Text>
      </Pressable>
    </>
  );
};

const OpenedDay = () => {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <Text>{`Opened ${date}`}</Text>;
};

const OpenedCreate = () => {
  const { dateTime } = useLocalSearchParams<{ dateTime: string }>();
  return <Text>{`Opened ${dateTime}`}</Text>;
};

const renderDays = async () => {
  const result = await renderRouter(
    {
      _layout: () => (
        <SettingsProvider>
          <AnalyticsProvider options={{ enabled: true }}>
            <LogsProvider>
              <Stack />
            </LogsProvider>
          </AnalyticsProvider>
        </SettingsProvider>
      ),
      calendar: Days,
      "days/[date]": OpenedDay,
      "logs/create/[dateTime]": OpenedCreate,
    },
    { initialUrl: "/calendar" }
  );
  jest.useRealTimers();
  return result;
};

describe("useCalendarNavigation()", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
    );
    await AsyncStorage.setItem(
      LOGS_KEY,
      JSON.stringify({
        items: [
          _generateItem({ dateTime: twoDaysAgoNoon }),
          _generateItem({ dateTime: twoDaysAgoNoon }),
        ],
      })
    );
  });

  test("tracks opening a day with its source, entry count, and age", async () => {
    const result = await renderDays();
    await userEvent.press(await result.findByText("Open two days ago"));
    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith("calendar:day_opened", {
        source: "mood_peaks",
        entries_count: 2,
        days_ago: 2,
      })
    );
    expect(await result.findByText(`Opened ${twoDaysAgo}`)).toBeOnTheScreen();
  });

  test("tracks opening an empty day", async () => {
    const result = await renderDays();
    await userEvent.press(await result.findByText("Open today"));
    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith("calendar:day_opened", {
        source: "calendar",
        entries_count: 0,
        days_ago: 0,
      })
    );
    expect(await result.findByText(/^Opened .*T.*Z$/u)).toBeOnTheScreen();
  });
});
