import dayjs from "dayjs";
import { _generateItem } from "@/testing/log-item";
import type { Emotion } from "@/types";
import { getSheetSections } from "../sheet-sections";

const NOW = dayjs("2026-10-18T21:00:00");

const emotion = (
  key: string,
  category: Emotion["category"],
  overrides: Partial<Emotion> = {}
): Emotion => ({
  key,
  label: key,
  description: "",
  source: "how_we_feel_app",
  category,
  mode: "basic",
  disabled: false,
  ...overrides,
});

const emotions = [
  emotion("calm", "good"),
  emotion("sad", "very_bad"),
  emotion("joyful", "very_good"),
  emotion("jealous", "bad", { mode: "advanced" }),
];

const people = ["Ben", "Ada", "Cem", "Dora"].map((name) => ({
  id: name.toLowerCase(),
  name,
}));
const tags = [
  { id: "work", title: "Work" },
  { id: "jog", title: "Jogging" },
];

const labels = (options: { label: string }[]) =>
  options.map((option) => option.label);

describe("getSheetSections()", () => {
  test("suggests the top 3 and lists the rest A to Z", () => {
    const items = [
      _generateItem({
        dateTime: "2026-10-17T20:00:00",
        people: [{ id: "dora" }],
        tags: [{ id: "work" }],
      }),
    ];

    const sections = getSheetSections({
      query: "",
      rating: "good",
      items,
      people,
      tags,
      emotions,
      now: NOW,
    });

    expect(labels(sections.suggested)).toEqual(["Dora", "Work", "Ada"]);
    expect(labels(sections.people)).toEqual(["Ben", "Cem"]);
    expect(labels(sections.tags)).toEqual(["Jogging"]);
  });

  test("lists basic emotions with the mood's category first", () => {
    const sections = getSheetSections({
      query: "",
      rating: "very_bad",
      items: [],
      people,
      tags,
      emotions,
      now: NOW,
    });

    expect(sections.emotions.map((item) => item.key)).toEqual([
      "sad",
      "calm",
      "joyful",
    ]);
  });

  test("search matches every emotion, person, and tag without suggestions", () => {
    const sections = getSheetSections({
      query: "J",
      rating: "good",
      items: [],
      people,
      tags,
      emotions,
      now: NOW,
    });

    expect(sections.emotions.map((item) => item.key)).toEqual([
      "jealous",
      "joyful",
    ]);
    expect(sections.suggested).toEqual([]);
    expect(labels(sections.people)).toEqual([]);
    expect(labels(sections.tags)).toEqual(["Jogging"]);
  });
});
