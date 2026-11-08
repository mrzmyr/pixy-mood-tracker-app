import { buildCards } from "../build-cards";
import { isNudgeCard } from "../card-types";
import { makeInput } from "./utils";

const days = (dates: string[]) => dates.map((date) => ({ date }));
/** Nudge cards only: stat cards like the mood chart show for any data. */
const types = (input: Parameters<typeof buildCards>[0]) =>
  buildCards(input)
    .filter(isNudgeCard)
    .map((card) => card.type);

describe("periods before the first entry", () => {
  test("get no cards at all", () => {
    const input = {
      today: "2026-11-02",
      date: "2026-10-05",
      steps: ["rating" as const],
    };

    expect(
      types(makeInput({ ...input, firstEntryDate: "2026-11-01" }))
    ).toEqual([]);
    expect(types(makeInput({ ...input, firstEntryDate: null }))).toEqual([]);
    expect(
      types(makeInput({ ...input, firstEntryDate: "2026-10-31" }))
    ).toEqual(["intro-emotions", "intro-people", "intro-photos"]);
  });
});

describe("turn on nudges", () => {
  const checkIns = days([
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
          items: checkIns,
          steps: ["rating", "tags"],
        })
      )
    ).toEqual(["intro-emotions", "intro-people", "intro-photos"]);
  });

  test("skip steps this build does not have", () => {
    expect(
      types(
        makeInput({
          items: checkIns,
          steps: ["rating", "tags"],
          availableSteps: ["rating", "tags", "emotions"],
        })
      )
    ).toEqual(["intro-emotions"]);
  });

  test("fit month, not year", () => {
    const input = { items: checkIns, steps: ["rating" as const] };

    expect(types(makeInput({ ...input, kind: "month" }))).toEqual([
      "intro-emotions",
      "intro-people",
      "intro-photos",
    ]);
    expect(types(makeInput({ ...input, kind: "year" }))).toEqual([]);
  });
});
