import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  LogsProvider,
  STORAGE_KEY as LOGS_STORAGE_KEY,
  useLogLoad,
} from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettingsLoad,
} from "@/state/settings";
import type { ReminderScheduler } from "../reminderScheduler";
import { useReminder } from "../useReminder";

/** 2024-01-10 12:00 local time. */
const NOW = new Date(2024, 0, 10, 12, 0);

interface SchedulerState {
  granted: boolean;
  /** First scheduled reminder, if any. */
  scheduled: { hour: number; minute: number; day: number } | null;
  dates: Date[];
}

/** In-memory scheduler. */
const createScheduler = ({
  granted = false,
  grantOnRequest = true,
}: { granted?: boolean; grantOnRequest?: boolean } = {}) => {
  const state: SchedulerState = { granted, scheduled: null, dates: [] };
  const scheduler: ReminderScheduler = {
    hasPermission: () => Promise.resolve(state.granted),
    requestPermission: () => {
      state.granted ||= grantOnRequest;
      return Promise.resolve(state.granted);
    },
    replace: (dates) => {
      state.dates = dates;
      state.scheduled = dates[0]
        ? {
            hour: dates[0].getHours(),
            minute: dates[0].getMinutes(),
            day: dates[0].getDate(),
          }
        : null;
      return Promise.resolve();
    },
    cancelAll: () => {
      state.dates = [];
      state.scheduled = null;
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

const renderReminder = async (scheduler: ReminderScheduler) => {
  const hook = await renderHook(
    () => ({
      reminder: useReminder(scheduler),
      load: useSettingsLoad(),
      logsLoad: useLogLoad(),
    }),
    { wrapper }
  );
  await waitFor(() => {
    expect(hook.result.current.load.status).toBe("ready");
    expect(hook.result.current.logsLoad.status).toBe("ready");
  });
  return hook;
};

const storeSettings = (settings: Partial<typeof INITIAL_STATE>) =>
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...INITIAL_STATE, ...settings })
  );

describe("useReminder()", () => {
  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW, advanceTimers: true });
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("enable schedules a daily reminder after permission is granted", async () => {
    const { scheduler, state } = createScheduler();
    const hook = await renderReminder(scheduler);

    let result: unknown;
    await act(async () => {
      result = await hook.result.current.reminder.enable("07:05");
    });

    expect(result).toEqual({ status: "enabled", time: "07:05" });
    expect(state.scheduled).toEqual({ hour: 7, minute: 5, day: 11 });
    expect(hook.result.current.reminder.enabled).toBe(true);
    expect(hook.result.current.reminder.time).toBe("07:05");
  });

  test("enable skips today when today already has an entry", async () => {
    await AsyncStorage.setItem(
      LOGS_STORAGE_KEY,
      JSON.stringify({
        items: [_generateItem({ dateTime: NOW.toISOString() })],
      })
    );
    const { scheduler, state } = createScheduler({ granted: true });
    const hook = await renderReminder(scheduler);

    await act(async () => {
      await hook.result.current.reminder.enable("20:00");
    });

    expect(state.scheduled).toEqual({ hour: 20, minute: 0, day: 11 });
  });

  test("enable accepts a picker date", async () => {
    const { scheduler, state } = createScheduler({ granted: true });
    const hook = await renderReminder(scheduler);

    await act(async () => {
      await hook.result.current.reminder.enable(new Date(2024, 0, 1, 21, 30));
    });

    expect(state.scheduled).toEqual({ hour: 21, minute: 30, day: 10 });
    expect(hook.result.current.reminder.time).toBe("21:30");
  });

  test("enable changes nothing when permission is denied", async () => {
    await storeSettings({ reminderTime: "20:00" });
    const { scheduler, state } = createScheduler({ grantOnRequest: false });
    const hook = await renderReminder(scheduler);

    let result: unknown;
    await act(async () => {
      result = await hook.result.current.reminder.enable("07:05");
    });

    expect(result).toEqual({ status: "permission_denied" });
    expect(state.scheduled).toBeNull();
    expect(hook.result.current.reminder.enabled).toBe(false);
    expect(hook.result.current.reminder.time).toBe("20:00");
  });

  test("disable cancels the reminder and keeps the time", async () => {
    await storeSettings({ reminderEnabled: true, reminderTime: "08:15" });
    const { scheduler, state } = createScheduler({ granted: true });
    state.scheduled = { hour: 8, minute: 15, day: 10 };
    const hook = await renderReminder(scheduler);

    let result: unknown;
    await act(async () => {
      result = await hook.result.current.reminder.disable();
    });

    expect(result).toEqual({ status: "disabled", permissionGranted: true });
    expect(state.scheduled).toBeNull();
    expect(hook.result.current.reminder.enabled).toBe(false);
    expect(hook.result.current.reminder.time).toBe("08:15");
  });

  test("setTime reschedules an enabled reminder", async () => {
    await storeSettings({ reminderEnabled: true, reminderTime: "08:15" });
    const { scheduler, state } = createScheduler({ granted: true });
    const hook = await renderReminder(scheduler);

    await act(async () => {
      await hook.result.current.reminder.setTime(new Date(2024, 0, 1, 22, 45));
    });

    expect(state.scheduled).toEqual({ hour: 22, minute: 45, day: 10 });
    expect(hook.result.current.reminder.time).toBe("22:45");
    expect(hook.result.current.reminder.enabled).toBe(true);
  });

  test("setTime on a disabled reminder saves the time, schedules nothing", async () => {
    const { scheduler, state } = createScheduler({ granted: true });
    const hook = await renderReminder(scheduler);

    await act(async () => {
      await hook.result.current.reminder.setTime("06:00");
    });

    expect(state.scheduled).toBeNull();
    expect(hook.result.current.reminder.time).toBe("06:00");
  });
});
