import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettingsLoad,
} from "@/state/settings";
import type { ReminderScheduler } from "../reminderScheduler";
import { useReminder } from "../useReminder";

interface SchedulerState {
  granted: boolean;
  scheduled: { hour: number; minute: number } | null;
}

/** In-memory scheduler. `scheduled` is the one daily reminder, if any. */
const createScheduler = ({
  granted = false,
  grantOnRequest = true,
}: { granted?: boolean; grantOnRequest?: boolean } = {}) => {
  const state: SchedulerState = { granted, scheduled: null };
  const scheduler: ReminderScheduler = {
    hasPermission: () => Promise.resolve(state.granted),
    requestPermission: () => {
      state.granted ||= grantOnRequest;
      return Promise.resolve(state.granted);
    },
    replaceDaily: (hour, minute) => {
      state.scheduled = { hour, minute };
      return Promise.resolve();
    },
    cancelAll: () => {
      state.scheduled = null;
      return Promise.resolve();
    },
  };
  return { scheduler, state };
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

const renderReminder = async (scheduler: ReminderScheduler) => {
  const hook = await renderHook(
    () => ({ reminder: useReminder(scheduler), load: useSettingsLoad() }),
    { wrapper }
  );
  await waitFor(() => {
    expect(hook.result.current.load.status).toBe("ready");
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
    await AsyncStorage.clear();
  });

  test("enable schedules a daily reminder after permission is granted", async () => {
    const { scheduler, state } = createScheduler();
    const hook = await renderReminder(scheduler);

    let result: unknown;
    await act(async () => {
      result = await hook.result.current.reminder.enable("07:05");
    });

    expect(result).toEqual({ status: "enabled", time: "07:05" });
    expect(state.scheduled).toEqual({ hour: 7, minute: 5 });
    expect(hook.result.current.reminder.enabled).toBe(true);
    expect(hook.result.current.reminder.time).toBe("07:05");
  });

  test("enable accepts a picker date", async () => {
    const { scheduler, state } = createScheduler({ granted: true });
    const hook = await renderReminder(scheduler);

    await act(async () => {
      await hook.result.current.reminder.enable(new Date(2024, 0, 1, 21, 30));
    });

    expect(state.scheduled).toEqual({ hour: 21, minute: 30 });
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
    state.scheduled = { hour: 8, minute: 15 };
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

    expect(state.scheduled).toEqual({ hour: 22, minute: 45 });
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
