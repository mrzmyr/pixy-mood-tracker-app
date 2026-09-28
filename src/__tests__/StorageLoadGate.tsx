import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import * as FileSystem from "expo-file-system/legacy";
import { Text } from "react-native";
import Colors from "@/constants/Colors";
import { setFileTransferOverride } from "@/features/datagate/fileTransfer";
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

  test("user can export stored data from the error screen", async () => {
    await AsyncStorage.setItem(LOGS_KEY, "🐇");
    const share = jest.fn().mockResolvedValue(true);
    setFileTransferOverride({ share, pickJson: jest.fn() });
    const writeSpy = jest
      .spyOn(FileSystem, "writeAsStringAsync")
      .mockResolvedValue();
    const user = userEvent.setup();

    await renderApp();
    await user.press(await screen.findByText("Export data"));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(JSON.parse(writeSpy.mock.calls[0][1]).storage[LOGS_KEY]).toBe("🐇");
    expect(screen.getByTestId("storage-load-error")).toBeOnTheScreen();
    expect(await AsyncStorage.getItem(LOGS_KEY)).toBe("🐇");

    setFileTransferOverride(null);
    writeSpy.mockRestore();
  });
});
