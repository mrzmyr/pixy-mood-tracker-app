import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { Pressable, Text } from "react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import { navigationRef, useScreenTracking } from "@/navigation/screenTracking";
import { AnalyticsProvider, useAnalytics } from "@/state/analytics";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import type { RootStackParamList } from "../../types";

// jest.setup.js replaces posthog-react-native with one shared fake client.
const { screen: mockScreen } = getPostHogTestClient();

const Stack = createNativeStackNavigator<RootStackParamList>();

const Home = () => {
  const navigation = useNavigation();
  const analytics = useAnalytics();

  return (
    <>
      <Pressable
        onPress={() => navigation.navigate("LogEdit", { id: "entry-1" })}
      >
        <Text>Open detail</Text>
      </Pressable>
      <Pressable onPress={() => analytics.enable()}>
        <Text>Enable analytics</Text>
      </Pressable>
    </>
  );
};

const Detail = () => <Text>Detail</Text>;

const Tracker = () => {
  useScreenTracking();

  return (
    <Stack.Navigator>
      <Stack.Screen name="Privacy" component={Home} />
      <Stack.Screen name="LogEdit" component={Detail} />
    </Stack.Navigator>
  );
};

const renderApp = () =>
  render(
    <NavigationContainer ref={navigationRef}>
      <SettingsProvider>
        <AnalyticsProvider options={{ enabled: true }}>
          <Tracker />
        </AnalyticsProvider>
      </SettingsProvider>
    </NavigationContainer>
  );

describe("useScreenTracking()", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  test("should send a screen event per route change, without params", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
    );
    await renderApp();

    await waitFor(() => expect(mockScreen).toHaveBeenCalledWith("Privacy"));

    await userEvent.press(screen.getByText("Open detail"));

    await waitFor(() => expect(mockScreen).toHaveBeenCalledWith("LogEdit"));
    expect(jest.mocked(mockScreen).mock.calls).toEqual([
      ["Privacy"],
      ["LogEdit"],
    ]);
  });

  test("should send the route in view once analytics turns on", async () => {
    await renderApp();
    await screen.findByText("Enable analytics");
    await act(async () => {});

    expect(mockScreen).not.toHaveBeenCalled();

    await userEvent.press(screen.getByText("Enable analytics"));

    await waitFor(() => expect(mockScreen).toHaveBeenCalledWith("Privacy"));
  });
});
