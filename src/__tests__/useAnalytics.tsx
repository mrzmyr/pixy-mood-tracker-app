import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { PostHogProvider } from "posthog-react-native";
import { AnalyticsProvider, useAnalytics } from "../hooks/useAnalytics";
import {
  INITIAL_STATE,
  SettingsProvider,
  STORAGE_KEY,
  useSettings
} from "../hooks/useSettings";

const wrapper = ({ children }) => (
  <SettingsProvider>
    <PostHogProvider
      apiKey={'POSTHOG_API_KEY'}
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
      >{children}</AnalyticsProvider>
    </PostHogProvider>
  </SettingsProvider>
);

const _renderHook = () => {
  return renderHook(
    () => ({
      state: useAnalytics(),
      settingsState: useSettings(),
    }),
    { wrapper }
  );
};

const waitForLoaded = (hook) => waitFor(() => {
  expect(hook.result.current.settingsState.settings.loaded).toBe(true);
});

const _console_error = console.error;
const STATIC_DEVICE_ID = "test-device-id";

const mockOptOut = jest.fn();
const mockOptIn = jest.fn();
const mockIdentify = jest.fn()
const mockCapture = jest.fn();
const mockReset = jest.fn();

jest.mock('posthog-react-native', () => {
  return {
    PostHogProvider: ({ children }) => children,
    usePostHog: () => ({
      identify: mockIdentify,
      optOut: mockOptOut,
      optIn: mockOptIn,
      reset: mockReset,
      capture: mockCapture,
    }),
  }
})

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

  test("should `isEnabled` = false initially", async () => {
    const { result } = await _renderHook();

    expect(result.current.settingsState.settings.analyticsEnabled).toBe(false);
    expect(result.current.state.isEnabled).toBe(false);
  });

  test("should `isEnabled` = false if disabled in settings", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(async () => {
      hook.result.current.settingsState.setSettings({
        ...hook.result.current.settingsState.settings,
        analyticsEnabled: false,
      });
    });

    expect(hook.result.current.state.isEnabled).toBe(false);
  });

  test("should `identify`", async () => {

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
      hook.result.current.state.identify();
    });

    expect(mockIdentify).not.toBeCalled()
    expect(hook.result.current.state.isIdentified).toBe(true);
  });

  test("should `enable`", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.enable();
    });

    expect(hook.result.current.state.isEnabled).toBe(true);
    expect(hook.result.current.settingsState.settings.analyticsEnabled).toBe(true)
    expect(mockOptIn).toBeCalled()
  })

  test("should `disable`", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.disable();
    });

    expect(hook.result.current.state.isEnabled).toBe(false);
    expect(hook.result.current.settingsState.settings.analyticsEnabled).toBe(false)
    expect(mockOptOut).toBeCalled()
  })

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
      hook.result.current.state.track('test-event', { test: true });
    });

    expect(mockCapture).toBeCalledWith('test-event')
  })

  test("should `reset`", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.state.reset();
    });

    expect(mockReset).toBeCalled()
    expect(mockOptOut).toBeCalled()
    expect(hook.result.current.state.isEnabled).toBe(false);
    expect(hook.result.current.settingsState.settings.analyticsEnabled).toBe(false)
  })
});
