import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  PostHogProvider,
  usePostHog as getPostHogTestClient,
} from "posthog-react-native";
import type { PostHogOptions } from "posthog-react-native";
import { View } from "react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import { ConfiguredAnalyticsProvider } from "../ConfiguredAnalyticsProvider";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettings,
  useSettingsLoad,
} from "@/state/settings";

type BeforeSend = Exclude<
  NonNullable<PostHogOptions["before_send"]>,
  readonly unknown[]
>;

const mockProvider = jest.mocked(PostHogProvider);
const { register: mockRegister } = getPostHogTestClient();
const storedSettings = {
  ...INITIAL_STATE,
  analyticsEnabled: true,
  reminderEnabled: true,
  scaleType: "ColorBrew-BrBG",
  steps: ["emotions", "tags", "message"],
};
const context = {
  scale_type: storedSettings.scaleType,
  reminder_enabled: true,
  steps: storedSettings.steps,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <ConfiguredAnalyticsProvider enabled>
      {children}
    </ConfiguredAnalyticsProvider>
  </SettingsProvider>
);

const renderSettings = () =>
  renderHook(() => ({ state: useSettings(), load: useSettingsLoad() }), {
    wrapper,
  });

const getInitialHook = (): BeforeSend => {
  const hook = mockProvider.mock.calls[0]?.[0].options?.before_send;
  expect(hook).toEqual(expect.any(Function));
  // SAFETY: ConfiguredAnalyticsProvider supplies one callback, never an array.
  return hook as BeforeSend;
};

describe("ConfiguredAnalyticsProvider", () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedSettings));
  });

  test("does not initialize the SDK or mount children until settings load", async () => {
    const pendingLoad = Promise.withResolvers<string | null>();
    jest
      .spyOn(AsyncStorage, "getItem")
      .mockReturnValueOnce(pendingLoad.promise);
    const hook = await renderSettings();
    expect(mockProvider).not.toHaveBeenCalled();
    expect(hook.result.current).toBeNull();

    await act(() => pendingLoad.resolve(JSON.stringify(storedSettings)));
    await waitFor(() => expect(mockProvider).toHaveBeenCalled());
    expect(hook.result.current.state.settings.loaded).toBe(true);
  });

  test.each(["Application Updated", "$screen", "app:logs_loaded"])(
    "first %s event has loaded context before register effects",
    async (eventName) => {
      const events: ReturnType<BeforeSend>[] = [];
      mockProvider.mockImplementationOnce(({ children, options }) => {
        expect(mockRegister).not.toHaveBeenCalled();
        // SAFETY: this provider configures one SDK callback, never an array.
        const beforeSend = options?.before_send as BeforeSend;
        events.push(
          beforeSend({ event: eventName, properties: { marker: "startup" } })
        );
        return <View>{children}</View>;
      });
      await renderSettings();
      await waitFor(() => expect(events).toHaveLength(1));
      expect(events[0]).toEqual({
        event: eventName,
        properties: { marker: "startup", ...context },
      });
    }
  );

  test("SDK's original hook uses changed settings and replaces stale super properties", async () => {
    const hook = await renderSettings();
    await waitFor(() => expect(mockProvider).toHaveBeenCalled());
    const beforeSend = getInitialHook();

    await act(() => {
      hook.result.current.state.setSettings((settings) => ({
        ...settings,
        scaleType: "ColorBrew-PiYG",
        reminderEnabled: false,
        steps: ["message"],
      }));
    });

    expect(
      beforeSend({
        event: "Application Backgrounded",
        properties: { ...context, $app_version: "1.89.0" },
      })
    ).toEqual({
      event: "Application Backgrounded",
      properties: {
        $app_version: "1.89.0",
        scale_type: "ColorBrew-PiYG",
        reminder_enabled: false,
        steps: ["message"],
      },
    });
  });

  test("preserves chosen scale reported before settings commit", async () => {
    await renderSettings();
    await waitFor(() => expect(mockProvider).toHaveBeenCalled());
    expect(
      getInitialHook()({
        event: "settings:scale_changed",
        properties: { scale_type: "ColorBrew-PiYG" },
      })
    ).toEqual({
      event: "settings:scale_changed",
      properties: { ...context, scale_type: "ColorBrew-PiYG" },
    });
  });

  test("drops events after opting out, including SDK lifecycle events", async () => {
    const hook = await renderSettings();
    await waitFor(() => expect(mockProvider).toHaveBeenCalled());
    const beforeSend = getInitialHook();
    await act(() => {
      hook.result.current.state.setSettings((settings) => ({
        ...settings,
        analyticsEnabled: false,
      }));
    });
    expect(beforeSend({ event: "Application Opened" })).toBeNull();
    expect(beforeSend({ event: "$screen" })).toBeNull();
    expect(beforeSend(null)).toBeNull();
  });

  test("initial stored opt-out blocks SDK events before consent effects", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...storedSettings, analyticsEnabled: false })
    );
    await renderSettings();
    await waitFor(() => expect(mockProvider).toHaveBeenCalled());
    expect(mockProvider.mock.calls[0][0].options?.defaultOptIn).toBe(false);
    expect(getInitialHook()({ event: "Application Updated" })).toBeNull();
  });

  test("failed settings load mounts recovery consumers, disables SDK, preserves storage", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await AsyncStorage.setItem(STORAGE_KEY, "invalid stored settings");
    const hook = await renderSettings();
    await waitFor(() => expect(mockProvider).toHaveBeenCalled());
    expect(hook.result.current.load.status).toBe("error");
    expect(hook.result.current.state.settings.loaded).toBe(false);
    expect(mockProvider.mock.calls[0][0].options?.disabled).toBe(true);
    expect(getInitialHook()({ event: "Application Opened" })).toBeNull();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(
      "invalid stored settings"
    );
  });
});
