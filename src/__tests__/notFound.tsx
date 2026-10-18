import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { userEvent, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { Text } from "react-native";
import NotFound from "@/app/(app)/+not-found";
import { INITIAL_STATE } from "@/constants/Settings";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-router's Jest setup replaces reanimated with an empty mock, so the animated press feedback cannot render; a plain Pressable keeps the button tappable.
jest.mock("@/components/PressableScale", () => ({
  PressableScale: jest.requireActual("react-native").Pressable,
}));

const { screen: mockScreen } = getPostHogTestClient();

const renderApp = async (initialUrl: string) => {
  const result = await renderRouter(
    {
      _layout: () => (
        <SettingsProvider>
          <AnalyticsProvider options={{ enabled: true }}>
            <Stack />
          </AnalyticsProvider>
        </SettingsProvider>
      ),
      calendar: () => <Text>Calendar screen</Text>,
      "+not-found": NotFound,
    },
    { initialUrl }
  );
  jest.useRealTimers();
  return result;
};

describe("not found route", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
    );
  });

  test("unknown path opens calendar from the not found screen", async () => {
    const result = await renderApp("/widget/old-link");

    await userEvent.press(result.getByTestId("not-found-open-calendar"));

    expect(await result.findByText("Calendar screen")).toBeTruthy();
    expect(result.queryByTestId("not-found-open-calendar")).toBeNull();
  });

  test("tracks a fixed screen name without the path", async () => {
    await renderApp("/widget/old-link");

    await waitFor(() => expect(mockScreen).toHaveBeenCalled());
    expect(jest.mocked(mockScreen).mock.calls[0][0]).toBe("NotFound");
    expect(JSON.stringify(jest.mocked(mockScreen).mock.calls)).not.toContain(
      "old-link"
    );
  });
});
