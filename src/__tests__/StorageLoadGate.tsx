import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Linking, Text } from "react-native";
import Colors from "@/constants/Colors";
import {
  createMemoryFileTransfer,
  PERSISTED_STORES,
  setFileTransferOverride,
} from "@/features/datagate";
import { PeopleProvider } from "@/features/people";
import { LogsProvider, STORAGE_KEY as LOGS_KEY } from "@/features/logs";
import { TagsProvider } from "@/features/tags";
import { StorageLoadGate } from "@/shell/StorageLoadGate";
import { AnalyticsProvider } from "@/state/analytics";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
} from "@/state/settings";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- load errors are reported through the Sentry SDK imported directly in state/persisted
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

const renderApp = ({ isTrackingEnabled = false } = {}) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider options={{ enabled: isTrackingEnabled }}>
          <LogsProvider>
            <TagsProvider>
              <PeopleProvider>
                <StorageLoadGate>
                  <Text>Calendar</Text>
                </StorageLoadGate>
              </PeopleProvider>
            </TagsProvider>
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
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
  }, 15_000);

  test.each(
    PERSISTED_STORES.filter((store) => store.gated).map((store) => [
      store.name,
      store.key,
    ])
  )(
    "user sees the error screen when stored %s cannot be read",
    async (_name, key) => {
      await AsyncStorage.setItem(key, "🐇");

      await renderApp();

      expect(await screen.findByTestId("storage-load-error")).toBeOnTheScreen();
      expect(screen.queryByText("Calendar")).toBeNull();
      expect(await AsyncStorage.getItem(key)).toBe("🐇");
    },
    15_000
  );

  test("load failure code goes to analytics when the user opted in", async () => {
    // jest.setup.js replaces posthog-react-native with one shared fake client.
    const { capture } = getPostHogTestClient();
    jest.mocked(capture).mockClear();
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
    );
    await AsyncStorage.setItem(LOGS_KEY, "🐇");

    await renderApp({ isTrackingEnabled: true });

    await waitFor(() =>
      expect(capture).toHaveBeenCalledWith(
        "app:storage_load_failed",
        expect.objectContaining({ status: "storage_invalid_value" })
      )
    );
  });

  test("user can export stored data from the error screen", async () => {
    await AsyncStorage.setItem(LOGS_KEY, "🐇");
    const fileTransfer = createMemoryFileTransfer();
    setFileTransferOverride(fileTransfer);
    const user = userEvent.setup();

    await renderApp();
    await user.press(await screen.findByText("Export data"));

    await waitFor(() => expect(fileTransfer.shared).toHaveLength(1));
    expect(JSON.parse(fileTransfer.shared[0].contents).storage[LOGS_KEY]).toBe(
      "🐇"
    );
    expect(screen.getByTestId("storage-load-error")).toBeOnTheScreen();
    expect(await AsyncStorage.getItem(LOGS_KEY)).toBe("🐇");

    setFileTransferOverride(null);
  });

  test("user can mail support with the error code and no stored data", async () => {
    await AsyncStorage.setItem(LOGS_KEY, "🐇");
    const openURLSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const user = userEvent.setup();

    await renderApp();
    await user.press(await screen.findByText("Contact support"));

    const url = decodeURIComponent(openURLSpy.mock.calls[0][0]);
    expect(url).toContain("mailto:care@pixy.day");
    expect(url).toContain("Error code: storage_invalid_value");
    expect(url).not.toContain("🐇");
    expect(screen.queryByText("Report Bug")).toBeNull();

    openURLSpy.mockRestore();
  });

  test("user sees the feedback form when no mail app opens", async () => {
    await AsyncStorage.setItem(LOGS_KEY, "🐇");
    const openURLSpy = jest
      .spyOn(Linking, "openURL")
      .mockRejectedValue(new Error("no mail app"));
    const user = userEvent.setup();

    await renderApp();
    await user.press(await screen.findByText("Contact support"));

    expect(await screen.findByText("Report Bug")).toBeOnTheScreen();

    openURLSpy.mockRestore();
  });
});
