import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import {
  PostHogProvider,
  usePostHog as getPostHogTestClient,
} from "posthog-react-native";
import FlagHighlight from "@/components/flag-highlight";
import { INITIAL_STATE } from "@/constants/settings";
import {
  FeatureFlagsProvider,
  useCanOverrideFeatureFlags,
  useFeatureFlag,
  useFeatureFlagVariant,
} from "@/state/feature-flags";
import { FEATURE_FLAGS } from "@/state/feature-flags/keys";
import {
  isOverride,
  setHighlight,
  setOverride,
  setOverrides,
  subscribe,
} from "@/state/feature-flags/overrides";
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
      isPeopleOn: useFeatureFlag("people"),
      isAccessOn: useFeatureFlag("feature-flag-overrides"),
      pickerVariant: useFeatureFlagVariant("emotion-picker"),
      isPickerOn: useFeatureFlag("emotion-picker"),
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
    setOverrides({ keys: FEATURE_FLAGS, value: "remote" });
    setHighlight(false);
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

  test("sets many flags in one update", async () => {
    mockReload.mockResolvedValue({ "feature-flag-overrides": true });
    const hook = await renderFlags();
    await waitFor(() => {
      expect(hook.result.current.canOverride).toBe(true);
    });
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    await act(() => {
      setOverrides({ keys: ["photos", "people"], value: "on" });
    });
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(hook.result.current.isPhotosOn).toBe(true);
    expect(hook.result.current.isPeopleOn).toBe(true);
  });

  test("returns many flags to PostHog in one update", async () => {
    mockReload.mockResolvedValue({
      "feature-flag-overrides": true,
      people: true,
    });
    const hook = await renderFlags();
    await waitFor(() => {
      expect(hook.result.current.canOverride).toBe(true);
    });
    await act(() => {
      setOverrides({ keys: ["photos", "people"], value: "off" });
    });
    expect(hook.result.current.isPeopleOn).toBe(false);

    await act(() => {
      setOverrides({ keys: ["photos", "people"], value: "remote" });
    });

    expect(hook.result.current.isPhotosOn).toBe(false);
    expect(hook.result.current.isPeopleOn).toBe(true);
  });

  test("reads the PostHog variant of a multivariate flag", async () => {
    mockReload.mockResolvedValue({ "emotion-picker": "slider" });
    const hook = await renderFlags();

    await waitFor(() => {
      expect(hook.result.current.pickerVariant).toBe("slider");
    });
    expect(hook.result.current.isPickerOn).toBe(true);
  });

  test("reads an unknown PostHog variant as off", async () => {
    mockReload.mockResolvedValue({ "emotion-picker": "gauge" });
    const hook = await renderFlags();

    expect(hook.result.current.pickerVariant).toBeUndefined();
    expect(hook.result.current.isPickerOn).toBe(false);
  });

  test("an override picks the variant, off hides it", async () => {
    mockReload.mockResolvedValue({
      "feature-flag-overrides": true,
      "emotion-picker": "cards",
    });
    const hook = await renderFlags();
    await waitFor(() => {
      expect(hook.result.current.pickerVariant).toBe("cards");
    });

    await act(() => {
      setOverride({ key: "emotion-picker", value: "weather" });
    });
    expect(hook.result.current.pickerVariant).toBe("weather");

    await act(() => {
      setOverride({ key: "emotion-picker", value: "off" });
    });
    expect(hook.result.current.pickerVariant).toBeUndefined();
    expect(hook.result.current.isPickerOn).toBe(false);

    await act(() => {
      setOverride({ key: "emotion-picker", value: "remote" });
    });
    expect(hook.result.current.pickerVariant).toBe("cards");
  });

  test("accepts a variant only for its own flag", () => {
    expect(isOverride("emotion-picker", "slider")).toBe(true);
    expect(isOverride("emotion-picker", "on")).toBe(false);
    expect(isOverride("photos", "slider")).toBe(false);
    expect(isOverride("photos", "on")).toBe(true);
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

  test("never outlines UI without the access flag", async () => {
    mockReload.mockResolvedValue({ photos: true });
    await renderFlags();
    setHighlight(true);

    const screen = await render(
      <FlagHighlight flag="photos">
        <Text>flagged</Text>
      </FlagHighlight>,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText("flagged")).toBeTruthy();
    });
    expect(screen.queryByTestId("feature-flag-highlight-photos")).toBeNull();
  });

  test("outlines UI while the access flag is on", async () => {
    mockReload.mockResolvedValue({ "feature-flag-overrides": true });
    await renderFlags();
    setHighlight(true);

    const screen = await render(
      <FlagHighlight flag="photos">
        <Text>flagged</Text>
      </FlagHighlight>,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByTestId("feature-flag-highlight-photos")).toBeTruthy();
    });
  });
});
