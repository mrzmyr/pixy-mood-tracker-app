import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, waitFor } from "@testing-library/react-native";
import {
  DEFAULT_ACTION_IDENTIFIER,
  SchedulableTriggerInputTypes,
} from "expo-notifications";
import type {
  NotificationContent,
  NotificationResponse,
  NotificationTrigger,
} from "expo-notifications";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import {
  REMINDER_NOTIFICATION_DATA,
  useReminderTapTracking,
} from "../reminderTaps";
import type { NotificationResponseSource } from "../reminderTaps";

const { capture: mockCapture } = getPostHogTestClient();
const EVENT = "reminders:notification_opened";
// Delivered 5 minutes before the test file runs.
const DELIVERED_AT = Date.now() - 5 * 60_000;

const createResponse = ({
  date = DELIVERED_AT,
  actionIdentifier = DEFAULT_ACTION_IDENTIFIER,
  data = { ...REMINDER_NOTIFICATION_DATA },
  trigger = null,
}: {
  date?: number;
  actionIdentifier?: string;
  data?: NotificationContent["data"];
  trigger?: NotificationTrigger;
} = {}): NotificationResponse => ({
  actionIdentifier,
  notification: {
    date,
    request: {
      identifier: "reminder-id",
      content: {
        title: "Title",
        subtitle: null,
        body: "Body",
        data,
        categoryIdentifier: null,
        sound: null,
      },
      trigger,
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
    last = response;
    await act(() => {
      listener?.(response);
    });
  };
  return { source, tap };
};

const Tracker = ({ source }: { source: NotificationResponseSource }) => {
  useReminderTapTracking(source);
  return null;
};

const renderTracker = async (source: NotificationResponseSource) => {
  await render(
    <SettingsProvider>
      <AnalyticsProvider options={{ enabled: true }}>
        <Tracker source={source} />
      </AnalyticsProvider>
    </SettingsProvider>
  );
  // Let stored settings load.
  await act(async () => {});
};

const openedCalls = () =>
  jest.mocked(mockCapture).mock.calls.filter(([event]) => event === EVENT);

describe("useReminderTapTracking()", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
    );
  });

  test("sends one event per warm tap", async () => {
    const { source, tap } = createSource();
    await renderTracker(source);

    await tap(createResponse());

    await waitFor(() => expect(openedCalls()).toHaveLength(1));
    expect(openedCalls()[0]?.[1]).toMatchObject({
      cold_start: false,
      minutes_since_delivered: 5,
    });
  });

  test("counts a cold start tap once, after settings load", async () => {
    const launch = createResponse();
    const { source, tap } = createSource(launch);
    await renderTracker(source);

    // The listener can report the launch response again.
    await tap(launch);

    await waitFor(() => expect(openedCalls()).toHaveLength(1));
    expect(openedCalls()[0]?.[1]).toMatchObject({ cold_start: true });
  });

  test("counts the next delivery of the same daily reminder", async () => {
    const { source, tap } = createSource(createResponse());
    await renderTracker(source);

    await tap(createResponse({ date: DELIVERED_AT + 24 * 60 * 60_000 }));

    await waitFor(() => expect(openedCalls()).toHaveLength(2));
  });

  test("ignores dismisses and other notifications", async () => {
    const { source, tap } = createSource();
    await renderTracker(source);

    await tap(
      createResponse({
        actionIdentifier: "com.apple.UNNotificationDismissActionIdentifier",
      })
    );
    await tap(
      createResponse({
        data: {},
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: 0 },
      })
    );
    await act(async () => {});

    expect(openedCalls()).toHaveLength(0);
  });

  test("counts reminders scheduled before the data marker", async () => {
    const { source, tap } = createSource();
    await renderTracker(source);

    await tap(
      createResponse({
        data: {},
        trigger: { type: SchedulableTriggerInputTypes.CALENDAR, repeats: true },
      })
    );

    await waitFor(() => expect(openedCalls()).toHaveLength(1));
  });

  test("sends nothing when analytics is off", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: false })
    );
    const { source, tap } = createSource(createResponse());
    await renderTracker(source);

    await tap(createResponse({ date: DELIVERED_AT + 60_000 }));
    await act(async () => {});

    expect(openedCalls()).toHaveLength(0);
  });
});
