import { act, renderHook } from "@testing-library/react-native";
import { _generateItem } from "@/__tests__/utils";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, useSettings } from "@/state/settings";
import { getMoodBarSegments } from "../screens/Calendar/CalendarDay/moodBar";
import { useCalendarView } from "../view";

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider>{children}</AnalyticsProvider>
  </SettingsProvider>
);

describe("useCalendarView", () => {
  it("starts with the average view and switches to all moods", async () => {
    const { result } = await renderHook(
      () => ({ calendarView: useCalendarView(), settings: useSettings() }),
      { wrapper }
    );
    await act(async () => {});

    expect(result.current.calendarView.view).toBe("average");

    await act(() => result.current.calendarView.setView("all"));

    expect(result.current.calendarView.view).toBe("all");
    expect(result.current.settings.settings.calendarView).toBe("all");
  });

  it("falls back to the average view for an unknown stored value", async () => {
    const { result } = await renderHook(
      () => ({ calendarView: useCalendarView(), settings: useSettings() }),
      { wrapper }
    );
    await act(async () => {});

    await act(() =>
      result.current.settings.setSettings((settings) => ({
        ...settings,
        // SAFETY: simulates an unchecked value from storage or an import.
        calendarView: "grid" as never,
      }))
    );

    expect(result.current.calendarView.view).toBe("average");
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
