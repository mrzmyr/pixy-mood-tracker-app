import { _generateItem } from "@/__tests__/utils";
import {
  WIDGET_NUDGE_DAYS,
  countLoggedDays,
  shouldShowWidgetNudge,
} from "../widgetNudge";
import type { WidgetNudgeInput } from "../widgetNudge";

const ELIGIBLE: WidgetNudgeInput = {
  loggedDays: 3,
  isShown: false,
  isWidgetSupported: true,
  isSettingsReady: true,
};

describe("shouldShowWidgetNudge()", () => {
  test("nudges on the third and fourth logged day", () => {
    expect(WIDGET_NUDGE_DAYS).toEqual([3, 4]);
    expect(shouldShowWidgetNudge(ELIGIBLE)).toBe(true);
    expect(shouldShowWidgetNudge({ ...ELIGIBLE, loggedDays: 4 })).toBe(true);
  });

  test("should not nudge on other days", () => {
    expect(shouldShowWidgetNudge({ ...ELIGIBLE, loggedDays: 2 })).toBe(false);
    expect(shouldShowWidgetNudge({ ...ELIGIBLE, loggedDays: 5 })).toBe(false);
  });

  test("should nudge once", () => {
    expect(shouldShowWidgetNudge({ ...ELIGIBLE, isShown: true })).toBe(false);
  });

  test("should not nudge without widget support", () => {
    expect(
      shouldShowWidgetNudge({ ...ELIGIBLE, isWidgetSupported: false })
    ).toBe(false);
  });

  test("should not nudge before settings load", () => {
    expect(shouldShowWidgetNudge({ ...ELIGIBLE, isSettingsReady: false })).toBe(
      false
    );
  });
});

describe("countLoggedDays()", () => {
  test("counts distinct local days, not entries", () => {
    const items = [
      _generateItem({ dateTime: "2026-10-01T08:00:00.000Z" }),
      _generateItem({ dateTime: "2026-10-01T20:00:00.000Z" }),
      _generateItem({ dateTime: "2026-10-02T08:00:00.000Z" }),
    ];
    expect(countLoggedDays(items)).toBe(2);
    expect(countLoggedDays([])).toBe(0);
  });
});
