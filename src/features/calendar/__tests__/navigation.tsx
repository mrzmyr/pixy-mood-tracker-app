import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
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
import type { RootStackParamList } from "../../../../types";

// jest.setup.js replaces posthog-react-native with one shared fake client.
const { capture: mockCapture } = getPostHogTestClient();

const Stack = createNativeStackNavigator<RootStackParamList>();
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

const Empty = () => <Text>Opened</Text>;

const renderDays = () =>
  render(
    <NavigationContainer>
      <SettingsProvider>
        <AnalyticsProvider options={{ enabled: true }}>
          <LogsProvider>
            <Stack.Navigator>
              <Stack.Screen name="Calendar" component={Days} />
              <Stack.Screen name="LogCreate" component={Empty} />
              <Stack.Screen name="LogList" component={Empty} />
            </Stack.Navigator>
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </NavigationContainer>
  );

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

  test("should track opening a day with its source, entry count, and age", async () => {
    const user = userEvent.setup();
    await renderDays();

    await user.press(await screen.findByText("Open two days ago"));

    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith("calendar:day_opened", {
        source: "mood_peaks",
        entries_count: 2,
        days_ago: 2,
      })
    );
    expect(await screen.findByText("Opened")).toBeOnTheScreen();
  });

  test("should track opening an empty day", async () => {
    const user = userEvent.setup();
    await renderDays();

    await user.press(await screen.findByText("Open today"));

    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith("calendar:day_opened", {
        source: "calendar",
        entries_count: 0,
        days_ago: 0,
      })
    );
  });
});
