import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { AnalyticsProvider } from "@/state/analytics";
import { LogsProvider } from "@/features/logs";
import { SettingsProvider } from "@/state/settings";
import Colors from "@/constants/Colors";
import { MAX_TAG_LENGTH, MIN_TAG_LENGTH } from "@/constants/Config";
import { STORAGE_KEY as STORAGE_KEY_TAGS, TagsProvider } from "../TagsProvider";
import { TagCreate } from "../screens/TagCreate";

const theme = {
  ...DefaultTheme,
  dark: false,
  colors: { ...DefaultTheme.colors, ...Colors.light },
};

// Inside a stack with a header: on iOS, Save sits in the native bar.
// The router store settles on fake timers; the test runs on real ones.
const renderCreate = async () => {
  jest.useFakeTimers();
  const screen = await renderRouter(
    {
      _layout: () => (
        <ThemeProvider value={theme}>
          <SettingsProvider>
            <AnalyticsProvider>
              <LogsProvider>
                <TagsProvider>
                  <Stack screenOptions={{ headerShown: true }} />
                </TagsProvider>
              </LogsProvider>
            </AnalyticsProvider>
          </SettingsProvider>
        </ThemeProvider>
      ),
      index: TagCreate,
    },
    { initialUrl: "/" }
  );
  jest.useRealTimers();
  return screen;
};

const storedTitles = async (): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_TAGS);
  const parsed: { tags: { title: string }[] } = JSON.parse(
    raw ?? '{"tags":[]}'
  );
  return parsed.tags.map((tag) => tag.title);
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("tag form", () => {
  test("user sees an error instead of a disabled Save when the name is too short", async () => {
    const screen = await renderCreate();
    await act(async () => {});

    expect(screen.queryByTestId("tag-name-error")).toBeNull();

    await fireEvent.press(screen.getByTestId("tag-save"));

    await waitFor(() => {
      expect(screen.getByTestId("tag-name-error")).toHaveTextContent(
        String(MIN_TAG_LENGTH),
        { exact: false }
      );
    });
    expect(await storedTitles()).not.toContain("");
  });

  test("user sees the error go away once the name is valid", async () => {
    const screen = await renderCreate();
    await act(async () => {});

    await fireEvent.press(screen.getByTestId("tag-save"));
    await fireEvent.changeText(screen.getByTestId("tag-name"), "Valid name");

    await waitFor(() => {
      expect(screen.queryByTestId("tag-name-error")).toBeNull();
    });
  });

  test("user sees the counter only above 90% of the limit", async () => {
    const screen = await renderCreate();
    await act(async () => {});
    const input = screen.getByTestId("tag-name");

    const atThreshold = Math.floor(MAX_TAG_LENGTH * 0.9);
    await fireEvent.changeText(input, "a".repeat(atThreshold));
    expect(screen.queryByTestId("tag-name-counter")).toBeNull();

    await fireEvent.changeText(input, "a".repeat(atThreshold + 1));
    expect(screen.getByTestId("tag-name-counter")).toHaveTextContent(
      `${atThreshold + 1}/${MAX_TAG_LENGTH}`
    );
  });
});
