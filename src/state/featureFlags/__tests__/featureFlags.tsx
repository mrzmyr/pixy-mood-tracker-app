import noop from "lodash/noop";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  PostHogProvider,
  usePostHog as getPostHogTestClient,
} from "posthog-react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import { POSTHOG_OPTIONS } from "@/shell/posthogOptions";
import {
  FeatureFlagsProvider,
  useFeatureFlag,
  useFeatureFlagState,
} from "@/state/featureFlags";
import { SettingsProvider, STORAGE_KEY, useSettings } from "@/state/settings";

// jest.setup.js replaces posthog-react-native with one shared fake client.
const mockReload = jest.mocked(getPostHogTestClient().reloadFeatureFlagsAsync);

const ONBOARDED = [{ title: "onboarding", date: "2026-10-01T10:00:00.000Z" }];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <PostHogProvider apiKey="POSTHOG_API_KEY" autocapture={false}>
      <FeatureFlagsProvider options={{ enabled: true }}>
        {children}
      </FeatureFlagsProvider>
    </PostHogProvider>
  </SettingsProvider>
);

const renderFlag = async ({
  analyticsEnabled,
  isOnboarded = true,
}: {
  analyticsEnabled: boolean;
  isOnboarded?: boolean;
}) => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      deviceId: "test-device-id",
      analyticsEnabled,
      actionsDone: isOnboarded ? ONBOARDED : [],
    })
  );
  const hook = await renderHook(
    () => ({ isOn: useFeatureFlag("photos"), settings: useSettings() }),
    { wrapper }
  );
  await waitFor(() => {
    expect(hook.result.current.settings.settings.loaded).toBe(true);
  });
  return hook;
};

const setAnalytics = async (
  hook: Awaited<ReturnType<typeof renderFlag>>,
  analyticsEnabled: boolean
) => {
  await act(() => {
    hook.result.current.settings.setSettings((settings) => ({
      ...settings,
      analyticsEnabled,
    }));
  });
};

describe("feature flags", () => {
  beforeEach(async () => {
    mockReload.mockReset();
    await AsyncStorage.clear();
  });

  test("PostHog client never loads flags at startup", () => {
    expect(POSTHOG_OPTIONS).toMatchObject({
      preloadFeatureFlags: false,
      defaultOptIn: false,
    });
  });

  test("never reloads flags without consent", async () => {
    const hook = await renderFlag({ analyticsEnabled: false });

    expect(mockReload).not.toHaveBeenCalled();
    expect(hook.result.current.isOn).toBe(false);
  });

  test("never reloads flags before onboarding ends", async () => {
    const hook = await renderFlag({
      analyticsEnabled: true,
      isOnboarded: false,
    });

    expect(mockReload).not.toHaveBeenCalled();
    expect(hook.result.current.isOn).toBe(false);
  });

  test("reloads flags once after consent, then reads the flag", async () => {
    mockReload.mockResolvedValue({ photos: true });
    const hook = await renderFlag({ analyticsEnabled: false });

    await setAnalytics(hook, true);
    await waitFor(() => {
      expect(hook.result.current.isOn).toBe(true);
    });
    await act(() => {
      hook.result.current.settings.addActionDone("unrelated");
    });

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  test("stays off when the PostHog flag is off", async () => {
    mockReload.mockResolvedValue({ photos: false });
    const hook = await renderFlag({ analyticsEnabled: true });

    await waitFor(() => {
      expect(mockReload).toHaveBeenCalledTimes(1);
    });
    expect(hook.result.current.isOn).toBe(false);
  });

  test("stays off when the flag request fails", async () => {
    // The SDK resolves `undefined` after a failed request; the reset mock does too.
    const hook = await renderFlag({ analyticsEnabled: true });

    await waitFor(() => {
      expect(mockReload).toHaveBeenCalledTimes(1);
    });
    expect(hook.result.current.isOn).toBe(false);
  });

  test("turns off when consent ends and ignores flags of that period", async () => {
    mockReload.mockResolvedValue({ photos: true });
    const hook = await renderFlag({ analyticsEnabled: true });
    await waitFor(() => {
      expect(hook.result.current.isOn).toBe(true);
    });

    await setAnalytics(hook, false);

    expect(hook.result.current.isOn).toBe(false);
    expect(mockReload).toHaveBeenCalledTimes(1);

    // Consent again: off until the new request answers.
    // oxlint-disable-next-line promise/avoid-new -- a request that never answers keeps the new period pending.
    mockReload.mockReturnValue(new Promise(noop));
    await setAnalytics(hook, true);

    expect(mockReload).toHaveBeenCalledTimes(2);
    expect(hook.result.current.isOn).toBe(false);
  });
});

const renderState = async (analyticsEnabled: boolean) => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      deviceId: "test-device-id",
      analyticsEnabled,
      actionsDone: ONBOARDED,
    })
  );
  return renderHook(() => useFeatureFlagState("ios-widget"), {
    wrapper,
  });
};

describe("feature flag state", () => {
  beforeEach(async () => {
    mockReload.mockReset();
    await AsyncStorage.clear();
  });

  test("is loading until the first flag request after consent resolves", async () => {
    const pending = Promise.withResolvers<Record<string, boolean>>();
    mockReload.mockReturnValue(pending.promise);
    const hook = await renderState(true);
    await waitFor(() => {
      expect(mockReload).toHaveBeenCalled();
    });
    expect(hook.result.current).toBe("loading");

    await act(() => {
      pending.resolve({ "ios-widget": true });
    });
    expect(hook.result.current).toBe("on");
  });

  test("is off without consent, never loading", async () => {
    const hook = await renderState(false);
    await waitFor(() => {
      expect(hook.result.current).toBe("off");
    });
    expect(mockReload).not.toHaveBeenCalled();
  });

  test("a failed flag request ends loading with the flag off", async () => {
    // oxlint-disable-next-line unicorn/no-useless-undefined -- the SDK resolves `undefined` for a failed request.
    mockReload.mockResolvedValue(undefined);
    const hook = await renderState(true);
    await waitFor(() => {
      expect(hook.result.current).toBe("off");
    });
  });
});
