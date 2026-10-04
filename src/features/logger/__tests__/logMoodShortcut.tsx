import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { DeviceEventEmitter, Settings, Text } from "react-native";
import { AnalyticsProvider } from "@/state/analytics";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
  useSettings,
} from "@/state/settings";
import { Stack } from "expo-router";
import { useLogMoodShortcut } from "../useLogMoodShortcut";

const { capture: mockCapture } = getPostHogTestClient();

const Calendar = () => {
  const { settings } = useSettings();
  useLogMoodShortcut({ isReady: settings.loaded });
  return <Text>Calendar</Text>;
};

const LogCreate = () => <Text>Logger</Text>;

const KEY = "pixyLogMoodRequestedAt";

// Native side of RN `Settings`: `UserDefaults` as the intent writes it.
const mockSetValues = jest.fn();
// oxlint-disable-next-line anti-slop/no-module-mocking -- RN Settings reads UserDefaults through a native module unavailable in Jest; the intent writes there
jest.mock("react-native/Libraries/Settings/NativeSettingsManager", () => ({
  __esModule: true,
  default: {
    getConstants: () => ({ settings: {} }),
    setValues: (values: Record<string, number>) => mockSetValues(values),
    deleteValues: jest.fn(),
  },
}));

/** Native `UserDefaults` change, as `RCTSettingsManager` reports it. */
const runIntent = (requestedAt = Date.now()) =>
  DeviceEventEmitter.emit("settingsUpdated", { [KEY]: requestedAt });

const renderApp = async () => {
  const result = await renderRouter(
    {
      _layout: () => (
        <SettingsProvider>
          <AnalyticsProvider options={{ enabled: true }}>
            <Stack />
          </AnalyticsProvider>
        </SettingsProvider>
      ),
      calendar: Calendar,
      "logs/create/[dateTime]": LogCreate,
    },
    { initialUrl: "/calendar" }
  );
  // renderRouter turns on fake timers.
  jest.useRealTimers();
  return result;
};

describe("useLogMoodShortcut", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
    );
    jest.mocked(mockCapture).mockClear();
    mockSetValues.mockClear();
    Settings.set({ [KEY]: 0 });
  });

  it("opens the logger once when the intent ran before launch", async () => {
    runIntent(Date.now() - 2000);

    await renderApp();

    expect(await screen.findByText("Logger")).toBeTruthy();
    expect(mockSetValues).toHaveBeenLastCalledWith({ [KEY]: 0 });
    expect(mockCapture).toHaveBeenCalledWith(
      "logger:shortcut_opened",
      expect.anything()
    );
  });

  it("ignores a request from an earlier launch", async () => {
    runIntent(Date.now() - 5 * 60_000);

    await renderApp();

    expect(screen.getByText("Calendar")).toBeTruthy();
    expect(screen.queryByText("Logger")).toBeNull();
    expect(mockSetValues).toHaveBeenLastCalledWith({ [KEY]: 0 });
  });

  it("opens the logger when the intent runs while the app is open", async () => {
    await renderApp();
    expect(screen.queryByText("Logger")).toBeNull();

    act(() => runIntent());

    expect(await screen.findByText("Logger")).toBeTruthy();
  });
});
