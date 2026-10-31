import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, Stack, ThemeProvider, useRouter } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import noop from "lodash/noop";
import { Alert, Platform, Pressable, Text } from "react-native";
import Colors from "@/constants/colors";
import { LogsProvider, STORAGE_KEY as STORAGE_KEY_LOGS } from "@/features/logs";
import { PeopleProvider } from "@/features/people/people-provider";
import { TagsProvider } from "@/features/tags/tags-provider";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { QuickCheckIn } from "../screens/quick-check-in";

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
    <Pressable onPress={() => router.push("/check-in/new")}>
      <Text>Open check-in</Text>
    </Pressable>
  );
};

const Layout = () => (
  <ThemeProvider value={theme}>
    <SettingsProvider>
      <AnalyticsProvider>
        <LogsProvider>
          <TagsProvider>
            <PeopleProvider>
              <Stack />
            </PeopleProvider>
          </TagsProvider>
        </LogsProvider>
      </AnalyticsProvider>
    </SettingsProvider>
  </ThemeProvider>
);

const storedNotes = async (): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_LOGS);
  const parsed: { items: { message: string }[] } = JSON.parse(
    raw ?? '{"items":[]}'
  );
  return parsed.items.map((item) => item.message);
};

// Presses a button of the latest prompt by its style.
const pressPrompt = (style: "destructive" | "cancel") => {
  const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2] ?? [];
  buttons.find((button) => button.style === style)?.onPress?.();
};

let alert: jest.SpyInstance | undefined;

describe("quick check-in discard guard", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    // Android: Close and Save are JS header buttons with test ids.
    jest.replaceProperty(Platform, "OS", "android");
    jest.useFakeTimers();
    alert = jest.spyOn(Alert, "alert").mockImplementation(noop);
  });

  afterEach(() => {
    alert?.mockRestore();
  });

  // One test: the router store breaks a second render in the same file.
  test("asks before typed input is dropped, never when clean or on Save", async () => {
    const result = await renderRouter(
      { _layout: Layout, index: Home, "check-in/[id]": QuickCheckIn },
      { initialUrl: "/" }
    );
    jest.useRealTimers();

    // Clean draft closes at once.
    fireEvent.press(await result.findByText("Open check-in"));
    fireEvent.press(await result.findByTestId("quick-check-in-close"));
    fireEvent.press(await result.findByText("Open check-in"));
    expect(Alert.alert).not.toHaveBeenCalled();

    // Save closes without a prompt and stores the entry.
    fireEvent.press(await result.findByTestId("quick-check-in-mood-good"));
    fireEvent.changeText(result.getByTestId("quick-check-in-note"), "Tea");
    await waitFor(() =>
      expect(result.getByTestId("quick-check-in-save")).toBeEnabled()
    );
    fireEvent.press(result.getByTestId("quick-check-in-save"));
    await waitFor(() =>
      expect(result.queryByTestId("quick-check-in-note")).toBeNull()
    );
    expect(Alert.alert).not.toHaveBeenCalled();
    await waitFor(async () => {
      expect(await storedNotes()).toEqual(["Tea"]);
    });

    // Typed note: Close asks; Keep Editing keeps the note.
    fireEvent.press(await result.findByText("Open check-in"));
    fireEvent.changeText(
      await result.findByTestId("quick-check-in-note"),
      "Long walk"
    );
    fireEvent.press(result.getByTestId("quick-check-in-close"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));
    await act(() => Promise.resolve(pressPrompt("cancel")));
    expect(result.getByTestId("quick-check-in-note")).toHaveDisplayValue(
      "Long walk"
    );

    // Discard closes and stores nothing.
    fireEvent.press(result.getByTestId("quick-check-in-close"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(2));
    await act(() => Promise.resolve(pressPrompt("destructive")));
    await waitFor(() =>
      expect(result.queryByTestId("quick-check-in-note")).toBeNull()
    );
    expect(await storedNotes()).toEqual(["Tea"]);
  });
});
