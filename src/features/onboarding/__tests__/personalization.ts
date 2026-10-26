import { EMPTY_PERSONALIZATION } from "@/constants/personalization";
import {
  buildTagSelection,
  getStepsForCapture,
  getSuggestions,
  SUGGESTED_TAGS_PER_CATEGORY,
} from "../personalization";

const roomy = { tagSlots: 100, categorySlots: 20 };

describe("getSuggestions", () => {
  test("suggests nothing without answers", () => {
    expect(
      getSuggestions({ answers: EMPTY_PERSONALIZATION, ...roomy })
    ).toEqual([]);
  });

  test("ADHD and medication bring focus, screens, and medication tags", () => {
    const suggestions = getSuggestions({
      answers: { goal: null, struggles: ["focus", "medication"] },
      ...roomy,
    });

    expect(suggestions.map((item) => item.kind)).toEqual([
      "focus",
      "medication",
      "screens",
    ]);
    expect(suggestions[0].tags.map((item) => item.key)).toContain("hyperfocus");
    expect(suggestions[1].tags.map((item) => item.key)).toContain("took_meds");
  });

  test("a category shared by two answers names both and shows once", () => {
    const suggestions = getSuggestions({
      answers: { goal: null, struggles: ["stress", "anxiety"] },
      ...roomy,
    });

    const triggers = suggestions.filter((item) => item.kind === "triggers");
    expect(triggers).toHaveLength(1);
    expect(triggers[0].reasons).toEqual(["stress", "anxiety"]);
  });

  test("the goal adds categories without a struggle reason", () => {
    const suggestions = getSuggestions({
      answers: { goal: "health", struggles: [] },
      ...roomy,
    });

    expect(suggestions).toEqual([
      expect.objectContaining({ kind: "body", reasons: [] }),
    ]);
  });

  test("suggests at most a few tags per category", () => {
    const [focus] = getSuggestions({
      answers: { goal: null, struggles: ["focus"] },
      ...roomy,
    });

    expect(focus.tags).toHaveLength(SUGGESTED_TAGS_PER_CATEGORY);
  });

  test("every answer gets its main category before second ones", () => {
    const suggestions = getSuggestions({
      answers: { goal: null, struggles: ["stress", "medication"] },
      tagSlots: 12,
      categorySlots: 20,
    });

    expect(suggestions.map((item) => item.kind)).toEqual([
      "triggers",
      "medication",
      "calm",
    ]);
  });

  test("stays within free tag and category slots", () => {
    const suggestions = getSuggestions({
      answers: {
        goal: null,
        struggles: ["stress", "low_mood", "sleep", "focus", "medication"],
      },
      tagSlots: 8,
      categorySlots: 2,
    });

    expect(suggestions).toHaveLength(2);
    expect(
      suggestions.reduce((sum, item) => sum + item.tags.length, 0)
    ).toBeLessThanOrEqual(8);
  });
});

describe("buildTagSelection", () => {
  const suggestions = getSuggestions({
    answers: { goal: null, struggles: ["medication"] },
    ...roomy,
  });

  test("creates a typed category whose tags keep their catalog keys", () => {
    const { categories, tags } = buildTagSelection(suggestions, new Set());

    expect(categories).toEqual([
      expect.objectContaining({ kind: "medication" }),
    ]);
    expect(tags.length).toBe(suggestions[0].tags.length);
    expect(tags.every((item) => item.categoryId === categories[0].id)).toBe(
      true
    );
    expect(tags.map((item) => item.catalogKey)).toContain("missed_meds");
  });

  test("leaves out removed tags and empty categories", () => {
    const removed = new Set(suggestions[0].tags.map((item) => item.key));
    removed.delete("took_meds");

    expect(
      buildTagSelection(suggestions, removed).tags.map(
        (item) => item.catalogKey
      )
    ).toEqual(["took_meds"]);

    removed.add("took_meds");
    expect(buildTagSelection(suggestions, removed)).toEqual({
      categories: [],
      tags: [],
    });
  });
});

describe("getStepsForCapture", () => {
  test("follows the choice for offered steps and keeps the rest", () => {
    expect(
      getStepsForCapture({
        current: ["rating", "tags", "sleep", "photos", "feedback"],
        offered: ["emotions", "sleep", "message"],
        chosen: new Set(["emotions"]),
      })
    ).toEqual(["rating", "tags", "photos", "feedback", "emotions"]);
  });
});
