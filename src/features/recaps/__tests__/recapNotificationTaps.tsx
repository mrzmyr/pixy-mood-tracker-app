import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { act, waitFor } from "@testing-library/react-native";
import { DEFAULT_ACTION_IDENTIFIER } from "expo-notifications";
import type {
  NotificationContent,
  NotificationResponse,
} from "expo-notifications";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { Text } from "react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import type { NotificationResponseSource } from "@/features/notifications";
import { AnalyticsProvider } from "@/state/analytics";
import { FeatureFlagsContext } from "@/state/featureFlags/context";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import { useRecapNotificationTaps } from "../recapNotificationTaps";

const { capture: mockCapture } = getPostHogTestClient();
const EVENT = "recaps:notification_tapped";

const createResponse = ({
  actionIdentifier = DEFAULT_ACTION_IDENTIFIER,
  data = { type: "recap", kind: "month", date: "2026-09-30" },
}: {
  actionIdentifier?: string;
  data?: NotificationContent["data"];
} = {}): NotificationResponse => ({
  actionIdentifier,
  notification: {
    date: Date.now(),
    request: {
      identifier: "recap-id",
      content: {
        title: "Title",
        subtitle: null,
        body: "Body",
        data,
        categoryIdentifier: null,
        sound: null,
      },
      trigger: null,
    },
  },
});

const createSource = (launchResponse: NotificationResponse | null = null) => {
  let last = launchResponse;
  let listener: ((response: NotificationResponse) => void) | null = null;
  const source: NotificationResponseSource = {
    getLastResponse: () => last,
    clearLastResponse: () => {
      last = null;
    },
    addResponseListener: (handler) => {
      listener = handler;
      return {
        remove: () => {
          listener = null;
        },
      };
    },
  };
  const tap = async (response: NotificationResponse) => {
    await act(() => {
      listener?.(response);
    });
  };
  return { source, tap };
};

const FLAGS = {
  on: { flags: { recaps: true }, isLoading: false },
  off: { flags: { recaps: false }, isLoading: false },
};

const RecapRoute = () => {
  const { kind, date } = useLocalSearchParams<{ kind: string; date: string }>();
  return <Text testID="recap-route">{`${kind} ${date}`}</Text>;
};

const renderApp = async ({
  source,
  recaps,
}: {
  source: NotificationResponseSource;
  recaps: boolean;
}) => {
  const Shell = () => {
    useRecapNotificationTaps(source);
    return <Stack />;
  };
  const result = await renderRouter(
    {
      _layout: () => (
        <SettingsProvider>
          <AnalyticsProvider options={{ enabled: true }}>
            <FeatureFlagsContext.Provider value={recaps ? FLAGS.on : FLAGS.off}>
              <Shell />
            </FeatureFlagsContext.Provider>
          </AnalyticsProvider>
        </SettingsProvider>
      ),
      index: () => <Text testID="home">Home</Text>,
      "recaps/[kind]/[date]": RecapRoute,
    },
    { initialUrl: "/" }
  );
  jest.useRealTimers();
  return result;
};

const tappedCalls = () =>
  jest.mocked(mockCapture).mock.calls.filter(([event]) => event === EVENT);

describe("useRecapNotificationTaps()", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
    );
  });

  test("opens the recap of the tapped period", async () => {
    const { source, tap } = createSource();
    const screen = await renderApp({ source, recaps: true });

    await tap(createResponse());

    await waitFor(() =>
      expect(screen.getByTestId("recap-route").props.children).toBe(
        "month 2026-09-30"
      )
    );
    expect(tappedCalls()).toHaveLength(1);
    expect(tappedCalls()[0]?.[1]).toMatchObject({ period: "month" });
  });

  test("opens the recap from the tap that launched the app, once", async () => {
    const launch = createResponse({
      data: { type: "recap", kind: "week", date: "2026-10-11" },
    });
    const { source } = createSource(launch);
    const screen = await renderApp({ source, recaps: true });

    await waitFor(() =>
      expect(screen.getByTestId("recap-route").props.children).toBe(
        "week 2026-10-11"
      )
    );
    expect(source.getLastResponse()).toBeNull();
    expect(tappedCalls()).toHaveLength(1);
  });

  test("does nothing while flag recaps is off", async () => {
    const { source, tap } = createSource();
    const screen = await renderApp({ source, recaps: false });

    await tap(createResponse());

    expect(screen.getByTestId("home")).toBeTruthy();
    expect(screen.queryByTestId("recap-route")).toBeNull();
    expect(tappedCalls()).toHaveLength(0);
  });

  test("ignores dismisses and reminder taps", async () => {
    const { source, tap } = createSource();
    const screen = await renderApp({ source, recaps: true });

    await tap(createResponse({ actionIdentifier: "dismiss" }));
    await tap(createResponse({ data: { kind: "reminder" } }));

    expect(screen.queryByTestId("recap-route")).toBeNull();
    expect(tappedCalls()).toHaveLength(0);
  });
});
