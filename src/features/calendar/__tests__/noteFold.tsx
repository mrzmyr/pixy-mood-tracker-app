import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import dayjs from "dayjs";
import { FlatList } from "react-native";
import { _generateItem } from "@/__tests__/utils";
import { DATE_FORMAT } from "@/constants/Config";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { LogList } from "@/features/calendar";
import { LogsProvider, STORAGE_KEY as LOGS_KEY } from "@/features/logs";
import { PeopleProvider } from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
  useSettingsLoad,
} from "@/state/settings";
import { COLLAPSED_LINES, Message } from "../screens/LogList/Message";

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-router's Jest setup replaces reanimated with an empty mock, so the animated float button cannot render; a plain Pressable keeps it tappable.
jest.mock("@/components/FloatButton", () => ({
  FloatButton: jest.requireActual("react-native").Pressable,
}));

const TEXT = "log-list-message-text";
const MEASURE = "log-list-message-measure";
const TOGGLE = "log-list-message-toggle";
const EDIT = "log-list-message-edit";

/** Layout event of a note that needs `count` lines when nothing limits it. */
const layoutOf = (count: number) => ({
  nativeEvent: { lines: Array.from({ length: count }, () => ({})) },
});

const HIDDEN = { includeHiddenElements: true };

const Loaded = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSettingsLoad();
  return status === "ready" ? children : null;
};

describe("note fold", () => {
  describe("message", () => {
    const item = _generateItem({ message: "A note" });

    const renderMessage = ({
      expanded = false,
      onEdit,
      onToggleExpanded = jest.fn(),
    }: {
      expanded?: boolean;
      onEdit?: () => void;
      onToggleExpanded?: () => void;
    } = {}) =>
      render(
        <ThemeProvider value={DefaultTheme}>
          <Message
            item={item}
            expanded={expanded}
            onEdit={onEdit}
            onToggleExpanded={onToggleExpanded}
          />
        </ThemeProvider>
      );

    test("a note that fits shows no button", async () => {
      const screen = await renderMessage();

      await fireEvent(
        screen.getByTestId(MEASURE, HIDDEN),
        "textLayout",
        layoutOf(2)
      );

      expect(screen.queryByTestId(TOGGLE)).toBeNull();
    });

    test("a note of exactly the limit shows no button", async () => {
      const screen = await renderMessage();

      await fireEvent(
        screen.getByTestId(MEASURE, HIDDEN),
        "textLayout",
        layoutOf(COLLAPSED_LINES)
      );

      expect(screen.queryByTestId(TOGGLE)).toBeNull();
    });

    test("a note over the limit folds and shows the button", async () => {
      const screen = await renderMessage();

      await fireEvent(
        screen.getByTestId(MEASURE, HIDDEN),
        "textLayout",
        layoutOf(COLLAPSED_LINES + 1)
      );

      expect(screen.getByTestId(TOGGLE)).toBeTruthy();
      expect(screen.getByTestId(TEXT).props.numberOfLines).toBe(
        COLLAPSED_LINES
      );
    });

    test("the button reports the state and unfolds the text", async () => {
      const onToggleExpanded = jest.fn();
      const screen = await renderMessage({ onToggleExpanded });
      await fireEvent(
        screen.getByTestId(MEASURE, HIDDEN),
        "textLayout",
        layoutOf(9)
      );

      expect(screen.getByTestId(TOGGLE).props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: false })
      );
      await fireEvent.press(screen.getByTestId(TOGGLE));
      expect(onToggleExpanded).toHaveBeenCalledTimes(1);

      await screen.rerender(
        <ThemeProvider value={DefaultTheme}>
          <Message item={item} expanded onToggleExpanded={onToggleExpanded} />
        </ThemeProvider>
      );

      expect(screen.getByTestId(TOGGLE).props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: true })
      );
      expect(screen.getByTestId(TEXT).props.numberOfLines).toBeUndefined();
    });

    test("a card that mounts expanded keeps the button before it measures", async () => {
      const screen = await renderMessage({ expanded: true });

      expect(screen.getByTestId(TOGGLE)).toBeTruthy();
    });

    test("the button does not open the editor, the text does", async () => {
      const onEdit = jest.fn();
      const screen = await renderMessage({ onEdit });
      await fireEvent(
        screen.getByTestId(MEASURE, HIDDEN),
        "textLayout",
        layoutOf(9)
      );

      await fireEvent.press(screen.getByTestId(TOGGLE));
      expect(onEdit).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByTestId(EDIT));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    test("without a way to unfold, the full text shows", async () => {
      const screen = await render(
        <ThemeProvider value={DefaultTheme}>
          <Message item={item} />
        </ThemeProvider>
      );

      expect(screen.getByTestId(TEXT).props.numberOfLines).toBeUndefined();
      expect(screen.queryByTestId(TOGGLE)).toBeNull();
    });
  });

  describe("day list", () => {
    const day = dayjs().subtract(1, "day").format(DATE_FORMAT);
    const ENTRIES = 60;
    const CARD = 200;

    const renderDay = async () => {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(INITIAL_STATE));
      await AsyncStorage.setItem(
        LOGS_KEY,
        JSON.stringify({
          items: Array.from({ length: ENTRIES }, (_, index) =>
            _generateItem({
              id: `entry-${index}`,
              message: `note ${index}`,
              dateTime: dayjs(day).hour(0).add(index, "minute").toISOString(),
            })
          ),
        })
      );
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
                        </Loaded>
                      </PeopleProvider>
                    </TagsProvider>
                  </LogsProvider>
                </AnalyticsProvider>
              </SettingsProvider>
            </ThemeProvider>
          ),
          "days/[date]": LogList,
        },
        { initialUrl: `/days/${day}` }
      );
      jest.useRealTimers();
      return result;
    };

    beforeEach(() => AsyncStorage.clear());

    test("an unfolded note stays unfolded after its card unmounts", async () => {
      const result = await renderDay();
      const list = result.getByTestId("log-list");
      const metrics = {
        contentSize: { width: 400, height: ENTRIES * CARD },
        layoutMeasurement: { width: 400, height: 800 },
      };
      const scrollTo = async (index: number) => {
        // Cards get sizes first: unsized cells keep the list from moving its window.
        const positions = await result.findAllByTestId("log-list-position");
        for (const position of positions) {
          const at =
            Math.trunc(Number(String(position.props.children).split("/")[0])) -
            1;
          // oxlint-disable-next-line eslint/no-await-in-loop -- the list needs the layout events one after another; parallel acts drop them.
          await fireEvent(position, "layout", {
            nativeEvent: {
              layout: { x: 0, y: at * CARD, width: 400, height: CARD },
            },
          });
        }
        await fireEvent.scroll(list, {
          nativeEvent: {
            ...metrics,
            contentOffset: { x: 0, y: index * CARD },
          },
        });
      };
      const noteText = (note: string) =>
        result
          .queryAllByTestId(TEXT)
          .find((node) => node.props.children === note);

      await fireEvent(list, "layout", {
        nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
      });
      await fireEvent(list, "contentSizeChange", 400, ENTRIES * CARD);
      await scrollTo(30);
      await waitFor(() => expect(noteText("note 30")).toBeTruthy());
      const measures = result
        .getAllByTestId(MEASURE, HIDDEN)
        .filter((node) => node.props.children === "note 30");
      expect(measures).toHaveLength(1);
      await Promise.all(
        measures.map((node) => fireEvent(node, "textLayout", layoutOf(9)))
      );
      await fireEvent.press(await result.findByTestId(TOGGLE));
      expect(noteText("note 30")?.props.numberOfLines).toBeUndefined();

      await scrollTo(0);
      await waitFor(() => expect(noteText("note 30")).toBeUndefined());
      await scrollTo(30);

      await waitFor(() => expect(noteText("note 30")).toBeTruthy());
      expect(noteText("note 30")?.props.numberOfLines).toBeUndefined();
      expect(result.getByTestId(TOGGLE).props.accessibilityState).toEqual(
        expect.objectContaining({ expanded: true })
      );

      // Folding brings the card back to the top of the list.
      const scrollToIndex = jest.spyOn(FlatList.prototype, "scrollToIndex");
      await fireEvent.press(result.getByTestId(TOGGLE));
      await fireEvent(list, "contentSizeChange", 400, ENTRIES * CARD);

      await waitFor(() =>
        expect(scrollToIndex).toHaveBeenCalledWith(
          expect.objectContaining({ index: 30 })
        )
      );
      expect(noteText("note 30")?.props.numberOfLines).toBe(COLLAPSED_LINES);
    });
  });
});
