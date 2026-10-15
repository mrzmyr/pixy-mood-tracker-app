import { _generateItem } from "@/__tests__/utils";
import { getLogSavedProperties } from "../logSavedProperties";

// Saturday, 10 October 2026, evening.
const NOW = new Date(2026, 9, 10, 20);

const item = _generateItem({
  dateTime: new Date(2026, 9, 7, 9).toISOString(),
  rating: "very_bad",
  emotions: ["tired", "worried"],
  sleep: { quality: "bad" },
  message: "Fight with my sister",
  tags: [{ id: "tag-1" }],
  people: [{ id: "person-1" }],
});

describe("getLogSavedProperties()", () => {
  test("sends mood values and counts, never the note", () => {
    const properties = getLogSavedProperties({
      mode: "create",
      item,
      hasRating: true,
      durationMs: 1200,
      now: NOW,
    });

    expect(properties).toMatchObject({
      rating: "very_bad",
      emotions: ["tired", "worried"],
      sleep_quality: "bad",
      entry_days_ago: 3,
      message_length: 20,
      tags_count: 1,
      people_count: 1,
    });
    expect(JSON.stringify(properties)).not.toContain("sister");
  });

  test("sends no rating when the entry got the neutral fallback", () => {
    const properties = getLogSavedProperties({
      mode: "edit",
      item: _generateItem({ dateTime: NOW.toISOString(), rating: "neutral" }),
      hasRating: false,
      durationMs: 0,
      now: NOW,
    });

    expect(properties).toMatchObject({
      has_rating: false,
      rating: null,
      entry_days_ago: 0,
    });
  });
});
