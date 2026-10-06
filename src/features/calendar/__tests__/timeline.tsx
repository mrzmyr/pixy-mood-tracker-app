import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  PostHogProvider,
  usePostHog as getPostHogTestClient,
} from "posthog-react-native";
import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import { AnalyticsProvider } from "@/state/analytics";
import { FeatureFlagsProvider } from "@/state/featureFlags";
import { SettingsProvider, STORAGE_KEY, useSettings } from "@/state/settings";
import { useCalendarLayout } from "../calendarLayout";
import { getTimelineRows } from "../screens/Calendar/Timeline/rows";

// jest.setup.js replaces posthog-react-native with one shared fake client.
const mockReload = jest.mocked(getPostHogTestClient().reloadFeatureFlagsAsync);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <PostHogProvider apiKey="POSTHOG_API_KEY" autocapture={false}>
      <FeatureFlagsProvider options={{ enabled: true }}>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </FeatureFlagsProvider>
    </PostHogProvider>
  </SettingsProvider>
);

/** Renders the hook with consent given, so remote flags load. */
const renderCalendarLayout = async ({
  isFlagOn,
  storedLayout = "calendar",
}: {
  isFlagOn: boolean;
  /** Raw stored value, also invalid ones from old or broken storage. */
  storedLayout?: string;
}) => {
  mockReload.mockResolvedValue({ "calendar-timeline": isFlagOn });
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      deviceId: "test-device-id",
      analyticsEnabled: true,
      actionsDone: [{ title: "onboarding", date: "2026-10-01T10:00:00.000Z" }],
      calendarLayout: storedLayout,
    })
  );
  const hook = await renderHook(
    () => ({ calendarLayout: useCalendarLayout(), settings: useSettings() }),
    { wrapper }
  );
  await waitFor(() => {
    expect(hook.result.current.calendarLayout.isEnabled).toBe(isFlagOn);
  });
  return hook;
};

beforeEach(async () => {
  mockReload.mockReset();
  await AsyncStorage.clear();
});

describe("useCalendarLayout", () => {
  it("starts with the calendar and switches to the timeline", async () => {
    const { result } = await renderCalendarLayout({ isFlagOn: true });

    expect(result.current.calendarLayout.layout).toBe("calendar");

    await act(() => result.current.calendarLayout.setLayout("timeline"));

    expect(result.current.calendarLayout.layout).toBe("timeline");
  });

  it("falls back to the calendar for an unknown stored value", async () => {
    const { result } = await renderCalendarLayout({
      isFlagOn: true,
      storedLayout: "grid",
    });

    expect(result.current.calendarLayout.layout).toBe("calendar");
  });

  it("shows the calendar with the flag off and keeps the stored choice", async () => {
    const { result } = await renderCalendarLayout({
      isFlagOn: false,
      storedLayout: "timeline",
    });

    expect(result.current.calendarLayout.layout).toBe("calendar");
    expect(result.current.settings.settings.calendarLayout).toBe("timeline");
  });

  it("keeps the device layout when importing settings", async () => {
    const { result } = await renderCalendarLayout({ isFlagOn: true });
    await act(() => result.current.calendarLayout.setLayout("timeline"));

    const { settings } = result.current.settings;
    await act(() =>
      result.current.settings.importSettings({
        scaleType: settings.scaleType,
        reminderEnabled: settings.reminderEnabled,
        reminderTime: settings.reminderTime,
        analyticsEnabled: settings.analyticsEnabled,
        actionsDone: settings.actionsDone,
        steps: settings.steps,
      })
    );

    expect(result.current.calendarLayout.layout).toBe("timeline");
  });
});

describe("getTimelineRows", () => {
  it("lists entries newest first with a month row before each month", () => {
    const october = _generateItem({ dateTime: "2026-10-02T09:00:00" });
    const lateSeptember = _generateItem({ dateTime: "2026-09-30T20:00:00" });
    const earlySeptember = _generateItem({ dateTime: "2026-09-01T08:00:00" });

    const rows = getTimelineRows([earlySeptember, october, lateSeptember]);

    expect(
      rows.map((row) => (row.type === "month" ? row.month : row.item.id))
    ).toEqual([
      "2026-10",
      october.id,
      "2026-09",
      lateSeptember.id,
      earlySeptember.id,
    ]);
  });
});
