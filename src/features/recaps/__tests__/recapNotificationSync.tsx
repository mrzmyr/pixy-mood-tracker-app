import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import type {
  RecapNotificationRequest,
  RecapNotificationScheduler,
} from "@/features/notifications";
import { FeatureFlagsContext } from "@/state/featureFlags/context";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettings,
  useSettingsLoad,
} from "@/state/settings";
import { useRecapNotificationSync } from "../recapNotificationSync";

/** Wednesday 2026-10-07 12:00 local time. */
const NOW = new Date(2026, 9, 7, 12, 0);

interface SchedulerState {
  /** Scheduled recap notifications; `null` until the first change. */
  requests: RecapNotificationRequest[] | null;
}

const FLAGS = {
  on: { flags: { recaps: true }, isLoading: false },
  off: { flags: { recaps: false }, isLoading: false },
  loading: { flags: null, isLoading: true },
};

/** In-memory scheduler. */
const createScheduler = () => {
  const state: SchedulerState = { requests: null };
  const scheduler: RecapNotificationScheduler = {
    replace: (requests) => {
      state.requests = requests;
      return Promise.resolve();
    },
    cancelAll: () => {
      state.requests = [];
      return Promise.resolve();
    },
  };
  return { scheduler, state };
};

const renderSync = async ({
  settings,
  flag,
}: {
  settings: Partial<typeof INITIAL_STATE>;
  flag: "on" | "off" | "loading";
}) => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...INITIAL_STATE, ...settings })
  );
  const { scheduler, state } = createScheduler();
  const hook = await renderHook(
    () => {
      useRecapNotificationSync(scheduler);
      return { ...useSettings(), load: useSettingsLoad() };
    },
    {
      wrapper: ({ children }) => (
        <SettingsProvider>
          <FeatureFlagsContext.Provider value={FLAGS[flag]}>
            {children}
          </FeatureFlagsContext.Provider>
        </SettingsProvider>
      ),
    }
  );
  return { hook, state };
};

describe("useRecapNotificationSync()", () => {
  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW, advanceTimers: true });
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("schedules period ends at the reminder time, marked with the period", async () => {
    const { state } = await renderSync({
      settings: { recapNotificationsEnabled: true, reminderTime: "21:15" },
      flag: "on",
    });

    await waitFor(() => {
      expect(state.requests?.length).toBeGreaterThan(0);
    });
    const kinds = new Set(state.requests?.map(({ data }) => data.kind));
    expect(kinds).toEqual(new Set(["week", "month", "year"]));
    expect(state.requests).toContainEqual(
      expect.objectContaining({
        at: new Date(2026, 9, 31, 21, 15),
        data: { kind: "month", date: "2026-10-31" },
      })
    );
  });

  test("reschedules when the reminder time changes", async () => {
    const { hook, state } = await renderSync({
      settings: { recapNotificationsEnabled: true, reminderTime: "20:00" },
      flag: "on",
    });
    await waitFor(() => {
      expect(state.requests?.[0]?.at.getHours()).toBe(20);
    });

    await act(() => {
      hook.result.current.setSettings((current) => ({
        ...current,
        reminderTime: "08:00",
      }));
    });

    await waitFor(() => {
      expect(state.requests?.[0]?.at.getHours()).toBe(8);
    });
  });

  test("cancels recap notifications when turned off", async () => {
    const { hook, state } = await renderSync({
      settings: { recapNotificationsEnabled: true },
      flag: "on",
    });
    await waitFor(() => {
      expect(state.requests?.length).toBeGreaterThan(0);
    });

    await act(() => {
      hook.result.current.setSettings((current) => ({
        ...current,
        recapNotificationsEnabled: false,
      }));
    });

    await waitFor(() => {
      expect(state.requests).toEqual([]);
    });
  });

  test("cancels recap notifications while flag recaps is off", async () => {
    const { state } = await renderSync({
      settings: { recapNotificationsEnabled: true },
      flag: "off",
    });

    await waitFor(() => {
      expect(state.requests).toEqual([]);
    });
  });

  test("leaves the schedule alone while flags load", async () => {
    const { hook, state } = await renderSync({
      settings: { recapNotificationsEnabled: true },
      flag: "loading",
    });

    await waitFor(() => {
      expect(hook.result.current.load.status).toBe("ready");
    });
    await act(() => jest.advanceTimersByTimeAsync(100));
    expect(state.requests).toBeNull();
  });
});
