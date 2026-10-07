import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  useLocalSearchParams,
} from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { fireEvent, waitFor } from "@testing-library/react-native";
import dayjs from "dayjs";
import { FlatList, Pressable, Text } from "react-native";
import { _generateItem } from "@/__tests__/utils";
import { DATE_FORMAT } from "@/constants/Config";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { LogList } from "@/features/calendar";
import {
  LogsProvider,
  STORAGE_KEY as LOGS_KEY,
  useLogUpdater,
} from "@/features/logs";
import { PeopleProvider } from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
  useSettingsLoad,
} from "@/state/settings";

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-router's Jest setup replaces reanimated with an empty mock, so the animated press feedback cannot render; a plain Pressable keeps the button tappable.
jest.mock("@/components/PressableScale", () => ({
  PressableScale: jest.requireActual("react-native").Pressable,
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-router's Jest setup replaces reanimated with an empty mock, so the animated float button cannot render; a plain Pressable keeps it tappable.
jest.mock("@/components/FloatButton", () => ({
  FloatButton: jest.requireActual("react-native").Pressable,
}));

const Loaded = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSettingsLoad();
  return status === "ready" ? children : null;
};

const day = dayjs().subtract(1, "day").format(DATE_FORMAT);

/** Stand-in logger: shows the day it was opened for. */
const CreateStub = () => {
  const { dateTime } = useLocalSearchParams<{ dateTime: string }>();
  return <Text>{`create ${dayjs(dateTime).format(DATE_FORMAT)}`}</Text>;
};

/** Adds an entry to the shown day, like the logger does when it closes. */
const AddEntry = ({ id, dateTime }: { id: string; dateTime: string }) => {
  const logUpdater = useLogUpdater();
  return (
    <Pressable
      testID="add-entry"
      onPress={() =>
        logUpdater.addLog(_generateItem({ id, message: id, dateTime }))
      }
    />
  );
};

const at = (hour: number) => dayjs(day).hour(hour).toISOString();

const seed = (items: ReturnType<typeof _generateItem>[]) =>
  AsyncStorage.setItem(LOGS_KEY, JSON.stringify({ items }));

const renderDay = async (search = "") => {
  const result = await renderRouter(
    {
      _layout: () => (
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
                <TagsProvider>
                  <PeopleProvider>
                    <Loaded>
                      <Stack />
                      <AddEntry id="added" dateTime={at(23)} />
                    </Loaded>
                  </PeopleProvider>
                </TagsProvider>
              </LogsProvider>
            </AnalyticsProvider>
          </SettingsProvider>
        </ThemeProvider>
      ),
      "days/[date]": LogList,
      "logs/create/[dateTime]": CreateStub,
    },
    { initialUrl: `/days/${day}${search}` }
  );
  jest.useRealTimers();
  return result;
};

const shownMessages = (result: Awaited<ReturnType<typeof renderDay>>) =>
  result.queryAllByText(/^entry-/u).map((node) => node.props.children);

describe("day view list", () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(INITIAL_STATE));
    await seed([
      _generateItem({ id: "c", message: "entry-c", dateTime: at(18) }),
      _generateItem({ id: "a", message: "entry-a", dateTime: at(8) }),
      _generateItem({ id: "b", message: "entry-b", dateTime: at(12) }),
    ]);
  });

  test("shows every entry of the day as a card, oldest first", async () => {
    const result = await renderDay();

    await waitFor(() =>
      expect(shownMessages(result)).toEqual(["entry-a", "entry-b", "entry-c"])
    );
  });

  test("scrolls to the entry the day opens for", async () => {
    const scrollToIndex = jest.spyOn(FlatList.prototype, "scrollToIndex");

    await renderDay("?entry=b");

    await waitFor(() =>
      expect(scrollToIndex).toHaveBeenCalledWith(
        expect.objectContaining({ index: 1 })
      )
    );
  });

  test("stays at the top without an entry", async () => {
    const scrollToIndex = jest.spyOn(FlatList.prototype, "scrollToIndex");

    const result = await renderDay();
    await waitFor(() => expect(shownMessages(result)).toHaveLength(3));

    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  test("scrolls to an entry added while the day is open", async () => {
    const scrollToIndex = jest.spyOn(FlatList.prototype, "scrollToIndex");
    const result = await renderDay();
    await waitFor(() => expect(shownMessages(result)).toHaveLength(3));

    fireEvent.press(result.getByTestId("add-entry"));

    // "added" is the newest entry, so it sorts last.
    await waitFor(() =>
      expect(scrollToIndex).toHaveBeenCalledWith(
        expect.objectContaining({ index: 3 })
      )
    );
  });

  test("renders only a window of a 100 entry day", async () => {
    await seed(
      Array.from({ length: 100 }, (_, index) =>
        _generateItem({
          id: `bulk-${index}`,
          message: `entry-${index}`,
          dateTime: dayjs(day).hour(0).add(index, "minute").toISOString(),
        })
      )
    );

    const result = await renderDay();

    await waitFor(() =>
      expect(shownMessages(result).length).toBeGreaterThan(0)
    );
    expect(shownMessages(result).length).toBeLessThan(100);
  });

  test("add button opens the logger for the shown day", async () => {
    const result = await renderDay();

    fireEvent.press(await result.findByTestId("log-list-add"));

    expect(await result.findByText(`create ${day}`)).toBeTruthy();
  });
});
