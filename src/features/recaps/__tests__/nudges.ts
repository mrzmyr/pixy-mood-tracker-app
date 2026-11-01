import { buildCards } from "../build-cards";
import { isNudgeCard } from "../card-types";
import { makeInput } from "./utils";

const days = (dates: string[]) => dates.map((date) => ({ date }));
/** Nudge cards only: stat cards like the mood chart show for any data. */
const types = (input: Parameters<typeof buildCards>[0]) =>
  buildCards(input)
    .filter(isNudgeCard)
    .map((card) => card.type);

// Week of Monday 2026-10-05 to Sunday 2026-10-11.
const mon = "2026-10-05";
const after = "2026-10-12";

describe("reminder nudge", () => {
  test("shows for a past week with 4 check-in days, not with 5", () => {
    const four = days([mon, "2026-10-06", "2026-10-07", "2026-10-08"]);

    expect(types(makeInput({ today: after, date: mon, items: four }))).toEqual([
      "nudge-reminder",
    ]);
    expect(
      types(
        makeInput({
          today: after,
          date: mon,
          items: [...four, { date: "2026-10-09" }],
        })
      )
    ).toEqual([]);
  });

  test("waits mid-week while 5 check-in days are still possible", () => {
    expect(
      types(makeInput({ today: "2026-10-07", items: days([mon]) }))
    ).toEqual([]);
    expect(
      types(makeInput({ today: "2026-10-09", items: days([mon]) }))
    ).toEqual(["nudge-reminder"]);
  });

  test("stays hidden when the reminder is on", () => {
    const input = { today: after, date: mon, items: days([mon]) };

    expect(types(makeInput({ ...input, reminderEnabled: true }))).toEqual([]);
    expect(types(makeInput({ ...input, reminderEnabled: false }))).toEqual([
      "nudge-reminder",
    ]);
  });

  test("fits the week recap only", () => {
    expect(
      types(makeInput({ kind: "month", today: "2026-11-02", items: [] }))
    ).toEqual([]);
  });
});

describe("periods before the first entry", () => {
  test("get no cards at all", () => {
    const input = {
      today: "2026-10-12",
      date: mon,
      steps: ["rating" as const],
    };

    expect(
      types(makeInput({ ...input, firstEntryDate: "2026-10-12" }))
    ).toEqual([]);
    expect(types(makeInput({ ...input, firstEntryDate: null }))).toEqual([]);
    expect(
      types(makeInput({ ...input, firstEntryDate: "2026-10-11" }))
    ).toEqual([
      "nudge-reminder",
      "intro-emotions",
      "intro-people",
      "intro-photos",
    ]);
  });
});

describe("turn on nudges", () => {
  const fullWeek = days([
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
  ]);

  test("offer each step that is off", () => {
    expect(
      types(
        makeInput({
          items: fullWeek,
          steps: ["rating", "tags"],
        })
      )
    ).toEqual(["intro-emotions", "intro-people", "intro-photos"]);
  });

  test("skip steps this build does not have", () => {
    expect(
      types(
        makeInput({
          items: fullWeek,
          steps: ["rating", "tags"],
          availableSteps: ["rating", "tags", "emotions"],
        })
      )
    ).toEqual(["intro-emotions"]);
  });

  test("fit week and month, not year", () => {
    const input = { items: fullWeek, steps: ["rating" as const] };

    expect(types(makeInput({ ...input, kind: "month" }))).toEqual([
      "intro-emotions",
      "intro-people",
      "intro-photos",
    ]);
    expect(types(makeInput({ ...input, kind: "year" }))).toEqual([]);
  });
});
