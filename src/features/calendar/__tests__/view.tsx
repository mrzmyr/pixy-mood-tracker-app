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
import {
  getAverageMoodBarSegments,
  getMoodBarSegments,
} from "../screens/Calendar/CalendarDay/moodBar";
import { useCalendarView } from "../view";

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
const renderCalendarView = async ({ isFlagOn }: { isFlagOn: boolean }) => {
  mockReload.mockResolvedValue({ "calendar-view-all-moods": isFlagOn });
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
    () => ({ calendarView: useCalendarView(), settings: useSettings() }),
    { wrapper }
  );
  await waitFor(() => {
    expect(hook.result.current.calendarView.isEnabled).toBe(isFlagOn);
  });
  return hook;
};

beforeEach(async () => {
  mockReload.mockReset();
  await AsyncStorage.clear();
});

describe("useCalendarView", () => {
  it("starts with the average view and switches to all moods", async () => {
    const { result } = await renderCalendarView({ isFlagOn: true });

    expect(result.current.calendarView.view).toBe("average");

    await act(() => result.current.calendarView.setView("all"));

    expect(result.current.calendarView.view).toBe("all");
    expect(result.current.settings.settings.calendarView).toBe("all");
  });

  it("falls back to the average view for an unknown stored value", async () => {
    const { result } = await renderCalendarView({ isFlagOn: true });

    await act(() =>
      result.current.settings.setSettings((settings) => ({
        ...settings,
        // SAFETY: simulates an unchecked value from storage or an import.
        calendarView: "grid" as never,
      }))
    );

    expect(result.current.calendarView.view).toBe("average");
  });

  it("shows the average view with the flag off and keeps the stored choice", async () => {
    const { result } = await renderCalendarView({ isFlagOn: false });

    await act(() => result.current.calendarView.setView("all"));

    expect(result.current.calendarView.view).toBe("average");
    expect(result.current.settings.settings.calendarView).toBe("all");
  });
});

describe("getMoodBarSegments", () => {
  it("orders segments by entry time, not by storage order", () => {
    const items = [
      _generateItem({ rating: "good", dateTime: "2026-10-01T20:00:00.000Z" }),
      _generateItem({ rating: "bad", dateTime: "2026-10-01T08:00:00.000Z" }),
      _generateItem({
        rating: "neutral",
        dateTime: "2026-10-01T12:00:00.000Z",
      }),
    ];

    expect(getMoodBarSegments(items).map(({ rating }) => rating)).toEqual([
      "bad",
      "neutral",
      "good",
    ]);
  });
});

describe("getAverageMoodBarSegments", () => {
  it("returns one segment in the average mood of the day", () => {
    const items = [
      _generateItem({ rating: "extremely_good" }),
      _generateItem({ rating: "extremely_bad" }),
      _generateItem({ rating: "neutral" }),
    ];

    expect(
      getAverageMoodBarSegments("2026-10-01", items).map(({ rating }) => rating)
    ).toEqual(["neutral"]);
  });

  it("returns no segment for a day without entries", () => {
    expect(getAverageMoodBarSegments("2026-10-01", [])).toEqual([]);
  });
});
