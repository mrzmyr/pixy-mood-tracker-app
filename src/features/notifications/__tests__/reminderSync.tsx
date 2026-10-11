import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  LogsProvider,
  STORAGE_KEY as LOGS_STORAGE_KEY,
  useLogLoad,
  useLogUpdater,
} from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettingsLoad,
} from "@/state/settings";
import type { ReminderScheduler } from "../reminderScheduler";
import { useReminderSync } from "../reminderSync";

/** 2024-01-10 12:00 local time. */
const NOW = new Date(2024, 0, 10, 12, 0);

interface SchedulerState {
  /** Every scheduled reminder; `null` until the first change. */
  dates: Date[] | null;
}

/** In-memory scheduler. */
const createScheduler = () => {
  const state: SchedulerState = { dates: null };
  const scheduler: ReminderScheduler = {
    hasPermission: () => Promise.resolve(true),
    requestPermission: () => Promise.resolve(true),
    replace: (dates) => {
      state.dates = dates;
      return Promise.resolve();
    },
    cancelAll: () => {
      state.dates = [];
      return Promise.resolve();
    },
  };
  return { scheduler, state };
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>{children}</LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const store = async ({
  settings,
  items = [],
}: {
  settings: Partial<typeof INITIAL_STATE>;
  items?: ReturnType<typeof _generateItem>[];
}) => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...INITIAL_STATE, ...settings })
  );
  await AsyncStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify({ items }));
};

const days = (dates: Date[] | null) =>
  dates?.slice(0, 3).map((date) => date.getDate());

describe("useReminderSync()", () => {
  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW, advanceTimers: true });
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("skips today when today already has an entry", async () => {
    await store({
      settings: { reminderEnabled: true, reminderTime: "20:00" },
      items: [_generateItem({ dateTime: NOW.toISOString() })],
    });
    const { scheduler, state } = createScheduler();

    await renderHook(() => useReminderSync(scheduler), { wrapper });

    await waitFor(() => {
      expect(days(state.dates)).toEqual([11, 12, 13]);
    });
  });

  test("drops today's reminder after a new entry for today", async () => {
    await store({ settings: { reminderEnabled: true, reminderTime: "20:00" } });
    const { scheduler, state } = createScheduler();

    const hook = await renderHook(
      () => {
        useReminderSync(scheduler);
        return useLogUpdater();
      },
      { wrapper }
    );
    await waitFor(() => {
      expect(days(state.dates)).toEqual([10, 11, 12]);
    });

    await act(() => {
      hook.result.current.addLog(
        _generateItem({ dateTime: new Date(2024, 0, 10, 13).toISOString() })
      );
    });

    await waitFor(() => {
      expect(days(state.dates)).toEqual([11, 12, 13]);
    });
  });

  test("schedules nothing while the reminder is off", async () => {
    await store({ settings: { reminderEnabled: false } });
    const { scheduler, state } = createScheduler();

    const hook = await renderHook(
      () => {
        useReminderSync(scheduler);
        return [useSettingsLoad().status, useLogLoad().status];
      },
      { wrapper }
    );
    await waitFor(() => {
      expect(hook.result.current).toEqual(["ready", "ready"]);
    });

    expect(state.dates).toBeNull();
  });
});
