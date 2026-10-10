import { _generateItem } from "@/__tests__/utils";
import { createCsv } from "../csv";

const HEADER =
  '\uFEFF"id","date","date_time","created_at","rating","emotions","tags","note","sleep_quality"\r\n';

describe("createCsv", () => {
  test("exports every entry field, including archived tag names and Unicode", () => {
    const item = _generateItem({
      id: "entry-1",
      date: "2026-10-03",
      rating: "good",
      emotions: ["happy", "calm"],
      tags: [{ id: "tag-1" }, { id: "missing-tag" }],
      message: 'Coffee, "friends"\nGrüße 🦄',
      sleep: { quality: "very_good" },
    });
    expect(
      createCsv({
        items: [item],
        tags: [
          {
            id: "tag-1",
            title: 'Walk, "park"',
            color: "lime",
            isArchived: true,
          },
        ],
      })
    ).toBe(
      `${
        HEADER
      }"entry-1","2026-10-03","2026-10-03T00:00:00.000Z","2026-10-03T00:00:00.000Z","good","happy; calm","Walk, ""park""; missing-tag","Coffee, ""friends""\nGrüße 🦄","very_good"\r\n`
    );
  });

  test("exports an empty dataset as headers only", () => {
    expect(createCsv({ items: [], tags: [] })).toBe(HEADER);
  });

  test("keeps multiple entries on the same day as separate rows", () => {
    const items = [
      _generateItem({
        id: "first",
        date: "2026-10-03",
        message: "",
        emotions: [],
        tags: [],
      }),
      _generateItem({
        id: "second",
        date: "2026-10-03",
        message: "",
        emotions: [],
        tags: [],
      }),
    ];
    const csv = createCsv({ items, tags: [] });
    expect(csv.split("\r\n")).toHaveLength(4);
    expect(csv).toContain('"first","2026-10-03"');
    expect(csv).toContain('"second","2026-10-03"');
    expect(csv).toContain('"neutral","","","","neutral"');
  });

  test.each([
    "=1+1",
    "+1+1",
    "-1+1",
    "@SUM(A1)",
    "  =1+1",
    "\t=1+1",
    "\r=1+1",
    "\n=1+1",
  ])("treats formula-like notes and tag names as text: %p", (value) => {
    const csv = createCsv({
      items: [_generateItem({ message: value, tags: [{ id: "tag-1" }] })],
      tags: [{ id: "tag-1", title: value, color: "lime" }],
    });
    expect(csv).toContain(`"'${value}","'${value}"`);
  });
});
