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

const base = {
  query: "",
  rating: "good" as const,
  items: [],
  people,
  tags,
  emotions,
  picked: [],
  pickedEmotions: [],
  now: NOW,
};

describe("getSheetSections()", () => {
  test("ranks people and tags best guess first", () => {
    const items = [
      _generateItem({
        dateTime: "2026-10-17T20:00:00",
        people: [{ id: "dora" }],
        tags: [{ id: "work" }],
      }),
    ];

    const sections = getSheetSections({ ...base, items });

    expect(labels(sections.people)).toEqual(["Dora", "Ada", "Ben", "Cem"]);
    expect(labels(sections.tags)).toEqual(["Work", "Jogging"]);
  });

  test("caps tags at 20 and keeps a picked tag from further down", () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      id: `t${String(index).padStart(2, "0")}`,
      title: `Tag ${String(index).padStart(2, "0")}`,
    }));

    const sections = getSheetSections({
      ...base,
      tags: many,
      picked: ["tag:t24"],
    });

    expect(sections.tags).toHaveLength(21);
    expect(sections.tags[20]?.id).toBe("t24");
  });

  test("lists basic emotions plus picked advanced ones", () => {
    const sections = getSheetSections({ ...base, pickedEmotions: ["jealous"] });

    expect(sections.emotions.map((item) => item.key)).toEqual([
      "calm",
      "sad",
      "joyful",
      "jealous",
    ]);
  });

  test("search matches every emotion, person, and tag", () => {
    const sections = getSheetSections({ ...base, query: "J" });

    expect(sections.emotions.map((item) => item.key)).toEqual([
      "jealous",
      "joyful",
    ]);
    expect(labels(sections.people)).toEqual([]);
    expect(labels(sections.tags)).toEqual(["Jogging"]);
  });
});
