import dayjs from "dayjs";
import { _generateItem } from "@/__tests__/utils";
import { LogItemSchema } from "@/types";
import {
  collectCheckInTaps,
  getCheckInLogItem,
  getCheckInTapId,
  getUnimportedTaps,
} from "../checkIn";
import { getCheckInWidgetProps } from "../widgetData";

const NOW = dayjs("2026-10-15T14:30:00");
const TAP_TODAY = { rating: "good" as const, at: NOW.valueOf() };
const TAP_EARLIER = {
  rating: "very_bad" as const,
  at: NOW.subtract(2, "hour").valueOf(),
};
const TAP_YESTERDAY = {
  rating: "extremely_good" as const,
  at: NOW.subtract(1, "day").valueOf(),
};

describe("collectCheckInTaps()", () => {
  test("merges taps of every entry once, oldest first", () => {
    const taps = collectCheckInTaps([
      { props: { taps: [TAP_TODAY] } },
      { props: { taps: [TAP_EARLIER, TAP_TODAY] } },
      { props: {} },
    ]);
    expect(taps).toEqual([TAP_EARLIER, TAP_TODAY]);
  });

  test("drops values that are not taps", () => {
    const taps = collectCheckInTaps([
      {
        props: {
          taps: [
            TAP_TODAY,
            { rating: "great", at: 1 },
            { rating: "good", at: "1" },
            null,
          ],
        },
      },
      { props: { taps: "broken" } },
    ]);
    expect(taps).toEqual([TAP_TODAY]);
  });
});

describe("getUnimportedTaps()", () => {
  test("skips taps that already have an entry", () => {
    const imported = getCheckInLogItem(TAP_EARLIER);
    expect(
      getUnimportedTaps(
        [TAP_EARLIER, TAP_TODAY],
        [imported, _generateItem({ rating: "good" })]
      )
    ).toEqual([TAP_TODAY]);
  });
});

describe("getCheckInLogItem()", () => {
  test("creates a valid entry dated at the tap", () => {
    const item = getCheckInLogItem(TAP_YESTERDAY);
    expect(LogItemSchema.omit({ sleep: true }).safeParse(item).success).toBe(
      true
    );
    expect(item.rating).toBe("extremely_good");
    expect(item.date).toBe("2026-10-14");
    expect(item.id).toBe(getCheckInTapId(TAP_YESTERDAY));
  });

  test("gives different taps different ids", () => {
    expect(getCheckInTapId(TAP_TODAY)).not.toBe(getCheckInTapId(TAP_EARLIER));
    expect(getCheckInTapId(TAP_TODAY)).not.toBe(
      getCheckInTapId({ ...TAP_TODAY, rating: "bad" })
    );
  });
});

describe("getCheckInWidgetProps()", () => {
  const input = {
    items: [
      _generateItem({ dateTime: "2026-10-15T08:00:00", rating: "bad" }),
      _generateItem({ dateTime: "2026-10-15T12:00:00", rating: "neutral" }),
    ],
    scaleType: "ColorBrew-RdYlGn",
    url: "pixy://calendar",
    now: NOW,
    reminderTime: null,
  };

  test("checks today's latest entry without taps", () => {
    expect(getCheckInWidgetProps({ ...input, taps: [] }).selected).toBe(
      "neutral"
    );
  });

  test("checks the last tap of the day over entries", () => {
    const props = getCheckInWidgetProps({
      ...input,
      taps: [TAP_EARLIER, TAP_TODAY],
    });
    expect(props.selected).toBe("good");
    expect(props.taps).toHaveLength(2);
  });

  test("ignores taps of another day for the check mark", () => {
    const props = getCheckInWidgetProps({
      ...input,
      items: [],
      taps: [TAP_YESTERDAY],
    });
    expect(props.selected).toBe("");
  });

  test("hides the reminder when reminders are off", () => {
    expect(getCheckInWidgetProps({ ...input, taps: [] }).reminderTime).toBe("");
    expect(
      getCheckInWidgetProps({ ...input, taps: [], reminderTime: "20:30" })
        .reminderTime
    ).not.toBe("");
  });

  test("never contains null: the widget store rejects it", () => {
    const props = getCheckInWidgetProps({ ...input, taps: [TAP_TODAY] });
    expect(JSON.stringify(props)).not.toContain("null");
  });
});
