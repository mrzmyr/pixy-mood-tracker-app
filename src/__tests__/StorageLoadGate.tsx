import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import Colors from "@/constants/Colors";
import { LogsProvider, STORAGE_KEY as LOGS_KEY } from "@/features/logs";
import { TagsProvider } from "@/features/tags";
import { StorageLoadGate } from "@/navigation/StorageLoadGate";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- load errors are reported through the Sentry SDK imported directly in state/persisted
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

const renderApp = () =>
  render(
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider>
          <LogsProvider>
            <TagsProvider>
              <StorageLoadGate>
                <Text>Calendar</Text>
              </StorageLoadGate>
            </TagsProvider>
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </NavigationContainer>
  );

const _console_error = console.error;

describe("StorageLoadGate", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = _console_error;
  });

  test("user sees the app when all stored data loads", async () => {
    await renderApp();

    expect(await screen.findByText("Calendar")).toBeOnTheScreen();
    expect(screen.queryByTestId("storage-load-error")).toBeNull();
  });

  test("user sees an error screen instead of an empty app when stored logs cannot be read", async () => {
    await AsyncStorage.setItem(LOGS_KEY, "🐇");

    await renderApp();

    expect(
      await screen.findByText("Your entries could not be loaded")
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Your data is still stored on this device. Nothing was deleted."
      )
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Error code: storage_invalid_value")
    ).toBeOnTheScreen();
    expect(screen.getByText("Contact support")).toBeOnTheScreen();
    expect(screen.queryByText("Calendar")).toBeNull();
    expect(await AsyncStorage.getItem(LOGS_KEY)).toBe("🐇");
  });

  test("user keeps seeing the error screen when retry fails again", async () => {
    await AsyncStorage.setItem(LOGS_KEY, "🐇");
    const user = userEvent.setup();

    const getItemSpy = jest.spyOn(AsyncStorage, "getItem");
    getItemSpy.mockClear();
    const logReads = () =>
      getItemSpy.mock.calls.filter(([key]) => key === LOGS_KEY).length;

    await renderApp();
    await user.press(await screen.findByText("Try again"));

    await waitFor(() => expect(logReads()).toBe(2));
    expect(
      await screen.findByText("Error code: storage_invalid_value")
    ).toBeOnTheScreen();
    expect(screen.queryByText("Calendar")).toBeNull();
    expect(await AsyncStorage.getItem(LOGS_KEY)).toBe("🐇");
  });

  test("user sees the app after retry once stored logs can be read", async () => {
    await AsyncStorage.setItem(LOGS_KEY, "🐇");
    const user = userEvent.setup();

    await renderApp();
    const retryButton = await screen.findByText("Try again");
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify({ items: [] }));
    await user.press(retryButton);

    expect(await screen.findByText("Calendar")).toBeOnTheScreen();
    expect(screen.queryByTestId("storage-load-error")).toBeNull();
  });
});
