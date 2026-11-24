import dayjs from "dayjs";
import { _generateItem } from "@/testing/log-item";
import { getSheetSections } from "../sheet-sections";

const NOW = dayjs("2026-10-18T21:00:00");

const people = ["Ben", "Ada", "Cem", "Dora"].map((name) => ({
  id: name.toLowerCase(),
  name,
}));
const labels = (options: { label: string }[]) =>
  options.map((option) => option.label);

const base = {
  rating: "good" as const,
  items: [],
  people,
  picked: [],
  now: NOW,
};

describe("getSheetSections()", () => {
  test("ranks people best guess first", () => {
    const items = [
      _generateItem({
        dateTime: "2026-10-17T20:00:00",
        people: [{ id: "dora" }],
      }),
    ];

    const sections = getSheetSections({ ...base, items });

    expect(labels(sections.people)).toEqual(["Dora", "Ada", "Ben", "Cem"]);
  });
});
