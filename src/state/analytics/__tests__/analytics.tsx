import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  PostHogProvider,
  usePostHog as getPostHogTestClient,
} from "posthog-react-native";
import { AnalyticsProvider, useAnalytics } from "@/state/analytics";
import { INITIAL_STATE } from "@/constants/Settings";
import { DEFAULT_ANALYTICS_ENABLED } from "@/state/analytics/consent";
import { SettingsProvider, STORAGE_KEY, useSettings } from "@/state/settings";

const wrapper = ({ children }) => (
  <SettingsProvider>
    <PostHogProvider
      apiKey="POSTHOG_API_KEY"
      options={{
        host: "https://app.posthog.com",
        defaultOptIn: false,
        captureAppLifecycleEvents: false,
      }}
      autocapture={false}
    >
      <AnalyticsProvider
        options={{
          enabled: true,
        }}
      >
        {children}
      </AnalyticsProvider>
    </PostHogProvider>
  </SettingsProvider>
);

const _renderHook = () =>
  renderHook(
    () => ({
      state: useAnalytics(),
      settingsState: useSettings(),
    }),
    { wrapper }
  );

const waitForLoaded = (hook) =>
  waitFor(() => {
    expect(hook.result.current.settingsState.settings.loaded).toBe(true);
  });

const _console_error = console.error;
const STATIC_DEVICE_ID = "test-device-id";

// jest.setup.js replaces posthog-react-native with one shared fake client.
const {
  optOut: mockOptOut,
  optIn: mockOptIn,
  capture: mockCapture,
  reset: mockReset,
  screen: mockScreen,
  register: mockRegister,
  setPersonProperties: mockPostHogSet,
} = getPostHogTestClient();

const USAGE_SUMMARY = {
  entries_count: 3,
  entries_30d: 3,
  logged_days_7d: 2,
  logged_days_30d: 2,
  days_since_first_entry: 4,
  days_since_last_entry: 0,
  current_streak: 1,
  longest_streak: 1,
  notes_pct_30d: 33,
  tags_pct_30d: 0,
  emotions_pct_30d: 100,
  statistics_unlocked: false,
  tags_count: 2,
  archived_tags_count: 0,
  reminder_enabled: true,
  reminder_hour: 20,
  scale_type: INITIAL_STATE.scaleType,
  steps: INITIAL_STATE.steps,
  onboarding_done: true,
  questions_answered_count: 1,
  photos_enabled: true,
  photos_pct_30d: 10,
  photos_count: 4,
  photos_day_pct: 50,
  photo_library_access: "limited" as const,
};

describe("useAnalytics()", () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = _console_error;
  });

  test("should `isEnabled` = regional default initially", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    expect(hook.result.current.settingsState.settings.analyticsEnabled).toBe(
      DEFAULT_ANALYTICS_ENABLED
    );
    expect(hook.result.current.state.isEnabled).toBe(DEFAULT_ANALYTICS_ENABLED);
  });

  test("should `isEnabled` = false if disabled in settings", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.settingsState.setSettings({
        ...hook.result.current.settingsState.settings,
        analyticsEnabled: false,
      });
    });

    expect(hook.result.current.state.isEnabled).toBe(false);
  });

  test("should `enable`", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.enable();
    });

    expect(hook.result.current.state.isEnabled).toBe(true);
    expect(hook.result.current.settingsState.settings.analyticsEnabled).toBe(
      true
    );
    expect(mockOptIn).toBeCalled();
  });

  test("should `disable`", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.disable();
    });

    expect(hook.result.current.state.isEnabled).toBe(false);
    expect(hook.result.current.settingsState.settings.analyticsEnabled).toBe(
      false
    );
    expect(mockOptOut).toBeCalled();
  });

  test("should `track` with properties", async () => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...INITIAL_STATE,
        deviceId: STATIC_DEVICE_ID,
      })
    );

    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.enable();
    });

    await act(() => {
      hook.result.current.state.track("settings:analytics_toggled", {
        enabled: true,
      });
    });

    expect(mockCapture).toBeCalledWith("settings:analytics_toggled", {
      scale_type: INITIAL_STATE.scaleType,
      reminder_enabled: INITIAL_STATE.reminderEnabled,
      steps: INITIAL_STATE.steps,
      enabled: true,
    });
  });

  test("event properties win over settings properties", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.enable();
    });
    await act(() => {
      hook.result.current.state.track("settings:scale_changed", {
        scale_type: "ColorBrew-PiYG",
      });
    });

    expect(mockCapture).toBeCalledWith(
      "settings:scale_changed",
      expect.objectContaining({ scale_type: "ColorBrew-PiYG" })
    );
  });

  test("should only accept catalog events and properties", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);
    const { track } = hook.result.current.state;

    // Type-level checks, enforced by `bun run type-check`.
    const calls = [
      // @ts-expect-error unknown event
      () => track("unknown_event"),
      // @ts-expect-error missing required properties
      () => track("settings:analytics_toggled"),
      // @ts-expect-error unknown property
      () => track("settings:analytics_toggled", { enabled: true, text: "" }),
    ];

    expect(calls).toHaveLength(3);
  });

  test("should not `track` while disabled", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.disable();
    });

    await act(() => {
      hook.result.current.state.track("settings:analytics_toggled", {
        enabled: true,
      });
    });

    expect(mockCapture).not.toBeCalled();
  });

  test("should send `screen` only while enabled", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.disable();
    });

    await act(() => {
      hook.result.current.state.screen("Calendar");
    });
    expect(mockScreen).not.toBeCalled();

    await act(() => {
      hook.result.current.state.enable();
    });
    await act(() => {
      hook.result.current.state.screen("Calendar");
    });
    expect(mockScreen).toBeCalledWith("Calendar", {
      scale_type: INITIAL_STATE.scaleType,
      reminder_enabled: INITIAL_STATE.reminderEnabled,
      steps: INITIAL_STATE.steps,
    });
  });

  test("should register settings as super properties", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    expect(mockRegister).toHaveBeenLastCalledWith({
      scale_type: INITIAL_STATE.scaleType,
      reminder_enabled: INITIAL_STATE.reminderEnabled,
      steps: INITIAL_STATE.steps,
    });

    await act(() => {
      hook.result.current.settingsState.setSettings((settings) => ({
        ...settings,
        reminderEnabled: !INITIAL_STATE.reminderEnabled,
      }));
    });

    expect(mockRegister).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reminder_enabled: !INITIAL_STATE.reminderEnabled,
      })
    );
  });

  test("should `reset` to the regional default", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.disable();
    });
    await act(() => {
      hook.result.current.state.reset();
    });

    expect(mockReset).toBeCalled();
    expect(hook.result.current.state.isEnabled).toBe(DEFAULT_ANALYTICS_ENABLED);
    expect(hook.result.current.settingsState.settings.analyticsEnabled).toBe(
      DEFAULT_ANALYTICS_ENABLED
    );
  });

  test("should send usage summary only while enabled", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.enable();
    });
    await act(() => {
      hook.result.current.state.sendUsageSummary(USAGE_SUMMARY, {
        first_app_version: "1.0.0",
      });
    });
    expect(mockPostHogSet).toBeCalledWith(
      USAGE_SUMMARY,
      { first_app_version: "1.0.0" },
      false
    );

    jest.clearAllMocks();
    await act(() => {
      hook.result.current.state.disable();
    });
    await act(() => {
      hook.result.current.state.sendUsageSummary(USAGE_SUMMARY, {
        first_app_version: "1.0.0",
      });
    });
    expect(mockPostHogSet).not.toBeCalled();
  });
});
