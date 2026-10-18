import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { act, userEvent, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { Pressable, Text } from "react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import { useScreenTracking } from "@/shell/screenTracking";
import { AnalyticsProvider, useAnalytics } from "@/state/analytics";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";

const { screen: mockScreen } = getPostHogTestClient();
const settingsProperties = {
  scale_type: INITIAL_STATE.scaleType,
  reminder_enabled: INITIAL_STATE.reminderEnabled,
  steps: INITIAL_STATE.steps,
};

const Home = () => {
  const router = useRouter();
  const analytics = useAnalytics();

  return (
    <>
      <Pressable onPress={() => router.push("/logs/entry-1/edit")}>
        <Text>Open detail</Text>
      </Pressable>
      <Pressable onPress={() => analytics.enable()}>
        <Text>Enable analytics</Text>
      </Pressable>
    </>
  );
};

const Tracker = () => {
  useScreenTracking();
  return <Stack />;
};

const renderApp = async () => {
  const result = await renderRouter(
    {
      _layout: () => (
        <SettingsProvider>
          <AnalyticsProvider options={{ enabled: true }}>
            <Tracker />
          </AnalyticsProvider>
        </SettingsProvider>
      ),
      "settings/privacy": Home,
      "logs/[id]/edit": () => <Text>Detail</Text>,
    },
    { initialUrl: "/settings/privacy" }
  );
  jest.useRealTimers();
  return result;
};

describe("useScreenTracking()", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  test("sends a screen event per route change with settings, without params", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
    );
    const result = await renderApp();

    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    await userEvent.press(result.getByText("Open detail"));
    await waitFor(() => expect(mockScreen).toHaveBeenCalledTimes(2));
    expect(jest.mocked(mockScreen).mock.calls).toEqual([
      ["Privacy", settingsProperties],
      ["LogEdit", settingsProperties],
    ]);
  });

  test("sends the route in view once analytics turns on", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: false })
    );
    const result = await renderApp();
    await result.findByText("Enable analytics");
    await act(async () => {});
    expect(mockScreen).not.toHaveBeenCalled();

    await userEvent.press(result.getByText("Enable analytics"));
    await waitFor(() =>
      expect(mockScreen).toHaveBeenCalledWith("Privacy", settingsProperties)
    );
  });
});
