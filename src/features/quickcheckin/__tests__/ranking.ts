import dayjs from "dayjs";
import { _generateItem } from "@/testing/log-item";
import type { Emotion } from "@/types";
import { getGlanceLabels, rankEmotions, rankInfluences } from "../ranking";

const NOW = dayjs("2026-10-18T21:00:00");

const people = [
  { id: "anna", name: "Anna" },
  { id: "sam", name: "Sam" },
  { id: "old", name: "Old Friend", isArchived: true },
];
const tags = [
  { id: "work", title: "Work" },
  { id: "gym", title: "Gym" },
];

const emotion = (
  key: string,
  category: Emotion["category"],
  overrides: Partial<Pick<Emotion, "mode" | "disabled">> = {}
): Pick<Emotion, "key" | "category" | "mode" | "disabled"> => ({
  key,
  category,
  mode: "basic",
  disabled: false,
  ...overrides,
});

const ids = (options: { id: string }[]) => options.map((option) => option.id);

describe("rankInfluences()", () => {
  test("puts items used at this time of day first", () => {
    const items = [
      // Mornings with Anna, evenings with Sam.
      ...["10-10", "10-11", "10-12"].map((day) =>
        _generateItem({
          dateTime: `2026-${day}T08:00:00`,
          people: [{ id: "anna" }],
        })
      ),
      _generateItem({
        dateTime: "2026-10-12T20:00:00",
        people: [{ id: "sam" }],
      }),
    ];

    const ranked = rankInfluences({
      items,
      people,
      tags,
      rating: "neutral",
      now: NOW,
    });

    expect(ids(ranked)).toEqual(["sam", "anna", "gym", "work"]);
    expect(ranked.at(0)?.kind).toBe("person");
  });

  test("mixes people and tags in one list", () => {
    const items = [
      _generateItem({
        dateTime: "2026-10-17T20:00:00",
        tags: [{ id: "work" }],
      }),
      _generateItem({
        dateTime: "2026-10-16T20:00:00",
        tags: [{ id: "work" }],
      }),
      _generateItem({
        dateTime: "2026-10-15T20:00:00",
        people: [{ id: "sam" }],
      }),
    ];

    const ranked = rankInfluences({
      items,
      people,
      tags,
      rating: "neutral",
      now: NOW,
    });

    expect(ids(ranked).slice(0, 2)).toEqual(["work", "sam"]);
  });

  test("prefers items whose entries had a similar mood", () => {
    const items = [
      _generateItem({
        dateTime: "2026-10-17T20:00:00",
        rating: "very_bad",
        tags: [{ id: "work" }],
      }),
      _generateItem({
        dateTime: "2026-10-17T20:30:00",
        rating: "very_good",
        tags: [{ id: "gym" }],
      }),
    ];

    expect(
      ids(
        rankInfluences({
          items,
          people: [],
          tags,
          rating: "extremely_good",
          now: NOW,
        })
      )
    ).toEqual(["gym", "work"]);
    expect(
      ids(
        rankInfluences({
          items,
          people: [],
          tags,
          rating: "extremely_bad",
          now: NOW,
        })
      )
    ).toEqual(["work", "gym"]);
  });

  test("ignores entries older than 90 days and hides archived items", () => {
    const items = [
      _generateItem({
        dateTime: "2026-06-01T20:00:00",
        tags: [{ id: "work" }],
      }),
      _generateItem({
        dateTime: "2026-10-17T20:00:00",
        people: [{ id: "old" }],
      }),
    ];

    const ranked = rankInfluences({
      items,
      people,
      tags,
      rating: "neutral",
      now: NOW,
    });

    // No usage counts, so everything sorts by label.
    expect(ids(ranked)).toEqual(["anna", "gym", "sam", "work"]);
  });
});

describe("rankEmotions()", () => {
  const emotions = [
    emotion("happy", "very_good"),
    emotion("grateful", "very_good"),
    emotion("proud", "very_good", { mode: "advanced" }),
    emotion("hidden", "very_good", { disabled: true }),
    emotion("sad", "very_bad"),
  ];

  test("offers only basic emotions of the rating's category", () => {
    expect(
      rankEmotions({ items: [], emotions, rating: "extremely_good", now: NOW })
    ).toEqual(["happy", "grateful"]);
    expect(
      rankEmotions({ items: [], emotions, rating: "very_bad", now: NOW })
    ).toEqual(["sad"]);
    expect(
      rankEmotions({ items: [], emotions, rating: "neutral", now: NOW })
    ).toEqual([]);
  });

  test("puts the most used emotion first", () => {
    const items = [
      _generateItem({
        dateTime: "2026-10-17T20:00:00",
        rating: "very_good",
        emotions: ["grateful"],
      }),
    ];

    expect(
      rankEmotions({ items, emotions, rating: "very_good", now: NOW })
    ).toEqual(["grateful", "happy"]);
  });
});

describe("getGlanceLabels()", () => {
  test("shows first names, with a last initial when first names repeat", () => {
    expect(
      getGlanceLabels([
        { kind: "person", id: "1", label: "Anna Klein", color: "" },
        { kind: "person", id: "2", label: "Anna Meyer", color: "" },
        { kind: "person", id: "3", label: "Sam Lee", color: "" },
        { kind: "tag", id: "4", label: "Long walk in the park", color: "" },
      ])
    ).toEqual(["Anna K.", "Anna M.", "Sam", "Long walk i…"]);
  });
});
