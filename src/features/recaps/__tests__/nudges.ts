import { buildCards } from "../buildCards";
import { makeInput, makeTags } from "./utils";

const days = (dates: string[]) => dates.map((date) => ({ date }));
const types = (input: Parameters<typeof buildCards>[0]) =>
  buildCards(input).map((card) => card.type);

describe("reminder nudge", () => {
  test("shows in a week with 4 check-in days, not with 5", () => {
    const four = days(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"]);

    expect(
      types(makeInput({ items: [...four, { date: "2026-10-08" }] }))
    ).toEqual(["nudge-reminder"]);
    expect(
      types(makeInput({ items: [...four, { date: "2026-10-09" }] }))
    ).toEqual([]);
  });

  test("stays hidden when the reminder is on", () => {
    expect(types(makeInput({ reminderEnabled: true }))).toEqual([]);
    expect(types(makeInput({ reminderEnabled: false }))).toEqual([
      "nudge-reminder",
    ]);
  });

  test("fits the week recap only", () => {
    expect(types(makeInput({ kind: "month" }))).toEqual([]);
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

  test("fit week and month, not quarter or year", () => {
    const input = { items: fullWeek, steps: ["rating" as const] };

    expect(types(makeInput({ ...input, kind: "month" }))).toEqual([
      "intro-emotions",
      "intro-people",
      "intro-photos",
    ]);
    expect(types(makeInput({ ...input, kind: "quarter" }))).toEqual([]);
    expect(types(makeInput({ ...input, kind: "year" }))).toEqual([]);
  });
});

describe("group your tags", () => {
  const input = {
    kind: "month" as const,
    items: [{ date: "2026-10-01" }],
  };

  test("shows from 30 active tags, all in General", () => {
    expect(buildCards(makeInput({ ...input, tags: makeTags(30) }))).toEqual([
      { type: "intro-categories", tagsCount: 30 },
    ]);
    expect(buildCards(makeInput({ ...input, tags: makeTags(29) }))).toEqual([]);
  });

  test("counts tags in the General category as General", () => {
    expect(
      buildCards(
        makeInput({ ...input, tags: makeTags(30, { categoryId: "general" }) })
      )
    ).toEqual([{ type: "intro-categories", tagsCount: 30 }]);
  });

  test("ignores archived tags", () => {
    const tags = [...makeTags(29), ...makeTags(5, { isArchived: true })];

    expect(buildCards(makeInput({ ...input, tags }))).toEqual([]);
  });

  test("stays hidden once one tag has its own category", () => {
    const tags = [
      ...makeTags(30),
      { id: "x", title: "X", color: "red" as const, categoryId: "c1" },
    ];

    expect(buildCards(makeInput({ ...input, tags }))).toEqual([]);
  });

  test("stays hidden with the tags step off", () => {
    expect(
      buildCards(
        makeInput({
          ...input,
          tags: makeTags(30),
          steps: ["rating", "emotions", "people", "photos"],
        })
      )
    ).toEqual([]);
  });
});
