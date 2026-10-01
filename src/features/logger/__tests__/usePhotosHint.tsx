import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { AccessibilityInfo } from "react-native";
import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  LogsProvider,
  STORAGE_KEY as LOGS_STORAGE_KEY,
  useLogState,
} from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_STORAGE_KEY,
  useSettings,
} from "@/state/settings";
import type { LogPhoto } from "@/types";
import { usePhotosHint } from "../hooks/usePhotosHint";

const { capture: mockCapture } = getPostHogTestClient();

const photo: LogPhoto = {
  id: "00000000-0000-4000-8000-000000000001",
  fileName: "00000000-0000-4000-8000-000000000001.jpg",
  width: 100,
  height: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider options={{ enabled: true }}>
      <LogsProvider>{children}</LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const renderHint = ({
  isActive = true,
  draftPhotosCount = 0,
}: {
  isActive?: boolean;
  draftPhotosCount?: number;
} = {}) =>
  renderHook(
    () => ({
      hint: usePhotosHint({ isActive, draftPhotosCount }),
      settings: useSettings().settings,
      logs: useLogState(),
    }),
    { wrapper }
  );

type HintHook = Awaited<ReturnType<typeof renderHint>>;

const waitForLoaded = (hook: HintHook) =>
  waitFor(() => {
    expect(hook.result.current.settings.loaded).toBe(true);
    expect(hook.result.current.logs.loaded).toBe(true);
  });

const getHintEvents = () =>
  jest
    .mocked(mockCapture)
    .mock.calls.filter(([event]) => event === "logger:photo_hint_shown");

const setReduceMotion = (isEnabled: boolean) =>
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockResolvedValue(isEnabled);

/** Lets pending effects run so a hint that should not start had the chance. */
const flushEffects = () =>
  waitFor(() => {
    expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
  });

describe("usePhotosHint()", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.mocked(mockCapture).mockClear();
    setReduceMotion(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("shows until marked, then sets the flag and tracks the event", async () => {
    const hook = await renderHint();
    await waitForLoaded(hook);

    await waitFor(() => {
      expect(hook.result.current.hint.isVisible).toBe(true);
    });
    expect(hook.result.current.settings.photosHintShown).toBe(false);

    await act(() => {
      hook.result.current.hint.markShown();
    });

    expect(hook.result.current.hint.isVisible).toBe(false);
    expect(hook.result.current.settings.photosHintShown).toBe(true);
    expect(getHintEvents()).toHaveLength(1);
  });

  test("skips when the flag is set", async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, photosHintShown: true })
    );
    const hook = await renderHint();
    await waitForLoaded(hook);
    await flushEffects();

    expect(hook.result.current.hint.isVisible).toBe(false);
    expect(getHintEvents()).toEqual([]);
  });

  test("skips under reduce motion and keeps the flag off", async () => {
    setReduceMotion(true);
    const hook = await renderHint();
    await waitForLoaded(hook);
    await flushEffects();

    expect(hook.result.current.hint.isVisible).toBe(false);
    expect(hook.result.current.settings.photosHintShown).toBe(false);
  });

  test("skips when a stored entry has photos", async () => {
    await AsyncStorage.setItem(
      LOGS_STORAGE_KEY,
      JSON.stringify({ items: [_generateItem({ photos: [photo] })] })
    );
    const hook = await renderHint();
    await waitForLoaded(hook);
    await flushEffects();

    expect(hook.result.current.hint.isVisible).toBe(false);
    expect(hook.result.current.settings.photosHintShown).toBe(false);
  });

  test("skips when the draft has photos", async () => {
    const hook = await renderHint({ draftPhotosCount: 1 });
    await waitForLoaded(hook);
    await flushEffects();

    expect(hook.result.current.hint.isVisible).toBe(false);
  });

  test("waits until the note slide is active", async () => {
    const hook = await renderHint({ isActive: false });
    await waitForLoaded(hook);
    await flushEffects();

    expect(hook.result.current.hint.isVisible).toBe(false);
    expect(hook.result.current.settings.photosHintShown).toBe(false);
  });
});
