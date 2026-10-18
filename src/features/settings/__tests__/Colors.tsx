import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { Pressable, Text } from "react-native";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettings,
  useSettingsLoad,
} from "@/state/settings";
import { ColorsScreen } from "../screens/Colors";

// jest.setup.js replaces posthog-react-native with one shared fake client.
const mockCapture = jest.mocked(getPostHogTestClient().capture);

const scaleChangedCalls = () =>
  mockCapture.mock.calls.filter(
    ([event]) => event === "settings:scale_changed"
  );

// The app shows settings screens only after settings load, like this gate.
const SettingsLoaded = ({ children }: { children: React.ReactNode }) =>
  useSettingsLoad().status === "ready" ? children : null;

// Shows the stored scale and offers an unrelated settings change.
const SettingsProbe = () => {
  const { settings, setSettings } = useSettings();
  return (
    <>
      <Text testID="stored-scale">{settings.scaleType}</Text>
      <Pressable
        testID="toggle-reminder"
        onPress={() =>
          setSettings((current) => ({
            ...current,
            reminderEnabled: !current.reminderEnabled,
          }))
        }
      />
    </>
  );
};

const initialMetrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

const renderColors = async () => {
  await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ThemeProvider
        value={{
          ...DefaultTheme,
          dark: false,
          colors: { ...DefaultTheme.colors, ...Colors.light },
        }}
      >
        <SettingsProvider>
          <AnalyticsProvider options={{ enabled: true }}>
            <SettingsLoaded>
              <SettingsProbe />
              <ColorsScreen />
            </SettingsLoaded>
          </AnalyticsProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
  await waitFor(() => {
    expect(screen.getByTestId("color-scale-ColorBrew-RdYG")).toBeTruthy();
  });
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      analyticsEnabled: true,
      scaleType: "ColorBrew-RdYlGn",
    })
  );
});

describe("Settings > Colors", () => {
  test("opening the screen and unrelated settings changes send no scale_changed", async () => {
    await renderColors();

    await fireEvent.press(screen.getByTestId("toggle-reminder"));

    expect(scaleChangedCalls()).toHaveLength(0);
  });

  test("tapping a different scale saves it and sends scale_changed once", async () => {
    await renderColors();

    await fireEvent.press(screen.getByTestId("color-scale-ColorBrew-RdYG"));

    await waitFor(() => {
      expect(screen.getByTestId("stored-scale")).toHaveTextContent(
        "ColorBrew-RdYG"
      );
    });
    expect(scaleChangedCalls()).toEqual([
      [
        "settings:scale_changed",
        expect.objectContaining({ scale_type: "ColorBrew-RdYG" }),
      ],
    ]);
  });

  test("tapping the current scale sends no scale_changed", async () => {
    await renderColors();

    await fireEvent.press(screen.getByTestId("color-scale-ColorBrew-RdYlGn"));

    expect(scaleChangedCalls()).toHaveLength(0);
    expect(screen.getByTestId("stored-scale")).toHaveTextContent(
      "ColorBrew-RdYlGn"
    );
  });
});
