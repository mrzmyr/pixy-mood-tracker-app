import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, Stack, ThemeProvider, useRouter } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import noop from "lodash/noop";
import { Alert, Pressable, Text } from "react-native";
import { AnalyticsProvider } from "@/state/analytics";
import { LogsProvider } from "@/features/logs";
import { SettingsProvider } from "@/state/settings";
import Colors from "@/constants/Colors";
import { STORAGE_KEY as STORAGE_KEY_TAGS, TagsProvider } from "../TagsProvider";
import { TagCreate } from "../screens/TagCreate";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide; the router Stack also needs its contexts
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default
);

const theme = {
  ...DefaultTheme,
  dark: false,
  colors: { ...DefaultTheme.colors, ...Colors.light },
};

const Home = () => {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push("/create")}>
      <Text>Open form</Text>
    </Pressable>
  );
};

const Layout = () => (
  <ThemeProvider value={theme}>
    <SettingsProvider>
      <AnalyticsProvider>
        <LogsProvider>
          <TagsProvider>
            <Stack />
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

// Presses a button of the latest prompt by its style.
const pressPrompt = (style: "destructive" | "cancel") => {
  const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2] ?? [];
  buttons.find((button) => button.style === style)?.onPress?.();
};

let alert: jest.SpyInstance | undefined;

describe("tag form discard guard", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers();
    alert = jest.spyOn(Alert, "alert").mockImplementation(noop);
  });

  afterEach(() => {
    alert?.mockRestore();
  });

  // One test: the router store breaks a second render in the same file.
  test("asks before a typed name is dropped, saves on Return without asking", async () => {
    const result = await renderRouter(
      { _layout: Layout, index: Home, create: TagCreate },
      { initialUrl: "/" }
    );
    jest.useRealTimers();

    // Clean form closes at once.
    fireEvent.press(await result.findByText("Open form"));
    fireEvent.press(await result.findByText("Cancel"));
    fireEvent.press(await result.findByText("Open form"));
    expect(Alert.alert).not.toHaveBeenCalled();

    // Typed name: Cancel asks; Keep Editing keeps the name.
    fireEvent.changeText(await result.findByTestId("tag-name"), "Big day");
    fireEvent.press(result.getByText("Cancel"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));
    await act(() => Promise.resolve(pressPrompt("cancel")));
    expect(result.getByTestId("tag-name")).toHaveDisplayValue("Big day");

    // Return saves and closes without a second prompt.
    fireEvent(result.getByTestId("tag-name"), "submitEditing");
    expect(await result.findByText("Open form")).toBeOnTheScreen();
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    await waitFor(async () => {
      expect(await storedTitles()).toContain("Big day");
    });
  });
});
