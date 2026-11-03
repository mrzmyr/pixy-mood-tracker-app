import type { ConfigurableLoggerStep } from "@/constants/logger-steps";
import type { LogItem } from "@/features/logs";
import { addDays } from "../days";
import { buildRoughNightSlides, seenBefore, sleep } from "../story/sleep";
import { makeInput, makeTags } from "./utils";

const SEP = "2026-09-01";
const TODAY = "2026-10-02";
const [late, walk, coffee] = makeTags(3);
const STEPS: ConfigurableLoggerStep[] = [
  "rating",
  "tags",
  "people",
  "emotions",
  "photos",
  "sleep",
];

type Quality = LogItem["sleep"]["quality"];
const GOOD: Quality = "good";

/** 30 September days with good sleep, plus `extra` per day index. */
const month = (
  extra: (index: number) => Partial<LogItem> = () => ({})
): Partial<LogItem>[] =>
  Array.from({ length: 30 }, (_, index) => ({
    date: addDays(SEP, index),
    rating: "good",
    message: "",
    sleep: { quality: GOOD },
    ...extra(index),
  }));

/** Rough sleep on the mornings after these day indexes. */
const ROUGH_EVENINGS = [3, 9, 15, 21];
const isRoughMorning = (index: number) => ROUGH_EVENINGS.includes(index - 1);

const slideOf = (
  items: Partial<LogItem>[],
  steps: ConfigurableLoggerStep[] = STEPS
) =>
  sleep(
    makeInput({
      kind: "month",
      today: TODAY,
      date: SEP,
      items,
      steps,
      tags: [late, walk, coffee],
    })
  );

describe("sleep slide", () => {
  test("needs the sleep step and 7 nights with sleep", () => {
    expect(
      slideOf(
        month(),
        STEPS.filter((s) => s !== "sleep")
      )
    ).toBeNull();
    // Sleep counts per day with an entry: 6 days give 6 nights.
    expect(slideOf(month().slice(0, 6))).toBeNull();
    expect(slideOf(month())).not.toBeNull();
  });

  test("looks at the evening before a rough night", () => {
    const slide = slideOf(
      month((index) => ({
        sleep: { quality: isRoughMorning(index) ? "bad" : "good" },
        tags: ROUGH_EVENINGS.includes(index) ? [{ id: late.id }] : [],
      }))
    );
    expect(slide?.roughNights.map((night) => night.evening)).toEqual(
      ROUGH_EVENINGS.map((index) => addDays(SEP, index))
    );
    expect(slide?.roughNights.every((n) => n.tagIds.includes(late.id))).toBe(
      true
    );
  });

  test("asks nothing when rough evenings hold only a rating", () => {
    const slide = slideOf(
      month((index) => ({
        sleep: { quality: isRoughMorning(index) ? "very_bad" : "good" },
      }))
    );
    expect(slide?.roughNights).toEqual([]);
    expect(slide?.goodNights).toBe(26);
  });

  test("marks a tag that stands out, never a tag of most days", () => {
    const slide = slideOf(
      month((index) => ({
        sleep: { quality: isRoughMorning(index) ? "bad" : "good" },
        // Coffee every day, Late screen only on the rough evenings.
        tags: [
          { id: coffee.id },
          ...(ROUGH_EVENINGS.includes(index) ? [{ id: late.id }] : []),
        ],
      }))
    );
    expect(slide?.marked).toEqual([`tag:${late.id}`]);
    expect(slide?.suggestion).toBe(`tag:${late.id}`);
    expect(slide?.items.find((item) => item.id === coffee.id)).toMatchObject({
      isEveryday: true,
      nights: 4,
    });
  });

  test("never marks a person, but measures them as the suggestion", () => {
    const person = { id: "person-1" };
    const slide = slideOf(
      month((index) => ({
        sleep: { quality: isRoughMorning(index) ? "bad" : "good" },
        people: ROUGH_EVENINGS.includes(index) ? [person] : [],
      }))
    );
    expect(slide?.marked).toEqual([]);
    expect(slide?.suggestion).toBe("person:person-1");
  });

  test("shows only data of steps the user has on", () => {
    const slide = slideOf(
      month((index) => ({
        sleep: { quality: isRoughMorning(index) ? "bad" : "good" },
        tags: [{ id: walk.id }],
        emotions: ["tired"],
      })),
      ["rating", "emotions", "sleep"]
    );
    expect(slide?.roughNights[0]).toMatchObject({
      tagIds: [],
      emotions: ["tired"],
    });
    expect(slide?.items).toEqual([]);
  });

  test("counts a repeat only from the second rough night on", () => {
    const slide = slideOf(
      month((index) => ({
        sleep: { quality: isRoughMorning(index) ? "bad" : "good" },
        tags: ROUGH_EVENINGS.includes(index) ? [{ id: late.id }] : [],
      }))
    );
    expect(slide).not.toBeNull();
    if (!slide) {
      return;
    }
    expect(seenBefore(slide, `tag:${late.id}`, 1)).toBe(0);
    expect(seenBefore(slide, `tag:${late.id}`, 3)).toBe(2);
  });
});

describe("rough night slides", () => {
  test("one per night, then overview, question, and closing", () => {
    const slide = slideOf(
      month((index) => ({
        sleep: { quality: isRoughMorning(index) ? "bad" : "good" },
        tags: ROUGH_EVENINGS.includes(index) ? [{ id: late.id }] : [],
      }))
    );
    expect(slide).not.toBeNull();
    if (!slide) {
      return;
    }
    expect(buildRoughNightSlides(slide).map((s) => s.type)).toEqual([
      "rough-night",
      "rough-night",
      "rough-night",
      "rough-night",
      "rough-nights-all",
      "rough-nights-ask",
      "rough-nights-closing",
    ]);
  });

  test("skips the question without tags or people", () => {
    const slide = slideOf(
      month((index) => ({
        sleep: { quality: isRoughMorning(index) ? "bad" : "good" },
        emotions: ["tired"],
      }))
    );
    expect(slide).not.toBeNull();
    if (!slide) {
      return;
    }
    expect(buildRoughNightSlides(slide).map((s) => s.type)).not.toContain(
      "rough-nights-ask"
    );
  });
});
