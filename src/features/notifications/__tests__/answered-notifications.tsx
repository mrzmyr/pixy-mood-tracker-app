import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { Notification, NotificationContent } from "expo-notifications";
import { _generateItem } from "@/testing/log-item";
import { INITIAL_STATE } from "@/constants/settings";
import {
  LogsProvider,
  STORAGE_KEY as LOGS_STORAGE_KEY,
  useLogUpdater,
} from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import { useDismissAnsweredNotifications } from "../answered-notifications";
import type { PresentedNotificationSource } from "../answered-notifications";
import {
  QUICK_CHECK_IN_NOTIFICATION_TYPE,
  RECAP_NOTIFICATION_TYPE,
} from "../reminder-scheduler";
import { REMINDER_NOTIFICATION_DATA } from "../reminder-taps";

const delivered = (
  identifier: string,
  date: Date,
  data: NotificationContent["data"]
): Notification => ({
  date: date.getTime(),
  request: {
    identifier,
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
});

/** In-memory Notification Center. */
const createSource = (initial: Notification[]) => {
  const presented = [...initial];
  const source: PresentedNotificationSource = {
    list: () => Promise.resolve([...presented]),
    dismiss: (identifier) => {
      const index = presented.findIndex(
        ({ request }) => request.identifier === identifier
      );
      if (index !== -1) {
        presented.splice(index, 1);
      }
      return Promise.resolve();
    },
  };
  const ids = () => presented.map(({ request }) => request.identifier);
  return { source, ids };
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>{children}</LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const store = async (items: ReturnType<typeof _generateItem>[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
  await AsyncStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify({ items }));
};

describe("useDismissAnsweredNotifications()", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("a new entry removes the reminder and quick check-ins it answers", async () => {
    await store([]);
    const { source, ids } = createSource([
      delivered("reminder-yesterday", new Date(2024, 0, 9, 20), {
        ...REMINDER_NOTIFICATION_DATA,
      }),
      delivered("reminder-today", new Date(2024, 0, 10, 20), {
        ...REMINDER_NOTIFICATION_DATA,
      }),
      delivered("check-in-before", new Date(2024, 0, 10, 21), {
        type: QUICK_CHECK_IN_NOTIFICATION_TYPE,
      }),
      delivered("check-in-after", new Date(2024, 0, 10, 23), {
        type: QUICK_CHECK_IN_NOTIFICATION_TYPE,
      }),
      delivered("recap", new Date(2024, 0, 10, 20), {
        type: RECAP_NOTIFICATION_TYPE,
        kind: "week",
      }),
    ]);

    const hook = await renderHook(
      () => {
        useDismissAnsweredNotifications(source);
        return useLogUpdater();
      },
      { wrapper }
    );

    await act(() => {
      hook.result.current.addLog(
        _generateItem({ dateTime: new Date(2024, 0, 10, 22).toISOString() })
      );
    });

    await waitFor(() => {
      expect(ids()).toEqual(["reminder-yesterday", "check-in-after", "recap"]);
    });
  });

  test("on launch, removes the reminder of a day logged earlier", async () => {
    await store([
      _generateItem({ dateTime: new Date(2024, 0, 10, 8).toISOString() }),
    ]);
    const { source, ids } = createSource([
      delivered("reminder-today", new Date(2024, 0, 10, 20), {
        ...REMINDER_NOTIFICATION_DATA,
      }),
    ]);

    await renderHook(() => useDismissAnsweredNotifications(source), {
      wrapper,
    });

    await waitFor(() => {
      expect(ids()).toEqual([]);
    });
  });
});
