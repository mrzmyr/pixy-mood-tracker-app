import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import _ from "lodash";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettings,
  useSettingsLoad,
} from "@/state/settings";

const wrapper = ({ children }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

const _renderHook = () =>
  renderHook(
    () => ({
      state: useSettings(),
      load: useSettingsLoad(),
    }),
    { wrapper }
  );

const waitForLoaded = (hook) =>
  waitFor(() => {
    expect(hook.result.current.load.status).toBe("ready");
  });

const _console_error = console.error;

const STATIC_DEVICE_ID = "test-device-id";

const LOADED_STATE = {
  ...INITIAL_STATE,
  deviceId: STATIC_DEVICE_ID,
};

// oxlint-disable-next-line anti-slop/no-module-mocking -- useSettings generates the device ID with uuid directly; the test needs a deterministic ID
jest.mock("uuid", () => ({ v4: () => STATIC_DEVICE_ID }));

describe("useSettings()", () => {
  test.each(["blobs", "cats", "robots"] as const)(
    "persists %s characters across remounts",
    async (moodTheme) => {
      const hook = await _renderHook();
      await waitForLoaded(hook);
      await act(() =>
        hook.result.current.state.setSettings((current) => ({
          ...current,
          moodTheme,
        }))
      );
      await waitFor(async () =>
        expect(
          JSON.parse(String(await AsyncStorage.getItem(STORAGE_KEY))).moodTheme
        ).toBe(moodTheme)
      );
      await hook.unmount();
      const reloaded = await _renderHook();
      await waitForLoaded(reloaded);
      expect(reloaded.result.current.state.settings.moodTheme).toBe(moodTheme);
    }
  );

  test.each([undefined, "unknown-theme"])(
    "loads classic for legacy or invalid appearance %s",
    async (moodTheme) => {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...INITIAL_STATE, moodTheme })
      );
      const hook = await _renderHook();
      await waitForLoaded(hook);
      expect(hook.result.current.state.settings.moodTheme).toBe("classic");
    }
  );

  beforeEach(async () => {
    await AsyncStorage.clear();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = _console_error;
  });

  test("should load from settings async storage & initialize device id if missing", async () => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...INITIAL_STATE,
        reminderTime: "12:00",
      })
    );
    const hook = await _renderHook();
    await waitForLoaded(hook);
    expect(hook.result.current.state.settings.reminderTime).toBe("12:00");
    expect(hook.result.current.state.settings.deviceId).toBe(STATIC_DEVICE_ID);
  });

  test("should keep the sleep step from stored settings", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...INITIAL_STATE,
        steps: ["rating", "message", "sleep"],
      })
    );

    const hook = await _renderHook();
    await waitForLoaded(hook);

    expect(hook.result.current.state.settings.steps).toEqual([
      "rating",
      "message",
      "sleep",
    ]);
    expect(hook.result.current.state.hasStep("sleep")).toBe(true);
  });

  test("should initiate with empty `settings` when async storage is empty", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    expect(hook.result.current.state.settings).toEqual(LOADED_STATE);
  });

  test("should initiate with empty `settings` when async storage is falsely", async () => {
    AsyncStorage.setItem(STORAGE_KEY, "🐇");
    await _renderHook();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(console.error).toHaveBeenCalled();
  });

  test("should import", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.importSettings({
        ...INITIAL_STATE,
        reminderTime: "12:00",
      });
    });

    expect(hook.result.current.state.settings.reminderTime).toBe("12:00");
  });

  test("should keep the sleep step from imported settings", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.importSettings({
        ...INITIAL_STATE,
        steps: ["rating", "message", "sleep"],
      });
    });

    expect(hook.result.current.state.settings.steps).toEqual([
      "rating",
      "message",
      "sleep",
    ]);
  });

  test("should keep store review prompt state on import", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...INITIAL_STATE,
        storeReviewPromptedAt: "2026-09-01T10:00:00.000Z",
        storeReviewPromptedAppVersion: "1.89.0",
      })
    );
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.importSettings({
        ...INITIAL_STATE,
        reminderTime: "12:00",
      });
    });

    expect(hook.result.current.state.settings).toMatchObject({
      reminderTime: "12:00",
      storeReviewPromptedAt: "2026-09-01T10:00:00.000Z",
      storeReviewPromptedAppVersion: "1.89.0",
    });
  });

  test("keeps the photo access dismissal of this device on import", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, photosDayAccessDismissed: true })
    );
    const hook = await _renderHook();
    await waitForLoaded(hook);
    expect(hook.result.current.state.settings.photosDayAccessDismissed).toBe(
      true
    );

    await act(() => {
      hook.result.current.state.importSettings({ ...INITIAL_STATE });
    });

    expect(hook.result.current.state.settings.photosDayAccessDismissed).toBe(
      true
    );
  });

  test("keeps the app lock of this device on import", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, appLockEnabled: true })
    );
    const hook = await _renderHook();
    await waitForLoaded(hook);

    // Backups never carry the lock; an old or edited file still must not change it.
    const backup = { ...INITIAL_STATE, appLockEnabled: false };
    await act(() => {
      hook.result.current.state.importSettings(backup);
    });

    expect(hook.result.current.state.settings.appLockEnabled).toBe(true);
  });

  test("reads a missing or invalid photo access dismissal as false", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, photosDayAccessDismissed: "yes" })
    );
    const hook = await _renderHook();
    await waitForLoaded(hook);

    expect(hook.result.current.state.settings.photosDayAccessDismissed).toBe(
      false
    );
  });

  test("should addActionDone", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.addActionDone("test");
    });

    const ACTIONS_DONE = [
      {
        title: "test",
        date: expect.any(String),
      },
    ];

    expect(hook.result.current.state.settings.actionsDone).toEqual(
      ACTIONS_DONE
    );
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(json ?? "null")).toEqual({
      ...LOADED_STATE,
      actionsDone: ACTIONS_DONE,
    });
  });

  test("should not addActionDone when it already exists", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.addActionDone("test");
    });

    await act(() => {
      hook.result.current.state.addActionDone("test");
    });

    const ACTIONS_DONE = [
      {
        title: "test",
        date: expect.any(String),
      },
    ];

    expect(hook.result.current.state.settings.actionsDone).toEqual(
      ACTIONS_DONE
    );
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(json ?? "null")).toEqual({
      ...LOADED_STATE,
      actionsDone: ACTIONS_DONE,
    });
  });

  test("should hasActionDone", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.addActionDone("test");
    });

    expect(hook.result.current.state.hasActionDone("test")).toBe(true);
    expect(hook.result.current.state.hasActionDone("test2")).toBe(false);
  });

  test("should resetSettings", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.resetSettings();
    });

    expect(hook.result.current.state.settings).toEqual(LOADED_STATE);
  });

  test("should `toggleStep`", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.toggleStep("feedback");
    });

    expect(hook.result.current.state.settings.steps.length).toEqual(6);

    await act(() => {
      hook.result.current.state.toggleStep("feedback");
    });

    expect(hook.result.current.state.settings.steps[4]).toEqual("photos");
  });

  test("should `toggleStep` with value", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.toggleStep("tags");
      hook.result.current.state.toggleStep("tags", true);
      hook.result.current.state.toggleStep("tags", true);
    });

    expect(hook.result.current.state.settings.steps).toEqual([
      "rating",
      "sleep",
      "emotions",
      "photos",
      "message",
      "feedback",
      "tags",
    ]);
  });

  test("new installs get the photos and sleep steps, stored step lists stay as they are", async () => {
    const fresh = await _renderHook();
    await waitForLoaded(fresh);
    expect(fresh.result.current.state.hasStep("photos")).toBe(true);
    expect(fresh.result.current.state.hasStep("sleep")).toBe(true);
    await fresh.unmount();

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ steps: ["rating", "message"] })
    );
    const existing = await _renderHook();
    await waitForLoaded(existing);

    expect(existing.result.current.state.hasStep("photos")).toBe(false);
    expect(existing.result.current.state.hasStep("sleep")).toBe(false);
  });

  test("should `hasStep`", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.toggleStep("feedback");
    });

    expect(hook.result.current.state.hasStep("feedback")).toEqual(false);
  });
});
