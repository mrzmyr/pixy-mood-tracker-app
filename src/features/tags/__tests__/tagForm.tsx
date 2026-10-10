import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AnalyticsProvider } from "@/state/analytics";
import { LogsProvider } from "@/features/logs";
import { SettingsProvider } from "@/state/settings";
import Colors from "@/constants/Colors";
import { MAX_TAG_LENGTH, MIN_TAG_LENGTH } from "@/constants/Config";
import { STORAGE_KEY as STORAGE_KEY_TAGS, TagsProvider } from "../TagsProvider";
import TagColorPicker from "../components/TagColorPicker";
import { TagCreate } from "../screens/TagCreate";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const theme = {
  ...DefaultTheme,
  dark: false,
  colors: { ...DefaultTheme.colors, ...Colors.light },
};

const renderCreate = () =>
  render(
    <ThemeProvider value={theme}>
      <SettingsProvider>
        <AnalyticsProvider>
          <LogsProvider>
            <TagsProvider>
              <TagCreate />
            </TagsProvider>
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

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

    expect(screen.queryByTestId("tag-name-error")?.props.children).toBe("");

    await fireEvent.press(screen.getByTestId("tag-save"));

    await waitFor(() => {
      expect(screen.getByTestId("tag-name-error").props.children).toContain(
        String(MIN_TAG_LENGTH)
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
      expect(screen.getByTestId("tag-name-error").props.children).toBe("");
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

describe("<TagColorPicker>", () => {
  test("user selects a color and only that swatch reports selected", async () => {
    const onChange = jest.fn();
    const screen = await render(
      <ThemeProvider value={theme}>
        <TagColorPicker value="slate" onChange={onChange} />
      </ThemeProvider>
    );

    expect(screen.getByTestId("tag-color-slate")).toBeSelected();
    expect(screen.getByTestId("tag-color-lime")).not.toBeSelected();

    await fireEvent.press(screen.getByTestId("tag-color-lime"));
    expect(onChange).toHaveBeenCalledWith("lime");
  });
});
