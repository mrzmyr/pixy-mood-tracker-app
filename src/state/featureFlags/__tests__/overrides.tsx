import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  PostHogProvider,
  usePostHog as getPostHogTestClient,
} from "posthog-react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  FeatureFlagsProvider,
  useCanOverrideFeatureFlags,
  useFeatureFlag,
} from "@/state/featureFlags";
import { setOverride } from "@/state/featureFlags/overrides";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettings,
  useSettingsLoad,
} from "@/state/settings";

// Jest sets no app variant, so this file covers production builds.
// jest.setup.js replaces posthog-react-native with one shared fake client.
const mockReload = jest.mocked(getPostHogTestClient().reloadFeatureFlagsAsync);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <PostHogProvider apiKey="POSTHOG_API_KEY" autocapture={false}>
      <FeatureFlagsProvider options={{ enabled: true }}>
        {children}
      </FeatureFlagsProvider>
    </PostHogProvider>
  </SettingsProvider>
);

const renderFlags = async () => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      deviceId: "test-device-id",
      analyticsEnabled: true,
      actionsDone: [{ title: "onboarding", date: "2026-10-01T10:00:00.000Z" }],
    })
  );
  const hook = await renderHook(
    () => ({
      canOverride: useCanOverrideFeatureFlags(),
      isPhotosOn: useFeatureFlag("photos"),
      isAccessOn: useFeatureFlag("feature-flag-overrides"),
      settings: useSettings(),
      settingsLoad: useSettingsLoad(),
    }),
    { wrapper }
  );
  await waitFor(() => {
    expect(mockReload).toHaveBeenCalledTimes(1);
  });
  return hook;
};

describe("feature flag overrides in production builds", () => {
  beforeEach(async () => {
    mockReload.mockReset();
    await AsyncStorage.clear();
    // Overrides live in memory; drop the ones of the last test.
    setOverride({ key: "photos", value: "remote" });
    setOverride({ key: "feature-flag-overrides", value: "remote" });
  });

  test("ignores overrides without the access flag", async () => {
    mockReload.mockResolvedValue({ photos: true });
    const hook = await renderFlags();

    await act(() => {
      setOverride({ key: "photos", value: "off" });
    });

    expect(hook.result.current.canOverride).toBe(false);
    expect(hook.result.current.isPhotosOn).toBe(true);
  });

  test("applies overrides while the access flag is on", async () => {
    mockReload.mockResolvedValue({ "feature-flag-overrides": true });
    const hook = await renderFlags();
    await waitFor(() => {
      expect(hook.result.current.canOverride).toBe(true);
    });

    await act(() => {
      setOverride({ key: "photos", value: "on" });
    });

    expect(hook.result.current.isPhotosOn).toBe(true);
  });

  test("never overrides the access flag itself", async () => {
    mockReload.mockResolvedValue({ "feature-flag-overrides": true });
    const hook = await renderFlags();
    await waitFor(() => {
      expect(hook.result.current.isAccessOn).toBe(true);
    });

    await act(() => {
      setOverride({ key: "feature-flag-overrides", value: "off" });
    });

    expect(hook.result.current.isAccessOn).toBe(true);
    expect(hook.result.current.canOverride).toBe(true);
  });

  test("drops overrides when consent ends", async () => {
    mockReload.mockResolvedValue({ "feature-flag-overrides": true });
    const hook = await renderFlags();
    await waitFor(() => {
      expect(hook.result.current.canOverride).toBe(true);
    });
    await act(() => {
      setOverride({ key: "photos", value: "on" });
    });

    await act(() => {
      hook.result.current.settings.setSettings((settings) => ({
        ...settings,
        analyticsEnabled: false,
      }));
    });

    expect(hook.result.current.canOverride).toBe(false);
    expect(hook.result.current.isPhotosOn).toBe(false);
  });
});
