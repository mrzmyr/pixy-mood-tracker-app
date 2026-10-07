import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { fireEvent, waitFor } from "@testing-library/react-native";
import dayjs from "dayjs";
import { StyleSheet, Text } from "react-native";
import { _generateItem } from "@/__tests__/utils";
import { DATE_FORMAT } from "@/constants/Config";
import { INITIAL_STATE } from "@/constants/Settings";
import { LogList } from "@/features/calendar";
import { LogsProvider, STORAGE_KEY as LOGS_KEY } from "@/features/logs";
import { TagsProvider } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
} from "@/state/settings";

// oxlint-disable-next-line anti-slop/no-module-mocking -- native carousel is unavailable in Jest; a plain View keeps the style the screen passes.
jest.mock("react-native-reanimated-carousel", () => {
  const { View } = jest.requireActual("react-native");
  return {
    Carousel: ({ testID, style }: { testID?: string; style?: unknown }) => (
      <View testID={testID} style={style} />
    ),
  };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-router's Jest setup replaces reanimated with an empty mock, so the animated press feedback cannot render; a plain Pressable keeps the button tappable.
jest.mock("@/components/PressableScale", () => ({
  PressableScale: jest.requireActual("react-native").Pressable,
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-router's Jest setup replaces reanimated with an empty mock, so the animated float button cannot render; a plain Pressable keeps it tappable.
jest.mock("@/components/FloatButton", () => ({
  FloatButton: jest.requireActual("react-native").Pressable,
}));

const day = dayjs().subtract(1, "day").format(DATE_FORMAT);

/** Stand-in logger: shows the day it was opened for. */
const CreateStub = () => {
  const { dateTime } = useLocalSearchParams<{ dateTime: string }>();
  return <Text>{`create ${dayjs(dateTime).format(DATE_FORMAT)}`}</Text>;
};

const layout = (height: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
});

const renderDay = async () => {
  const result = await renderRouter(
    {
      _layout: () => (
        <SettingsProvider>
          <AnalyticsProvider>
            <LogsProvider>
              <TagsProvider>
                <Stack />
              </TagsProvider>
            </LogsProvider>
          </AnalyticsProvider>
        </SettingsProvider>
      ),
      "days/[date]": LogList,
      "logs/create/[dateTime]": CreateStub,
    },
    { initialUrl: `/days/${day}` }
  );
  jest.useRealTimers();
  return result;
};

describe("day view pages", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(INITIAL_STATE));
    await AsyncStorage.setItem(
      LOGS_KEY,
      JSON.stringify({
        items: [_generateItem({ dateTime: dayjs(day).hour(12).toISOString() })],
      })
    );
  });

  test("carousel follows the page area height when the modal shrinks", async () => {
    const result = await renderDay();
    const pages = await result.findByTestId("log-list-pages");
    const carouselHeight = () =>
      StyleSheet.flatten(result.getByTestId("log-list-carousel").props.style)
        .height;

    await fireEvent(pages, "layout", layout(800));
    await waitFor(() => expect(carouselHeight()).toBe(800));

    await fireEvent(pages, "layout", layout(740));
    await waitFor(() => expect(carouselHeight()).toBe(740));
  });

  test("add button opens the logger for the shown day", async () => {
    const result = await renderDay();

    fireEvent.press(await result.findByTestId("log-list-add"));

    expect(await result.findByText(`create ${day}`)).toBeTruthy();
  });
});
