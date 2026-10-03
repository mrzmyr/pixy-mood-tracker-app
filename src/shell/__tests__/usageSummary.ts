import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import { getUsageSummary } from "@/shell/usageSummary";

const at = (month: number, day: number) =>
  new Date(2026, month, day, 12).toISOString();
// Saturday, 10 October 2026, evening.
const NOW = new Date(2026, 9, 10, 20);

const settings = {
  reminderEnabled: true,
  reminderTime: "20:30",
  scaleType: INITIAL_STATE.scaleType,
  steps: INITIAL_STATE.steps,
  actionsDone: [
    { title: "onboarding", date: at(8, 1) },
    { title: "question_slide_42", date: at(9, 1) },
    { title: "promo_changelog", date: at(9, 2) },
  ],
};

describe("getUsageSummary()", () => {
  // Streak helpers read the clock directly.
  beforeAll(() => {
    jest.useFakeTimers({ now: NOW });
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it("summarizes entries without their content", () => {
    const items = [
      // Outside the 30-day window.
      _generateItem({
        dateTime: at(7, 1),
        message: "",
        tags: [],
        emotions: [],
      }),
      // Inside 30 days, outside 7 days.
      _generateItem({
        dateTime: at(8, 20),
        message: "",
        tags: [{ id: "t1" }],
        emotions: [],
      }),
      // Today, twice, and yesterday.
      _generateItem({
        dateTime: at(9, 9),
        message: "note",
        emotions: ["alive"],
      }),
      _generateItem({ dateTime: at(9, 10), message: "", emotions: [] }),
      _generateItem({ dateTime: at(9, 10), message: "", emotions: [] }),
    ];
    const tags = [
      { id: "t1", title: "Work", color: "red" as const },
      { id: "t2", title: "Gym", color: "blue" as const, isArchived: true },
    ];

    expect(
      getUsageSummary({
        items,
        tags,
        settings,
        isPhotosEnabled: true,
        photoLibraryAccess: "granted",
        now: NOW,
      })
    ).toEqual({
      entries_count: 5,
      entries_30d: 4,
      logged_days_7d: 2,
      logged_days_30d: 3,
      days_since_first_entry: 70,
      days_since_last_entry: 0,
      current_streak: 2,
      longest_streak: 2,
      notes_pct_30d: 25,
      tags_pct_30d: 25,
      emotions_pct_30d: 25,
      statistics_unlocked: false,
      tags_count: 1,
      archived_tags_count: 1,
      reminder_enabled: true,
      reminder_hour: 20,
      scale_type: INITIAL_STATE.scaleType,
      steps: INITIAL_STATE.steps,
      onboarding_done: true,
      questions_answered_count: 1,
      photos_enabled: true,
      photos_pct_30d: 0,
      photos_count: 0,
      photos_day_pct: null,
      photo_library_access: "granted",
    });
  });

  it("counts photos by entry and origin, without photo metadata", () => {
    const photo = (source: "day" | "library", index: number) => ({
      id: `photo-${index}`,
      fileName: `photo-${index}.jpg`,
      width: 1200,
      height: 1600,
      createdAt: at(9, 9),
      source,
      libraryId: `library-${index}`,
    });
    const items = [
      // Outside 30 days: counts toward totals only.
      _generateItem({ dateTime: at(7, 1), photos: [photo("library", 1)] }),
      _generateItem({
        dateTime: at(9, 9),
        photos: [photo("day", 2), photo("day", 3), photo("library", 4)],
      }),
      _generateItem({ dateTime: at(9, 10), photos: [] }),
    ];

    const properties = getUsageSummary({
      items,
      tags: [],
      settings,
      isPhotosEnabled: false,
      photoLibraryAccess: "limited",
      now: NOW,
    });

    expect(properties).toMatchObject({
      photos_pct_30d: 50,
      photos_count: 4,
      photos_day_pct: 50,
      photo_library_access: "limited",
    });
    const serialized = JSON.stringify(properties);
    expect(serialized).not.toContain("library-");
    expect(serialized).not.toContain(".jpg");
  });

  it("returns empty values for a fresh install", () => {
    const properties = getUsageSummary({
      items: [],
      tags: [],
      settings: { ...settings, reminderEnabled: false, actionsDone: [] },
      isPhotosEnabled: false,
      photoLibraryAccess: "unavailable",
      now: NOW,
    });

    expect(properties).toMatchObject({
      entries_count: 0,
      days_since_first_entry: null,
      days_since_last_entry: null,
      notes_pct_30d: null,
      reminder_hour: null,
      onboarding_done: false,
      photos_pct_30d: null,
      photos_count: 0,
      photos_day_pct: null,
    });
  });
});
