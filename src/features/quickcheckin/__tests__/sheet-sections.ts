import dayjs from "dayjs";
import { _generateItem } from "@/testing/log-item";
import { getSheetSections } from "../sheet-sections";

const NOW = dayjs("2026-10-18T21:00:00");

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
  rating: "good" as const,
  items: [],
  people,
  tags,
  picked: [],
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
});
