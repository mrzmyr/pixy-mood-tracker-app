import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { INITIAL_STATE } from "@/constants/settings";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettings,
  useSettingsLoad,
} from "@/state/settings";
import { toExportSettings } from "@/state/settings/export-settings";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

const renderSettings = async () => {
  const hook = await renderHook(
    () => ({ state: useSettings(), load: useSettingsLoad() }),
    {
      wrapper: ({ children }) => (
        <SettingsProvider>{children}</SettingsProvider>
      ),
    }
  );
  await waitFor(() => {
    expect(hook.result.current.load.status).toBe("ready");
  });
  return hook;
};

const readStored = async () =>
  JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "null");

describe("feedback id", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("fresh install gets a random feedback id apart from the install id", async () => {
    const hook = await renderSettings();

    const { deviceId, feedbackId } = hook.result.current.state.settings;
    expect(feedbackId).toMatch(UUID_V4);
    expect(feedbackId).not.toBe(deviceId);
  });

  test("update keeps the install id and adds a feedback id", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, deviceId: "install-id" })
    );

    const hook = await renderSettings();

    const { deviceId, feedbackId } = hook.result.current.state.settings;
    expect(deviceId).toBe("install-id");
    expect(feedbackId).toMatch(UUID_V4);
    await waitFor(async () => {
      const stored = await readStored();
      expect(stored.feedbackId).toBe(feedbackId);
    });
  });

  test("stored feedback id survives a relaunch", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...INITIAL_STATE,
        deviceId: "install-id",
        feedbackId: "feedback-id",
      })
    );

    const hook = await renderSettings();

    expect(hook.result.current.state.settings.feedbackId).toBe("feedback-id");
  });

  test("reset renews the feedback id", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...INITIAL_STATE,
        deviceId: "install-id",
        feedbackId: "feedback-id",
      })
    );
    const hook = await renderSettings();

    await act(() => {
      hook.result.current.state.resetSettings();
    });

    const { deviceId, feedbackId } = hook.result.current.state.settings;
    expect(feedbackId).toMatch(UUID_V4);
    expect(feedbackId).not.toBe("feedback-id");
    expect(feedbackId).not.toBe(deviceId);
  });

  test("backups never carry the feedback id, and imports keep the current one", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...INITIAL_STATE,
        deviceId: "install-id",
        feedbackId: "feedback-id",
      })
    );
    const hook = await renderSettings();

    const backup = toExportSettings(hook.result.current.state.settings);
    expect(backup).not.toHaveProperty("feedbackId");

    // A hand-edited backup could still hold one.
    const edited = { ...backup, feedbackId: "other-feedback-id" };
    await act(() => {
      hook.result.current.state.importSettings(edited);
    });

    expect(hook.result.current.state.settings.feedbackId).toBe("feedback-id");
  });
});
